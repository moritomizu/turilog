import type { Catch } from "@/types";

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

export function getShareOverlayData(item: Catch): ShareOverlayData {
  return {
    brand: "TSURILOGUE",
    fishType: item.fishType || "釣果",
    sizeLabel: Number.isFinite(item.sizeCm) && item.sizeCm > 0 ? `${item.sizeCm} cm` : "size unknown",
    dateLabel: formatDate(item.caughtAt),
    areaLabel: item.areaName || "Area private",
    methodLabel: getMethodLabel(item),
    lureLabel: item.lure || item.tackle.lureName || "",
    tackleLabel: item.tackleName || item.rod || item.tackle.rodName || "",
    tideLabel: item.tidePhaseLabel && item.tidePhaseLabel !== "潮位未取得" ? item.tidePhaseLabel : "",
    weatherLabel: item.weather.weatherLabel && item.weather.weatherLabel !== "天候未取得" ? item.weather.weatherLabel : "",
    waterTempLabel: item.seaTemperature.seaTemperatureC == null ? "" : `${item.seaTemperature.seaTemperatureC}℃`,
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

function getMethodLabel(item: Catch) {
  const genre = [item.tackleName, item.lure || item.tackle.lureName].filter(Boolean).join(" / ");
  return genre || "Fishing";
}

function hasCatchProof(item: Catch) {
  const level = item.verificationScore?.level;
  return level === "high" || level === "medium";
}

function getCatchProofLabel(item: Catch) {
  return hasCatchProof(item) ? "Catch Proof ✓" : "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unknown";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
