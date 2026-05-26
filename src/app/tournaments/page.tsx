"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getTournamentCatches } from "@/lib/catches";
import { canManageApprovals, findParticipant } from "@/lib/tournamentPermissions";
import { getTournamentParticipants, getTournaments, getTournamentStatus, getRankingTypeLabel } from "@/lib/tournaments";
import type { Tournament, TournamentStatus } from "@/types";

export default function TournamentsPage() {
  return (
    <AuthGate>
      {(user) => <TournamentList userId={user.uid} />}
    </AuthGate>
  );
}

type TournamentListItem = Tournament & {
  participantCount: number;
  isParticipant: boolean;
  isOwner: boolean;
  pendingApprovalCount: number;
};

function TournamentList({ userId }: { userId: string }) {
  const [items, setItems] = useState<TournamentListItem[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const groups = useMemo(() => groupTournaments(items), [items]);

  useEffect(() => {
    getTournaments()
      .then(async (result) => {
        const withCounts = await Promise.all(
          result.map(async (tournament) => {
            const participants = await getTournamentParticipants(tournament.id);
            const currentParticipant = findParticipant(participants, userId, tournament.ownerId);
            const pendingApprovalCount = canManageApprovals(currentParticipant)
              ? (await getTournamentCatches(tournament.id)).filter((item) => item.tournamentEntryStatus === "pending").length
              : 0;
            return {
              ...tournament,
              participantCount: participants.length,
              isParticipant: participants.some((participant) => participant.userId === userId),
              isOwner: tournament.ownerId === userId,
              pendingApprovalCount
            };
          })
        );
        const visibleItems = withCounts.filter((item) => item.visibility === "public" || item.ownerId === userId || item.isParticipant);
        setItems(visibleItems);
        setMessage(visibleItems.length ? "" : "表示できる大会はまだありません。公開大会を作成するか、非公開大会のURLを仲間から共有してもらってください。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "大会を読み込めませんでした。"));
  }, [userId]);

  return (
    <>
      <PageHeader title="大会" actionHref="/tournaments/new" actionLabel="作成" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <section className="rounded border border-coral/30 bg-orange-50 p-4 shadow-soft">
          <p className="text-xs font-black text-coral">TOURNAMENT</p>
          <h1 className="mt-1 text-2xl font-black">釣り大会</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">期間中の釣果で競えるMVP大会機能です。公開大会は誰でも参加でき、非公開大会は仲間から共有された人だけが中身を見られます。</p>
        </section>
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <TournamentSection title="開催中の大会" items={groups.active} />
        <TournamentSection title="開催予定の大会" items={groups.upcoming} />
        <TournamentSection title="終了した大会" items={groups.ended} />
      </main>
    </>
  );
}

function TournamentSection({ title, items }: { title: string; items: TournamentListItem[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-xl font-black">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={`/tournaments/${item.id}`} className="overflow-hidden rounded border border-teal-100 bg-white shadow-soft">
            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="aspect-[16/9] w-full object-cover" /> : null}
            <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-black text-ink">{item.name}</h3>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {item.isOwner ? (
                  <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-black text-white shadow-sm">
                    主催者
                  </span>
                ) : null}
                {item.isParticipant ? (
                  <span className="rounded-full bg-coral px-3 py-1 text-[11px] font-black text-white shadow-sm">
                    参加中
                  </span>
                ) : null}
                {item.pendingApprovalCount > 0 ? (
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-coral ring-1 ring-coral/30">
                    承認待ち{item.pendingApprovalCount}件
                  </span>
                ) : null}
                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${item.visibility === "public" ? "bg-water/10 text-water" : "bg-slate-100 text-slate-600"}`}>
                  {item.visibility === "public" ? "公開" : "非公開"}
                </span>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>
            <div className="mt-3 space-y-1 text-xs font-bold text-slate-600">
              <p>{formatDate(item.startAt)} - {formatDate(item.endAt)}</p>
              <p>対象: {item.targetFishTypes.join("、") || "指定なし"}</p>
              <p>方式: {getRankingTypeLabel(item.rankingType)}</p>
              <p>参加人数: {item.participantCount}人</p>
              {item.pendingApprovalCount > 0 ? <p className="text-coral">承認待ち投稿: {item.pendingApprovalCount}件</p> : null}
            </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function groupTournaments(items: TournamentListItem[]) {
  return items.reduce<Record<TournamentStatus, TournamentListItem[]>>(
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
