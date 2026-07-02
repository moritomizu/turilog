import crypto from "node:crypto";

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firestoreBaseUrl = projectId ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents` : "";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

export async function verifyFirebaseIdToken(token: string) {
  if (!firebaseApiKey) throw new Error("Firebase APIキーが未設定です。");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token })
  });
  const data = await response.json();
  const user = data.users?.[0];
  if (!response.ok || typeof user?.localId !== "string") {
    const error = new Error("ログイン確認に失敗しました。もう一度ログインしてください。") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return {
    uid: user.localId as string,
    email: typeof user.email === "string" ? (user.email as string) : undefined
  };
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("認証トークンがありません。") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return match[1];
}

export async function getServiceAccountAccessToken() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!clientEmail || !privateKey || !projectId) {
    throw new Error("Firebaseサービスアカウント環境変数が未設定です。");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
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

export async function getFirestoreDocument(path: string, accessToken: string) {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 404) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error?.message === "string" ? data.error.message : "Firestoreドキュメントの取得に失敗しました。");
  return fromFirestoreFields(data.fields ?? {});
}

export async function patchFirestoreDocument(path: string, data: Record<string, unknown>, accessToken: string) {
  ensureFirestoreConfig();
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]));
  const updateMask = Object.keys(data).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const response = await fetch(`${firestoreBaseUrl}/${path}?${updateMask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fields })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error?.message === "string" ? result.error.message : "Firestoreドキュメントの更新に失敗しました。");
  return result;
}

export async function runFirestoreQuery(structuredQuery: Record<string, unknown>, accessToken: string) {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ structuredQuery })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error?.message === "string" ? data.error.message : "Firestoreクエリに失敗しました。");
  return (Array.isArray(data) ? (data as Array<{ document?: { name?: string; fields?: Record<string, Record<string, unknown>> } }>) : [])
    .map((row) => row.document)
    .filter((document): document is { name?: string; fields?: Record<string, Record<string, unknown>> } => Boolean(document))
    .map((document) => ({
      id: typeof document.name === "string" ? document.name.split("/").pop() ?? "" : "",
      path: typeof document.name === "string" ? document.name.split("/documents/").pop() ?? "" : "",
      data: fromFirestoreFields(document.fields ?? {})
    }));
}

export function getRequestOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
}

export function getErrorStatus(error: unknown) {
  return typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 500;
}

function ensureFirestoreConfig() {
  if (!firestoreBaseUrl) throw new Error("FIREBASE_PROJECT_ID が未設定です。");
}

function normalizePrivateKey(value?: string) {
  if (!value) return "";
  let normalized = value.trim();
  if (normalized.endsWith(",")) normalized = normalized.slice(0, -1).trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/\\n/g, "\n");
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return { timestampValue: value };
    return { stringValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toFirestoreValue(item)])) } };
  return { stringValue: String(value) };
}

function fromFirestoreFields(fields: Record<string, Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

function fromFirestoreValue(value: Record<string, unknown>): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue === true;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    const arrayValue = value.arrayValue as { values?: Record<string, unknown>[] };
    return (arrayValue.values ?? []).map(fromFirestoreValue);
  }
  if ("mapValue" in value) {
    const mapValue = value.mapValue as { fields?: Record<string, Record<string, unknown>> };
    return fromFirestoreFields(mapValue.fields ?? {});
  }
  return undefined;
}
