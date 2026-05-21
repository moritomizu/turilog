"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { getTournamentCatches } from "@/lib/catches";
import { getRankingTypeLabel, getTournament, getTournamentParticipants, getTournamentStatus, joinTournament, leaveTournament, uploadTournamentParticipantIcon } from "@/lib/tournaments";
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
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("読み込み中です。");
  const isParticipant = participants.some((item) => item.userId === userId);
  const currentParticipant = participants.find((item) => item.userId === userId);
  const isOwner = tournament?.ownerId === userId;
  const canViewPrivateContent = tournament ? tournament.visibility === "public" || isParticipant || isOwner : false;
  const participantNames = useMemo(() => new Map(participants.map((item) => [item.userId, item.userName])), [participants]);
  const approvedCatches = useMemo(() => catches.filter((item) => isApprovedTournamentCatch(item, tournament)), [catches, tournament]);
  const ranking = useMemo(() => buildRanking(approvedCatches, participants, tournament), [approvedCatches, participants, tournament]);

  useEffect(() => {
    Promise.all([getTournament(tournamentId), getTournamentParticipants(tournamentId)])
      .then(async ([nextTournament, nextParticipants]) => {
        const canLoadCatches = nextTournament ? nextTournament.visibility === "public" || nextTournament.ownerId === userId || nextParticipants.some((item) => item.userId === userId) : false;
        const nextCatches = canLoadCatches ? await getTournamentCatches(tournamentId) : [];
        setTournament(nextTournament);
        setParticipants(nextParticipants);
        setCatches(nextCatches);
        setMessage(nextTournament ? "" : "大会が見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "大会を読み込めませんでした。"));
  }, [tournamentId, userId]);

  useEffect(() => {
    if (!iconFile) {
      setIconPreview(null);
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  async function handleJoin() {
    if (!tournament) return;
    try {
      const avatarUrl = iconFile ? await uploadTournamentParticipantIcon(userId, iconFile) : null;
      await joinTournament(tournament, userId, joinName.trim() || userName, avatarUrl);
      setParticipants(await getTournamentParticipants(tournament.id));
      setCatches(await getTournamentCatches(tournament.id));
      setIconFile(null);
      setMessage("大会に参加しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "参加できませんでした。");
    }
  }

  async function handleLeave() {
    if (!tournament || !window.confirm("この大会から抜けますか？")) return;
    try {
      await leaveTournament(tournament.id, userId);
      setParticipants(await getTournamentParticipants(tournament.id));
      setCatches(tournament.visibility === "public" || tournament.ownerId === userId ? await getTournamentCatches(tournament.id) : []);
      setMessage("大会から抜けました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "大会から抜けられませんでした。");
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
                <InfoItem label="期間" value={`${formatDate(tournament.startAt)} - ${formatDate(tournament.endAt)}`} />
                <InfoItem label="対象魚種" value={tournament.targetFishTypes.join("、") || "指定なし"} />
                <InfoItem label="方式" value={getRankingTypeLabel(tournament.rankingType)} />
                <InfoItem label="参加人数" value={`${participants.length}${tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ""}人`} />
                <InfoItem label="公開設定" value={getVisibilityLabel(tournament.visibility)} />
                <InfoItem label="主催者" value={isOwner ? "あなた" : "大会作成者"} />
              </div>
              <p className="mt-3 rounded bg-white/80 p-3 text-xs font-bold leading-5 text-slate-600">
                {tournament.visibility === "public"
                  ? "公開大会です。ログインしているユーザーなら大会内容とランキングを閲覧でき、誰でも参加できます。"
                  : "非公開大会です。参加者と作成者だけが閲覧できます。招待された方は参加名を入力して参加してください。"}
              </p>
              <p className="mt-3 whitespace-pre-wrap rounded bg-white p-3 text-sm leading-6 text-slate-700">{tournament.rules || "ルール未設定"}</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                <div className="rounded bg-white p-3">
                  <h2 className="text-sm font-black text-ink">参加メニュー</h2>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {isParticipant ? (
                      <div className="flex items-center gap-3 rounded border border-teal-100 bg-foam p-3 text-sm font-black text-slate-700">
                        <Avatar src={currentParticipant?.avatarUrl} name={participantNames.get(userId) ?? userName} size="md" />
                        <span className="min-w-0 truncate">自分の参加名: {participantNames.get(userId) ?? userName}</span>
                      </div>
                    ) : (
                      <>
                        <label className="block">
                          <span className="text-xs font-black text-slate-600">参加名</span>
                          <input value={joinName} onChange={(event) => setJoinName(event.target.value)} className="mt-1 w-full rounded border border-orange-200 bg-white p-3 text-sm font-bold" placeholder="ニックネーム" />
                        </label>
                        <label className="flex items-center gap-3 rounded border border-orange-100 bg-white p-3 text-sm font-bold text-slate-700">
                          <Avatar src={iconPreview} name={joinName || userName} size="md" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-black text-slate-600">アイコン画像</span>
                            <span className="block truncate text-xs text-slate-500">{iconFile ? iconFile.name : "任意で設定"}</span>
                          </span>
                          <input type="file" accept="image/*" onChange={(event) => setIconFile(event.target.files?.[0] ?? null)} className="hidden" />
                        </label>
                      </>
                    )}
                    <button disabled={isParticipant} onClick={handleJoin} className="tap-target rounded bg-coral px-4 py-3 font-black text-white disabled:opacity-50">
                      {isParticipant ? "参加済み" : "この名前で参加"}
                    </button>
                    {isParticipant ? (
                      <button onClick={handleLeave} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 font-black text-slate-700">
                        大会から抜ける
                      </button>
                    ) : null}
                    {canViewPrivateContent ? (
                      <Link href={`/post?tournamentId=${tournament.id}`} className="tap-target flex items-center justify-center rounded bg-water px-4 py-3 font-black text-white sm:col-span-2">
                        大会釣果を投稿
                      </Link>
                    ) : null}
                  </div>
                </div>
                {isOwner ? (
                  <div className="rounded border border-coral/20 bg-white p-3">
                    <h2 className="text-sm font-black text-ink">主催者メニュー</h2>
                    <div className="mt-3 grid gap-2">
                      <Link href={`/tournaments/${tournament.id}/admin`} className="tap-target flex items-center justify-center rounded border border-coral px-4 py-3 font-black text-coral">
                        承認画面
                      </Link>
                      <Link href={`/tournaments/${tournament.id}/edit`} className="tap-target flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-3 font-black text-ink">
                        大会編集
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {canViewPrivateContent ? (
              <>
                <section>
                  <h2 className="mb-3 text-xl font-black">参加者</h2>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {participants.length ? (
                      participants.map((participant) => (
                        <div key={participant.id} className="flex items-center gap-3 rounded border border-teal-100 bg-white p-3 shadow-soft">
                          <Avatar src={participant.avatarUrl} name={participant.userName} size="md" />
                          <div className="min-w-0">
                            <p className="truncate font-black text-ink">{participant.userName}</p>
                            <p className="mt-1 text-xs font-bold text-slate-500">参加日: {formatDate(participant.joinedAt)}</p>
                          </div>
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
                    {ranking.length ? ranking.map((row, index) => <RankingRow key={row.userId} row={row} rank={index + 1} isCurrentUser={row.userId === userId} />) : <Empty text="承認済みの大会釣果がありません。" />}
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
            ) : (
              <section className="rounded border border-slate-200 bg-white p-4 shadow-soft">
                <h2 className="text-xl font-black">参加すると閲覧できます</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                  この大会は仲間向けの非公開大会です。参加者名を入力して参加すると、ランキング・参加者・大会釣果を確認できます。
                </p>
              </section>
            )}
          </>
        ) : null}
      </main>
    </>
  );
}

function TournamentCatch({ item, userName }: { item: Catch; userName: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-3 z-10 max-w-[55%] truncate rounded-full bg-black/55 px-3 py-1 text-xs font-black text-white backdrop-blur">
        {userName}
      </span>
      <span className={`absolute right-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-black text-white ${getEntryBadgeClass(item.tournamentEntryStatus)}`}>
        {getEntryStatusLabel(item.tournamentEntryStatus)}
      </span>
      <CatchCard item={item} />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="mr-1 text-xs font-black text-slate-500">{label}:</span>
      {value}
    </p>
  );
}

function RankingRow({ row, rank, isCurrentUser }: { row: RankingRowValue; rank: number; isCurrentUser: boolean }) {
  const medal = rank <= 3 ? ["bg-yellow-400", "bg-slate-300", "bg-orange-300"][rank - 1] : "bg-white";
  return (
    <article className={`rounded border p-3 shadow-soft ${isCurrentUser ? "border-coral ring-2 ring-coral/30" : "border-teal-100"} ${medal}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <Avatar src={row.avatarUrl} name={row.userName} size="lg" />
            {rank <= 3 ? <MedalIcon rank={rank} /> : null}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black">#{rank}</p>
            <h3 className="truncate text-lg font-black">{row.userName}{isCurrentUser ? "（自分）" : ""}</h3>
            <p className="text-sm font-bold text-slate-700">{row.label}</p>
          </div>
        </div>
        {row.bestCatch?.imageUrl ? <img src={row.bestCatch.imageUrl} alt={row.bestCatch.fishType} className="h-16 w-16 rounded object-cover" /> : null}
      </div>
      {row.bestCatch ? <p className="mt-2 text-xs font-bold text-slate-700">{row.bestCatch.fishType} / {row.bestCatch.sizeCm}cm / {row.bestCatch.tidePhaseLabel}</p> : null}
    </article>
  );
}

function MedalIcon({ rank }: { rank: number }) {
  const styles = {
    1: "border-yellow-200 bg-yellow-400 text-yellow-950",
    2: "border-slate-200 bg-slate-300 text-slate-800",
    3: "border-orange-200 bg-orange-300 text-orange-950"
  }[rank];
  return (
    <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-black shadow ${styles}`}>
      {rank}
    </span>
  );
}

type RankingRowValue = { userId: string; userName: string; avatarUrl: string | null; score: number; label: string; bestCatch: Catch | null };

function buildRanking(items: Catch[], participants: TournamentParticipant[], tournament: Tournament | null): RankingRowValue[] {
  if (!tournament) return [];
  const names = new Map(participants.map((item) => [item.userId, item.userName]));
  const avatars = new Map(participants.map((item) => [item.userId, item.avatarUrl]));
  const groups = new Map<string, Catch[]>();
  for (const item of items) groups.set(item.userId, [...(groups.get(item.userId) ?? []), item]);

  return [...groups.entries()]
    .map(([userId, userItems]) => {
      const bestCatch = [...userItems].sort((a, b) => b.sizeCm - a.sizeCm)[0] ?? null;
      const userName = names.get(userId) ?? "参加者";
      const avatarUrl = avatars.get(userId) ?? null;
      if (tournament.rankingType === "count") return { userId, userName, avatarUrl, score: userItems.length, label: `${userItems.length}匹`, bestCatch };
      if (tournament.rankingType === "totalSize") {
        const score = userItems.reduce((sum, item) => sum + item.sizeCm, 0);
        return { userId, userName, avatarUrl, score, label: `合計${score.toFixed(1)}cm`, bestCatch };
      }
      return { userId, userName, avatarUrl, score: bestCatch?.sizeCm ?? 0, label: `${bestCatch?.sizeCm ?? 0}cm`, bestCatch };
    })
    .sort((a, b) => b.score - a.score);
}

function Avatar({ src, name, size }: { src: string | null | undefined; name: string; size: "md" | "lg" }) {
  const className = size === "lg" ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm";
  if (src) return <img src={src} alt={name} className={`${className} shrink-0 rounded-full object-cover ring-2 ring-white`} />;
  return (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-full bg-water text-center font-black text-white ring-2 ring-white`}>
      {name.trim().slice(0, 1) || "参"}
    </div>
  );
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

function getVisibilityLabel(visibility: Tournament["visibility"]) {
  return visibility === "public" ? "公開大会" : "非公開大会";
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
