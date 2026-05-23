"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { canManageMembers, findParticipant, updateTournamentParticipantPermissions } from "@/lib/tournamentPermissions";
import { getTournament, getTournamentParticipants } from "@/lib/tournaments";
import type { Tournament, TournamentParticipant, TournamentRole } from "@/types";

export default function TournamentMembersPage({ params }: { params: { tournamentId: string } }) {
  return (
    <AuthGate>
      {(user) => <TournamentMembers tournamentId={params.tournamentId} userId={user.uid} />}
    </AuthGate>
  );
}

function TournamentMembers({ tournamentId, userId }: { tournamentId: string; userId: string }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const requester = tournament ? findParticipant(participants, userId, tournament.ownerId) : null;
  const canManage = canManageMembers(requester);

  const load = useCallback(async () => {
    const [nextTournament, nextParticipants] = await Promise.all([getTournament(tournamentId), getTournamentParticipants(tournamentId)]);
    setTournament(nextTournament);
    setParticipants(nextParticipants);
    setMessage(nextTournament ? "" : "大会が見つかりません。");
  }, [tournamentId]);

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "参加者管理を読み込めませんでした。"));
  }, [load]);

  async function updateParticipant(participant: TournamentParticipant, patch: Partial<Pick<TournamentParticipant, "role" | "canViewExactLocation" | "canViewPrivateCatchDetails" | "canApproveEntries">>) {
    if (!requester) return;
    try {
      await updateTournamentParticipantPermissions(requester, participant, {
        role: patch.role ?? participant.role,
        canViewExactLocation: patch.canViewExactLocation ?? participant.canViewExactLocation,
        canViewPrivateCatchDetails: patch.canViewPrivateCatchDetails ?? participant.canViewPrivateCatchDetails,
        canApproveEntries: patch.canApproveEntries ?? participant.canApproveEntries
      });
      await load();
      setMessage("権限を更新しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "権限を更新できませんでした。");
    }
  }

  if (tournament && !canManage) {
    return (
      <>
        <PageHeader title="参加者管理" actionHref={`/tournaments/${tournamentId}`} actionLabel="詳細" />
        <main className="mx-auto max-w-xl px-4 py-5">
          <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">主催者または管理者のみアクセスできます。</p>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="参加者管理" actionHref={`/tournaments/${tournamentId}`} actionLabel="詳細" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {tournament ? <h1 className="text-2xl font-black">{tournament.name} 参加者管理</h1> : null}
        <div className="grid gap-3">
          {participants.map((participant) => {
            const locked = participant.role === "owner";
            return (
              <article key={participant.id} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black">{participant.userName}</h2>
                    <p className="text-xs font-bold text-slate-500">{participant.email ?? "メール未取得"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">参加日: {formatDate(participant.joinedAt)}</p>
                  </div>
                  <label className="block min-w-40">
                    <span className="text-xs font-black text-slate-600">権限</span>
                    <select
                      disabled={locked}
                      value={participant.role}
                      onChange={(event) => updateParticipant(participant, { role: event.target.value as TournamentRole })}
                      className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm font-bold disabled:opacity-50"
                    >
                      {participant.role === "owner" ? <option value="owner">{getTournamentRoleLabel("owner")}</option> : null}
                      <option value="admin">{getTournamentRoleLabel("admin")}</option>
                      <option value="subAdmin">{getTournamentRoleLabel("subAdmin")}</option>
                      <option value="participant">{getTournamentRoleLabel("participant")}</option>
                      <option value="viewer">{getTournamentRoleLabel("viewer")}</option>
                    </select>
                  </label>
                </div>
                <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-3">
                  <Toggle label="正確位置マップ" checked={participant.canViewExactLocation} disabled={locked} onChange={(value) => updateParticipant(participant, { canViewExactLocation: value })} />
                  <Toggle label="詳細釣果情報" checked={participant.canViewPrivateCatchDetails} disabled={locked} onChange={(value) => updateParticipant(participant, { canViewPrivateCatchDetails: value })} />
                  <Toggle label="承認/却下" checked={participant.canApproveEntries} disabled={locked} onChange={(value) => updateParticipant(participant, { canApproveEntries: value })} />
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded bg-foam p-3">
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5" />
    </label>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getTournamentRoleLabel(role: TournamentRole) {
  if (role === "owner") return "主催者";
  if (role === "admin") return "管理者";
  if (role === "subAdmin") return "副管理者";
  if (role === "viewer") return "閲覧のみ";
  return "参加者";
}
