"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { formatDate } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { getUserCatches } from "@/lib/catches";
import type { Catch } from "@/types";

export default function MapPage() {
  return (
    <AuthGate>
      {(user) => <CatchMap userId={user.uid} />}
    </AuthGate>
  );
}

function CatchMap({ userId }: { userId: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("地図を準備しています。");

  useEffect(() => {
    async function load() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMessage("Google Maps APIキーが未設定です。NEXT_PUBLIC_GOOGLE_MAPS_API_KEYを確認してください。");
        return;
      }

      const items = (await getUserCatches(userId)).filter((item) => item.latitude != null && item.longitude != null);
      if (!items.length) {
        setMessage("位置情報付きの釣果がありません。");
        return;
      }

      const loader = new Loader({ apiKey, version: "weekly" });
      const google = await loader.load();
      const center = { lat: items[0].latitude as number, lng: items[0].longitude as number };
      const map = new google.maps.Map(mapRef.current as HTMLDivElement, { center, zoom: 11 });
      const info = new google.maps.InfoWindow();

      items.forEach((item) => {
        const marker = new google.maps.Marker({
          position: { lat: item.latitude as number, lng: item.longitude as number },
          map,
          title: `${item.fishType} ${item.sizeCm}cm`
        });
        marker.addListener("click", () => {
          info.setContent(infoHtml(item));
          info.open({ map, anchor: marker });
        });
      });
      setMessage("");
    }

    load().catch((error) => setMessage(error instanceof Error ? error.message : "地図を表示できませんでした。"));
  }, [userId]);

  return (
    <>
      <PageHeader title="マップ" />
      <main className="mx-auto max-w-5xl px-4 py-5">
        {message ? <p className="mb-4 rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <div ref={mapRef} className="h-[70vh] min-h-[480px] w-full rounded border border-teal-100 bg-white shadow-soft" />
      </main>
    </>
  );
}

function infoHtml(item: Catch) {
  const image = item.imageUrl ? `<img src="${item.imageUrl}" alt="" style="width:220px;height:140px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />` : "";
  const officialLink = item.officialTideCurveUrl
    ? `<p style="margin:8px 0 0;"><a href="${item.officialTideCurveUrl}" target="_blank" rel="noreferrer">${item.officialTideDate ? `${escapeHtml(item.officialTideDate)}の潮汐曲線を見る` : "海上保安庁の潮汐曲線を見る"}</a></p>`
    : "";
  const officialStation = item.officialTideStationName
    ? `<p style="margin:4px 0;color:#475569;">公式参照地点: ${escapeHtml(item.officialTideStationName)}${
        item.officialTideStationDistance == null ? "" : ` / 約${item.officialTideStationDistance}km`
      }</p>`
    : "";
  const tackle = formatTackleHtml(item);
  return `
    <div style="max-width:240px;font-family:sans-serif;color:#17201d;">
      ${image}
      <strong style="font-size:16px;">${escapeHtml(item.fishType)} ${item.sizeCm}cm</strong>
      <p style="margin:4px 0;">${formatDate(item.caughtAt)}</p>
      <p style="margin:4px 0;">潮位: ${item.tideHeight == null ? "未取得" : `${item.tideHeight}m`} / ${escapeHtml(item.tidePhaseLabel)}</p>
      <p style="margin:4px 0;">当時の天候: ${escapeHtml(item.weather.weatherLabel)} / 当時の風: ${formatWindHtml(item)}</p>
      <p style="margin:4px 0;">${escapeHtml(item.lunar.lunarDateLabel ?? "旧暦未取得")}${item.lunar.moonAge == null ? "" : ` / 月齢${item.lunar.moonAge}`}</p>
      ${tackle}
      <p style="margin:4px 0;">${escapeHtml(item.comment)}</p>
      ${officialStation}
      ${officialLink}
    </div>
  `;
}

function formatTackleHtml(item: Catch) {
  const values = [
    item.tackle.lureName ? `ルアー: ${escapeHtml(item.tackle.lureName)}${item.tackle.lureColor ? ` / ${escapeHtml(item.tackle.lureColor)}` : ""}` : "",
    item.tackle.rodName ? `ロッド: ${escapeHtml(item.tackle.rodName)}` : "",
    item.tackle.reelName ? `リール: ${escapeHtml(item.tackle.reelName)}` : ""
  ].filter(Boolean);
  if (!values.length) return "";
  return `<p style="margin:4px 0;">${values.join("<br />")}</p>`;
}

function formatWindHtml(item: Catch) {
  if (item.weather.windSpeedMs == null) return "未取得";
  const direction = item.weather.windDirectionLabel ? `${escapeHtml(item.weather.windDirectionLabel)} ` : "";
  return `${direction}${item.weather.windSpeedMs}m/s`;
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}
