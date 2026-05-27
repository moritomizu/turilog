import type { AiReportFilters, Catch } from "@/types";

export type ReportCatch = Pick<
  Catch,
  | "id"
  | "fishType"
  | "sizeCm"
  | "caughtAt"
  | "tideDirection"
  | "tidePhase"
  | "tidePhaseLabel"
  | "tideHeight"
  | "areaName"
  | "areaCode"
  | "tackleName"
  | "rod"
  | "reel"
  | "lure"
  | "latitude"
  | "longitude"
>;

export type AiReportSummary = {
  catchCount: number;
  dataLevel: string;
  filters: AiReportFilters;
  source: {
    scope: "personal" | "group";
    label: string;
    note: string;
  };
  overall: {
    maxSizeCm: number | null;
    averageSizeCm: number | null;
    topArea: string;
    topTimeBand: string;
  };
  byFishType: SummaryCount[];
  byTide: {
    directionCounts: SummaryCount[];
    phaseCounts: SummaryCount[];
    bigFishTideHints: SummaryCount[];
  };
  byTimeOfDay: SummaryCount[];
  byArea: AreaSummary[];
  byTackle: TackleSummary[];
  plannedTideHints?: PlannedTideHint[];
};

export type SummaryCount = {
  label: string;
  count: number;
  maxSizeCm?: number | null;
  averageSizeCm?: number | null;
};

export type AreaSummary = SummaryCount & {
  areaCode?: string;
};

export type TackleSummary = SummaryCount & {
  tackleName?: string;
  rod?: string;
  reel?: string;
  lure?: string;
};

export type PlannedTideHint = {
  time: string;
  tideHeight: number | null;
  tideDirection: string;
  tidePhaseLabel: string;
};

export async function getUserCatchesForReport(userId: string, filters: AiReportFilters, source: ReportCatch[] = []) {
  return filterReportCatches(source.filter((item) => Boolean(userId)), filters);
}

export function filterReportCatches(items: ReportCatch[], filters: AiReportFilters) {
  const now = new Date();
  const from = getPeriodStart(filters.period, now);
  return items.filter((item) => {
    if (filters.fishType && filters.fishType !== "all" && item.fishType !== filters.fishType) return false;
    if (filters.plannedArea && item.areaName !== filters.plannedArea) return false;
    if (!from) return true;
    return new Date(item.caughtAt).getTime() >= from.getTime();
  });
}

export function summarizeCatches(
  catches: ReportCatch[],
  filters: AiReportFilters,
  plannedTideHints: PlannedTideHint[] = [],
  source: AiReportSummary["source"] = {
    scope: "personal",
    label: "自分の釣果",
    note: "ユーザー本人の釣果だけを母数にした分析です。"
  }
): AiReportSummary {
  const sizes = catches.map((item) => item.sizeCm).filter((value) => Number.isFinite(value) && value > 0);
  const byArea = summarizeByArea(catches);
  const byTimeOfDay = summarizeByTimeOfDay(catches);
  return {
    catchCount: catches.length,
    dataLevel: getDataLevel(catches.length),
    filters,
    source,
    overall: {
      maxSizeCm: sizes.length ? Math.max(...sizes) : null,
      averageSizeCm: sizes.length ? round(sizes.reduce((sum, value) => sum + value, 0) / sizes.length) : null,
      topArea: byArea[0]?.label ?? "未取得",
      topTimeBand: byTimeOfDay[0]?.label ?? "未取得"
    },
    byFishType: summarizeByFishType(catches),
    byTide: summarizeByTide(catches),
    byTimeOfDay,
    byArea,
    byTackle: summarizeByTackle(catches),
    plannedTideHints
  };
}

export function summarizeByFishType(catches: ReportCatch[]) {
  return summarizeCount(catches, (item) => item.fishType || "未分類");
}

export function summarizeByTide(catches: ReportCatch[]) {
  const bigThreshold = getBigFishThreshold(catches);
  return {
    directionCounts: summarizeCount(catches, (item) => getTideDirectionLabel(item.tideDirection)),
    phaseCounts: summarizeCount(catches, (item) => item.tidePhaseLabel || "潮未取得"),
    bigFishTideHints: summarizeCount(catches.filter((item) => bigThreshold != null && item.sizeCm >= bigThreshold), (item) => item.tidePhaseLabel || "潮未取得")
  };
}

export function summarizeByTimeOfDay(catches: ReportCatch[]) {
  return summarizeCount(catches, (item) => getTimeBand(new Date(item.caughtAt).getHours()));
}

export function summarizeByArea(catches: ReportCatch[]): AreaSummary[] {
  return summarizeCount(catches, (item) => item.areaName || "未分類エリア").map((row) => ({
    ...row,
    areaCode: catches.find((item) => (item.areaName || "未分類エリア") === row.label)?.areaCode
  }));
}

export function summarizeByTackle(catches: ReportCatch[]): TackleSummary[] {
  return summarizeCount(catches, (item) => item.tackleName || item.lure || item.rod || "タックル未記録")
    .filter((row) => row.label !== "タックル未記録" || row.count > 0)
    .map((row) => {
      const sample = catches.find((item) => (item.tackleName || item.lure || item.rod || "タックル未記録") === row.label);
      return {
        ...row,
        tackleName: sample?.tackleName || undefined,
        rod: sample?.rod || undefined,
        reel: sample?.reel || undefined,
        lure: sample?.lure || undefined
      };
    });
}

export function buildAiReportPrompt(summary: AiReportSummary, options: { plannedDate?: string; plannedArea?: string }) {
  return `
あなたは釣果ログアプリの分析アシスタントです。
以下の集計データだけを根拠に、日本語で釣り人向けの実践的なレポートを作成してください。

重要なルール:
- 釣果を断定しないでください。
- 「傾向」「可能性」「参考」「仮説」という表現を使ってください。
- データ数が少ない場合は正直に伝えてください。
- 正確な緯度経度や秘密ポイントは出さず、エリア単位で説明してください。
- source.scope が "group" の場合は、個人の予測ではなく「グループ全体の参考傾向」として説明してください。
- グループ母数はデータ量が増える一方で、釣り方や腕前の違いも混ざることを必要に応じて補足してください。
- 次回釣行への提案は最大3つにしてください。
- 釣果を保証しない注意点を必ず入れてください。
- 出力は以下の見出しを必ず使ってください。

見出し:
1. 今回の分析対象
2. 全体サマリー
3. 潮位の傾向
4. 時間帯の傾向
5. エリアの傾向
6. タックルの傾向
7. 次回釣行へのおすすめ
8. 注意点

次回釣行予定:
${options.plannedDate ? `予定日: ${options.plannedDate}` : "未入力"}
${options.plannedArea ? `予定エリア: ${options.plannedArea}` : "未入力"}

集計データ:
${JSON.stringify(summary, null, 2)}
`.trim();
}

function summarizeCount(items: ReportCatch[], getKey: (item: ReportCatch) => string): SummaryCount[] {
  const grouped = new Map<string, ReportCatch[]>();
  items.forEach((item) => {
    const key = getKey(item) || "未取得";
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });
  return [...grouped.entries()]
    .map(([label, values]) => {
      const sizes = values.map((item) => item.sizeCm).filter((value) => Number.isFinite(value) && value > 0);
      return {
        label,
        count: values.length,
        maxSizeCm: sizes.length ? Math.max(...sizes) : null,
        averageSizeCm: sizes.length ? round(sizes.reduce((sum, value) => sum + value, 0) / sizes.length) : null
      };
    })
    .sort((a, b) => b.count - a.count || (b.maxSizeCm ?? 0) - (a.maxSizeCm ?? 0))
    .slice(0, 10);
}

function getPeriodStart(period: AiReportFilters["period"], now: Date) {
  if (period === "last30") return new Date(now.getTime() - 30 * 86400000);
  if (period === "last90") return new Date(now.getTime() - 90 * 86400000);
  if (period === "thisYear") return new Date(now.getFullYear(), 0, 1);
  return null;
}

function getDataLevel(count: number) {
  if (count === 0) return "分析に必要な釣果データがまだありません。まずは釣果を記録してください。";
  if (count <= 4) return "データ数が少ないため、今回は参考メモとして表示します。";
  if (count <= 19) return "傾向は見え始めていますが、まだ仮説段階です。";
  return "一定の傾向分析が可能です。";
}

function getBigFishThreshold(catches: ReportCatch[]) {
  const sizes = catches.map((item) => item.sizeCm).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sizes.length) return null;
  return sizes[Math.max(0, Math.floor(sizes.length * 0.75) - 1)];
}

function getTideDirectionLabel(value: string) {
  if (value === "rising") return "上げ潮";
  if (value === "falling") return "下げ潮";
  return "未取得";
}

function getTimeBand(hour: number) {
  if (hour >= 4 && hour < 10) return "朝";
  if (hour >= 10 && hour < 16) return "昼";
  if (hour >= 16 && hour < 20) return "夕方";
  return "夜";
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
