"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { getTournamentCatches } from "@/lib/catches";
import { getRankingTypeLabel, getTournament, getTournamentParticipants, getTournamentStatus, joinTournament } from "@/lib/tournaments";
import type { Catch, Tournament, TournamentParticipant } from "@/types";

export default function TournamentDetailPage({ params }: { params: { tournamentId: string } }) {
  return (
    <AuthGate>
      {(user) => <TournamentDetail tournamentId={params.tournamentId} userId={user.uid} userName={user.displayName ?? user.email ?? "参加者"} />}
    </AuthGate>
  );
}

function TournamentDetail({ tournamentId, userId, userName }: { tournamentId: string; userId: string; userName: string }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [joinName, setJoinName] = useState(userName);
  const [message, setMessage] = useState("読み込み中です。");
  const isParticipant = participants.some((item) => item.userId === userId);
  const participantNames = useMemo(() => new Map(participants.map((item) => [item.userId, item.userName])), [participants]);
  const approvedCatches = useMemo(() => catches.filter((item) => isApprovedTournamentCatch(item, tournament)), [catches, tournament]);
  const ranking = useMemo(() => buildRanking(approvedCatches, participants, tournament), [approvedCatches, participants, tournament]);

  useEffect(() => {
    Promise.all([getTournament(tournamentId), getTournamentParticipants(tournamentId), getTournamentCatches(tournamentId)])
      .then(([nextTournament, nextParticipants, nextCatches]) => {
        setTournament(nextTournament);
        setParticipants(nextParticipants);
        setCatches(nextCatches);
        setMessage(nextTournament ? "" : "大会が見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "大会を読み込めませんでした。"));
  }, [tournamentId]);

  async function handleJoin() {
    if (!tournament) return;
    try {
      await joinTournament(tournament, userId, joinName.trim() || userName);
      setParticipants(await getTournamentParticipants(tournament.id));
      setMessage("大会に参加しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "参加できませんでした。");
    }
  }

  return (
    <>
      <PageHeader title="大会詳細" actionHref="/tournaments" actionLabel="一覧" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {tournament ? (
          <>
            <section className="rounded border border-coral/30 bg-orange-50 p-4 shadow-soft">
              <p className="text-xs font-black text-coral">{getStatusLabel(getTournamentStatus(tournament))}</p>
              <h1 className="mt-1 text-2xl font-black">{tournament.name}</h1>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{tournament.description}</p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2">
                <p>期間: {formatDate(tournament.startAt)} - {formatDate(tournament.endAt)}</p>
                <p>対象魚種: {tournament.targetFishTypes.join("、") || "指定なし"}</p>
                <p>方式: {getRankingTypeLabel(tournament.rankingType)}</p>
                <p>参加人数: {participants.length}{tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ""}人</p>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded bg-white p-3 text-sm leading-6 text-slate-700">{tournament.rules || "ルール未設定"}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {isParticipant ? (
                  <div className="rounded bg-white p-3 text-sm font-black text-slate-700">参加名: {participantNames.get(userId) ?? userName}</div>
                ) : (
                  <label className="block">
                    <span className="text-xs font-black text-slate-600">参加名</span>
                    <input value={joinName} onChange={(event) => setJoinName(event.target.value)} className="mt-1 w-full rounded border border-orange-200 bg-white p-3 text-sm font-bold" placeholder="ニックネーム" />
                  </label>
                )}
                <button disabled={isParticipant} onClick={handleJoin} className="tap-target rounded bg-coral px-4 py-3 font-black text-white disabled:opacity-50">
                  {isParticipant ? "参加済み" : "この名前で参加"}
                </button>
                <Link href={`/post?tournamentId=${tournament.id}`} className="tap-target flex items-center justify-center rounded bg-water px-4 py-3 font-black text-white">
                  大会釣果を投稿
                </Link>
                {tournament.ownerId === userId ? (
                  <>
                    <Link href={`/tournaments/${tournament.id}/admin`} className="tap-target flex items-center justify-center rounded border border-coral px-4 py-3 font-black text-coral">
                      承認画面
                    </Link>
                    <Link href={`/tournaments/${tournament.id}/edit`} className="tap-target flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-3 font-black text-ink">
                      大会編集
                    </Link>
                  </>
                ) : null}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black">参加者</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {participants.length ? (
                  participants.map((participant) => (
                    <div key={participant.id} className="rounded border border-teal-100 bg-white p-3 shadow-soft">
                      <p className="font-black text-ink">{participant.userName}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">参加日: {formatDate(participant.joinedAt)}</p>
                    </div>
                  ))
                ) : (
                  <Empty text="参加者はまだいません。" />
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black">大会ランキング</h2>
              <p className="mb-3 text-sm font-bold leading-6 text-slate-600">
                承認済みの大会投稿をランキングへ反映します。期間や対象魚種は承認画面で確認します。
              </p>
              <div className="space-y-2">
                {ranking.length ? ranking.map((row, index) => <RankingRow key={row.userId} row={row} rank={index + 1} />) : <Empty text="承認済みの大会釣果がありません。" />}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black">大会釣果一覧</h2>
              <p className="mb-3 text-sm font-bold leading-6 text-slate-600">承認待ち・承認済み・却下済みを含む、この大会に紐づいた投稿です。ランキングには承認済みのみ反映されます。</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catches.length ? catches.map((item) => <TournamentCatch key={item.id} item={item} userName={participantNames.get(item.userId) ?? "参加者"} />) : <Empty text="大会釣果はまだありません。" />}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}

function TournamentCatch({ item, userName }: { item: Catch; userName: string }) {
  return (
    <div className="relative">
      <span className={`absolute right-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-black text-white ${getEntryBadgeClass(item.tournamentEntryStatus)}`}>
        {getEntryStatusLabel(item.tournamentEntryStatus)}
      </span>
      <CatchCard item={item} />
      <div className="rounded-b border-x border-b border-teal-100 bg-white px-4 py-3 text-sm font-black text-water shadow-soft">
        投稿者: {userName}
      </div>
    </div>
  );
}

function RankingRow({ row, rank }: { row: RankingRowValue; rank: number }) {
  const medal = rank <= 3 ? ["bg-yellow-400", "bg-slate-300", "bg-orange-300"][rank - 1] : "bg-white";
  return (
    <article className={`rounded border border-teal-100 p-3 shadow-soft ${medal}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black">#{rank}</p>
          <h3 className="text-lg font-black">{row.userName}</h3>
          <p className="text-sm font-bold text-slate-700">{row.label}</p>
        </div>
        {row.bestCatch?.imageUrl ? <img src={row.bestCatch.imageUrl} alt={row.bestCatch.fishType} className="h-16 w-16 rounded object-cover" /> : null}
      </div>
      {row.bestCatch ? <p className="mt-2 text-xs font-bold text-slate-700">{row.bestCatch.fishType} / {row.bestCatch.sizeCm}cm / {row.bestCatch.tidePhaseLabel}</p> : null}
    </article>
  );
}

type RankingRowValue = { userId: string; userName: string; score: number; label: string; bestCatch: Catch | null };

function buildRanking(items: Catch[], participants: TournamentParticipant[], tournament: Tournament | null): RankingRowValue[] {
  if (!tournament) return [];
  const names = new Map(participants.map((item) => [item.userId, item.userName]));
  const groups = new Map<string, Catch[]>();
  for (const item of items) groups.set(item.userId, [...(groups.get(item.userId) ?? []), item]);

  return [...groups.entries()]
    .map(([userId, userItems]) => {
      const bestCatch = [...userItems].sort((a, b) => b.sizeCm - a.sizeCm)[0] ?? null;
      if (tournament.rankingType === "count") return { userId, userName: names.get(userId) ?? "参加者", score: userItems.length, label: `${userItems.length}匹`, bestCatch };
      if (tournament.rankingType === "totalSize") {
        const score = userItems.reduce((sum, item) => sum + item.sizeCm, 0);
        return { userId, userName: names.get(userId) ?? "参加者", score, label: `合計${score.toFixed(1)}cm`, bestCatch };
      }
      return { userId, userName: names.get(userId) ?? "参加者", score: bestCatch?.sizeCm ?? 0, label: `${bestCatch?.sizeCm ?? 0}cm`, bestCatch };
    })
    .sort((a, b) => b.score - a.score);
}

function isApprovedTournamentCatch(item: Catch, tournament: Tournament | null) {
  if (!tournament || item.tournamentEntryStatus !== "approved") return false;
  return item.tournamentId === tournament.id;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{text}</p>;
}

function getStatusLabel(status: string) {
  if (status === "active") return "開催中";
  if (status === "upcoming") return "開催予定";
  return "終了";
}

function getEntryStatusLabel(status: Catch["tournamentEntryStatus"]) {
  if (status === "approved") return "承認済み";
  if (status === "rejected") return "却下";
  if (status === "pending") return "承認待ち";
  return "通常投稿";
}

function getEntryBadgeClass(status: Catch["tournamentEntryStatus"]) {
  if (status === "approved") return "bg-water";
  if (status === "rejected") return "bg-slate-500";
  if (status === "pending") return "bg-coral";
  return "bg-slate-400";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
