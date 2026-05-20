import type { LunarInfo } from "@/types";

const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);

export function getLunarInfo(caughtAt: string): LunarInfo {
  const date = new Date(caughtAt);
  const parts = new Intl.DateTimeFormat("ja-JP-u-ca-chinese", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).formatToParts(date) as Array<{ type: string; value: string }>;

  const relatedYear = parts.find((part) => part.type === "relatedYear")?.value ?? null;
  const yearName = parts.find((part) => part.type === "yearName")?.value ?? null;
  const monthLabel = parts.find((part) => part.type === "month")?.value ?? null;
  const day = Number(parts.find((part) => part.type === "day")?.value ?? NaN);
  const moonAge = getMoonAge(date);
  const moonPhase = Number((moonAge / SYNODIC_MONTH_DAYS).toFixed(3));

  return {
    lunarDateLabel: relatedYear && monthLabel && Number.isFinite(day) ? `旧暦${relatedYear}年 ${monthLabel}${day}日` : null,
    lunarYearName: yearName,
    lunarMonthLabel: monthLabel,
    lunarDay: Number.isFinite(day) ? day : null,
    moonAge,
    moonPhase,
    moonPhaseLabel: getMoonPhaseLabel(moonAge)
  };
}

export function emptyLunarInfo(): LunarInfo {
  return {
    lunarDateLabel: null,
    lunarYearName: null,
    lunarMonthLabel: null,
    lunarDay: null,
    moonAge: null,
    moonPhase: null,
    moonPhaseLabel: null
  };
}

function getMoonAge(date: Date) {
  const days = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86400000;
  const age = ((days % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  return Number(age.toFixed(1));
}

function getMoonPhaseLabel(moonAge: number) {
  if (moonAge < 1.5) return "新月";
  if (moonAge < 6.5) return "三日月";
  if (moonAge < 8.5) return "上弦";
  if (moonAge < 13.5) return "十三夜";
  if (moonAge < 16.5) return "満月";
  if (moonAge < 21.5) return "寝待月";
  if (moonAge < 23.5) return "下弦";
  if (moonAge < 28) return "有明月";
  return "新月前";
}
