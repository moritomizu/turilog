import { NextResponse } from "next/server";
import { getBearerToken, getErrorStatus, verifyFirebaseIdToken } from "@/lib/server/firebaseRest";
import { findActiveSubscriptionByEmail, getStripeSecretKey, saveSubscriptionToUser, syncCheckoutSessionToUser } from "@/lib/server/stripeBilling";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secretKey = getStripeSecretKey();
    const token = getBearerToken(request);
    const authUser = await verifyFirebaseIdToken(token);
    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (sessionId) {
      const result = await syncCheckoutSessionToUser(sessionId, authUser.uid, secretKey);
      return NextResponse.json(result);
    }

    const subscription = await findActiveSubscriptionByEmail(authUser.email, secretKey);
    if (!subscription) return NextResponse.json({ subscriptionPlan: "free", subscriptionStatus: "none", synced: false });

    const result = await saveSubscriptionToUser(authUser.uid, subscription);
    return NextResponse.json({ ...result, synced: true });
  } catch (error) {
    console.error("sync stripe subscription failed", error);
    return NextResponse.json(
      {
        error: "Premium状態を同期できませんでした。時間をおいて再度お試しください。",
        detail: error instanceof Error ? error.message : "Subscription同期に失敗しました。"
      },
      { status: getErrorStatus(error) }
    );
  }
}
