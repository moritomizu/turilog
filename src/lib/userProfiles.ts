"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
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
      ...data,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
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
    updatedAt: normalizeDateString(data.updatedAt)
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
