"use client";

import type { User as FirebaseUser } from "firebase/auth";

export async function syncPremiumStatus(user: FirebaseUser, sessionId = "") {
  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/stripe/sync-subscription", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sessionId })
    });
    const data = await response.json().catch(() => ({}));
    return {
      premium: response.ok && (data.subscriptionPlan === "premium" || data.subscriptionStatus === "active" || data.subscriptionStatus === "trialing" || data.alreadyPremium === true),
      syncFailed: data.syncFailed === true,
      message: typeof data.error === "string" ? data.error : typeof data.detail === "string" ? data.detail : ""
    };
  } catch (error) {
    console.warn("Premium status sync failed", error);
    return { premium: false, syncFailed: true, message: "Premium状態を確認できませんでした。" };
  }
}

export function isPremiumProfile(profile: { subscriptionPlan?: string; subscriptionStatus?: string | null } | null | undefined) {
  return profile?.subscriptionPlan === "premium" || profile?.subscriptionStatus === "active" || profile?.subscriptionStatus === "trialing";
}
