"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { getUserCatches } from "@/lib/catches";
import type { Catch } from "@/types";

export default function CatchesPage() {
  return (
    <AuthGate>
      {(user) => <CatchList userId={user.uid} />}
    </AuthGate>
  );
}

function CatchList({ userId }: { userId: string }) {
  const [items, setItems] = useState<Catch[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const digest = useMemo(() => buildDigest(items), [items]);

  useEffect(() => {
    getUserCatches(userId)
      .then((result) => {
        setItems(result);
        setMessage(result.length ? "" : "まだ釣果がありません。最初の一匹を投稿しましょう。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "釣果を読み込めませんでした。"));
  }, [userId]);

  return (
    <>
      <PageHeader title="釣果一覧" actionHref="/post" actionLabel="投稿" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {items.length ? <CatchDigest digest={digest} /> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CatchCard key={item.id} item={item} />
          ))}
        </div>
      </main>
    </>
  );
}

type Digest = {
  total: number;
  thisMonth: number;
  recent30: number;
  streak: number;
  best: Catch | null;
  latest: Catch | null;
  topFish: string;
  topTide: string;
  topArea: string;
  latestText: string;
};

function CatchDigest({ digest }: { digest: Digest }) {
  return (
    <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-water">RECENT REPORT</p>
          <h2 className="mt-1 text-xl font-black">釣果ダイジェスト</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{digest.latestText}</p>
        </div>
        <div className="rounded bg-coral px-3 py-2 text-center text-white">
          <p className="text-xs font-bold">総投稿</p>
          <p className="text-2xl font-black">{digest.total}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DigestStat label="今月" value={`${digest.thisMonth}匹`} />
        <DigestStat label="直近30日" value={`${digest.recent30}匹`} />
        <DigestStat label="連続記録" value={`${digest.streak}日`} />
        <DigestStat label="最大" value={digest.best ? `${digest.best.sizeCm}cm` : "未取得"} />
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <DigestTag label="よく釣れる魚種" value={digest.topFish} />
        <DigestTag label="好調な潮" value={digest.topTide} />
        <DigestTag label="よく行くエリア" value={digest.topArea} />
      </div>
    </section>
  );
}

function DigestStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-foam p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function DigestTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-teal-100 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-water">{value}</p>
    </div>
  );
}

function buildDigest(items: Catch[]): Digest {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const thirtyDaysAgo = now.getTime() - 30 * 86400000;
  const best = [...items].sort((a, b) => b.sizeCm - a.sizeCm)[0] ?? null;
  const latest = items[0] ?? null;

  return {
    total: items.length,
    thisMonth: items.filter((item) => getMonthKey(item.caughtAt) === thisMonthKey).length,
    recent30: items.filter((item) => new Date(item.caughtAt).getTime() >= thirtyDaysAgo).length,
    streak: getStreakDays(items),
    best,
    latest,
    topFish: topLabel(items, (item) => item.fishType),
    topTide: topLabel(items, (item) => item.tidePhaseLabel),
    topArea: topLabel(items, (item) => item.areaName || item.officialCurrentStationName || "未取得"),
    latestText: latest ? `最新は${formatShortDate(latest.caughtAt)}の${latest.fishType} ${latest.sizeCm}cm。次の一匹で記録を伸ばしましょう。` : "まだ釣果がありません。"
  };
}

function topLabel(items: Catch[], getKey: (item: Catch) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item) || "未取得";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "未取得";
}

function getMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function getStreakDays(items: Catch[]) {
  const days = new Set(items.map((item) => new Date(item.caughtAt).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
