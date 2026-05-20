"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { getUserCatches } from "@/lib/catches";
import type { Catch } from "@/types";

export default function RankingPage() {
  return (
    <AuthGate>
      {(user) => <Ranking userId={user.uid} />}
    </AuthGate>
  );
}

function Ranking({ userId }: { userId: string }) {
  const [items, setItems] = useState<Catch[]>([]);
  const [message, setMessage] = useState("読み込み中です。");

  useEffect(() => {
    getUserCatches(userId)
      .then((result) => {
        setItems(result);
        setMessage(result.length ? "" : "ランキング対象の釣果がありません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "ランキングを読み込めませんでした。"));
  }, [userId]);

  const yearly = useMemo(() => [...items].sort((a, b) => b.sizeCm - a.sizeCm).slice(0, 3), [items]);
  const byFish = useMemo(() => topNByGroup(items, (item) => item.fishType, 3), [items]);
  const byMonth = useMemo(() => topBy(items, (item) => new Date(item.caughtAt).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit" })), [items]);

  return (
    <>
      <PageHeader title="ランキング" />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <RankingSection title="年間最大サイズランキング" items={yearly} />
        <FishRankingSection title="魚種別最大サイズランキング" groups={byFish} />
        <RankingSection title="月別最大サイズランキング" items={byMonth} />
      </main>
    </>
  );
}

function RankingSection({ title, items }: { title: string; items: Catch[] }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-black">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <CatchCard key={`${title}-${item.id}`} item={item} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

function FishRankingSection({ title, groups }: { title: string; groups: RankingGroup[] }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-black">{title}</h2>
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.label} className="rounded-lg bg-white p-3 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-slate-900">{group.label}</h3>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800">TOP {group.items.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item, index) => (
                <CatchCard key={`${title}-${group.label}-${item.id}`} item={item} rank={index + 1} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function topBy(items: Catch[], getKey: (item: Catch) => string) {
  const map = new Map<string, Catch>();
  for (const item of items) {
    const key = getKey(item);
    const current = map.get(key);
    if (!current || item.sizeCm > current.sizeCm) map.set(key, item);
  }
  return [...map.values()].sort((a, b) => b.sizeCm - a.sizeCm);
}

type RankingGroup = {
  label: string;
  items: Catch[];
};

function topNByGroup(items: Catch[], getKey: (item: Catch) => string, limit: number): RankingGroup[] {
  const map = new Map<string, Catch[]>();
  for (const item of items) {
    const key = getKey(item) || "未分類";
    map.set(key, [...(map.get(key) ?? []), item]);
  }

  return [...map.entries()]
    .map(([label, groupItems]) => ({
      label,
      items: [...groupItems].sort((a, b) => b.sizeCm - a.sizeCm).slice(0, limit),
    }))
    .sort((a, b) => (b.items[0]?.sizeCm ?? 0) - (a.items[0]?.sizeCm ?? 0));
}
