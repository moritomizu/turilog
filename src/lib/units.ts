import type { AppLocale } from "@/lib/i18n";
import type { UnitSystem } from "@/types";

export function getDefaultUnitSystem(locale: AppLocale): UnitSystem {
  return locale === "en" ? "imperial" : "metric";
}

export function formatLengthFromCm(value: number, locale: AppLocale, unitSystem: UnitSystem = getDefaultUnitSystem(locale)) {
  if (!Number.isFinite(value)) return locale === "en" ? "Size unknown" : "サイズ不明";
  if (unitSystem === "imperial") {
    const inches = value / 2.54;
    return `${formatNumber(inches, locale, { maximumFractionDigits: 1 })} in`;
  }
  return `${formatNumber(value, locale, { maximumFractionDigits: 1 })} cm`;
}

export function formatTemperatureFromCelsius(value: number, locale: AppLocale, unitSystem: UnitSystem = getDefaultUnitSystem(locale)) {
  if (!Number.isFinite(value)) return "";
  if (unitSystem === "imperial") {
    const fahrenheit = value * 1.8 + 32;
    return `${formatNumber(fahrenheit, locale, { maximumFractionDigits: 1 })}℉`;
  }
  return `${formatNumber(value, locale, { maximumFractionDigits: 1 })}℃`;
}

export function formatNumber(value: number, locale: AppLocale, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "ja-JP", options).format(value);
}
