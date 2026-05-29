import type { AppLocale } from "@/lib/i18n";

export function formatLocaleDate(value: string | Date, locale: AppLocale, options: Intl.DateTimeFormatOptions = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return locale === "en" ? "Unknown" : "未取得";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  }).format(date);
}

export function formatLocaleNumber(value: number, locale: AppLocale, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "ja-JP", options).format(value);
}

export function formatCentimeters(value: number, locale: AppLocale) {
  return `${formatLocaleNumber(value, locale, { maximumFractionDigits: 1 })} cm`;
}

export function formatMetersPerSecond(value: number, locale: AppLocale) {
  return `${formatLocaleNumber(value, locale, { maximumFractionDigits: 1 })} m/s`;
}
