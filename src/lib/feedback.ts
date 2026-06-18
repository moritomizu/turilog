"use client";

import { addDoc, collection, doc, getDoc, getDocs, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { APP_NAME, APP_VERSION } from "@/lib/brand";
import { getFirebaseDb } from "@/lib/firebase";
import type { FeedbackCategory, FeedbackRating, FeedbackState, FeedbackTrigger, UserFeedback } from "@/types";

const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const SUBMIT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const AFTER_CATCH_TARGET_COUNTS = [1, 3];

export const feedbackRatingOptions: { value: FeedbackRating; label: string }[] = [
  { value: "excellent", label: "😊 最高" },
  { value: "good", label: "🙂 良い" },
  { value: "neutral", label: "😐 普通" },
  { value: "poor", label: "😕 微妙" },
  { value: "bad", label: "😡 不満" }
];

export const feedbackCategoryOptions: { value: FeedbackCategory; label: string }[] = [
  { value: "general", label: "全体について" },
  { value: "bug", label: "不具合" },
  { value: "feature_request", label: "改善要望" },
  { value: "catch_log", label: "釣果ログ" },
  { value: "ai_report", label: "AIレポート" },
  { value: "group", label: "グループ" },
  { value: "tournament", label: "大会" },
  { value: "catch_proof", label: "釣果デジタル証明" },
  { value: "location_privacy", label: "位置情報保護" },
  { value: "premium", label: "Premium" }
];

export const feedbackTriggerLabels: Record<FeedbackTrigger, string> = {
  after_catch_created: "釣果投稿後",
  after_ai_report_viewed: "AIレポート閲覧後",
  after_tournament_created: "大会作成後",
  after_group_created: "グループ作成後",
  manual_feedback: "手動送信",
  nps: "NPS"
};

export async function submitUserFeedback(input: {
  userId: string;
  trigger: FeedbackTrigger;
  rating?: FeedbackRating;
  category?: FeedbackCategory;
  comment?: string;
  path?: string;
  userAgent?: string;
  locale?: string;
}) {
  await addDoc(collection(getFirebaseDb(), "feedbacks"), {
    userId: input.userId,
    appName: APP_NAME,
    trigger: input.trigger,
    rating: input.rating ?? null,
    category: input.category ?? "general",
    comment: input.comment?.trim() || "",
    path: input.path ?? "",
    userAgent: input.userAgent ?? "",
    locale: input.locale ?? "",
    createdAt: serverTimestamp(),
    appVersion: APP_VERSION
  });

  await setDoc(
    doc(getFirebaseDb(), "users", input.userId),
    {
      feedbackState: {
        lastSubmittedAt: serverTimestamp()
      }
    },
    { merge: true }
  );
}

export async function getFeedbackState(userId: string): Promise<FeedbackState> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "users", userId));
  const data = snapshot.exists() ? snapshot.data() : {};
  return normalizeFeedbackState(data.feedbackState as Record<string, unknown> | undefined);
}

export async function shouldShowAfterCatchCreatedFeedback(userId: string, catchCount: number) {
  if (!AFTER_CATCH_TARGET_COUNTS.includes(catchCount)) return false;
  const state = await getFeedbackState(userId);
  if (catchCount === 1 && state.afterCatchCreatedShownCount >= 1) return false;
  if (catchCount === 3 && state.afterCatchCreatedShownCount >= 2) return false;
  if (isWithinCooldown(state.dismissedAt, DISMISS_COOLDOWN_MS)) return false;
  if (isWithinCooldown(state.lastSubmittedAt, SUBMIT_COOLDOWN_MS)) return false;
  return true;
}

export async function markAfterCatchFeedbackShown(userId: string) {
  await setDoc(
    doc(getFirebaseDb(), "users", userId),
    {
      feedbackState: {
        afterCatchCreatedShownCount: increment(1),
        lastShownAt: serverTimestamp()
      }
    },
    { merge: true }
  );
}

export async function dismissFeedbackPrompt(userId: string) {
  await setDoc(
    doc(getFirebaseDb(), "users", userId),
    {
      feedbackState: {
        dismissedAt: serverTimestamp()
      }
    },
    { merge: true }
  );
}

export async function getRecentFeedbacks(maxCount = 300): Promise<UserFeedback[]> {
  const snapshot = await getDocs(collection(getFirebaseDb(), "feedbacks"));
  return snapshot.docs
    .map((item) => normalizeFeedbackDoc(item.id, item.data()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxCount);
}

function normalizeFeedbackDoc(id: string, data: Record<string, unknown>): UserFeedback {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "",
    appName: typeof data.appName === "string" ? data.appName : APP_NAME,
    trigger: isFeedbackTrigger(data.trigger) ? data.trigger : "manual_feedback",
    rating: isFeedbackRating(data.rating) ? data.rating : undefined,
    category: isFeedbackCategory(data.category) ? data.category : undefined,
    comment: typeof data.comment === "string" ? data.comment : "",
    path: typeof data.path === "string" ? data.path : "",
    userAgent: typeof data.userAgent === "string" ? data.userAgent : "",
    locale: typeof data.locale === "string" ? data.locale : "",
    createdAt: normalizeDate(data.createdAt),
    appVersion: typeof data.appVersion === "string" ? data.appVersion : ""
  };
}

function normalizeFeedbackState(value?: Record<string, unknown>): FeedbackState {
  return {
    afterCatchCreatedShownCount: Number(value?.afterCatchCreatedShownCount ?? 0),
    lastShownAt: normalizeOptionalDate(value?.lastShownAt),
    lastSubmittedAt: normalizeOptionalDate(value?.lastSubmittedAt),
    dismissedAt: normalizeOptionalDate(value?.dismissedAt)
  };
}

function isWithinCooldown(value: string | null | undefined, cooldownMs: number) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < cooldownMs;
}

function normalizeDate(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function normalizeOptionalDate(value: unknown) {
  if (value == null) return null;
  return normalizeDate(value);
}

function isFeedbackTrigger(value: unknown): value is FeedbackTrigger {
  return typeof value === "string" && Object.keys(feedbackTriggerLabels).includes(value);
}

function isFeedbackRating(value: unknown): value is FeedbackRating {
  return typeof value === "string" && feedbackRatingOptions.some((item) => item.value === value);
}

function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === "string" && feedbackCategoryOptions.some((item) => item.value === value);
}
