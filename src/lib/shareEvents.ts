"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type ShareEventName =
  | "share_open"
  | "share_overlay_selected"
  | "share_template_selected"
  | "share_image_generated"
  | "share_image_saved"
  | "share_completed";

export async function logShareEvent(userId: string, eventName: ShareEventName, metadata: Record<string, unknown> = {}) {
  if (!isFirebaseConfigured || !userId) return;
  await addDoc(collection(getFirebaseDb(), "shareEvents"), {
    userId,
    eventName,
    pagePath: typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`,
    metadata: sanitizeShareMetadata(metadata),
    createdAt: serverTimestamp()
  }).catch((error) => {
    console.warn("share event log failed", error);
  });
}

function sanitizeShareMetadata(metadata: Record<string, unknown>) {
  return sanitizeObject(metadata);
}

function sanitizeObject(value: Record<string, unknown>): Record<string, unknown> {
  const blockedKeys = new Set(["latitude", "longitude", "pointname", "location", "gps", "coordinates"]);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blockedKeys.has(key.toLowerCase()))
      .map(([key, child]) => [key, sanitizeValue(child)])
  );
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") return sanitizeObject(value as Record<string, unknown>);
  return value;
}
