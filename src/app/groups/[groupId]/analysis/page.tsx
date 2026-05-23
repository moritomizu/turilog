"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getGroupCatches } from "@/lib/catches";
import { getGroup, getGroupMembers } from "@/lib/groups";
import type { Catch, Group } from "@/types";

export default function GroupAnalysisPage({ params }: { params: { groupId: string } }) {
  return <AuthGate>{() => <GroupAnalysis groupId={params.groupId} />}</AuthGate>;
}

function GroupAnalysis({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [items, setItems] = useState<Catch[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const analysis = useMemo(() => buildAnalysis(items), [items]);

  useEffect(() => {
    Promise.all([getGroup(groupId), getGroupMembers(groupId), getGroupCatches(groupId)])
      .then(([nextGroup, , nextItems]) => {
        setGroup(nextGroup);
        setItems(nextItems);
        setMessage(nextGroup ? "" : "グループが見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "分析を読み込めませんでした。"));
  }, [groupId]);

  return (
    <>
      <PageHeader title="グループ分析" actionHref={`/groups/${groupId}`} actionLabel="詳細" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {group ? <h1 className="text-2xl font-black">{group.name} 分析</h1> : null}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card label="今日の釣果数" value={`${analysis.todayCount}件`} />
          <Card label="今月の釣果数" value={`${analysis.monthCount}件`} />
          <Card label="今月最大サイズ" value={analysis.monthMax ? `${analysis.monthMax}cm` : "なし"} />
          <Card label="最多魚種" value={analysis.topFish || "なし"} />
          <Card label="最多エリア" value={analysis.topArea || "なし"} />
          <Card label="潮比率" value={analysis.tideRatio} />
        </section>
        <Table title="日別分析" rows={analysis.daily} columns={["日付", "釣果数", "最大サイズ", "魚種内訳"]} />
        <Table title="月別分析" rows={analysis.monthly} columns={["月", "釣果数", "最大サイズ", "平均サイズ", "魚種内訳"]} />
        <Table title="エリア別分析" rows={analysis.area} columns={["エリア", "釣果数", "最大サイズ", "魚種内訳", "潮位傾向"]} />
      </main>
    </>
  );
}

function buildAnalysis(items: Catch[]) {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);
  const monthItems = items.filter((item) => item.caughtAt.slice(0, 7) === monthKey);
  const rising = items.filter((item) => item.tideDirection === "rising").length;
  const falling = items.filter((item) => item.tideDirection === "falling").length;
  return {
    todayCount: items.filter((item) => item.caughtAt.slice(0, 10) === todayKey).length,
    monthCount: monthItems.length,
    monthMax: maxSize(monthItems),
    topFish: topValue(items.map((item) => item.fishType)),
    topArea: topValue(items.map((item) => item.areaName || item.officialCurrentStationName || "未取得")),
    tideRatio: rising + falling ? `上げ${rising} / 下げ${falling}` : "未取得",
    daily: groupRows(items, (item) => item.caughtAt.slice(0, 10), false),
    monthly: groupRows(items, (item) => item.caughtAt.slice(0, 7), true),
    area: groupRows(items, (item) => item.areaName || item.officialCurrentStationName || "未取得", false, true)
  };
}

function groupRows(items: Catch[], keyFn: (item: Catch) => string, includeAverage: boolean, includeTide = false) {
  const groups = new Map<string, Catch[]>();
  items.forEach((item) => groups.set(keyFn(item), [...(groups.get(keyFn(item)) ?? []), item]));
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, values]) => {
    const fish = summarize(values.map((item) => item.fishType));
    const base = [key, `${values.length}`, `${maxSize(values)}cm`];
    if (includeAverage) base.push(`${(values.reduce((sum, item) => sum + item.sizeCm, 0) / values.length).toFixed(1)}cm`);
    base.push(fish);
    if (includeTide) base.push(summarize(values.map((item) => item.tidePhaseLabel)));
    return base;
  });
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-teal-100 bg-white p-4 shadow-soft"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

function Table({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return <section><h2 className="mb-3 text-xl font-black">{title}</h2><div className="overflow-x-auto rounded border border-teal-100 bg-white shadow-soft"><table className="min-w-full text-sm"><thead className="bg-foam">{columns.map((column) => <th key={column} className="whitespace-nowrap p-3 text-left font-black">{column}</th>)}</thead><tbody>{rows.map((row) => <tr key={row.join("-")} className="border-t border-teal-50">{row.map((cell, index) => <td key={`${cell}-${index}`} className="whitespace-nowrap p-3 font-bold text-slate-700">{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function maxSize(items: Catch[]) {
  return items.length ? Math.max(...items.map((item) => item.sizeCm)) : 0;
}

function topValue(values: string[]) {
  return summarize(values).split("、")[0]?.split(":")[0] ?? "";
}

function summarize(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => `${key}:${count}`).join("、");
}
