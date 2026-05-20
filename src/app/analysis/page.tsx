"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getUserCatches } from "@/lib/catches";
import type { Catch } from "@/types";

export default function AnalysisPage() {
  return (
    <AuthGate>
      {(user) => <Analysis userId={user.uid} />}
    </AuthGate>
  );
}

function Analysis({ userId }: { userId: string }) {
  const [items, setItems] = useState<Catch[]>([]);
  const [message, setMessage] = useState("読み込み中です。");

  useEffect(() => {
    getUserCatches(userId)
      .then((result) => {
        setItems(result);
        setMessage(result.length ? "" : "分析対象の釣果がありません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "分析を読み込めませんでした。"));
  }, [userId]);

  const stats = useMemo(() => buildStats(items), [items]);

  return (
    <>
      <PageHeader title="潮位分析" />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <section className="grid grid-cols-2 gap-3">
          <Stat label="上げ潮で釣れた数" value={stats.rising} />
          <Stat label="下げ潮で釣れた数" value={stats.falling} />
        </section>
        <Table title="何分目で釣れたかの分布" rows={stats.phaseRows} />
        <Table title="魚種別の釣れやすい潮位傾向" rows={stats.fishRows} />
        <Table title="サイズが大きかった潮位傾向" rows={stats.sizeRows} />
        <Table title="天候・風速の傾向" rows={stats.weatherRows} />
        <Table title="旧暦・月齢の傾向" rows={stats.lunarRows} />
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-teal-100 bg-white p-4 shadow-soft">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-water">{value}</p>
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="overflow-hidden rounded border border-teal-100 bg-white shadow-soft">
      <h2 className="border-b border-teal-100 p-4 text-lg font-black">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.join("-")} className="border-b border-teal-50 last:border-b-0">
                  {row.map((cell) => (
                    <td key={cell} className="p-3 font-medium">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4 text-slate-500">データがありません。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildStats(items: Catch[]) {
  const rising = items.filter((item) => item.tideDirection === "rising").length;
  const falling = items.filter((item) => item.tideDirection === "falling").length;
  const phaseRows = countBy(items, (item) => item.tidePhaseLabel).map(([label, count]) => [label, `${count}件`]);
  const fishRows = [...groupBy(items, (item) => item.fishType).entries()].map(([fish, fishItems]) => {
    const best = countBy(fishItems, (item) => item.tidePhaseLabel)[0];
    return [fish, best?.[0] ?? "未取得", `${best?.[1] ?? 0}件`];
  });
  const sizeRows = [...items]
    .filter((item) => item.tidePhaseLabel !== "潮位未取得")
    .sort((a, b) => b.sizeCm - a.sizeCm)
    .slice(0, 10)
    .map((item) => [item.fishType, `${item.sizeCm}cm`, item.tidePhaseLabel, item.tideHeight == null ? "潮位未取得" : `${item.tideHeight}m`]);
  const weatherRows = countBy(items, (item) => item.weather.weatherLabel).map(([label, count]) => [label, `${count}件`, averageWind(items, label)]);
  const lunarRows = countBy(items, (item) => item.lunar.moonPhaseLabel ?? "未取得").map(([label, count]) => [label, `${count}件`]);

  return { rising, falling, phaseRows, fishRows, sizeRows, weatherRows, lunarRows };
}

function countBy(items: Catch[], getKey: (item: Catch) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item) || "未取得";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function groupBy(items: Catch[], getKey: (item: Catch) => string) {
  const map = new Map<string, Catch[]>();
  for (const item of items) {
    const key = getKey(item) || "未分類";
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

function averageWind(items: Catch[], weatherLabel: string) {
  const winds = items
    .filter((item) => item.weather.weatherLabel === weatherLabel && item.weather.windSpeedMs != null)
    .map((item) => item.weather.windSpeedMs as number);
  if (!winds.length) return "平均風速 未取得";
  const average = winds.reduce((sum, value) => sum + value, 0) / winds.length;
  return `平均風速 ${average.toFixed(1)}m/s`;
}
