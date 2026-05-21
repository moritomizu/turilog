"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getTournamentParticipants, getTournaments, getTournamentStatus, getRankingTypeLabel } from "@/lib/tournaments";
import type { Tournament, TournamentStatus } from "@/types";

export default function TournamentsPage() {
  return (
    <AuthGate>
      {() => <TournamentList />}
    </AuthGate>
  );
}

function TournamentList() {
  const [items, setItems] = useState<Array<Tournament & { participantCount: number }>>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const groups = useMemo(() => groupTournaments(items), [items]);

  useEffect(() => {
    getTournaments()
      .then(async (result) => {
        const withCounts = await Promise.all(
          result.map(async (tournament) => ({
            ...tournament,
            participantCount: (await getTournamentParticipants(tournament.id)).length
          }))
        );
        setItems(withCounts);
        setMessage(withCounts.length ? "" : "大会はまだありません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "大会を読み込めませんでした。"));
  }, []);

  return (
    <>
      <PageHeader title="大会" actionHref="/tournaments/new" actionLabel="作成" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <section className="rounded border border-coral/30 bg-orange-50 p-4 shadow-soft">
          <p className="text-xs font-black text-coral">TOURNAMENT</p>
          <h1 className="mt-1 text-2xl font-black">釣り大会</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">期間中の釣果で競えるMVP大会機能です。参加して投稿し、承認後にランキングへ反映されます。</p>
        </section>
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <TournamentSection title="開催中の大会" items={groups.active} />
        <TournamentSection title="開催予定の大会" items={groups.upcoming} />
        <TournamentSection title="終了した大会" items={groups.ended} />
      </main>
    </>
  );
}

function TournamentSection({ title, items }: { title: string; items: Array<Tournament & { participantCount: number }> }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-xl font-black">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={`/tournaments/${item.id}`} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <h3 className="text-lg font-black text-ink">{item.name}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>
            <div className="mt-3 space-y-1 text-xs font-bold text-slate-600">
              <p>{formatDate(item.startAt)} - {formatDate(item.endAt)}</p>
              <p>対象: {item.targetFishTypes.join("、") || "指定なし"}</p>
              <p>方式: {getRankingTypeLabel(item.rankingType)}</p>
              <p>参加人数: {item.participantCount}人</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function groupTournaments(items: Array<Tournament & { participantCount: number }>) {
  return items.reduce<Record<TournamentStatus, Array<Tournament & { participantCount: number }>>>(
    (groups, item) => {
      groups[getTournamentStatus(item)].push(item);
      return groups;
    },
    { active: [], upcoming: [], ended: [] }
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
