"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getTournamentCatches, updateTournamentEntryStatus } from "@/lib/catches";
import { canManageApprovals, findParticipant } from "@/lib/tournamentPermissions";
import { getTournament, getTournamentParticipants } from "@/lib/tournaments";
import type { Catch, Tournament, TournamentParticipant } from "@/types";

export default function TournamentAdminPage({ params }: { params: { tournamentId: string } }) {
  return (
    <AuthGate>
      {(user) => <TournamentAdmin tournamentId={params.tournamentId} userId={user.uid} />}
    </AuthGate>
  );
}

function TournamentAdmin({ tournamentId, userId }: { tournamentId: string; userId: string }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [items, setItems] = useState<Catch[]>([]);
  const [message, setMessage] = useState("読み込み中です。");

  useEffect(() => {
    Promise.all([getTournament(tournamentId), getTournamentCatches(tournamentId), getTournamentParticipants(tournamentId)])
      .then(([nextTournament, nextItems, nextParticipants]) => {
        setTournament(nextTournament);
        setParticipants(nextParticipants);
        setItems(nextItems.filter((item) => item.tournamentEntryStatus === "pending"));
        setMessage(nextTournament ? "" : "大会が見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "承認画面を読み込めませんでした。"));
  }, [tournamentId]);

  async function updateStatus(catchId: string, status: "approved" | "rejected") {
    await updateTournamentEntryStatus(catchId, status);
    setItems((current) => current.filter((item) => item.id !== catchId));
  }

  const currentParticipant = tournament ? findParticipant(participants, userId, tournament.ownerId) : null;
  const canApprove = canManageApprovals(currentParticipant);

  if (tournament && !canApprove) {
    return (
      <>
        <PageHeader title="大会承認" actionHref={`/tournaments/${tournamentId}`} actionLabel="詳細" />
        <main className="mx-auto max-w-xl px-4 py-5">
          <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">承認権限のあるユーザーのみアクセスできます。</p>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="大会承認" actionHref={`/tournaments/${tournamentId}`} actionLabel="詳細" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {tournament ? <h1 className="text-2xl font-black">{tournament.name} 承認待ち</h1> : null}
        <p className="rounded bg-orange-50 p-3 text-sm font-bold leading-6 text-slate-700">
          承認権限のあるユーザーが操作できます。期間、対象魚種、位置情報、サイズ、写真を確認して承認してください。
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.length ? (
            items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded border border-teal-100 bg-white shadow-soft">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.fishType} className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-foam text-sm text-slate-500">写真なし</div>}
                <div className="space-y-2 p-4 text-sm">
                  <h2 className="text-lg font-black">{item.fishType} {item.sizeCm}cm</h2>
                  <p>投稿者: {participants.find((participant) => participant.userId === item.userId)?.userName ?? item.userId}</p>
                  <p>日時: {formatDate(item.caughtAt)}</p>
                  <p>位置情報: {item.latitude != null && item.longitude != null ? "あり" : "なし"}</p>
                  {tournament ? <CheckList item={item} tournament={tournament} /> : null}
                  <p>潮位: {item.tideHeight == null ? "未取得" : `${item.tideHeight}m`}</p>
                  <p>潮: {item.tidePhaseLabel}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={() => updateStatus(item.id, "approved")} className="tap-target rounded bg-water px-4 py-2 font-black text-white">承認</button>
                    <button onClick={() => updateStatus(item.id, "rejected")} className="tap-target rounded border border-coral px-4 py-2 font-black text-coral">却下</button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">承認待ち投稿はありません。</p>
          )}
        </div>
      </main>
    </>
  );
}

function CheckList({ item, tournament }: { item: Catch; tournament: Tournament }) {
  const caught = new Date(item.caughtAt).getTime();
  const inPeriod = caught >= new Date(tournament.startAt).getTime() && caught <= new Date(tournament.endAt).getTime();
  const fishType = normalizeFishType(item.fishType);
  const targetMatched = tournament.targetFishTypes.length === 0 || tournament.targetFishTypes.some((target) => normalizeFishType(target) === fishType);
  const hasLocation = item.latitude != null && item.longitude != null;
  const validSize = item.sizeCm > 0;
  return (
    <div className="rounded bg-foam p-2 text-xs font-bold leading-5">
      <p>期間内: {inPeriod ? "OK" : "要確認"}</p>
      <p>対象魚種: {targetMatched ? "OK" : "要確認"}</p>
      <p>位置情報: {hasLocation ? "OK" : "要確認"}</p>
      <p>サイズ: {validSize ? "OK" : "要確認"}</p>
    </div>
  );
}

function normalizeFishType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
