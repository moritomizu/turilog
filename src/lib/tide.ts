import type { TideDirection, TideInfo, TidePhase, TideType } from "@/types";

type TideExtreme = {
  time: string;
  height: number | null;
  type: TideType;
};

export type TideApiResult = {
  currentHeight: number | null;
  extremes: TideExtreme[];
  stationName: string | null;
  stationDistance: number | null;
  provider: TideInfo["tideApiProvider"];
};

export const emptyTideInfo: TideInfo = {
  tideHeight: null,
  tideDirection: "unknown",
  tidePhase: null,
  tidePhaseLabel: "潮位未取得",
  previousTideTime: null,
  previousTideType: "unknown",
  nextTideTime: null,
  nextTideType: "unknown",
  minutesToNextTide: null,
  tideStationName: null,
  tideStationDistance: null,
  tideApiProvider: "none"
};

export async function fetchTideInfo(
  latitude: number | null,
  longitude: number | null,
  caughtAt: string
): Promise<TideInfo> {
  if (latitude == null || longitude == null || !caughtAt) return emptyTideInfo;

  const response = await fetch("/api/tide", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ latitude, longitude, caughtAt })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `潮位APIでエラーが発生しました。HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchTideInfoFromProvider(
  latitude: number,
  longitude: number,
  caughtAt: string
): Promise<TideInfo> {
  const provider = process.env.TIDE_API_PROVIDER ?? "stormglass";
  const apiResult =
    provider === "worldtides"
      ? await fetchWorldTides(latitude, longitude, caughtAt)
      : await fetchStormglass(latitude, longitude, caughtAt);

  return calculateTideInfo(apiResult, caughtAt);
}

export function calculateTideInfo(apiResult: TideApiResult, caughtAt: string): TideInfo {
  const currentTime = new Date(caughtAt).getTime();
  const sorted = apiResult.extremes
    .filter((item) => item.time && item.type !== "unknown")
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const previous = [...sorted].reverse().find((item) => new Date(item.time).getTime() <= currentTime);
  const next = sorted.find((item) => new Date(item.time).getTime() > currentTime);

  if (!previous || !next) {
    return {
      ...emptyTideInfo,
      tideHeight: apiResult.currentHeight,
      tideStationName: apiResult.stationName,
      tideStationDistance: apiResult.stationDistance,
      tideApiProvider: apiResult.provider
    };
  }

  const previousTime = new Date(previous.time).getTime();
  const nextTime = new Date(next.time).getTime();
  const duration = nextTime - previousTime;
  const elapsed = currentTime - previousTime;
  const ratio = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;
  const phase = Math.min(10, Math.max(0, Math.round(ratio * 10))) as TidePhase;
  const direction = getDirection(previous.type, next.type);
  const minutesToNextTide = Math.max(0, Math.round((nextTime - currentTime) / 60000));

  return {
    tideHeight: apiResult.currentHeight,
    tideDirection: direction,
    tidePhase: phase,
    tidePhaseLabel: getPhaseLabel(direction, phase),
    previousTideTime: previous.time,
    previousTideType: previous.type,
    nextTideTime: next.time,
    nextTideType: next.type,
    minutesToNextTide,
    tideStationName: apiResult.stationName,
    tideStationDistance: apiResult.stationDistance,
    tideApiProvider: apiResult.provider
  };
}

function getDirection(previousType: TideType, nextType: TideType): TideDirection {
  if (previousType === "low" && nextType === "high") return "rising";
  if (previousType === "high" && nextType === "low") return "falling";
  return "unknown";
}

function getPhaseLabel(direction: TideDirection, phase: TidePhase | null) {
  if (!phase || direction === "unknown") return "潮止まり付近";
  return `${direction === "rising" ? "上げ" : "下げ"}${phase}分`;
}

async function fetchStormglass(latitude: number, longitude: number, caughtAt: string): Promise<TideApiResult> {
  const apiKey = process.env.STORMGLASS_API_KEY;
  if (!apiKey) throw new Error("Stormglass APIキーが未設定です。STORMGLASS_API_KEYを確認してください。");

  const target = new Date(caughtAt);
  const start = new Date(target.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const end = new Date(target.getTime() + 36 * 60 * 60 * 1000).toISOString();
  const url = new URL("https://api.stormglass.io/v2/tide/extremes/point");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lng", String(longitude));
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);

  const extremesResponse = await fetch(url.toString(), {
    headers: { Authorization: apiKey }
  });

  if (!extremesResponse.ok) {
    throw new Error(`Stormglassの潮位APIでエラーが発生しました。HTTP ${extremesResponse.status}`);
  }

  const extremesJson = await extremesResponse.json();
  const extremes: TideExtreme[] = (extremesJson.data ?? []).map((item: { time: string; height?: number; type: string }) => ({
    time: item.time,
    height: typeof item.height === "number" ? item.height : null,
    type: normalizeTideType(item.type)
  }));

  const nearest = findInterpolatedHeight(extremes, target.getTime());

  return {
    currentHeight: nearest,
    extremes,
    stationName: extremesJson.meta?.station?.name ?? "Stormglass nearest station",
    stationDistance: typeof extremesJson.meta?.station?.distance === "number" ? extremesJson.meta.station.distance : null,
    provider: "stormglass"
  };
}

async function fetchWorldTides(latitude: number, longitude: number, caughtAt: string): Promise<TideApiResult> {
  const apiKey = process.env.WORLDTIDES_API_KEY;
  if (!apiKey) throw new Error("WorldTides APIキーが未設定です。WORLDTIDES_API_KEYを確認してください。");

  const target = Math.floor(new Date(caughtAt).getTime() / 1000);
  const url = new URL("https://www.worldtides.info/api/v3");
  url.searchParams.set("heights", "");
  url.searchParams.set("extremes", "");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("start", String(target - 36 * 60 * 60));
  url.searchParams.set("length", String(72 * 60 * 60));
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`WorldTidesの潮位APIでエラーが発生しました。HTTP ${response.status}`);
  }

  const json = await response.json();
  const extremes: TideExtreme[] = (json.extremes ?? []).map((item: { dt: number; height?: number; type: string }) => ({
    time: new Date(item.dt * 1000).toISOString(),
    height: typeof item.height === "number" ? item.height : null,
    type: normalizeTideType(item.type)
  }));
  const nearestHeight = findNearestHeight(json.heights ?? [], target);

  return {
    currentHeight: nearestHeight,
    extremes,
    stationName: json.station ?? json.responseStation ?? "WorldTides nearest station",
    stationDistance: typeof json.stationDistance === "number" ? json.stationDistance : null,
    provider: "worldtides"
  };
}

function normalizeTideType(type: string): TideType {
  const value = type.toLowerCase();
  if (value.includes("high")) return "high";
  if (value.includes("low")) return "low";
  return "unknown";
}

function findNearestHeight(heights: Array<{ dt: number; height?: number }>, targetSeconds: number) {
  const nearest = heights
    .filter((item) => typeof item.height === "number")
    .sort((a, b) => Math.abs(a.dt - targetSeconds) - Math.abs(b.dt - targetSeconds))[0];
  return nearest?.height ?? null;
}

function findInterpolatedHeight(extremes: TideExtreme[], targetTime: number) {
  const before = [...extremes].reverse().find((item) => new Date(item.time).getTime() <= targetTime && item.height != null);
  const after = extremes.find((item) => new Date(item.time).getTime() > targetTime && item.height != null);
  if (!before || !after || before.height == null || after.height == null) return before?.height ?? after?.height ?? null;

  const beforeTime = new Date(before.time).getTime();
  const afterTime = new Date(after.time).getTime();
  const ratio = (targetTime - beforeTime) / (afterTime - beforeTime);
  return Number((before.height + (after.height - before.height) * ratio).toFixed(2));
}
