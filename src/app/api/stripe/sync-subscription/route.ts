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
      try {
        const result = await syncCheckoutSessionToUser(sessionId, authUser.uid, secretKey, token);
        return NextResponse.json(result);
      } catch (syncError) {
        console.error("checkout session subscription sync failed", syncError);
        return NextResponse.json({
          subscriptionPlan: "premium",
          subscriptionStatus: "active",
          syncFailed: true,
          detail: syncError instanceof Error ? syncError.message : "Premium契約のFirestore反映に失敗しました。"
        });
      }
    }

    const subscription = await findActiveSubscriptionByEmail(authUser.email, secretKey);
    if (!subscription) return NextResponse.json({ subscriptionPlan: "free", subscriptionStatus: "none", synced: false });

    try {
      const result = await saveSubscriptionToUser(authUser.uid, subscription, undefined, false, token);
      return NextResponse.json({ ...result, synced: true });
    } catch (syncError) {
      console.error("existing stripe subscription detected but Firestore sync failed", syncError);
      return NextResponse.json({
        subscriptionPlan: "premium",
        subscriptionStatus: subscription.status ?? "active",
        synced: false,
        syncFailed: true,
        detail: syncError instanceof Error ? syncError.message : "Premium契約のFirestore反映に失敗しました。"
      });
    }
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
