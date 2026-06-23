import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getErrorStatus } from "@/lib/server/firebaseRest";
import { fetchStripeSubscription, findUserIdByStripeCustomerId, getCustomerId, getStripeSecretKey, saveSubscriptionToUser, type StripeCheckoutSession, type StripeSubscription } from "@/lib/server/stripeBilling";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secretKey = getStripeSecretKey();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET が未設定です。");

    const rawBody = await request.text();
    verifyStripeSignature(rawBody, request.headers.get("stripe-signature") ?? "", webhookSecret);
    const event = JSON.parse(rawBody) as { type: string; data: { object: unknown } };

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as StripeCheckoutSession;
      await handleCheckoutSessionCompleted(session, secretKey);
    }
    if (event.type === "customer.subscription.updated") {
      await handleSubscriptionChange(event.data.object as StripeSubscription);
    }
    if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionChange(event.data.object as StripeSubscription, true);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook処理に失敗しました。" }, { status: getErrorStatus(error) });
  }
}

async function handleCheckoutSessionCompleted(session: StripeCheckoutSession, secretKey: string) {
  if (session.mode !== "subscription") return;
  const userId = session.metadata?.userId || session.client_reference_id || "";
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
  if (!userId || !subscriptionId) return;
  const subscription = await fetchStripeSubscription(subscriptionId, secretKey);
  await saveSubscriptionToUser(userId, subscription, typeof session.customer === "string" ? session.customer : undefined);
}

async function handleSubscriptionChange(subscription: StripeSubscription, forceFree = false) {
  const userId = subscription.metadata?.userId || (await findUserIdByStripeCustomerId(getCustomerId(subscription)));
  if (!userId) return;
  await saveSubscriptionToUser(userId, subscription, undefined, forceFree);
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
