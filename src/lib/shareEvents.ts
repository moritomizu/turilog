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
  const blockedKeys = new Set(["latitude", "longitude", "pointName", "location", "gps"]);
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !blockedKeys.has(key)));
}
