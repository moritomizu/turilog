"use client";

import Image from "next/image";
import type { Catch } from "@/types";

export function CatchCard({ item, rank }: { item: Catch; rank?: number }) {
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
          <Info label="潮位" value={item.tideHeight == null ? "未取得" : `${item.tideHeight}m`} />
          <Info label="潮" value={item.tidePhaseLabel || "未取得"} />
        </div>
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

function formatArea(item: Catch) {
  if (item.pointName) return item.areaName ? `${item.pointName} / ${item.areaName}` : item.pointName;
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-foam p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
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
