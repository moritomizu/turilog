"use client";

import Image from "next/image";
import { useState } from "react";
import type { Catch } from "@/types";

export function CatchCard({ item, rank }: { item: Catch; rank?: number }) {
  const [showTideHelp, setShowTideHelp] = useState(false);

  return (
    <article className="overflow-hidden rounded border border-teal-100 bg-white shadow-soft">
      <div className="relative aspect-[4/3] bg-teal-50">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.fishType} fill className="object-cover" sizes="(max-width: 768px) 100vw, 360px" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">写真なし</div>
        )}
        {rank ? <span className="absolute left-3 top-3 rounded bg-coral px-3 py-1 text-sm font-black text-white">#{rank}</span> : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{item.fishType}</h2>
            <p className="text-sm text-slate-600">{formatDate(item.caughtAt)}</p>
          </div>
          <p className="shrink-0 text-2xl font-black text-water">{item.sizeCm}cm</p>
        </div>
        {item.comment ? <p className="text-sm leading-6 text-slate-700">{item.comment}</p> : null}
        {hasTackle(item) ? (
          <div className="rounded bg-foam p-3 text-sm leading-6">
            <p className="text-xs font-bold text-slate-500">タックル</p>
            {item.tackle.lureName ? <p className="font-bold">ルアー: {item.tackle.lureName}{item.tackle.lureColor ? ` / ${item.tackle.lureColor}` : ""}</p> : null}
            {item.tackle.rodName ? <p>ロッド: {item.tackle.rodName}</p> : null}
            {item.tackle.reelName ? <p>リール: {item.tackle.reelName}</p> : null}
            {item.tackle.lineName || item.tackle.leaderName ? <p>ライン: {[item.tackle.lineName, item.tackle.leaderName].filter(Boolean).join(" / ")}</p> : null}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label="エリア" value={formatArea(item)} />
          <Info label="当時の天候" value={item.weather.weatherLabel} />
          <Info label="当時の風" value={formatWind(item)} />
          <Info label="当時の気温" value={item.weather.temperatureC == null ? "未取得" : `${item.weather.temperatureC}度`} />
          <Info label="当時の水温" value={formatSeaTemperature(item)} />
          <Info label="旧暦/月齢" value={formatLunar(item)} />
          <Info label="潮回り" value={formatTideCycle(item)} />
          <Info
            label="潮"
            value={item.tidePhaseLabel || "未取得"}
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
        {showTideHelp ? <TideHelp /> : null}
        {item.officialCurrentCurveUrl ? (
          <a
            href={item.officialCurrentCurveUrl}
            target="_blank"
            rel="noreferrer"
            className="tap-target flex items-center justify-center rounded border border-coral px-4 py-3 text-sm font-black text-coral"
          >
            {item.officialCurrentDate ? `${item.officialCurrentDate}の潮流曲線を見る` : "海上保安庁の潮流曲線を見る"}
          </a>
        ) : null}
        {item.officialCurrentStationName ? (
          <p className="text-xs font-bold text-slate-500">
            潮流参照地点: {item.officialCurrentStationName}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function TideHelp() {
  return (
    <div className="rounded border border-sky-100 bg-sky-50 p-3 text-xs font-bold leading-5 text-slate-700">
      <p className="font-black text-sky-800">潮の計算</p>
      <p className="mt-1">前回の満潮/干潮から次回の潮止まりまでを10等分し、釣った時刻の位置を表示しています。</p>
      <p className="mt-1">干潮から満潮へ向かう時は上げ、満潮から干潮へ向かう時は下げです。</p>
    </div>
  );
}

function formatArea(item: Catch) {
  if (item.areaName) return item.areaName;
  if (item.officialCurrentStationName) return item.officialCurrentStationName;
  if (item.latitude != null) return `${item.latitude.toFixed(4)}, ${item.longitude?.toFixed(4)}`;
  return "未取得";
}

function formatSeaTemperature(item: Catch) {
  if (item.seaTemperature.seaTemperatureC == null) return item.seaTemperature.seaTemperatureAreaName ?? "未取得";
  const date = item.seaTemperature.seaTemperatureDate ? ` ${item.seaTemperature.seaTemperatureDate}` : "";
  return `${item.seaTemperature.seaTemperatureC}度 (${item.seaTemperature.seaTemperatureAreaName ?? "海域未取得"}${date})`;
}

function hasTackle(item: Catch) {
  return Object.values(item.tackle).some(Boolean);
}

function formatWind(item: Catch) {
  if (item.weather.windSpeedMs == null) return "未取得";
  const direction = item.weather.windDirectionLabel ? `${item.weather.windDirectionLabel} ` : "";
  return `${direction}${item.weather.windSpeedMs}m/s`;
}

function formatLunar(item: Catch) {
  if (!item.lunar.lunarDateLabel && item.lunar.moonAge == null) return "未取得";
  const moonAge = item.lunar.moonAge == null ? "" : `月齢${item.lunar.moonAge}`;
  return [item.lunar.lunarDateLabel, moonAge].filter(Boolean).join(" / ");
}

function formatTideCycle(item: Catch) {
  const lunarDay = item.lunar.lunarDay;
  if (lunarDay != null) return getTideCycleByLunarDay(lunarDay);

  const moonAge = item.lunar.moonAge;
  if (moonAge == null) return "未取得";
  const estimatedLunarDay = Math.max(1, Math.min(30, Math.round(moonAge) + 1));
  return `${getTideCycleByLunarDay(estimatedLunarDay)}目安`;
}

function getTideCycleByLunarDay(lunarDay: number) {
  const day = ((Math.round(lunarDay) - 1) % 30) + 1;
  if ([1, 2, 3, 15, 16, 17].includes(day)) return "大潮";
  if ([7, 8, 9, 22, 23, 24].includes(day)) return "小潮";
  if ([10, 25].includes(day)) return "長潮";
  if ([11, 26].includes(day)) return "若潮";
  return "中潮";
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

export function formatDate(value: string | null | undefined) {
  if (!value) return "日時未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
