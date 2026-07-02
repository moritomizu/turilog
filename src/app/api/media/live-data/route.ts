import { NextResponse } from "next/server";
import { getServiceAccountAccessToken, runFirestoreQuery } from "@/lib/server/firebaseRest";

export const revalidate = 300;
export const dynamic = "force-dynamic";

type PublicCatchForLiveData = {
  fishType: string;
  sizeCm: number;
  caughtAt: string;
  createdAt: string;
  areaName: string;
  areaCode: string;
  pointName: string;
  tackleName: string;
  lure: string;
  rod: string;
  reel: string;
  fishingGenre: string;
  method: string;
  tackle?: {
    lureName?: string;
    lureColor?: string;
  };
};

type LiveDataResponse = {
  totalCatches: number;
  averageSize: number;
  maxSize: number;
  popularFish: string;
  popularArea: string;
  popularTimeRange: string;
  latestUpdatedAt: string | null;
};

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const QUERY_LIMIT = 500;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = {
      fish: normalizeFilter(url.searchParams.get("fish")),
      area: normalizeFilter(url.searchParams.get("area")),
      method: normalizeFilter(url.searchParams.get("method")),
      days: parseDays(url.searchParams.get("days"))
    };
    const since = Date.now() - filters.days * 24 * 60 * 60 * 1000;

    const accessToken = await getServiceAccountAccessToken();
    const rows = await runFirestoreQuery(
      {
        from: [{ collectionId: "publicCatches" }],
        orderBy: [{ field: { fieldPath: "caughtAt" }, direction: "DESCENDING" }],
        limit: QUERY_LIMIT
      },
      accessToken
    );

    const catches = rows
      .map((row) => normalizePublicCatch(row.data))
      .filter((item) => isWithinPeriod(item, since))
      .filter((item) => matchesFilter(item.fishType, filters.fish))
      .filter((item) => matchesArea(item, filters.area))
      .filter((item) => matchesMethod(item, filters.method));

    const response = summarizeLiveData(catches);
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600"
      }
    });
  } catch (error) {
    console.error("media live data failed", error);
    return NextResponse.json(
      {
        error: "現在データを取得できません"
      },
      { status: 500 }
    );
  }
}

function summarizeLiveData(catches: PublicCatchForLiveData[]): LiveDataResponse {
  const sizes = catches.map((item) => item.sizeCm).filter((value) => Number.isFinite(value) && value > 0);
  const latestUpdatedAt = catches
    .map((item) => parseDate(item.createdAt || item.caughtAt)?.getTime() ?? 0)
    .filter((value) => value > 0)
    .sort((a, b) => b - a)[0];

  return {
    totalCatches: catches.length,
    averageSize: sizes.length ? roundToOneDecimal(sizes.reduce((total, value) => total + value, 0) / sizes.length) : 0,
    maxSize: sizes.length ? roundToOneDecimal(Math.max(...sizes)) : 0,
    popularFish: getMostFrequent(catches.map((item) => item.fishType).filter(Boolean)) || "未集計",
    popularArea: getMostFrequent(catches.map((item) => item.areaName).filter(Boolean)) || "未集計",
    popularTimeRange: getMostFrequent(catches.map((item) => getTimeRangeLabel(item.caughtAt)).filter(Boolean)) || "未集計",
    latestUpdatedAt: latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : null
  };
}

function normalizePublicCatch(data: Record<string, unknown>): PublicCatchForLiveData {
  const tackle = isRecord(data.tackle) ? data.tackle : {};
  return {
    fishType: getString(data.fishType),
    sizeCm: getNumber(data.sizeCm),
    caughtAt: getString(data.caughtAt),
    createdAt: getString(data.createdAt),
    areaName: getString(data.areaName),
    areaCode: getString(data.areaCode),
    pointName: getString(data.pointName),
    tackleName: getString(data.tackleName),
    lure: getString(data.lure),
    rod: getString(data.rod),
    reel: getString(data.reel),
    fishingGenre: getString(data.fishingGenre),
    method: getString(data.method),
    tackle: {
      lureName: getString(tackle.lureName),
      lureColor: getString(tackle.lureColor)
    }
  };
}

function normalizeFilter(value: string | null) {
  return value?.trim() || "";
}

function parseDays(value: string | null) {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return DEFAULT_DAYS;
  return Math.min(Math.floor(days), MAX_DAYS);
}

function isWithinPeriod(item: PublicCatchForLiveData, since: number) {
  const caughtAt = parseDate(item.caughtAt)?.getTime();
  const createdAt = parseDate(item.createdAt)?.getTime();
  const target = Number.isFinite(caughtAt) ? caughtAt : createdAt;
  return typeof target === "number" && Number.isFinite(target) && target >= since;
}

function matchesFilter(value: string, filter: string) {
  if (!filter) return true;
  return normalizeSearchText(value).includes(normalizeSearchText(filter));
}

function matchesArea(item: PublicCatchForLiveData, filter: string) {
  if (!filter) return true;
  const haystack = [item.areaName, item.areaCode].map(normalizeSearchText).join(" ");
  return haystack.includes(normalizeSearchText(filter));
}

function matchesMethod(item: PublicCatchForLiveData, filter: string) {
  if (!filter) return true;
  const haystack = [item.method, item.fishingGenre, item.tackleName, item.lure, item.rod, item.reel, item.tackle?.lureName, item.tackle?.lureColor]
    .map((value) => normalizeSearchText(value ?? ""))
    .join(" ");
  return haystack.includes(normalizeSearchText(filter));
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getMostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function getTimeRangeLabel(value: string) {
  const date = parseDate(value);
  if (!date) return "";
  const hourLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hour12: false
  }).format(date);
  const hour = Number(hourLabel.replace(/\D/g, ""));
  if (!Number.isFinite(hour)) return "";
  const start = Math.floor(hour / 2) * 2;
  const end = (start + 2) % 24;
  return `${start}:00〜${end}:00`;
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
