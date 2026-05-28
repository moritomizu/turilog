import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getErrorStatus, getServiceAccountAccessToken, patchFirestoreDocument, runFirestoreQuery } from "@/lib/server/firebaseRest";
import type { SubscriptionPlan } from "@/types";

export const runtime = "nodejs";

type StripeCheckoutSession = {
  client_reference_id?: string | null;
  customer?: string | null;
  mode?: string | null;
  metadata?: { userId?: string };
  subscription?: string | null;
};

type StripeSubscription = {
  id: string;
  customer?: string | { id?: string } | null;
  status?: string;
  current_period_end?: number;
  metadata?: { userId?: string };
};

export async function POST(request: Request) {
  try {
    const secretKey = getStripeSecretKey();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET が未設定です。");

    const rawBody = await request.text();
    verifyStripeSignature(rawBody, request.headers.get("stripe-signature") ?? "", webhookSecret);
    const event = JSON.parse(rawBody) as { type: string; data: { object: unknown } };
    const accessToken = await getServiceAccountAccessToken();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as StripeCheckoutSession;
      await handleCheckoutSessionCompleted(session, secretKey, accessToken);
    }
    if (event.type === "customer.subscription.updated") {
      await handleSubscriptionChange(event.data.object as StripeSubscription, accessToken);
    }
    if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionChange(event.data.object as StripeSubscription, accessToken, true);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook処理に失敗しました。" }, { status: getErrorStatus(error) });
  }
}

async function handleCheckoutSessionCompleted(session: StripeCheckoutSession, secretKey: string, accessToken: string) {
  if (session.mode !== "subscription") return;
  const userId = session.metadata?.userId || session.client_reference_id || "";
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
  if (!userId || !subscriptionId) return;
  const subscription = await fetchStripeSubscription(subscriptionId, secretKey);
  await saveSubscriptionToUser(userId, subscription, accessToken, session.customer ?? undefined);
}

async function handleSubscriptionChange(subscription: StripeSubscription, accessToken: string, forceFree = false) {
  const userId = subscription.metadata?.userId || (await findUserIdByStripeCustomerId(getCustomerId(subscription), accessToken));
  if (!userId) return;
  await saveSubscriptionToUser(userId, subscription, accessToken, undefined, forceFree);
}

async function fetchStripeSubscription(subscriptionId: string, secretKey: string): Promise<StripeSubscription> {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await response.json();
  if (!response.ok || typeof data.id !== "string") throw new Error(typeof data.error?.message === "string" ? data.error.message : "Stripe Subscriptionの取得に失敗しました。");
  return data as StripeSubscription;
}

async function saveSubscriptionToUser(userId: string, subscription: StripeSubscription, accessToken: string, fallbackCustomerId?: string | null, forceFree = false) {
  const status = subscription.status ?? "active";
  const activePremium = !forceFree && (status === "active" || status === "trialing");
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
}

async function findUserIdByStripeCustomerId(customerId: string, accessToken: string) {
  if (!customerId) return "";
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

function getCustomerId(subscription: StripeSubscription) {
  if (typeof subscription.customer === "string") return subscription.customer;
  if (subscription.customer && typeof subscription.customer === "object" && typeof subscription.customer.id === "string") return subscription.customer.id;
  return "";
}

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value];
  }));
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) {
    const error = new Error("Stripe署名ヘッダーが不正です。") as Error & { status?: number };
    error.status = 400;
    throw error;
  }
  const actual = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const valid = actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  if (!valid) {
    const error = new Error("Stripe Webhook署名の検証に失敗しました。") as Error & { status?: number };
    error.status = 400;
    throw error;
  }
}

function getStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("STRIPE_SECRET_KEY が未設定です。");
  if (!value.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY の値が正しくありません。");
  return value;
}
