import type { AppLocale } from "@/lib/i18n";
import type { Catch, TideDirection, TidePhase, WeatherInfo } from "@/types";

const weatherLabels: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail"
};

const compassLabels = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function getWeatherDisplayLabel(weather: WeatherInfo, locale: AppLocale) {
  if (locale === "ja") return weather.weatherLabel || "未取得";
  if (weather.weatherCode != null) return weatherLabels[weather.weatherCode] ?? `Weather code ${weather.weatherCode}`;
  if (!weather.weatherLabel || weather.weatherLabel === "天候未取得") return "Unknown";
  return translateKnownWeatherLabel(weather.weatherLabel);
}

export function getWindDirectionDisplayLabel(weather: WeatherInfo, locale: AppLocale) {
  if (locale === "ja") return weather.windDirectionLabel ?? "";
  if (weather.windDirectionDeg != null) return compassLabels[Math.round(weather.windDirectionDeg / 22.5) % 16];
  return translateKnownWindLabel(weather.windDirectionLabel ?? "");
}

export function getTidePhaseDisplayLabel(item: Pick<Catch, "tideDirection" | "tidePhase" | "tidePhaseLabel">, locale: AppLocale) {
  if (locale === "ja") return item.tidePhaseLabel || "未取得";
  const structured = formatTidePhase(item.tideDirection, item.tidePhase);
  if (structured) return structured;
  const stored = item.tidePhaseLabel?.trim();
  if (!stored || stored === "潮位未取得" || stored === "潮未取得" || stored === "潮位取得中") return "Unknown";
  if (stored === "潮止まり付近") return "Near slack tide";
  const match = stored.match(/^(上げ|下げ)(\d+)分$/);
  if (match) return `${match[1] === "上げ" ? "Rising" : "Falling"} tide ${match[2]}/10`;
  return stored;
}

function formatTidePhase(direction: TideDirection, phase: TidePhase | null) {
  if (direction === "unknown") return "";
  if (!phase) return "Near slack tide";
  return `${direction === "rising" ? "Rising" : "Falling"} tide ${phase}/10`;
}

function translateKnownWeatherLabel(label: string) {
  const known: Record<string, string> = {
    快晴: "Clear sky",
    晴れ: "Mostly clear",
    くもり: "Overcast",
    霧: "Fog",
    霧雨: "Drizzle",
    雨: "Rain",
    雪: "Snow",
    雷雨: "Thunderstorm"
  };
  const code = label.match(/^天候コード(\d+)$/)?.[1];
  if (code) return `Weather code ${code}`;
  return known[label] ?? label;
}

function translateKnownWindLabel(label: string) {
  const japanese = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
  const index = japanese.indexOf(label);
  return index >= 0 ? compassLabels[index] : label;
}
