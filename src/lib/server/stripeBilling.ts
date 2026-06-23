import { getServiceAccountAccessToken, patchFirestoreDocument, runFirestoreQuery } from "@/lib/server/firebaseRest";
import type { SubscriptionPlan } from "@/types";

export type StripeCheckoutSession = {
  id?: string;
  client_reference_id?: string | null;
  customer?: string | { id?: string } | null;
  customer_email?: string | null;
  mode?: string | null;
  metadata?: { userId?: string };
  subscription?: string | { id?: string } | null;
};

export type StripeSubscription = {
  id: string;
  customer?: string | { id?: string } | null;
  status?: string;
  current_period_end?: number;
  metadata?: { userId?: string };
};

export function getStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("STRIPE_SECRET_KEY が未設定です。");
  if (!value.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY の値が正しくありません。");
  return value;
}

export function getStripeMode(secretKey: string) {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function isActivePremiumStatus(status?: string) {
  return status === "active" || status === "trialing";
}

export async function fetchStripeCheckoutSession(sessionId: string, secretKey: string): Promise<StripeCheckoutSession> {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.id !== "string") {
    throw new Error(typeof data.error?.message === "string" ? data.error.message : "Stripe Checkout Sessionの取得に失敗しました。");
  }
  return data as StripeCheckoutSession;
}

export async function fetchStripeSubscription(subscriptionId: string, secretKey: string): Promise<StripeSubscription> {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.id !== "string") {
    throw new Error(typeof data.error?.message === "string" ? data.error.message : "Stripe Subscriptionの取得に失敗しました。");
  }
  return data as StripeSubscription;
}

export async function verifyStripePrice(secretKey: string, priceId: string) {
  const response = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error?.message === "string" ? data.error.message : "Stripe Priceの確認に失敗しました。";
    console.error("stripe price verification failed", {
      status: response.status,
      message,
      priceIdPrefix: priceId.slice(0, 8),
      stripeMode: getStripeMode(secretKey)
    });
    throw new Error(message);
  }
  if (data.active === false) throw new Error("Stripe Price が無効です。");
  if (data.type !== "recurring") throw new Error("Stripe Price が月額サブスクリプション用ではありません。");
}

export async function saveSubscriptionToUser(userId: string, subscription: StripeSubscription, fallbackCustomerId?: string | null, forceFree = false, fallbackAccessToken?: string) {
  const accessToken = await getSubscriptionWriteToken(fallbackAccessToken);
  const status = subscription.status ?? "active";
  const activePremium = !forceFree && isActivePremiumStatus(status);
  const subscriptionPlan: SubscriptionPlan = activePremium ? "premium" : "free";
  await patchFirestoreDocument(
    `users/${userId}`,
    {
      subscriptionPlan,
      subscriptionStatus: forceFree ? "canceled" : status,
      stripeCustomerId: getCustomerId(subscription) || fallbackCustomerId || null,
      stripeSubscriptionId: subscription.id || null,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      planUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    accessToken
  );
  return { subscriptionPlan, subscriptionStatus: forceFree ? "canceled" : status };
}

export async function syncCheckoutSessionToUser(sessionId: string, expectedUserId: string, secretKey: string, fallbackAccessToken?: string) {
  const session = await fetchStripeCheckoutSession(sessionId, secretKey);
  const userId = session.metadata?.userId || session.client_reference_id || "";
  if (userId !== expectedUserId) {
    const error = new Error("Checkout Sessionのユーザーが一致しません。") as Error & { status?: number };
    error.status = 403;
    throw error;
  }
  const subscriptionId = getSubscriptionId(session);
  if (!subscriptionId) throw new Error("Checkout SessionにSubscriptionがありません。");
  const subscription = await fetchStripeSubscription(subscriptionId, secretKey);
  return saveSubscriptionToUser(expectedUserId, subscription, getCustomerIdFromSession(session), false, fallbackAccessToken);
}

export async function findActiveSubscriptionByEmail(email: string | undefined, secretKey: string) {
  if (!email) return null;
  const customersResponse = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=10`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const customersData = await customersResponse.json().catch(() => ({}));
  if (!customersResponse.ok || !Array.isArray(customersData.data)) return null;

  for (const customer of customersData.data as Array<{ id?: string }>) {
    if (!customer.id) continue;
    const subscription = await findActiveSubscriptionByCustomerId(customer.id, secretKey);
    if (subscription) return subscription;
  }
  return null;
}

export async function findActiveSubscriptionByCustomerId(customerId: string, secretKey: string) {
  if (!customerId) return null;
  const response = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=10`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data.data)) return null;
  return (data.data as StripeSubscription[]).find((subscription) => isActivePremiumStatus(subscription.status)) ?? null;
}

export async function findUserIdByStripeCustomerId(customerId: string) {
  if (!customerId) return "";
  const accessToken = await getServiceAccountAccessToken();
  const rows = await runFirestoreQuery(
    {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "stripeCustomerId" },
          op: "EQUAL",
          value: { stringValue: customerId }
        }
      },
      limit: 1
    },
    accessToken
  );
  return rows[0]?.id ?? "";
}

export function getCustomerId(subscription: StripeSubscription) {
  if (typeof subscription.customer === "string") return subscription.customer;
  if (subscription.customer && typeof subscription.customer === "object" && typeof subscription.customer.id === "string") return subscription.customer.id;
  return "";
}

export function getCustomerIdFromSession(session: StripeCheckoutSession) {
  if (typeof session.customer === "string") return session.customer;
  if (session.customer && typeof session.customer === "object" && typeof session.customer.id === "string") return session.customer.id;
  return "";
}

function getSubscriptionId(session: StripeCheckoutSession) {
  if (typeof session.subscription === "string") return session.subscription;
  if (session.subscription && typeof session.subscription === "object" && typeof session.subscription.id === "string") return session.subscription.id;
  return "";
}

async function getSubscriptionWriteToken(fallbackAccessToken?: string) {
  try {
    return await getServiceAccountAccessToken();
  } catch (error) {
    if (fallbackAccessToken) {
      console.warn("Firebase service account unavailable. Falling back to user token for subscription sync.", error);
      return fallbackAccessToken;
    }
    throw error;
  }
}
