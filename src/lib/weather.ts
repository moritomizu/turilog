import type { WeatherInfo } from "@/types";

const WEATHER_SOURCE_NAME = "Open-Meteo";
const HOURLY = [
  "temperature_2m",
  "weather_code",
  "precipitation",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m"
].join(",");

type OpenMeteoHourly = {
  time?: string[];
  temperature_2m?: Array<number | null>;
  weather_code?: Array<number | null>;
  precipitation?: Array<number | null>;
  cloud_cover?: Array<number | null>;
  wind_speed_10m?: Array<number | null>;
  wind_direction_10m?: Array<number | null>;
  wind_gusts_10m?: Array<number | null>;
};

type OpenMeteoResponse = {
  hourly?: OpenMeteoHourly;
};

export async function fetchWeatherInfo(
  latitude: number | null,
  longitude: number | null,
  caughtAt: string
): Promise<WeatherInfo> {
  if (latitude == null || longitude == null || !caughtAt) return emptyWeatherInfo();

  const dateKey = toTokyoDateKey(caughtAt);
  const endpoint = getEndpoint(caughtAt);
  const url = new URL(endpoint);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", HOURLY);
  url.searchParams.set("timezone", "Asia/Tokyo");
  url.searchParams.set("start_date", dateKey);
  url.searchParams.set("end_date", dateKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`天候データの取得に失敗しました。HTTP ${response.status}`);
  }

  const json = (await response.json()) as OpenMeteoResponse;
  const index = findNearestHourIndex(json.hourly?.time ?? [], caughtAt);
  if (index < 0 || !json.hourly) return emptyWeatherInfo();

  const weatherCode = valueAt(json.hourly.weather_code, index);
  const windSpeedKmh = valueAt(json.hourly.wind_speed_10m, index);
  const windGustKmh = valueAt(json.hourly.wind_gusts_10m, index);
  const windDirectionDeg = valueAt(json.hourly.wind_direction_10m, index);

  return {
    weatherLabel: getWeatherLabel(weatherCode),
    weatherCode,
    temperatureC: valueAt(json.hourly.temperature_2m, index),
    precipitationMm: valueAt(json.hourly.precipitation, index),
    cloudCoverPercent: valueAt(json.hourly.cloud_cover, index),
    windSpeedMs: kmhToMs(windSpeedKmh),
    windDirectionDeg,
    windDirectionLabel: getWindDirectionLabel(windDirectionDeg),
    windGustMs: kmhToMs(windGustKmh),
    weatherSourceName: WEATHER_SOURCE_NAME,
    weatherSourceUrl: url.toString(),
    weatherFetchedAt: new Date().toISOString()
  };
}

export function emptyWeatherInfo(): WeatherInfo {
  return {
    weatherLabel: "天候未取得",
    weatherCode: null,
    temperatureC: null,
    precipitationMm: null,
    cloudCoverPercent: null,
    windSpeedMs: null,
    windDirectionDeg: null,
    windDirectionLabel: null,
    windGustMs: null,
    weatherSourceName: null,
    weatherSourceUrl: null,
    weatherFetchedAt: null
  };
}

function getEndpoint(caughtAt: string) {
  const caught = new Date(caughtAt);
  const now = new Date();
  const daysFromNow = (caught.getTime() - now.getTime()) / 86400000;
  if (daysFromNow >= -7 && daysFromNow <= 16) return "https://api.open-meteo.com/v1/forecast";
  return "https://archive-api.open-meteo.com/v1/archive";
}

function findNearestHourIndex(times: string[], caughtAt: string) {
  if (!times.length) return -1;
  const target = toTokyoWallClockMs(caughtAt);
  let nearestIndex = 0;
  let nearestDiff = Infinity;

  times.forEach((time, index) => {
    const diff = Math.abs(parseOpenMeteoTokyoTime(time) - target);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function toTokyoDateKey(value: string) {
  const parts = getTokyoParts(value);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function toTokyoWallClockMs(value: string) {
  const parts = getTokyoParts(value);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

function parseOpenMeteoTokyoTime(value: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute = 0] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

function getTokyoParts(value: string) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(value));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
    hour: Number(parts.find((part) => part.type === "hour")?.value),
    minute: Number(parts.find((part) => part.type === "minute")?.value)
  };
}

function valueAt(values: Array<number | null> | undefined, index: number) {
  const value = values?.[index];
  return typeof value === "number" ? value : null;
}

function kmhToMs(value: number | null) {
  return value == null ? null : Number((value / 3.6).toFixed(1));
}

function getWindDirectionLabel(degrees: number | null) {
  if (degrees == null) return null;
  const labels = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
  return labels[Math.round(degrees / 22.5) % 16];
}

function getWeatherLabel(code: number | null) {
  if (code == null) return "天候未取得";
  if (code === 0) return "快晴";
  if ([1, 2].includes(code)) return "晴れ";
  if (code === 3) return "くもり";
  if ([45, 48].includes(code)) return "霧";
  if ([51, 53, 55, 56, 57].includes(code)) return "霧雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return `天候コード${code}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
