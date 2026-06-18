"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import type { UserProfile } from "@/types";

const ONBOARDING_REMINDER_DAYS = 14;

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "users", userId));
  return snapshot.exists() ? normalizeUserProfile(snapshot.id, snapshot.data()) : null;
}

export async function saveUserProfileData(userId: string, data: Partial<UserProfile>) {
  await setDoc(
    doc(getFirebaseDb(), "users", userId),
    {
      ...removeUndefinedFields(data),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function uploadUserAvatar(userId: string, file: File) {
  const storageRef = ref(getFirebaseStorage(), `avatars/${userId}/${crypto.randomUUID()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function completeOnboarding(userId: string, data: Partial<UserProfile>) {
  await saveUserProfileData(userId, {
    ...data,
    onboardingCompleted: true,
    onboardingCompletedAt: new Date().toISOString()
  });
}

export async function skipOnboarding(userId: string) {
  await saveUserProfileData(userId, {
    onboardingSkippedAt: new Date().toISOString()
  });
}

export function shouldShowOnboarding(profile: UserProfile | null) {
  if (!profile) return true;
  if (profile.onboardingCompleted) return false;
  if (!profile.onboardingSkippedAt) return true;
  const skippedAt = new Date(profile.onboardingSkippedAt).getTime();
  if (!Number.isFinite(skippedAt)) return true;
  return Date.now() - skippedAt > ONBOARDING_REMINDER_DAYS * 86400000;
}

function normalizeUserProfile(id: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: typeof data.uid === "string" ? data.uid : id,
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    email: typeof data.email === "string" ? data.email : null,
    avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : null,
    selfIntroduction: typeof data.selfIntroduction === "string" ? data.selfIntroduction : "",
    preferredLocale: data.preferredLocale === "en" ? "en" : data.preferredLocale === "ja" ? "ja" : undefined,
    ageRange: typeof data.ageRange === "string" ? (data.ageRange as UserProfile["ageRange"]) : undefined,
    residenceArea: typeof data.residenceArea === "string" ? data.residenceArea : "",
    fishingAreas: Array.isArray(data.fishingAreas) ? data.fishingAreas.filter((item): item is string => typeof item === "string") : [],
    fishingGenres: Array.isArray(data.fishingGenres) ? data.fishingGenres.filter((item): item is string => typeof item === "string") : [],
    fishingFrequency: typeof data.fishingFrequency === "string" ? (data.fishingFrequency as UserProfile["fishingFrequency"]) : undefined,
    fishingStyle: typeof data.fishingStyle === "string" ? data.fishingStyle : "",
    appPurposes: Array.isArray(data.appPurposes) ? data.appPurposes.filter((item): item is string => typeof item === "string") : [],
    fishingMotivation: typeof data.fishingMotivation === "string" ? (data.fishingMotivation as UserProfile["fishingMotivation"]) : undefined,
    onboardingCompleted: data.onboardingCompleted === true,
    onboardingCompletedAt: normalizeDateString(data.onboardingCompletedAt),
    onboardingSkippedAt: normalizeDateString(data.onboardingSkippedAt),
    subscriptionPlan: typeof data.subscriptionPlan === "string" ? (data.subscriptionPlan as UserProfile["subscriptionPlan"]) : "free",
    subscriptionStatus: typeof data.subscriptionStatus === "string" ? data.subscriptionStatus : "none",
    stripeCustomerId: typeof data.stripeCustomerId === "string" ? data.stripeCustomerId : null,
    stripeSubscriptionId: typeof data.stripeSubscriptionId === "string" ? data.stripeSubscriptionId : null,
    currentPeriodEnd: normalizeDateString(data.currentPeriodEnd),
    enabledFeatures: Array.isArray(data.enabledFeatures) ? data.enabledFeatures.filter((item): item is NonNullable<UserProfile["enabledFeatures"]>[number] => typeof item === "string") : [],
    disabledFeatures: Array.isArray(data.disabledFeatures) ? data.disabledFeatures.filter((item): item is NonNullable<UserProfile["disabledFeatures"]>[number] => typeof item === "string") : [],
    trialEndsAt: normalizeDateString(data.trialEndsAt),
    planUpdatedAt: normalizeDateString(data.planUpdatedAt),
    notificationEnabled: data.notificationEnabled === true,
    fcmTokens: Array.isArray(data.fcmTokens) ? data.fcmTokens.filter((item): item is string => typeof item === "string") : [],
    notificationPreferences: normalizeNotificationPreferences(data.notificationPreferences),
    notificationUpdatedAt: normalizeDateString(data.notificationUpdatedAt),
    feedbackState: normalizeFeedbackState(data.feedbackState),
    updatedAt: normalizeDateString(data.updatedAt)
  };
}

function normalizeNotificationPreferences(value: unknown) {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    tournamentStart: data.tournamentStart !== false,
    tournamentEndingSoon: data.tournamentEndingSoon !== false,
    tournamentRankingUpdated: data.tournamentRankingUpdated !== false,
    tournamentEntryApproved: data.tournamentEntryApproved !== false,
    groupCatchPosted: data.groupCatchPosted !== false,
    aiReportReady: data.aiReportReady !== false,
    systemNotice: data.systemNotice !== false
  };
}

function normalizeDateString(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  }
  return null;
}

function normalizeFeedbackState(value: unknown) {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    afterCatchCreatedShownCount: Number(data.afterCatchCreatedShownCount ?? 0),
    lastShownAt: normalizeDateString(data.lastShownAt),
    lastSubmittedAt: normalizeDateString(data.lastSubmittedAt),
    dismissedAt: normalizeDateString(data.dismissedAt)
  };
}

function removeUndefinedFields<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;
}
