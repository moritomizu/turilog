import { NextResponse } from "next/server";
import { getBearerToken, getErrorStatus, getFirestoreDocument, getRequestOrigin, verifyFirebaseIdToken } from "@/lib/server/firebaseRest";
import { findActiveSubscriptionByEmail, getCustomerId } from "@/lib/server/stripeBilling";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secretKey = getStripeSecretKey();
    const token = getBearerToken(request);
    const authUser = await verifyFirebaseIdToken(token);
    const userDoc = await getFirestoreDocument(`users/${authUser.uid}`, token).catch(() => null);
    let customerId = typeof userDoc?.stripeCustomerId === "string" ? userDoc.stripeCustomerId : "";
    if (!customerId) {
      const subscription = await findActiveSubscriptionByEmail(authUser.email, secretKey);
      customerId = subscription ? getCustomerId(subscription) : "";
    }
    if (!customerId) {
      return NextResponse.json({ error: "Stripe Customer がまだ作成されていません。" }, { status: 400 });
    }

    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: `${getRequestOrigin(request)}/plans`
      })
    });
    const data = await response.json();
    if (!response.ok || typeof data.url !== "string") {
      throw new Error(typeof data.error?.message === "string" ? data.error.message : "Customer Portalの作成に失敗しました。");
    }
    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("create customer portal session failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer Portalを開けませんでした。" }, { status: getErrorStatus(error) });
  }
}

function getStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("STRIPE_SECRET_KEY が未設定です。");
  if (!value.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY の値が正しくありません。");
  return value;
}
