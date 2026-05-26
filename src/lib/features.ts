import { featureDefinitions, getPlanLabel, planDefinitions } from "@/lib/plans";
import { getUserProfile } from "@/lib/userProfiles";
import type { FeatureKey, SubscriptionPlan, UserProfile } from "@/types";

export function getUserPlanFromProfile(profile: UserProfile | null): SubscriptionPlan {
  return profile?.subscriptionPlan ?? "free";
}

export async function getUserPlan(user: UserProfile | { uid: string } | string | null): Promise<SubscriptionPlan> {
  if (!user) return "free";
  if (typeof user === "string") return getUserPlanFromProfile(await getUserProfile(user));
  if ("subscriptionPlan" in user) return getUserPlanFromProfile(user);
  return getUserPlanFromProfile(await getUserProfile(user.uid));
}

export function getPlanFeatures(plan: SubscriptionPlan) {
  return planDefinitions[plan]?.features ?? planDefinitions.free.features;
}

export function hasFeatureSync(profile: UserProfile | null, featureKey: FeatureKey) {
  const plan = getUserPlanFromProfile(profile);
  if (plan === "tester") return !profile?.disabledFeatures?.includes(featureKey);
  if (profile?.disabledFeatures?.includes(featureKey)) return false;
  if (profile?.enabledFeatures?.includes(featureKey)) return true;
  return getPlanFeatures(plan).includes(featureKey);
}

export async function hasFeature(user: UserProfile | { uid: string } | string | null, featureKey: FeatureKey) {
  if (!user) return getPlanFeatures("free").includes(featureKey);
  const profile = typeof user === "string" ? await getUserProfile(user) : "subscriptionPlan" in user ? user : await getUserProfile(user.uid);
  return hasFeatureSync(profile, featureKey);
}

export async function getFeatureAccess(userId: string, featureKey: FeatureKey) {
  const profile = await getUserProfile(userId);
  const plan = getUserPlanFromProfile(profile);
  return {
    allowed: hasFeatureSync(profile, featureKey),
    plan,
    profile
  };
}

export function getLockedFeatureMessage(featureKey: FeatureKey) {
  const definition = featureDefinitions[featureKey];
  if (!definition) return "この機能は現在準備中です。興味がある方はお知らせください。";
  return `${definition.name}は${getPlanLabel(definition.suggestedPlan)}向けに検討中です。興味がある方はお知らせください。`;
}

export function isAdminProfile(profile: UserProfile | null) {
  if (profile?.subscriptionPlan === "tester") return true;
  const adminUids = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return profile?.uid ? adminUids.includes(profile.uid) : false;
}
