import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { NotificationCategory } from "@/types";

export const runtime = "nodejs";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const firestoreBaseUrl = projectId ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents` : "";

export async function POST(request: Request) {
  try {
    const requesterToken = getBearerToken(request);
    const requesterUid = await verifyFirebaseToken(requesterToken);
    const body = await request.json();
    const payload = normalizePayload(body);
    const selfTest = payload.userId === requesterUid && !payload.groupId && !payload.tournamentId;

    if (!selfTest && !isAdminUser(requesterUid)) {
      return NextResponse.json({ error: "通知送信は管理者のみ利用できます。" }, { status: 403 });
    }

    const accessToken = await getServiceAccountAccessToken();
    const targetUserIds = await resolveTargetUserIds(payload, accessToken);
    const users = await Promise.all(targetUserIds.map((userId) => fetchUserNotificationDoc(userId, accessToken)));
    const diagnostics = buildNotificationDiagnostics(users, payload.category);
    const tokens = users.flatMap((user) => {
      if (!user.notificationEnabled) return [];
      if (!isPreferenceEnabled(user.notificationPreferences, payload.category)) return [];
      return user.fcmTokens;
    });
    const uniqueTokens = [...new Set(tokens)].filter(Boolean);
    if (!uniqueTokens.length) return NextResponse.json({ sent: 0, skipped: targetUserIds.length, message: getNoTokenMessage(diagnostics, payload.category), diagnostics });

    const results = await Promise.allSettled(uniqueTokens.map((token) => sendFcmMessage(accessToken, token, payload)));
    const sent = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - sent;
    const failureMessages = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => (result.reason instanceof Error ? result.reason.message : "FCM送信に失敗しました。"))
      .slice(0, 3);
    return NextResponse.json({ sent, failed, targets: targetUserIds.length, diagnostics, failureMessages });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "通知を送信できませんでした。" }, { status: getStatus(error) });
  }
}

type NotificationPayload = {
  userId?: string;
  groupId?: string;
  tournamentId?: string;
  allUsers?: boolean;
  category: NotificationCategory;
  title: string;
  body: string;
  url: string;
};

function normalizePayload(value: Record<string, unknown>): NotificationPayload {
  const category = normalizeCategory(value.category);
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : "TsuriLog";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  const url = typeof value.url === "string" && value.url.startsWith("/") ? value.url : "/";
  const userId = typeof value.userId === "string" && value.userId.trim() ? value.userId.trim() : undefined;
  const groupId = typeof value.groupId === "string" && value.groupId.trim() ? value.groupId.trim() : undefined;
  const tournamentId = typeof value.tournamentId === "string" && value.tournamentId.trim() ? value.tournamentId.trim() : undefined;
  const allUsers = value.allUsers === true;
  if (!userId && !groupId && !tournamentId && !allUsers) throw new Error("通知の送信対象が指定されていません。");
  return { userId, groupId, tournamentId, allUsers, category, title, body, url };
}

function normalizeCategory(value: unknown): NotificationCategory {
  const categories: NotificationCategory[] = ["tournamentStart", "tournamentEndingSoon", "tournamentRankingUpdated", "tournamentEntryApproved", "groupCatchPosted", "aiReportReady", "systemNotice"];
  return categories.includes(value as NotificationCategory) ? (value as NotificationCategory) : "systemNotice";
}

async function resolveTargetUserIds(payload: NotificationPayload, accessToken: string) {
  if (payload.userId) return [payload.userId];
  if (payload.groupId) return fetchMemberUserIds("groupMembers", "groupId", payload.groupId, accessToken);
  if (payload.tournamentId) return fetchMemberUserIds("tournamentParticipants", "tournamentId", payload.tournamentId, accessToken);
  if (payload.allUsers) return fetchAllNotificationUserIds(accessToken);
  return [];
}

async function fetchAllNotificationUserIds(accessToken: string) {
  ensureFirestoreConfig();
  const ids = new Set<string>();
  let pageToken = "";
  do {
    const url = new URL(`${firestoreBaseUrl}/users`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error("通知対象ユーザーを取得できませんでした。");
    (Array.isArray(data.documents) ? data.documents : []).forEach((document: { name?: string; fields?: { notificationEnabled?: { booleanValue?: boolean } } }) => {
      const userId = document.name?.split("/").pop();
      if (userId && document.fields?.notificationEnabled?.booleanValue === true) ids.add(userId);
    });
    pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
  } while (pageToken);
  return [...ids];
}

async function fetchMemberUserIds(collectionId: string, fieldPath: string, value: string, accessToken: string) {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              { fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue: value } } },
              { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "active" } } }
            ]
          }
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error("通知対象メンバーを取得できませんでした。");
  return [
    ...new Set(
      (Array.isArray(data) ? data : [])
        .map((row) => row.document?.fields?.userId?.stringValue)
        .filter((item): item is string => typeof item === "string" && item.length > 0)
    )
  ];
}

async function fetchUserNotificationDoc(userId: string, accessToken: string) {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}/users/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 404) return { userId, exists: false, notificationEnabled: false, fcmTokens: [], notificationPreferences: {} as Record<string, boolean> };
  const data = await response.json();
  if (!response.ok) throw new Error("通知設定を取得できませんでした。");
  const fields = data.fields ?? {};
  return {
    userId,
    exists: true,
    notificationEnabled: fields.notificationEnabled?.booleanValue === true,
    fcmTokens: (fields.fcmTokens?.arrayValue?.values ?? []).map((item: { stringValue?: string }) => item.stringValue).filter((item: unknown): item is string => typeof item === "string"),
    notificationPreferences: fromMapValue(fields.notificationPreferences)
  };
}

function buildNotificationDiagnostics(users: Awaited<ReturnType<typeof fetchUserNotificationDoc>>[], category: NotificationCategory) {
  return {
    targetUsers: users.length,
    existingUsers: users.filter((user) => user.exists).length,
    notificationEnabledUsers: users.filter((user) => user.notificationEnabled).length,
    categoryEnabledUsers: users.filter((user) => isPreferenceEnabled(user.notificationPreferences, category)).length,
    tokenCount: users.reduce((total, user) => total + user.fcmTokens.length, 0)
  };
}

function getNoTokenMessage(diagnostics: ReturnType<typeof buildNotificationDiagnostics>, category: NotificationCategory) {
  if (diagnostics.existingUsers === 0) return "通知対象ユーザーがFirestore上で見つかりません。FIREBASE_PROJECT_ID がアプリのFirebase projectIdと一致しているか確認してください。";
  if (diagnostics.notificationEnabledUsers === 0) return "通知全体がOFFになっています。";
  if (diagnostics.categoryEnabledUsers === 0) return `${category} の通知カテゴリがOFFになっています。`;
  if (diagnostics.tokenCount === 0) return "通知トークンが保存されていません。通知を有効にする操作をもう一度行ってください。";
  return "送信対象の通知トークンがありません。";
}

function fromMapValue(value: { mapValue?: { fields?: Record<string, { booleanValue?: boolean }> } } | undefined) {
  const fields = value?.mapValue?.fields ?? {};
  return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, item.booleanValue === true]));
}

function isPreferenceEnabled(preferences: Record<string, boolean>, category: NotificationCategory) {
  return preferences[category] !== false;
}

async function sendFcmMessage(accessToken: string, token: string, payload: NotificationPayload) {
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID が未設定です。");
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body
        },
        webpush: {
          fcm_options: {
            link: payload.url
          },
          notification: {
            icon: "/icons/tsurilog-icon.png",
            badge: "/icons/tsurilog-icon.png"
          }
        },
        data: {
          url: payload.url,
          category: payload.category
        }
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error?.message === "string" ? data.error.message : "FCM送信に失敗しました。");
  return data;
}

async function getServiceAccountAccessToken() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey || !projectId) {
    throw new Error("FCM送信用のFirebaseサービスアカウント環境変数が未設定です。");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  const jwt = `${unsigned}.${base64url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string") throw new Error("Firebaseサービスアカウントの認証に失敗しました。");
  return data.access_token as string;
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function verifyFirebaseToken(token: string) {
  if (!firebaseApiKey) throw new Error("Firebase APIキーが未設定です。");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token })
  });
  const data = await response.json();
  const uid = data.users?.[0]?.localId;
  if (!response.ok || typeof uid !== "string") {
    const error = new Error("ログイン確認に失敗しました。もう一度ログインしてください。") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return uid as string;
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("認証トークンがありません。") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return match[1];
}

function isAdminUser(uid: string) {
  const values = `${process.env.ADMIN_UIDS ?? ""},${process.env.NEXT_PUBLIC_CATCH_EDITOR_UIDS ?? ""}`
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return values.includes(uid);
}

function ensureFirestoreConfig() {
  if (!firestoreBaseUrl) throw new Error("FIREBASE_PROJECT_ID が未設定です。");
}

function getStatus(error: unknown) {
  return typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 500;
}
