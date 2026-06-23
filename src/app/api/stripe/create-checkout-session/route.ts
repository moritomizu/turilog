import { NextResponse } from "next/server";
import { getBearerToken, getErrorStatus, getRequestOrigin, getFirestoreDocument, verifyFirebaseIdToken } from "@/lib/server/firebaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secretKey = getStripeSecretKey();
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID?.trim();
    if (!priceId) throw new Error("STRIPE_PREMIUM_PRICE_ID が未設定です。");
    if (!priceId.startsWith("price_")) throw new Error("STRIPE_PREMIUM_PRICE_ID の値が正しくありません。");

    const token = getBearerToken(request);
    const authUser = await verifyFirebaseIdToken(token);
    const origin = getRequestOrigin(request);
    const returnPath = await getReturnPath(request);
    const successUrl = buildCheckoutReturnUrl(origin, returnPath, "success");
    const cancelUrl = buildCheckoutReturnUrl(origin, returnPath, "cancelled");
    await verifyStripePrice(secretKey, priceId);

    const userDoc = await getFirestoreDocument(`users/${authUser.uid}`, token).catch(() => null);
    const existingCustomerId = typeof userDoc?.stripeCustomerId === "string" ? userDoc.stripeCustomerId : "";

    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      client_reference_id: authUser.uid,
      success_url: successUrl,
      cancel_url: cancelUrl,
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
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.url !== "string") {
      const message = typeof data.error?.message === "string" ? data.error.message : "Stripe Checkoutの作成に失敗しました。";
      console.error("stripe checkout sessions API error", {
        status: response.status,
        message,
        requestContext: {
          origin,
          returnPath,
          successUrl,
          cancelUrl,
          priceIdPrefix: priceId.slice(0, 8),
          stripeMode: getStripeMode(secretKey)
        }
      });
      throw new Error(message);
    }
    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("create checkout session failed", error);
    return NextResponse.json(
      {
        error: "決済画面を開けませんでした。時間をおいて再度お試しください。",
        detail: error instanceof Error ? error.message : "Checkoutを開始できませんでした。"
      },
      { status: getErrorStatus(error) }
    );
  }
}

function getStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("STRIPE_SECRET_KEY が未設定です。");
  if (!value.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY の値が正しくありません。");
  return value;
}

function getStripeMode(secretKey: string) {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return "unknown";
}

async function getReturnPath(request: Request) {
  const fallback = "/pricing";
  const body = await request.json().catch(() => null);
  const value = typeof body?.returnPath === "string" ? body.returnPath : fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value.split("?")[0] || fallback;
}

function buildCheckoutReturnUrl(origin: string, returnPath: string, checkout: "success" | "cancelled") {
  const url = new URL(returnPath, normalizeOrigin(origin));
  url.searchParams.set("checkout", checkout);
  return url.toString();
}

function normalizeOrigin(origin: string) {
  const trimmed = origin.trim().replace(/\/$/, "");
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) return "https://tsurilogue.com";
  return trimmed;
}

async function verifyStripePrice(secretKey: string, priceId: string) {
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
