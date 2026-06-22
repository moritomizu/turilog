"use client";

import { getToken } from "firebase/messaging";
import { arrayUnion, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, getFirebaseMessaging } from "@/lib/firebase";
import type { NotificationCategory, NotificationPreferences } from "@/types";

export const notificationCategories: Array<{ key: NotificationCategory; label: string; description: string }> = [
  { key: "tournamentStart", label: "大会開始", description: "参加中の大会が始まる時に通知します。" },
  { key: "tournamentEndingSoon", label: "大会終了間近", description: "大会終了が近い時に通知します。" },
  { key: "tournamentRankingUpdated", label: "大会ランキング更新", description: "大会ランキングに動きがあった時に通知します。" },
  { key: "tournamentEntryApproved", label: "大会投稿承認", description: "大会投稿が承認された時に通知します。" },
  { key: "groupCatchPosted", label: "グループ釣果投稿", description: "参加グループに新しい釣果が投稿された時に通知します。" },
  { key: "aiReportReady", label: "AIレポート完了", description: "AI釣果レポートの生成が完了した時に通知します。" },
  { key: "systemNotice", label: "運営からのお知らせ", description: "重要なお知らせを通知します。" }
];

export const defaultNotificationPreferences: NotificationPreferences = {
  tournamentStart: true,
  tournamentEndingSoon: true,
  tournamentRankingUpdated: true,
  tournamentEntryApproved: true,
  groupCatchPosted: true,
  aiReportReady: true,
  systemNotice: true
};

export function getNotificationPermissionLabel() {
  if (typeof window === "undefined" || !("Notification" in window)) return "非対応";
  if (Notification.permission === "granted") return "許可済み";
  if (Notification.permission === "denied") return "ブロック中";
  return "未設定";
}

export async function enablePushNotifications(userId: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("このブラウザは通知に対応していません。");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("通知が許可されませんでした。ブラウザ設定をご確認ください。");

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) throw new Error("NEXT_PUBLIC_FIREBASE_VAPID_KEY が未設定です。");
  if (!isLikelyVapidPublicKey(vapidKey)) {
    throw new Error("NEXT_PUBLIC_FIREBASE_VAPID_KEY には、Firebase Cloud Messaging の Web Push 証明書に表示される「鍵ペアの公開鍵」を設定してください。サーバーキー、秘密鍵、キーIDではありません。");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = await getFirebaseMessaging();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("通知トークンを取得できませんでした。");

  await setDoc(
    doc(getFirebaseDb(), "users", userId),
    {
      notificationEnabled: true,
      fcmTokens: arrayUnion(token),
      notificationPreferences: defaultNotificationPreferences,
      notificationUpdatedAt: serverTimestamp()
    },
    { merge: true }
  );
  return token;
}

function isLikelyVapidPublicKey(value: string) {
  return /^B[A-Za-z0-9_-]{80,}$/.test(value);
}

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences, enabled: boolean) {
  await setDoc(
    doc(getFirebaseDb(), "users", userId),
    {
      notificationEnabled: enabled,
      notificationPreferences: preferences,
      notificationUpdatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function sendSelfTestNotification() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("ログインが必要です。");
  const token = await user.getIdToken();
  const response = await fetch("/api/notifications/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: user.uid,
      category: "systemNotice",
      title: "TSURILOGUE テスト通知",
      body: "通知設定は有効です。釣果や大会のお知らせを受け取れます。",
      url: "/"
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "テスト通知を送信できませんでした。");
  return data;
}

export async function sendNotificationRequest(input: {
  userId?: string;
  groupId?: string;
  tournamentId?: string;
  category: NotificationCategory;
  title: string;
  body: string;
  url: string;
}) {
  const user = getFirebaseAuth().currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch("/api/notifications/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  }).catch(() => undefined);
}
