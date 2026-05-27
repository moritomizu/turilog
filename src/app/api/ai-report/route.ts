import { NextResponse } from "next/server";
import {
  buildAiReportPrompt,
  filterReportCatches,
  summarizeCatches,
  toPlannedLunarHint,
  toPlannedWeatherHint,
  type PlannedTideHint,
  type PlannedWeatherHint,
  type ReportCatch
} from "@/lib/aiReportAnalysis";
import { getLunarInfo } from "@/lib/lunar";
import { fetchTideInfoFromProvider } from "@/lib/tide";
import { fetchWeatherInfo } from "@/lib/weather";
import { planDefinitions } from "@/lib/plans";
import type { AiReport, AiReportFilters, AiReportPeriod, AiReportPlannedTimeBand, FeatureKey, SubscriptionPlan } from "@/types";

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
    getOpenAiApiKey();

    const token = getBearerToken(request);
    const uid = await verifyFirebaseToken(token);
    const userDoc = await fetchUserDoc(uid, token);
    if (!hasFeatureFromUserDoc(userDoc, "aiReport")) {
      return NextResponse.json({ error: "AI釣果レポートβは準備中のプレミアム機能です。" }, { status: 403 });
    }

    const body = await request.json();
    const filters = normalizeFilters(body);
    const source = await resolveReportSource(uid, token, userDoc, filters);
    const allCatches = source.scope === "group" && source.groupId ? await fetchGroupCatches(source.groupId, token) : await fetchUserCatches(uid, token);
    const filtered = filterReportCatches(allCatches, filters);
    const plannedContext = await fetchPlannedContext(allCatches, filtered, filters);
    const summary = summarizeCatches(filtered, filters, plannedContext.tideHints, plannedContext.weatherHints, plannedContext.lunarHint, {
      scope: source.scope,
      label: source.label,
      note: source.note
    });

    if (filtered.length === 0) {
      const reportText = buildEmptyReport(summary);
      const saved = await saveAiReport(uid, token, filters, source, filtered.length, reportText, summary);
      notifyAiReportReady(request, token, uid);
      return NextResponse.json({ report: saved });
    }

    const prompt = buildAiReportPrompt(summary, { plannedDate: filters.plannedDate, plannedArea: filters.plannedArea });
    const reportText = await generateReportText(prompt);
    const saved = await saveAiReport(uid, token, filters, source, filtered.length, reportText, summary);
    notifyAiReportReady(request, token, uid);
    return NextResponse.json({ report: saved });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "AIレポートを生成できませんでした。") }, { status: getStatus(error) });
  }
}

function notifyAiReportReady(request: Request, token: string, uid: string) {
  const origin = new URL(request.url).origin;
  void fetch(`${origin}/api/notifications/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: uid,
      category: "aiReportReady",
      title: "AI釣果レポートが生成されました",
      body: "AI釣果レポートが生成されました。次回釣行のヒントを確認できます。",
      url: "/ai-report"
    })
  }).catch(() => undefined);
}

async function generateReportText(prompt: string) {
  const apiKey = getOpenAiApiKey();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
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

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY が未設定です。Vercelまたは.env.localに設定してください。");
  }
  if (!apiKey.startsWith("sk-") || /\s/.test(apiKey)) {
    throw new Error("OPENAI_API_KEY の値が正しくありません。APIキーだけを1行で設定してください。ほかの環境変数や空白が混ざっていないか確認してください。");
  }
  return apiKey;
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

async function fetchGroupCatches(groupId: string, token: string): Promise<ReportCatch[]> {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "catches" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "groupIds" },
            op: "ARRAY_CONTAINS",
            value: { stringValue: groupId }
          }
        }
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error("グループ釣果データを取得できませんでした。");
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

async function resolveReportSource(uid: string, token: string, userDoc: Record<string, unknown>, filters: AiReportFilters) {
  if (filters.sourceScope !== "group") {
    return {
      scope: "personal" as const,
      groupId: null,
      groupName: null,
      label: "自分の釣果",
      note: "ユーザー本人の釣果だけを母数にした分析です。"
    };
  }

  if (!filters.groupId) throw new Error("グループ分析には対象グループを選択してください。");
  if (!hasFeatureFromUserDoc(userDoc, "groupAnalysis")) {
    const error = new Error("グループ釣果を母数にしたAIレポートはGroup Pro向け機能です。") as Error & { status?: number };
    error.status = 403;
    throw error;
  }

  const [member, group] = await Promise.all([fetchActiveGroupMember(uid, filters.groupId, token), fetchGroupDoc(filters.groupId, token)]);
  if (!member) {
    const error = new Error("このグループの釣果を分析する権限がありません。") as Error & { status?: number };
    error.status = 403;
    throw error;
  }

  const groupName = text(group.name) || "グループ";
  return {
    scope: "group" as const,
    groupId: filters.groupId,
    groupName,
    label: `${groupName}のグループ釣果`,
    note: "グループメンバーの釣果を母数にした参考分析です。データ量は増えますが、釣り方や腕前の違いも混ざります。"
  };
}

async function fetchActiveGroupMember(uid: string, groupId: string, token: string) {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}/groupMembers/${groupId}_${uid}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 404) return null;
  const data = await response.json();
  if (!response.ok) throw new Error("グループ参加情報を確認できませんでした。");
  const member = fromFirestoreFields(data.fields ?? {});
  return member.status === "active" ? member : null;
}

async function fetchGroupDoc(groupId: string, token: string) {
  ensureFirestoreConfig();
  const response = await fetch(`${firestoreBaseUrl}/groups/${groupId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 404) throw new Error("グループが見つかりませんでした。");
  const data = await response.json();
  if (!response.ok) throw new Error("グループ情報を取得できませんでした。");
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
  source: Awaited<ReturnType<typeof resolveReportSource>>,
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
    sourceScope: source.scope,
    groupId: source.groupId,
    groupName: source.groupName,
    plannedDate: filters.plannedDate || null,
    plannedTimeBand: filters.plannedTimeBand || null,
    plannedStartTime: filters.plannedStartTime || null,
    plannedEndTime: filters.plannedEndTime || null,
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

async function fetchPlannedContext(allCatches: ReportCatch[], filtered: ReportCatch[], filters: AiReportFilters) {
  if (!filters.plannedDate) return { tideHints: [] as PlannedTideHint[], weatherHints: [] as PlannedWeatherHint[], lunarHint: null };
  const base = findRepresentativeLocation(filtered, filters.plannedArea) ?? findRepresentativeLocation(allCatches, filters.plannedArea) ?? findRepresentativeLocation(allCatches);
  const lunarHint = toPlannedLunarHint(getLunarInfo(`${filters.plannedDate}T12:00:00+09:00`));
  if (!base) return { tideHints: [] as PlannedTideHint[], weatherHints: [] as PlannedWeatherHint[], lunarHint };
  const times = getPlannedHintTimes(filters);
  const tideResults: Array<PlannedTideHint | null> = await Promise.all(
    times.map(async (time) => {
      try {
        const tide = await fetchTideInfoFromProvider(base.latitude, base.longitude, `${filters.plannedDate}T${time}:00+09:00`);
        return {
          time,
          tideHeight: tide.tideHeight,
          tideDirection: tide.tideDirection,
          tidePhase: tide.tidePhase,
          tidePhaseLabel: tide.tidePhaseLabel
        };
      } catch {
        return null;
      }
    })
  );
  const weatherResults: Array<PlannedWeatherHint | null> = await Promise.all(
    times.map(async (time) => {
      try {
        const weather = await fetchWeatherInfo(base.latitude, base.longitude, `${filters.plannedDate}T${time}:00+09:00`);
        return toPlannedWeatherHint(time, weather);
      } catch {
        return null;
      }
    })
  );
  return {
    tideHints: tideResults.filter((item): item is PlannedTideHint => Boolean(item)),
    weatherHints: weatherResults.filter((item): item is PlannedWeatherHint => Boolean(item)),
    lunarHint
  };
}

function findRepresentativeLocation(catches: ReportCatch[], areaName?: string) {
  const item = catches.find((catchItem) => (!areaName || catchItem.areaName === areaName) && catchItem.latitude != null && catchItem.longitude != null);
  if (!item || item.latitude == null || item.longitude == null) return null;
  return { latitude: item.latitude, longitude: item.longitude };
}

function getPlannedHintTimes(filters: AiReportFilters) {
  if (filters.plannedTimeBand === "morning") return ["05:00", "07:00", "09:00"];
  if (filters.plannedTimeBand === "daytime") return ["10:00", "12:00", "14:00"];
  if (filters.plannedTimeBand === "evening") return ["16:00", "18:00", "20:00"];
  if (filters.plannedTimeBand === "night") return ["19:00", "21:00", "23:00"];
  if (filters.plannedTimeBand === "custom" && filters.plannedStartTime && filters.plannedEndTime) {
    return getCustomHintTimes(filters.plannedStartTime, filters.plannedEndTime);
  }
  return ["06:00", "12:00", "18:00"];
}

function getCustomHintTimes(start: string, end: string) {
  const startMinutes = parseTimeMinutes(start);
  let endMinutes = parseTimeMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const middle = Math.round((startMinutes + endMinutes) / 2);
  return [startMinutes, middle, endMinutes].map((minutes) => formatTimeMinutes(minutes));
}

function parseTimeMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function formatTimeMinutes(value: number) {
  const normalized = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeFilters(body: Record<string, unknown>): AiReportFilters {
  const sourceScope = body.sourceScope === "group" ? "group" : "personal";
  const plannedTimeBand = normalizePlannedTimeBand(body.plannedTimeBand);
  return {
    fishType: typeof body.fishType === "string" && body.fishType ? body.fishType : "all",
    period: normalizePeriod(body.period),
    plannedDate: typeof body.plannedDate === "string" && body.plannedDate ? body.plannedDate : undefined,
    plannedTimeBand,
    plannedStartTime: plannedTimeBand === "custom" && isTimeValue(body.plannedStartTime) ? body.plannedStartTime : undefined,
    plannedEndTime: plannedTimeBand === "custom" && isTimeValue(body.plannedEndTime) ? body.plannedEndTime : undefined,
    plannedArea: typeof body.plannedArea === "string" && body.plannedArea ? body.plannedArea : undefined,
    sourceScope,
    groupId: sourceScope === "group" && typeof body.groupId === "string" && body.groupId ? body.groupId : undefined
  };
}

function normalizePeriod(value: unknown): AiReportPeriod {
  if (value === "last7" || value === "last30" || value === "last90" || value === "last180" || value === "thisYear" || value === "sameSeason") return value;
  return "all";
}

function normalizePlannedTimeBand(value: unknown): AiReportPlannedTimeBand {
  if (value === "morning" || value === "daytime" || value === "evening" || value === "night" || value === "custom") return value;
  return "allDay";
}

function isTimeValue(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
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
    pointName: text(data.pointName),
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
    sourceScope: data.sourceScope === "group" ? "group" : "personal",
    groupId: text(data.groupId) || null,
    groupName: text(data.groupName) || null,
    plannedDate: text(data.plannedDate) || null,
    plannedTimeBand: text(data.plannedTimeBand) ? normalizePlannedTimeBand(data.plannedTimeBand) : null,
    plannedStartTime: text(data.plannedStartTime) || null,
    plannedEndTime: text(data.plannedEndTime) || null,
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
