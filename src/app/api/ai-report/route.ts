import { NextResponse } from "next/server";
import {
  buildAiReportPrompt,
  filterReportCatches,
  summarizeCatches,
  type PlannedTideHint,
  type ReportCatch
} from "@/lib/aiReportAnalysis";
import { fetchTideInfoFromProvider } from "@/lib/tide";
import { planDefinitions } from "@/lib/plans";
import type { AiReport, AiReportFilters, AiReportPeriod, FeatureKey, SubscriptionPlan } from "@/types";

export const runtime = "nodejs";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firestoreBaseUrl = projectId ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents` : "";

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    const uid = await verifyFirebaseToken(token);
    const reports = await fetchAiReports(uid, token);
    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "AIレポート一覧を取得できませんでした。") }, { status: getStatus(error) });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY が未設定です。Vercelまたは.env.localに設定してください。" }, { status: 500 });
    }

    const token = getBearerToken(request);
    const uid = await verifyFirebaseToken(token);
    const userDoc = await fetchUserDoc(uid, token);
    if (!hasFeatureFromUserDoc(userDoc, "aiReport")) {
      return NextResponse.json({ error: "AI釣果レポートβは準備中のプレミアム機能です。" }, { status: 403 });
    }

    const body = await request.json();
    const filters = normalizeFilters(body);
    const allCatches = await fetchUserCatches(uid, token);
    const filtered = filterReportCatches(allCatches, filters);
    const plannedTideHints = await fetchPlannedTideHints(allCatches, filtered, filters);
    const summary = summarizeCatches(filtered, filters, plannedTideHints);

    if (filtered.length === 0) {
      const reportText = buildEmptyReport(summary);
      const saved = await saveAiReport(uid, token, filters, filtered.length, reportText, summary);
      return NextResponse.json({ report: saved });
    }

    const prompt = buildAiReportPrompt(summary, { plannedDate: filters.plannedDate, plannedArea: filters.plannedArea });
    const reportText = await generateReportText(prompt);
    const saved = await saveAiReport(uid, token, filters, filtered.length, reportText, summary);
    return NextResponse.json({ report: saved });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "AIレポートを生成できませんでした。") }, { status: getStatus(error) });
  }
}

async function generateReportText(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "あなたは釣果ログアプリの分析レポートを書くアシスタントです。データに基づく参考傾向だけを、釣り人にわかりやすく日本語で説明します。",
      input: prompt,
      temperature: 0.4
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.error?.message === "string" ? data.error.message : "OpenAI APIでレポート生成に失敗しました。");
  }
  return extractOutputText(data) || "AIレポートを生成できませんでした。時間をおいてもう一度お試しください。";
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
  return uid;
}

async function fetchUserCatches(uid: string, token: string): Promise<ReportCatch[]> {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "catches" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "userId" },
            op: "EQUAL",
            value: { stringValue: uid }
          }
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error("釣果データを取得できませんでした。");
  return (Array.isArray(data) ? data : [])
    .map((row) => row.document)
    .filter(Boolean)
    .map((doc) => normalizeReportCatch(doc.name?.split("/").pop() ?? "", fromFirestoreFields(doc.fields ?? {})))
    .sort((a, b) => new Date(b.caughtAt).getTime() - new Date(a.caughtAt).getTime());
}

async function fetchUserDoc(uid: string, token: string) {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}/users/${uid}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 404) return {};
  const data = await response.json();
  if (!response.ok) throw new Error("ユーザー情報を取得できませんでした。");
  return fromFirestoreFields(data.fields ?? {});
}

async function fetchAiReports(uid: string, token: string): Promise<AiReport[]> {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "aiReports" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "userId" },
            op: "EQUAL",
            value: { stringValue: uid }
          }
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) return [];
  return (Array.isArray(data) ? data : [])
    .map((row) => row.document)
    .filter(Boolean)
    .map((doc) => normalizeAiReport(doc.name?.split("/").pop() ?? "", fromFirestoreFields(doc.fields ?? {})))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function saveAiReport(
  uid: string,
  token: string,
  filters: AiReportFilters,
  catchCount: number,
  reportText: string,
  summaryJson: Record<string, unknown>
) {
  ensureFirestoreConfig();
  const createdAt = new Date().toISOString();
  const payload = {
    userId: uid,
    fishType: filters.fishType,
    period: filters.period,
    plannedDate: filters.plannedDate || null,
    plannedArea: filters.plannedArea || null,
    catchCount,
    reportText,
    summaryJson,
    createdAt
  };
  const response = await fetch(`${firestoreBaseUrl}/aiReports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: toFirestoreFields(payload) })
  });
  const data = await response.json();
  if (!response.ok) throw new Error("AIレポートを保存できませんでした。Firestoreルールで aiReports の作成を許可してください。");
  return normalizeAiReport(data.name?.split("/").pop() ?? "", fromFirestoreFields(data.fields ?? {}));
}

async function fetchPlannedTideHints(allCatches: ReportCatch[], filtered: ReportCatch[], filters: AiReportFilters): Promise<PlannedTideHint[]> {
  if (!filters.plannedDate) return [];
  const base = findRepresentativeLocation(filtered, filters.plannedArea) ?? findRepresentativeLocation(allCatches, filters.plannedArea) ?? findRepresentativeLocation(allCatches);
  if (!base) return [];
  const times = ["06:00", "12:00", "18:00"];
  const results: Array<PlannedTideHint | null> = await Promise.all(
    times.map(async (time) => {
      try {
        const tide = await fetchTideInfoFromProvider(base.latitude, base.longitude, `${filters.plannedDate}T${time}:00+09:00`);
        return {
          time,
          tideHeight: tide.tideHeight,
          tideDirection: tide.tideDirection,
          tidePhaseLabel: tide.tidePhaseLabel
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter((item): item is PlannedTideHint => Boolean(item));
}

function findRepresentativeLocation(catches: ReportCatch[], areaName?: string) {
  const item = catches.find((catchItem) => (!areaName || catchItem.areaName === areaName) && catchItem.latitude != null && catchItem.longitude != null);
  if (!item || item.latitude == null || item.longitude == null) return null;
  return { latitude: item.latitude, longitude: item.longitude };
}

function normalizeFilters(body: Record<string, unknown>): AiReportFilters {
  return {
    fishType: typeof body.fishType === "string" && body.fishType ? body.fishType : "all",
    period: normalizePeriod(body.period),
    plannedDate: typeof body.plannedDate === "string" && body.plannedDate ? body.plannedDate : undefined,
    plannedArea: typeof body.plannedArea === "string" && body.plannedArea ? body.plannedArea : undefined
  };
}

function normalizePeriod(value: unknown): AiReportPeriod {
  if (value === "last30" || value === "last90" || value === "thisYear") return value;
  return "all";
}

function normalizeReportCatch(id: string, data: Record<string, unknown>): ReportCatch {
  return {
    id,
    fishType: text(data.fishType),
    sizeCm: number(data.sizeCm),
    caughtAt: text(data.caughtAt) || new Date().toISOString(),
    tideDirection: text(data.tideDirection) as ReportCatch["tideDirection"],
    tidePhase: typeof data.tidePhase === "number" ? (data.tidePhase as ReportCatch["tidePhase"]) : null,
    tidePhaseLabel: text(data.tidePhaseLabel) || "潮未取得",
    tideHeight: typeof data.tideHeight === "number" ? data.tideHeight : null,
    areaName: text(data.areaName) || "未分類エリア",
    areaCode: text(data.areaCode),
    tackleName: text(data.tackleName),
    rod: text(data.rod),
    reel: text(data.reel),
    lure: text(data.lure),
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null
  };
}

function normalizeAiReport(id: string, data: Record<string, unknown>): AiReport {
  return {
    id,
    userId: text(data.userId),
    fishType: text(data.fishType) || "all",
    period: normalizePeriod(data.period),
    plannedDate: text(data.plannedDate) || null,
    plannedArea: text(data.plannedArea) || null,
    catchCount: number(data.catchCount),
    reportText: text(data.reportText),
    summaryJson: data.summaryJson && typeof data.summaryJson === "object" ? (data.summaryJson as Record<string, unknown>) : {},
    createdAt: text(data.createdAt) || new Date().toISOString()
  };
}

function hasFeatureFromUserDoc(userDoc: Record<string, unknown>, featureKey: FeatureKey) {
  const plan = (text(userDoc.subscriptionPlan) || "free") as SubscriptionPlan;
  if (plan === "tester") return !stringArray(userDoc.disabledFeatures).includes(featureKey);
  if (stringArray(userDoc.disabledFeatures).includes(featureKey)) return false;
  if (stringArray(userDoc.enabledFeatures).includes(featureKey)) return true;
  return (planDefinitions[plan]?.features ?? planDefinitions.free.features).includes(featureKey);
}

function buildEmptyReport(summary: Record<string, unknown>) {
  return `1. 今回の分析対象
分析に必要な釣果データがまだありません。まずは釣果を記録してください。

2. 全体サマリー
現在の条件に一致する釣果は0件です。

3. 潮位の傾向
データがないため、潮位傾向はまだ判断できません。

4. 時間帯の傾向
データがないため、時間帯傾向はまだ判断できません。

5. エリアの傾向
データがないため、エリア傾向はまだ判断できません。

6. タックルの傾向
データがないため、タックル傾向はまだ判断できません。

7. 次回釣行へのおすすめ
まずは釣行後に魚種、サイズ、エリア、タックルを記録してみてください。数件たまると参考メモとして振り返れるようになります。

8. 注意点
このレポートは釣果を保証するものではありません。天候、水温、ベイト、人的要因でも結果は変わります。

集計メモ:
${JSON.stringify(summary)}`;
}

function extractOutputText(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string") return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => (item && typeof item === "object" && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : []))
    .map((content) => (content && typeof content === "object" && typeof (content as { text?: unknown }).text === "string" ? (content as { text: string }).text : ""))
    .filter(Boolean)
    .join("\n");
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    const error = new Error("ログインが必要です。") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return token;
}

function ensureFirestoreConfig() {
  if (!projectId || !firestoreBaseUrl) throw new Error("FirebaseプロジェクトIDが未設定です。");
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getStatus(error: unknown) {
  return typeof error === "object" && error != null && "status" in error && typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : 500;
}

function fromFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(fields).forEach(([key, value]) => {
    result[key] = fromFirestoreValue(value as Record<string, unknown>);
  });
  return result;
}

function fromFirestoreValue(value: Record<string, unknown>): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: Record<string, unknown>[] }).values ?? [];
    return values.map(fromFirestoreValue);
  }
  if ("mapValue" in value) return fromFirestoreFields((value.mapValue as { fields?: Record<string, unknown> }).fields ?? {});
  return null;
}

function toFirestoreFields(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]));
}

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value == null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  return { stringValue: String(value) };
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
