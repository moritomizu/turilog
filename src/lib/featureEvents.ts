"use client";

import { addDoc, collection, getDocs, limit, query, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { getUserPlan } from "@/lib/features";
import type { FeatureEvent, FeatureEventType, FeatureKey } from "@/types";

export async function logFeatureEvent(userId: string, featureKey: FeatureKey, eventType: FeatureEventType, metadata: Record<string, unknown> = {}) {
  const planAtEvent = await getUserPlan(userId).catch(() => "free" as const);
  const pagePath = typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`;
  await addDoc(collection(getFirebaseDb(), "featureEvents"), {
    userId,
    featureKey,
    eventType,
    planAtEvent,
    pagePath,
    metadata,
    createdAt: serverTimestamp()
  });
}

export function logLockedFeatureView(userId: string, featureKey: FeatureKey, metadata?: Record<string, unknown>) {
  return logFeatureEvent(userId, featureKey, "viewLockedFeature", metadata);
}

export function logFeatureInterest(userId: string, featureKey: FeatureKey, metadata?: Record<string, unknown>) {
  return logFeatureEvent(userId, featureKey, "clickInterested", metadata);
}

export function logFeatureNotInterested(userId: string, featureKey: FeatureKey, metadata?: Record<string, unknown>) {
  return logFeatureEvent(userId, featureKey, "clickNotInterested", metadata);
}

export function logFeatureAttempt(userId: string, featureKey: FeatureKey, metadata?: Record<string, unknown>) {
  return logFeatureEvent(userId, featureKey, "attemptUseFeature", metadata);
}

export async function getRecentFeatureEvents(maxCount = 200) {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "featureEvents"), limit(maxCount)));
  return snapshot.docs
    .map((docSnapshot) => normalizeFeatureEvent(docSnapshot.id, docSnapshot.data()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function normalizeFeatureEvent(id: string, data: Record<string, unknown>): FeatureEvent {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "",
    featureKey: typeof data.featureKey === "string" ? (data.featureKey as FeatureKey) : "advancedAnalysis",
    eventType: typeof data.eventType === "string" ? (data.eventType as FeatureEventType) : "viewLockedFeature",
    planAtEvent: typeof data.planAtEvent === "string" ? (data.planAtEvent as FeatureEvent["planAtEvent"]) : "free",
    pagePath: typeof data.pagePath === "string" ? data.pagePath : "",
    createdAt: normalizeDateString(data.createdAt) ?? "",
    metadata: data.metadata && typeof data.metadata === "object" ? (data.metadata as Record<string, unknown>) : {}
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
