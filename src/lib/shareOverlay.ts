import type { Catch } from "@/types";
import type { AppLocale } from "@/lib/i18n";
import type { UnitSystem } from "@/types";
import { getFishSpeciesLabel } from "@/lib/fishingDictionary";
import { formatLengthFromCm, formatTemperatureFromCelsius, getDefaultUnitSystem } from "@/lib/units";

export type ShareOverlayTemplate = "simple" | "catch" | "data";
export type ShareOverlayFormat = "story" | "feed" | "square";

export type ShareOverlayData = {
  brand: string;
  fishType: string;
  sizeLabel: string;
  dateLabel: string;
  areaLabel: string;
  methodLabel: string;
  lureLabel: string;
  tackleLabel: string;
  tideLabel: string;
  weatherLabel: string;
  waterTempLabel: string;
  catchProofLabel: string;
  hasCatchProof: boolean;
};

export type ShareOverlayOptions = {
  locale?: AppLocale;
  unitSystem?: UnitSystem;
};

export const shareOverlayTemplates: Array<{ key: ShareOverlayTemplate; label: string; description: string }> = [
  { key: "simple", label: "SIMPLE", description: "ロゴと主要データだけを控えめに表示" },
  { key: "catch", label: "CATCH", description: "魚種とサイズを大きく見せる写真向け" },
  { key: "data", label: "DATA", description: "潮・水温・タックルも入れる記録向け" }
];

export const shareOverlayFormats: Array<{ key: ShareOverlayFormat; label: string; width: number; height: number }> = [
  { key: "story", label: "Story 9:16", width: 1080, height: 1920 },
  { key: "feed", label: "Feed 4:5", width: 1080, height: 1350 },
  { key: "square", label: "Square 1:1", width: 1080, height: 1080 }
];

export function getShareOverlayData(item: Catch, options: ShareOverlayOptions = {}): ShareOverlayData {
  const locale = options.locale ?? "ja";
  const unitSystem = options.unitSystem ?? getDefaultUnitSystem(locale);
  const locationParts = [item.boatName, item.areaName].filter(Boolean);
  const areaLabel = locationParts.length ? locationParts.join("　") : locale === "en" ? "Area private" : "エリア非公開";
  return {
    brand: "TSURILOGUE",
    fishType: getFishSpeciesLabel(item.fishType, locale),
    sizeLabel: Number.isFinite(item.sizeCm) && item.sizeCm > 0 ? formatLengthFromCm(item.sizeCm, locale, unitSystem) : locale === "en" ? "size unknown" : "サイズ不明",
    dateLabel: formatDate(item.caughtAt, locale),
    areaLabel,
    methodLabel: getMethodLabel(item, locale),
    lureLabel: item.lure || item.tackle.lureName || "",
    tackleLabel: item.tackleName || item.rod || item.tackle.rodName || "",
    tideLabel: item.tidePhaseLabel && item.tidePhaseLabel !== "潮位未取得" ? item.tidePhaseLabel : "",
    weatherLabel: item.weather.weatherLabel && item.weather.weatherLabel !== "天候未取得" ? item.weather.weatherLabel : "",
    waterTempLabel: item.seaTemperature.seaTemperatureC == null ? "" : formatTemperatureFromCelsius(item.seaTemperature.seaTemperatureC, locale, unitSystem),
    catchProofLabel: getCatchProofLabel(item),
    hasCatchProof: hasCatchProof(item)
  };
}

export function getFormatSize(format: ShareOverlayFormat) {
  return shareOverlayFormats.find((item) => item.key === format) ?? shareOverlayFormats[0];
}

export function getTemplateLabel(template: ShareOverlayTemplate) {
  return shareOverlayTemplates.find((item) => item.key === template)?.label ?? "SIMPLE";
}

function getMethodLabel(item: Catch, locale: AppLocale) {
  const genre = [item.tackleName, item.lure || item.tackle.lureName].filter(Boolean).join(" / ");
  return genre || (locale === "en" ? "Fishing" : "釣り");
}

function hasCatchProof(item: Catch) {
  const level = item.verificationScore?.level;
  return level === "high" || level === "medium";
}

function getCatchProofLabel(item: Catch) {
  return hasCatchProof(item) ? "Catch Proof ✓" : "";
}

function formatDate(value: string, locale: AppLocale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return locale === "en" ? "Date unknown" : "日時不明";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
