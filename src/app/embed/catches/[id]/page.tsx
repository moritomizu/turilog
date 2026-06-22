"use client";

import { useEffect, useState } from "react";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";
import { getPublicCatch } from "@/lib/catches";
import { isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase";
import type { Catch } from "@/types";

type ShareMode = "standard" | "data" | "tackle";

export default function EmbedCatchPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<Catch | null>(null);
  const [message, setMessage] = useState("釣果を読み込んでいます。");
  const [mode, setMode] = useState<ShareMode>("standard");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setMessage(`Firebase設定が不足しています: ${missingFirebaseEnv.join(", ")}`);
      return;
    }

    getPublicCatch(params.id)
      .then((result) => {
        setItem(result);
        setMessage(result ? "" : "この釣果は公開されていないか、見つかりませんでした。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "釣果を読み込めませんでした。"));
  }, [params.id]);

  return (
    <main className="min-h-[100svh] bg-foam px-3 py-3">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-md flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <BackButton />
          {item ? <ShareModeTabs mode={mode} onChange={setMode} /> : null}
        </div>
        {item ? <ShareCatchCard item={item} mode={mode} /> : <Notice message={message} />}
      </div>
    </main>
  );
}

function ShareCatchCard({ item, mode }: { item: Catch; mode: ShareMode }) {
  const anglerName = item.publicAnglerName?.trim() || "TSURILOGUE Angler";
  const infoItems = getShareInfoItems(item, mode);
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
          <div className="flex h-[52svh] min-h-[295px] items-center justify-center text-sm font-bold text-slate-500">写真なし</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/75">Catch record</p>
              <h1 className="mt-1 truncate text-3xl font-black leading-tight">{item.fishType}</h1>
              <p className="mt-1 text-sm font-bold text-white/90">{formatDate(item.caughtAt)}</p>
            </div>
            <p className="shrink-0 text-4xl font-black leading-none">{item.sizeCm}<span className="ml-1 text-lg">cm</span></p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-water text-sm font-black text-white">
            {item.publicAnglerAvatarUrl ? <img src={item.publicAnglerAvatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(anglerName)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-500">釣った人</p>
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

function ShareModeTabs({ mode, onChange }: { mode: ShareMode; onChange: (mode: ShareMode) => void }) {
  const items: Array<{ mode: ShareMode; label: string }> = [
    { mode: "standard", label: "標準" },
    { mode: "data", label: "データ" },
    { mode: "tackle", label: "タックル" }
  ];
  return (
    <div className="flex rounded bg-white p-1 shadow-soft" aria-label="シェアカード表示設定">
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

function BackButton() {
  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/catches";
  }

  return (
    <button type="button" onClick={handleBack} className="tap-target inline-flex w-fit items-center rounded bg-white px-3 py-2 text-xs font-black text-water shadow-soft">
      ← 戻る
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

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "日時未取得";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function getInitial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "T";
}

function getModeLabel(mode: ShareMode) {
  if (mode === "data") return "DATA LOG";
  if (mode === "tackle") return "TACKLE LOG";
  return "FISHING LOG";
}

function getShareInfoItems(item: Catch, mode: ShareMode) {
  if (mode === "data") {
    return [
      { label: "エリア", value: item.areaName || "未取得" },
      { label: "天候", value: item.weather.weatherLabel || "未取得" },
      { label: "風", value: formatWind(item) },
      { label: "気温", value: item.weather.temperatureC == null ? "未取得" : `${item.weather.temperatureC}度` },
      { label: "潮", value: item.tidePhaseLabel || "未取得" },
      { label: "水温", value: formatSeaTemperature(item) },
      { label: "潮回り", value: formatTideCycle(item) },
      { label: "月齢", value: item.lunar.moonAge == null ? "未取得" : `${item.lunar.moonAge}` },
      { label: "時刻", value: formatTime(item.caughtAt) }
    ];
  }
  if (mode === "tackle") {
    return [
      { label: "セット", value: item.tackleName || "未設定" },
      { label: "ルアー", value: item.lure || item.tackle.lureName || "未設定" },
      { label: "ロッド", value: item.rod || item.tackle.rodName || "未設定" },
      { label: "リール", value: item.reel || item.tackle.reelName || "未設定" },
      { label: "ライン", value: item.line || item.tackle.lineName || "未設定" },
      { label: "リーダー", value: item.leader || item.tackle.leaderName || "未設定" }
    ];
  }
  return [
    { label: "ポイント", value: formatPoint(item) },
    { label: "天候", value: item.weather.weatherLabel || "未取得" },
    { label: "潮", value: item.tidePhaseLabel || "未取得" },
    { label: "風", value: formatWind(item) },
    { label: "水温", value: formatSeaTemperature(item) },
    { label: "タックル", value: item.tackleName || item.lure || item.tackle.lureName || "未設定" }
  ];
}

function formatPoint(item: Catch) {
  if (item.pointName && item.areaName) return `${item.pointName}(${item.areaName})`;
  if (item.pointName) return item.pointName;
  return item.areaName || "未取得";
}

function formatWind(item: Catch) {
  if (item.weather.windSpeedMs == null) return "未取得";
  const direction = item.weather.windDirectionLabel ? `${item.weather.windDirectionLabel} ` : "";
  return `${direction}${item.weather.windSpeedMs}m/s`;
}

function formatSeaTemperature(item: Catch) {
  if (item.seaTemperature.seaTemperatureC == null) return "未取得";
  return `${item.seaTemperature.seaTemperatureC}度`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "未取得";
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatTideCycle(item: Catch) {
  const lunarDay = item.lunar.lunarDay;
  if (lunarDay != null) return getTideCycleByLunarDay(lunarDay);
  const moonAge = item.lunar.moonAge;
  if (moonAge == null) return "未取得";
  return `${getTideCycleByLunarDay(Math.max(1, Math.min(30, Math.round(moonAge) + 1)))}目安`;
}

function getTideCycleByLunarDay(lunarDay: number) {
  const day = ((Math.round(lunarDay) - 1) % 30) + 1;
  if ([1, 2, 3, 15, 16, 17].includes(day)) return "大潮";
  if ([7, 8, 9, 22, 23, 24].includes(day)) return "小潮";
  if ([10, 25].includes(day)) return "長潮";
  if ([11, 26].includes(day)) return "若潮";
  return "中潮";
}
