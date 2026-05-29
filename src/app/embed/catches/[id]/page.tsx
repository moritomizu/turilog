"use client";

import { useEffect, useState } from "react";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";
import { getPublicCatch } from "@/lib/catches";
import { isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase";
import type { Catch } from "@/types";

export default function EmbedCatchPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<Catch | null>(null);
  const [message, setMessage] = useState("釣果を読み込んでいます。");

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
        <BackButton />
        {item ? <ShareCatchCard item={item} /> : <Notice message={message} />}
      </div>
    </main>
  );
}

function ShareCatchCard({ item }: { item: Catch }) {
  const anglerName = item.publicAnglerName?.trim() || "TsuriLog Angler";
  return (
    <article className="flex flex-1 flex-col overflow-hidden rounded border border-teal-100 bg-white shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-teal-50 px-4 py-3">
        <TsuriLogLogo className="h-7 w-28 max-w-[42vw]" />
        <p className="rounded-full bg-foam px-3 py-1 text-[11px] font-black text-water">FISHING LOG</p>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.fishType} className="h-full max-h-[58svh] min-h-[280px] w-full object-cover" />
        ) : (
          <div className="flex h-[42svh] min-h-[280px] items-center justify-center text-sm font-bold text-slate-500">写真なし</div>
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

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-water text-sm font-black text-white">
            {item.publicAnglerAvatarUrl ? <img src={item.publicAnglerAvatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(anglerName)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-500">釣った人</p>
            <p className="truncate text-base font-black text-ink">{anglerName}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniInfo label="ポイント" value={item.areaName || "未取得"} />
          <MiniInfo label="潮" value={item.tidePhaseLabel || "未取得"} />
          <MiniInfo label="水温" value={item.seaTemperature.seaTemperatureC == null ? "未取得" : `${item.seaTemperature.seaTemperatureC}度`} />
        </div>

        {item.comment ? <p className="line-clamp-2 rounded bg-foam px-3 py-2 text-sm font-bold leading-6 text-slate-700">{item.comment}</p> : null}
      </div>
    </article>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-foam px-2 py-2">
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
    <button type="button" onClick={handleBack} className="tap-target mb-2 inline-flex w-fit items-center rounded bg-white px-3 py-2 text-xs font-black text-water shadow-soft">
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
