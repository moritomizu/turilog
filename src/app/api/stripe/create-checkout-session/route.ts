import { NextResponse } from "next/server";
import { getBearerToken, getErrorStatus, getRequestOrigin, getFirestoreDocument, verifyFirebaseIdToken } from "@/lib/server/firebaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secretKey = getStripeSecretKey();
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID?.trim();
    if (!priceId) throw new Error("STRIPE_PREMIUM_PRICE_ID が未設定です。");

    const token = getBearerToken(request);
    const authUser = await verifyFirebaseIdToken(token);
    const origin = getRequestOrigin(request);
    const userDoc = await getFirestoreDocument(`users/${authUser.uid}`, token).catch(() => null);
    const existingCustomerId = typeof userDoc?.stripeCustomerId === "string" ? userDoc.stripeCustomerId : "";

    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      client_reference_id: authUser.uid,
      success_url: `${origin}/plans?checkout=success`,
      cancel_url: `${origin}/plans?checkout=cancelled`,
      "metadata[userId]": authUser.uid,
      "subscription_data[metadata][userId]": authUser.uid,
      allow_promotion_codes: "true"
    });
    if (existingCustomerId) {
      params.set("customer", existingCustomerId);
    } else if (authUser.email) {
      params.set("customer_email", authUser.email);
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    const data = await response.json();
    if (!response.ok || typeof data.url !== "string") {
      throw new Error(typeof data.error?.message === "string" ? data.error.message : "Stripe Checkoutの作成に失敗しました。");
    }
    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("create checkout session failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkoutを開始できませんでした。" }, { status: getErrorStatus(error) });
  }
}

function getStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("STRIPE_SECRET_KEY が未設定です。");
  if (!value.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY の値が正しくありません。");
  return value;
}
