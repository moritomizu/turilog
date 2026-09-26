"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";
import { getPublicCatch } from "@/lib/catches";
import { isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase";
import { type AppLocale } from "@/lib/i18n";
import { formatLengthFromCm, formatTemperatureFromCelsius, getDefaultUnitSystem } from "@/lib/units";
import type { Catch, UnitSystem } from "@/types";

type ShareMode = "standard" | "data" | "tackle";

export default function EmbedCatchPage({ params }: { params: { id: string } }) {
  const locale = useLocale() as AppLocale;
  const unitSystem = getDefaultUnitSystem(locale);
  const [item, setItem] = useState<Catch | null>(null);
  const [message, setMessage] = useState(tr(locale, "Loading catch...", "釣果を読み込んでいます。"));
  const [mode, setMode] = useState<ShareMode>("standard");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setMessage(locale === "en" ? `Firebase configuration is missing: ${missingFirebaseEnv.join(", ")}` : `Firebase設定が不足しています: ${missingFirebaseEnv.join(", ")}`);
      return;
    }

    getPublicCatch(params.id)
      .then((result) => {
        setItem(result);
        setMessage(result ? "" : tr(locale, "This catch is private or could not be found.", "この釣果は公開されていないか、見つかりませんでした。"));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : tr(locale, "Could not load this catch.", "釣果を読み込めませんでした。")));
  }, [locale, params.id]);

  return (
    <main className="min-h-[100svh] bg-foam px-3 py-3">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-md flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <BackButton locale={locale} />
          {item ? <ShareModeTabs locale={locale} mode={mode} onChange={setMode} /> : null}
        </div>
        {item ? <ShareCatchCard item={item} mode={mode} locale={locale} unitSystem={unitSystem} /> : <Notice message={message} />}
      </div>
    </main>
  );
}

function ShareCatchCard({ item, mode, locale, unitSystem }: { item: Catch; mode: ShareMode; locale: AppLocale; unitSystem: UnitSystem }) {
  const anglerName = item.publicAnglerName?.trim() || "TSURILOGUE Angler";
  const infoItems = getShareInfoItems(item, mode, locale, unitSystem);
  return (
    <article className="flex flex-1 flex-col overflow-hidden rounded border border-teal-100 bg-white shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-teal-50 px-4 py-3">
        <TsuriLogLogo className="h-7 w-28 max-w-[42vw]" />
        <p className="rounded-full bg-foam px-3 py-1 text-[11px] font-black text-water">{getModeLabel(mode)}</p>
      </div>

      <div className="relative bg-slate-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.fishType} className="h-[52svh] min-h-[295px] w-full object-cover" />
        ) : (
          <div className="flex h-[52svh] min-h-[295px] items-center justify-center text-sm font-bold text-slate-500">{tr(locale, "No photo", "写真なし")}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/75">Catch record</p>
              <h1 className="mt-1 truncate text-3xl font-black leading-tight">{item.fishType}</h1>
              <p className="mt-1 text-sm font-bold text-white/90">{formatDate(item.caughtAt, locale)}</p>
            </div>
            <p className="shrink-0 text-3xl font-black leading-none">{formatLengthFromCm(item.sizeCm, locale, unitSystem)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-water text-sm font-black text-white">
            {item.publicAnglerAvatarUrl ? <img src={item.publicAnglerAvatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(anglerName)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-500">{tr(locale, "Angler", "釣った人")}</p>
            <p className="truncate text-base font-black text-ink">{anglerName}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          {infoItems.map((info) => (
            <MiniInfo key={`${info.label}-${info.value}`} label={info.label} value={info.value} />
          ))}
        </div>

        {item.comment ? <p className="line-clamp-2 rounded bg-foam px-3 py-2 text-xs font-bold leading-5 text-slate-700">{item.comment}</p> : null}
      </div>
    </article>
  );
}

function ShareModeTabs({ mode, onChange, locale }: { mode: ShareMode; onChange: (mode: ShareMode) => void; locale: AppLocale }) {
  const items: Array<{ mode: ShareMode; label: string }> = [
    { mode: "standard", label: tr(locale, "Standard", "標準") },
    { mode: "data", label: tr(locale, "Data", "データ") },
    { mode: "tackle", label: tr(locale, "Tackle", "タックル") }
  ];
  return (
    <div className="flex rounded bg-white p-1 shadow-soft" aria-label={tr(locale, "Share card display", "シェアカード表示設定")}>
      {items.map((item) => (
        <button
          key={item.mode}
          type="button"
          onClick={() => onChange(item.mode)}
          className={`rounded px-2.5 py-1.5 text-[11px] font-black ${mode === item.mode ? "bg-water text-white" : "text-slate-600"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-foam px-1.5 py-2">
      <p className="text-[10px] font-black text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black text-ink">{value}</p>
    </div>
  );
}

function BackButton({ locale }: { locale: AppLocale }) {
  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = `/${locale}/catches`;
  }

  return (
    <button type="button" onClick={handleBack} className="tap-target inline-flex w-fit items-center rounded bg-white px-3 py-2 text-xs font-black text-water shadow-soft">
      ← {tr(locale, "Back", "戻る")}
    </button>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <section className="rounded border border-teal-100 bg-white p-4 text-sm font-bold leading-6 text-slate-700 shadow-soft">
      {message}
    </section>
  );
}

function formatDate(value: string, locale: AppLocale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return tr(locale, "Date unknown", "日時未取得");
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", { year: "numeric", month: locale === "en" ? "short" : "2-digit", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function getInitial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "T";
}

function getModeLabel(mode: ShareMode) {
  if (mode === "data") return "DATA LOG";
  if (mode === "tackle") return "TACKLE LOG";
  return "FISHING LOG";
}

function getShareInfoItems(item: Catch, mode: ShareMode, locale: AppLocale, unitSystem: UnitSystem) {
  const unknown = tr(locale, "Unknown", "未取得");
  const unset = tr(locale, "Not set", "未設定");
  if (mode === "data") {
    return [
      { label: tr(locale, "Area", "エリア"), value: item.areaName || unknown },
      { label: tr(locale, "Weather", "天候"), value: item.weather.weatherLabel || unknown },
      { label: tr(locale, "Wind", "風"), value: formatWind(item, locale) },
      { label: tr(locale, "Air", "気温"), value: item.weather.temperatureC == null ? unknown : formatTemperatureFromCelsius(item.weather.temperatureC, locale, unitSystem) },
      { label: tr(locale, "Tide", "潮"), value: item.tidePhaseLabel || unknown },
      { label: tr(locale, "Water", "水温"), value: formatSeaTemperature(item, locale, unitSystem) },
      { label: tr(locale, "Cycle", "潮回り"), value: formatTideCycle(item, locale) },
      { label: tr(locale, "Moon age", "月齢"), value: item.lunar.moonAge == null ? unknown : `${item.lunar.moonAge}` },
      { label: tr(locale, "Time", "時刻"), value: formatTime(item.caughtAt, locale) }
    ];
  }
  if (mode === "tackle") {
    return [
      { label: tr(locale, "Setup", "セット"), value: item.tackleName || unset },
      { label: tr(locale, "Lure", "ルアー"), value: item.lure || item.tackle.lureName || unset },
      { label: tr(locale, "Rod", "ロッド"), value: item.rod || item.tackle.rodName || unset },
      { label: tr(locale, "Reel", "リール"), value: item.reel || item.tackle.reelName || unset },
      { label: tr(locale, "Line", "ライン"), value: item.line || item.tackle.lineName || unset },
      { label: tr(locale, "Leader", "リーダー"), value: item.leader || item.tackle.leaderName || unset }
    ];
  }
  return [
    { label: tr(locale, "Area", "ポイント"), value: formatPoint(item, locale) },
    { label: tr(locale, "Weather", "天候"), value: item.weather.weatherLabel || unknown },
    { label: tr(locale, "Tide", "潮"), value: item.tidePhaseLabel || unknown },
    { label: tr(locale, "Wind", "風"), value: formatWind(item, locale) },
    { label: tr(locale, "Water", "水温"), value: formatSeaTemperature(item, locale, unitSystem) },
    { label: tr(locale, "Tackle", "タックル"), value: item.tackleName || item.lure || item.tackle.lureName || unset }
  ];
}

function formatPoint(item: Catch, locale: AppLocale) {
  if (item.pointName && item.areaName) return `${item.pointName}(${item.areaName})`;
  if (item.pointName) return item.pointName;
  return item.areaName || tr(locale, "Unknown", "未取得");
}

function formatWind(item: Catch, locale: AppLocale) {
  if (item.weather.windSpeedMs == null) return tr(locale, "Unknown", "未取得");
  const direction = item.weather.windDirectionLabel ? `${item.weather.windDirectionLabel} ` : "";
  return `${direction}${item.weather.windSpeedMs}m/s`;
}

function formatSeaTemperature(item: Catch, locale: AppLocale, unitSystem: UnitSystem) {
  if (item.seaTemperature.seaTemperatureC == null) return tr(locale, "Unknown", "未取得");
  return formatTemperatureFromCelsius(item.seaTemperature.seaTemperatureC, locale, unitSystem);
}

function formatTime(value: string, locale: AppLocale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return tr(locale, "Unknown", "未取得");
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatTideCycle(item: Catch, locale: AppLocale) {
  const lunarDay = item.lunar.lunarDay;
  if (lunarDay != null) return getTideCycleByLunarDay(lunarDay, locale);
  const moonAge = item.lunar.moonAge;
  if (moonAge == null) return tr(locale, "Unknown", "未取得");
  return `${getTideCycleByLunarDay(Math.max(1, Math.min(30, Math.round(moonAge) + 1)), locale)}${tr(locale, " (estimated)", "目安")}`;
}

function getTideCycleByLunarDay(lunarDay: number, locale: AppLocale) {
  const day = ((Math.round(lunarDay) - 1) % 30) + 1;
  if ([1, 2, 3, 15, 16, 17].includes(day)) return tr(locale, "Spring", "大潮");
  if ([7, 8, 9, 22, 23, 24].includes(day)) return tr(locale, "Neap", "小潮");
  if ([10, 25].includes(day)) return tr(locale, "Long", "長潮");
  if ([11, 26].includes(day)) return tr(locale, "Young", "若潮");
  return tr(locale, "Medium", "中潮");
}

function tr(locale: AppLocale, english: string, japanese: string) {
  return locale === "en" ? english : japanese;
}
