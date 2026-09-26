"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { useState } from "react";
import { CatchVerificationPanel } from "@/components/CatchVerificationPanel";
import { getVerificationFlagLabel, getVerificationScoreLabel } from "@/lib/catchVerification";
import { type AppLocale } from "@/lib/i18n";
import { formatLengthFromCm, formatTemperatureFromCelsius, getDefaultUnitSystem } from "@/lib/units";
import type { Catch, ProofFlag, UnitSystem } from "@/types";

export function CatchCard({ item, rank, mapPinNumber, onMapPinClick, unitSystem }: { item: Catch; rank?: number; mapPinNumber?: number | null; onMapPinClick?: () => void; unitSystem?: UnitSystem }) {
  const locale = useLocale() as AppLocale;
  const displayUnitSystem = unitSystem ?? getDefaultUnitSystem(locale);
  const [showTideHelp, setShowTideHelp] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  return (
    <article className="overflow-hidden rounded border border-teal-100 bg-white shadow-soft">
      <div className="relative aspect-[4/3] bg-teal-50">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.fishType} fill className="object-cover" sizes="(max-width: 768px) 100vw, 360px" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">{tr(locale, "No photo", "写真なし")}</div>
        )}
        {rank ? <span className="absolute left-3 top-3 rounded bg-coral px-3 py-1 text-sm font-black text-white">#{rank}</span> : null}
        {mapPinNumber ? (
          <button
            type="button"
            onClick={onMapPinClick}
            className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 p-1.5 shadow-soft ring-2 ring-white"
            aria-label={tr(locale, "Show this catch on the map", "地図でこの釣果ポイントを表示")}
          >
            <img src="/icons/group-map-link.png" alt="" className="h-full w-full object-contain" />
          </button>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{item.fishType}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{formatDate(item.caughtAt, locale)}</p>
          </div>
          <p className="shrink-0 text-2xl font-black text-water">{formatLengthFromCm(item.sizeCm, locale, displayUnitSystem)}</p>
        </div>
        {item.comment ? <p className="text-sm leading-6 text-slate-700">{item.comment}</p> : null}
        {hasTackle(item) ? (
          <div className="rounded bg-foam p-3 text-sm leading-6">
            <p className="text-xs font-bold text-slate-500">{tr(locale, "Tackle", "タックル")}</p>
            {item.tackleName ? <p className="font-black text-water">{item.tackleName}</p> : null}
            {item.tackle.lureName ? <p className="font-bold">{tr(locale, "Lure / bait", "ルアー")}: {item.tackle.lureName}{item.tackle.lureColor ? ` / ${item.tackle.lureColor}` : ""}</p> : null}
            {item.tackle.rodName ? <p>{tr(locale, "Rod", "ロッド")}: {item.tackle.rodName}</p> : null}
            {item.tackle.reelName ? <p>{tr(locale, "Reel", "リール")}: {item.tackle.reelName}</p> : null}
            {item.tackle.lineName || item.tackle.leaderName ? <p>{tr(locale, "Line", "ライン")}: {[item.tackle.lineName, item.tackle.leaderName].filter(Boolean).join(" / ")}</p> : null}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label={tr(locale, "Fishing area", "ポイント")} value={formatPoint(item, locale)} />
          <Info label={tr(locale, "Weather", "当時の天候")} value={item.weather.weatherLabel || tr(locale, "Unknown", "未取得")} />
          <Info label={tr(locale, "Wind", "当時の風")} value={formatWind(item, locale)} />
          <Info label={tr(locale, "Air temperature", "当時の気温")} value={item.weather.temperatureC == null ? tr(locale, "Unknown", "未取得") : formatTemperatureFromCelsius(item.weather.temperatureC, locale, displayUnitSystem)} />
          <Info label={tr(locale, "Water temperature", "当時の水温")} value={formatSeaTemperature(item, locale, displayUnitSystem)} />
          <Info label={tr(locale, "Lunar date / moon age", "旧暦/月齢")} value={formatLunar(item, locale)} />
          <Info label={tr(locale, "Tide cycle", "潮回り")} value={formatTideCycle(item, locale)} />
          <Info
            label={tr(locale, "Tide", "潮")}
            value={item.tidePhaseLabel || tr(locale, "Unknown", "未取得")}
            action={
              <button
                type="button"
                onClick={() => setShowTideHelp((value) => !value)}
                className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-black text-slate-600"
                aria-expanded={showTideHelp}
              >
                ?
              </button>
            }
          />
        </div>
        {showTideHelp ? <TideHelp locale={locale} /> : null}
        {item.officialCurrentCurveUrl ? (
          <a
            href={item.officialCurrentCurveUrl}
            target="_blank"
            rel="noreferrer"
            className="tap-target flex items-center justify-center rounded border border-coral px-4 py-3 text-sm font-black text-coral"
          >
            {locale === "en" ? "View official current chart" : item.officialCurrentDate ? `${item.officialCurrentDate}の潮流曲線を見る` : "海上保安庁の潮流曲線を見る"}
          </a>
        ) : null}
        {item.officialCurrentStationName ? (
          <p className="text-xs font-bold text-slate-500">
            {tr(locale, "Current reference station", "潮流参照地点")}: {item.officialCurrentStationName}
          </p>
        ) : null}
        {item.verificationScore ? (
          <VerificationSummary item={item} locale={locale} open={showVerification} onToggle={() => setShowVerification((value) => !value)} />
        ) : null}
      </div>
    </article>
  );
}

function VerificationSummary({ item, locale, open, onToggle }: { item: Catch; locale: AppLocale; open: boolean; onToggle: () => void }) {
  const [showHelp, setShowHelp] = useState(false);
  const score = item.verificationScore;
  if (!score) return null;
  const total = score.total ?? score.totalScore ?? 0;
  const concernFlags = getConcernFlags(score.flags ?? []);
  const levelClass = getVerificationTone(score.level);
  const topConcerns = concernFlags.slice(0, 2).map(getVerificationFlagLabel);

  return (
    <section className="border-t border-slate-100 pt-3">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="tap-target flex min-w-0 flex-1 items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-left"
          aria-expanded={open}
        >
          <div>
            <p className="text-[11px] font-black text-slate-500">{tr(locale, "CATCH PROOF β", "釣果デジタル証明β")}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-600">
              {concernFlags.length ? tr(locale, `${concernFlags.length} items to review`, `確認事項 ${concernFlags.length}件`) : tr(locale, "No major concerns", "大きな確認事項なし")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${levelClass}`}>{getVerificationScoreLabel(score)}</span>
            <span className="text-sm font-black text-slate-600">{total}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="flex w-10 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-sm font-black text-slate-600"
          aria-label={tr(locale, "About Catch Proof", "釣果デジタル証明βの説明を見る")}
        >
          ?
        </button>
      </div>
      {showHelp ? <VerificationHelpDialog locale={locale} onClose={() => setShowHelp(false)} /> : null}
      {!open && topConcerns.length ? (
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          {topConcerns.join(" / ")}
        </p>
      ) : null}
      {open ? (
        <div className="mt-3">
          <CatchVerificationPanel item={item} compact />
        </div>
      ) : null}
    </section>
  );
}

function VerificationHelpDialog({ locale, onClose }: { locale: AppLocale; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-5 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="verification-help-title">
      <section className="w-full max-w-md rounded border border-teal-100 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-water">{tr(locale, "ABOUT THIS FEATURE", "機能説明")}</p>
            <h2 id="verification-help-title" className="mt-1 text-xl font-black text-ink">{tr(locale, "Catch Proof β", "釣果デジタル証明β")}</h2>
          </div>
          <button type="button" onClick={onClose} className="tap-target rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-600" aria-label={tr(locale, "Close", "閉じる")}>
            ×
          </button>
        </div>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-700">
          {tr(locale, "Catch Proof provides a reference score based on available photo, location, time, tide, measurement, and tournament data.", "写真・位置情報・時刻・潮位・大会条件などをもとに、釣果の信頼性を参考スコアとして表示します。")}
        </p>
        <div className="mt-4 rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">
          <p className="text-xs font-black text-slate-500">{tr(locale, "How to read it", "見方")}</p>
          <p className="mt-1">{tr(locale, "A higher score means more supporting information is available. Review items point to missing or inconsistent details.", "スコアが高いほど記録情報がそろっています。確認事項がある場合は、写真・位置情報・サイズ確認・大会条件などを見直す目安になります。")}</p>
        </div>
        <p className="mt-4 text-xs font-bold leading-5 text-slate-500">
          {tr(locale, "This score does not guarantee authenticity. It is reference information intended to support review and tournament operations.", "このスコアは釣果の真正性を完全に保証するものではありません。大会運営や確認作業を補助するための参考情報です。")}
        </p>
        <button type="button" onClick={onClose} className="tap-target mt-4 w-full rounded bg-water px-4 py-3 font-black text-white">
          {tr(locale, "Close", "閉じる")}
        </button>
      </section>
    </div>
  );
}

function TideHelp({ locale }: { locale: AppLocale }) {
  return (
    <div className="rounded border border-sky-100 bg-sky-50 p-3 text-xs font-bold leading-5 text-slate-700">
      <p className="font-black text-sky-800">{tr(locale, "Tide phase calculation", "潮の計算")}</p>
      <p className="mt-1">{tr(locale, "The interval between the previous and next high or low tide is divided into ten phases.", "前回の満潮/干潮から次回の潮止まりまでを10等分し、釣った時刻の位置を表示しています。")}</p>
      <p className="mt-1">{tr(locale, "A rising tide moves from low to high tide; a falling tide moves from high to low tide.", "干潮から満潮へ向かう時は上げ、満潮から干潮へ向かう時は下げです。")}</p>
    </div>
  );
}

function formatPoint(item: Catch, locale: AppLocale) {
  if (item.pointName && item.areaName) return `${item.pointName}(${item.areaName})`;
  if (item.pointName) return item.pointName;
  if (item.areaName) return item.areaName;
  if (item.officialCurrentStationName) return item.officialCurrentStationName;
  if (item.latitude != null) return `${item.latitude.toFixed(4)}, ${item.longitude?.toFixed(4)}`;
  return tr(locale, "Unknown", "未取得");
}

function formatSeaTemperature(item: Catch, locale: AppLocale, unitSystem: UnitSystem) {
  if (item.seaTemperature.seaTemperatureC == null) return item.seaTemperature.seaTemperatureAreaName ?? tr(locale, "Unknown", "未取得");
  const date = item.seaTemperature.seaTemperatureDate ? ` ${item.seaTemperature.seaTemperatureDate}` : "";
  return `${formatTemperatureFromCelsius(item.seaTemperature.seaTemperatureC, locale, unitSystem)} (${item.seaTemperature.seaTemperatureAreaName ?? tr(locale, "Area unknown", "海域未取得")}${date})`;
}

function hasTackle(item: Catch) {
  return Boolean(item.tackleName) || Object.values(item.tackle).some(Boolean);
}

function formatWind(item: Catch, locale: AppLocale) {
  if (item.weather.windSpeedMs == null) return tr(locale, "Unknown", "未取得");
  const direction = item.weather.windDirectionLabel ? `${item.weather.windDirectionLabel} ` : "";
  return `${direction}${item.weather.windSpeedMs}m/s`;
}

function formatLunar(item: Catch, locale: AppLocale) {
  if (!item.lunar.lunarDateLabel && item.lunar.moonAge == null) return tr(locale, "Unknown", "未取得");
  const moonAge = item.lunar.moonAge == null ? "" : tr(locale, `Moon age ${item.lunar.moonAge}`, `月齢${item.lunar.moonAge}`);
  return [item.lunar.lunarDateLabel, moonAge].filter(Boolean).join(" / ");
}

function formatTideCycle(item: Catch, locale: AppLocale) {
  const lunarDay = item.lunar.lunarDay;
  if (lunarDay != null) return getTideCycleByLunarDay(lunarDay, locale);

  const moonAge = item.lunar.moonAge;
  if (moonAge == null) return tr(locale, "Unknown", "未取得");
  const estimatedLunarDay = Math.max(1, Math.min(30, Math.round(moonAge) + 1));
  return `${getTideCycleByLunarDay(estimatedLunarDay, locale)}${tr(locale, " (estimated)", "目安")}`;
}

function getTideCycleByLunarDay(lunarDay: number, locale: AppLocale) {
  const day = ((Math.round(lunarDay) - 1) % 30) + 1;
  if ([1, 2, 3, 15, 16, 17].includes(day)) return tr(locale, "Spring tide", "大潮");
  if ([7, 8, 9, 22, 23, 24].includes(day)) return tr(locale, "Neap tide", "小潮");
  if ([10, 25].includes(day)) return tr(locale, "Long tide", "長潮");
  if ([11, 26].includes(day)) return tr(locale, "Young tide", "若潮");
  return tr(locale, "Medium tide", "中潮");
}

function getConcernFlags(flags: ProofFlag[]) {
  return flags.filter((flag) =>
    flag.startsWith("missing_") ||
    flag.startsWith("low_") ||
    flag.includes("mismatch") ||
    flag.includes("suspected") ||
    flag.includes("out_of_period") ||
    flag.includes("manual") ||
    flag.includes("far_from") ||
    flag.includes("missing")
  );
}

function getVerificationTone(level: string) {
  if (level === "high" || level === "highTrust") return "bg-emerald-100 text-emerald-700";
  if (level === "medium" || level === "strong" || level === "standard") return "bg-sky-100 text-sky-700";
  if (level === "low" || level === "basic") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function Info({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="rounded bg-foam p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        {action}
      </div>
      <p className="mt-1 break-words font-bold text-ink">{value}</p>
    </div>
  );
}

export function formatDate(value: string | null | undefined, locale: AppLocale = "ja") {
  if (!value) return tr(locale, "Date unknown", "日時未設定");
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    year: "numeric",
    month: locale === "en" ? "short" : "2-digit",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function tr(locale: AppLocale, english: string, japanese: string) {
  return locale === "en" ? english : japanese;
}
