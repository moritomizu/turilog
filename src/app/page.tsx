"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getTournamentCatches } from "@/lib/catches";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { canManageGroupMembersSync, findGroupMember } from "@/lib/groupPermissions";
import { getGroupJoinRequests, getGroupMembers, getGroupsForUser } from "@/lib/groups";
import { canManageApprovals, findParticipant } from "@/lib/tournamentPermissions";
import { getTournamentParticipants, getTournaments } from "@/lib/tournaments";

const links = [
  { href: "/post", label: "釣果を投稿", body: "写真・魚種・サイズ・場所・潮位を記録" },
  { href: "/catches", label: "釣果一覧", body: "新着順で自分の釣果を確認" },
  { href: "/tournaments", label: "釣り大会", body: "大会に参加してランキングを競う" },
  { href: "/groups", label: "グループ", body: "釣り仲間と釣果・ランキング・マップを共有" },
  { href: "/ranking", label: "ランキング", body: "年間・魚種別・月別の最大サイズ" },
  { href: "/map", label: "マップ", body: "釣れた地点を地図で振り返る" },
  { href: "/analysis", label: "潮位分析", body: "上げ潮・下げ潮・何分目の傾向" }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [approvalSummary, setApprovalSummary] = useState<ApprovalSummary>(emptyApprovalSummary());

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);

  useEffect(() => {
    if (!user) {
      setApprovalSummary(emptyApprovalSummary());
      return;
    }
    loadApprovalSummary(user.uid)
      .then(setApprovalSummary)
      .catch(() => setApprovalSummary(emptyApprovalSummary()));
  }, [user]);

  const approvalCount = approvalSummary.groupRequests + approvalSummary.tournamentEntries;

  return (
    <main className="min-h-screen bg-foam px-4 py-6">
      <section className="mx-auto max-w-2xl">
        <div className="py-8">
          <p className="text-sm font-bold text-water">Personal fishing log</p>
          <h1 className="mt-2 text-4xl font-black tracking-normal text-ink">TsuriLog</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
            created by TaPiYoTa
            <br />
            心に残る一枚のために。釣果を残して振り返ろう。
            <br />
            潮位や水温、釣行データなどデータから振り返ることができる個人用釣りログです。
          </p>
        </div>

        {user && approvalCount > 0 ? (
          <section className="mb-4 rounded border border-coral/30 bg-orange-50 p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-coral">APPROVAL</p>
                <h2 className="mt-1 text-xl font-black text-ink">承認待ちがあります</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                  グループ参加申請 {approvalSummary.groupRequests}件 / 大会投稿承認 {approvalSummary.tournamentEntries}件
                </p>
              </div>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-coral px-3 text-sm font-black text-white">{approvalCount}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {approvalSummary.groupDetails.map((group) => (
                <Link key={group.id} href={`/groups/${group.id}/members`} className="tap-target flex items-center justify-between gap-3 rounded bg-white px-4 py-3 font-black text-coral">
                  <span className="min-w-0 truncate">{group.name}</span>
                  <span className="shrink-0 rounded-full bg-coral px-2 py-1 text-xs text-white">{group.count}件</span>
                </Link>
              ))}
              {approvalSummary.tournamentDetails.map((tournament) => (
                <Link key={tournament.id} href={`/tournaments/${tournament.id}/admin`} className="tap-target flex items-center justify-between gap-3 rounded bg-white px-4 py-3 font-black text-coral">
                  <span className="min-w-0 truncate">{tournament.name}</span>
                  <span className="shrink-0 rounded-full bg-coral px-2 py-1 text-xs text-white">{tournament.count}件</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-3">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="tap-target rounded border border-teal-100 bg-white p-5 shadow-soft transition hover:border-water">
              <span className="block text-xl font-black text-ink">{item.label}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">{item.body}</span>
            </Link>
          ))}
        </div>

        <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded border border-water px-5 py-4 font-bold text-water">
          ログイン設定
        </Link>
      </section>
    </main>
  );
}

type ApprovalSummary = {
  groupRequests: number;
  tournamentEntries: number;
  groupDetails: { id: string; name: string; count: number }[];
  tournamentDetails: { id: string; name: string; count: number }[];
};

function emptyApprovalSummary(): ApprovalSummary {
  return { groupRequests: 0, tournamentEntries: 0, groupDetails: [], tournamentDetails: [] };
}

async function loadApprovalSummary(userId: string) {
  const [groups, tournaments] = await Promise.all([getGroupsForUser(userId), getTournaments()]);

  const groupDetails = (
    await Promise.all(
      groups.map(async (group) => {
    const members = await getGroupMembers(group.id);
    const currentMember = findGroupMember(members, userId);
        if (!canManageGroupMembersSync(currentMember)) return null;
    const requests = await getGroupJoinRequests(group.id);
        const count = requests.filter((request) => request.status === "pending").length;
        return count > 0 ? { id: group.id, name: group.name, count } : null;
      })
    )
  ).filter((item): item is { id: string; name: string; count: number } => Boolean(item));

  const tournamentDetails = (
    await Promise.all(
      tournaments.map(async (tournament) => {
    const participants = await getTournamentParticipants(tournament.id);
    const currentParticipant = findParticipant(participants, userId, tournament.ownerId);
        if (!canManageApprovals(currentParticipant)) return null;
    const catches = await getTournamentCatches(tournament.id);
        const count = catches.filter((item) => item.tournamentEntryStatus === "pending").length;
        return count > 0 ? { id: tournament.id, name: tournament.name, count } : null;
      })
    )
  ).filter((item): item is { id: string; name: string; count: number } => Boolean(item));

  return {
    groupRequests: groupDetails.reduce((sum, item) => sum + item.count, 0),
    tournamentEntries: tournamentDetails.reduce((sum, item) => sum + item.count, 0),
    groupDetails,
    tournamentDetails
  };
}
