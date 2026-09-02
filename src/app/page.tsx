"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getGroupCatches, getTournamentCatches } from "@/lib/catches";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { getGroupCatchComments } from "@/lib/groupCatchComments";
import { canManageGroupMembersSync, findGroupMember } from "@/lib/groupPermissions";
import { getGroupJoinRequests, getGroupMembers, getGroupsForUser } from "@/lib/groups";
import { isAdminProfile } from "@/lib/features";
import { canManageApprovals, canManageMembers, findParticipant } from "@/lib/tournamentPermissions";
import { getTournamentParticipants, getTournaments } from "@/lib/tournaments";
import { getUserProfile } from "@/lib/userProfiles";
import { LandingPage } from "@/components/landing/LandingPage";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";
import type { Catch, GroupCatchComment } from "@/types";

const links = [
  { href: "/media", label: "メディア", body: "釣果記録や釣りのヒントを読む" },
  { href: "/tournaments", label: "釣り大会", body: "大会に参加してランキングを競う" },
  { href: "/groups", label: "グループ", body: "釣り仲間と釣果・ランキング・マップを共有" },
  { href: "/ai-report", label: "AIレポートβ", body: "釣果傾向から次回釣行のヒントを作成" },
  { href: "/settings/notifications", label: "通知設定", body: "大会・グループ・AIレポートの通知を管理" },
  { href: "/plans", label: "プラン", body: "準備中の便利機能と候補プランを見る" }
];

const bannerSlides = [
  {
    title: "心に残る１枚を",
    body: "写真、潮、水温、タックルをまとめて残す個人用釣りログ。",
    href: "/post",
    action: "釣果を投稿"
  },
  {
    title: "仲間の釣果が動き出す。",
    body: "グループで釣果、ランキング、マップ、コメントを共有。",
    href: "/groups",
    action: "グループを見る"
  },
  {
    title: "大会も、日常の釣りも。",
    body: "承認、ランキング、参加者管理までMVPで運用できます。",
    href: "/tournaments",
    action: "大会を見る"
  }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvalSummary, setApprovalSummary] = useState<ApprovalSummary>(emptyApprovalSummary());
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setApprovalSummary(emptyApprovalSummary());
      setProfileAvatarUrl(null);
      setIsAdmin(false);
      return;
    }
    getUserProfile(user.uid)
      .then((profile) => {
        setProfileAvatarUrl(profile?.avatarUrl ?? user.photoURL ?? null);
        setIsAdmin(isAdminProfile(profile));
      })
      .catch(() => {
        setProfileAvatarUrl(user.photoURL ?? null);
        setIsAdmin(false);
      });
    loadApprovalSummary(user.uid)
      .then(setApprovalSummary)
      .catch(() => setApprovalSummary(emptyApprovalSummary()));
  }, [user]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % bannerSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const approvalCount = approvalSummary.groupRequests + approvalSummary.tournamentEntries + approvalSummary.tournamentPaymentReviews;
  const commentCount = approvalSummary.commentDetails.reduce((sum, item) => sum + item.count, 0);

  if (!authReady) {
    return (
      <main className="min-h-screen bg-foam px-6 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <TsuriLogLogo className="mx-auto h-12 w-44 object-contain" />
          <p className="mt-4 text-sm font-black text-slate-500">読み込み中...</p>
          <section className="mt-8 rounded-[1.5rem] border border-teal-100 bg-white p-6 text-left shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-water">Personal Fishing Log</p>
            <h1 className="mt-3 text-2xl font-black leading-tight text-ink sm:text-4xl">TSURILOGUE（釣りローグ）｜釣果記録・釣果共有・釣り大会アプリ</h1>
            <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
              TSURILOGUEは、釣果写真、魚種、サイズ、潮位、天候、タックル、ポイントを記録し、次の釣行に活かせる釣果記録・釣りログアプリです。個人の記録から、仲間との釣果共有、オンライン釣り大会まで広げられます。
            </p>
            <nav className="mt-5 flex flex-wrap gap-2 text-sm font-black" aria-label="主要ページ">
              <Link href="/ja/about" className="rounded-full bg-foam px-3 py-2 text-water">TSURILOGUEとは</Link>
              <Link href="/ja/features" className="rounded-full bg-foam px-3 py-2 text-water">機能</Link>
              <Link href="/ja/media" className="rounded-full bg-foam px-3 py-2 text-water">メディア</Link>
              <Link href="/ja/tournaments" className="rounded-full bg-foam px-3 py-2 text-water">釣り大会</Link>
              <Link href="/ja/groups" className="rounded-full bg-foam px-3 py-2 text-water">グループ</Link>
            </nav>
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <SeoMiniCard title="釣果記録" text="写真、潮位、天候、タックルをまとめて残せます。" />
              <SeoMiniCard title="釣果共有" text="仲間内のグループで釣果を振り返れます。" />
              <SeoMiniCard title="オンライン釣り大会" text="期間と魚種を決めてランキングを楽しめます。" />
            </section>
            <section className="mt-6 rounded bg-foam p-4">
              <h2 className="text-base font-black text-ink">よくある質問</h2>
              <dl className="mt-3 space-y-3 text-sm font-bold leading-6 text-slate-600">
                <div>
                  <dt className="text-ink">無料で使えますか？</dt>
                  <dd>基本の釣果記録、釣果一覧、グループ参加、大会参加から始められます。</dd>
                </div>
                <div>
                  <dt className="text-ink">釣った場所は公開されますか？</dt>
                  <dd>正確な位置は権限や共有設定に応じて制御し、必要に応じてエリア表示やぼかし表示を使います。</dd>
                </div>
              </dl>
            </section>
          </section>
        </div>
      </main>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <main className="min-h-screen bg-foam px-4 py-5">
      <section className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4 py-3">
          <TsuriLogLogo className="h-9 w-32 max-w-[34vw] sm:h-[3.6rem] sm:w-[13.2rem] sm:max-w-[48vw]" />
          <Link href={user ? "/profile" : "/login"} aria-label="プロフィール設定" className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-teal-100 bg-white text-base font-black text-water shadow-soft">
            {profileAvatarUrl ? <img src={profileAvatarUrl} alt="" className="h-full w-full object-cover" /> : user ? getInitial(user.displayName ?? user.email) : "人"}
          </Link>
        </div>

        <PwaInstallBanner userId={user.uid} />

        <section className="relative mb-4 overflow-hidden rounded bg-ink text-white shadow-soft">
          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeBanner * 100}%)` }}>
            {bannerSlides.map((slide, index) => (
              <article key={slide.title} className="relative min-w-full">
                <div className="absolute inset-0 bg-[url('/icons/tsurilog-icon.png')] bg-cover bg-center opacity-60" aria-hidden="true" />
                <div className={`absolute inset-0 ${index === 0 ? "bg-gradient-to-r from-black/75 via-black/30 to-transparent" : index === 1 ? "bg-gradient-to-r from-teal-950/80 via-teal-900/35 to-black/20" : "bg-gradient-to-r from-slate-950/80 via-slate-900/35 to-black/20"}`} aria-hidden="true" />
                <div className="relative flex min-h-44 flex-col justify-end p-5 sm:min-h-56 sm:p-7">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">Personal fishing log</p>
                  <h1 className="mt-2 max-w-sm text-2xl font-black leading-tight sm:text-3xl">{slide.title}</h1>
                  <p className="mt-2 max-w-md text-sm font-bold leading-6 text-white/90">{slide.body}</p>
                  <Link href={slide.href} className="tap-target mt-4 inline-flex w-fit items-center rounded bg-white px-4 py-2 text-sm font-black text-ink">
                    {slide.action}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {bannerSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setActiveBanner(index)}
                className={`h-2 rounded-full transition-all ${activeBanner === index ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                aria-label={`${index + 1}枚目のバナーを表示`}
              />
            ))}
          </div>
        </section>

        {user && approvalCount > 0 ? (
          <section className="mb-4 rounded border border-coral/30 bg-orange-50 p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-coral">APPROVAL</p>
                <h2 className="mt-1 text-xl font-black text-ink">承認待ちがあります</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                  グループ参加申請 {approvalSummary.groupRequests}件 / 大会投稿承認 {approvalSummary.tournamentEntries}件 / 大会参加確認 {approvalSummary.tournamentPaymentReviews}件
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
              {approvalSummary.tournamentPaymentDetails.map((tournament) => (
                <Link key={tournament.id} href={`/tournaments/${tournament.id}/members`} className="tap-target flex items-center justify-between gap-3 rounded bg-white px-4 py-3 font-black text-coral">
                  <span className="min-w-0 truncate">{tournament.name} 参加確認</span>
                  <span className="shrink-0 rounded-full bg-coral px-2 py-1 text-xs text-white">{tournament.count}件</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {user && commentCount > 0 ? (
          <section className="mb-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-water">COMMENTS</p>
                <h2 className="mt-1 text-xl font-black text-ink">自分の釣果にコメントがあります</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-700">グループ内の自分の投稿に新しいコメントが届いています。</p>
              </div>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-coral px-3 text-sm font-black text-white">{commentCount}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {approvalSummary.commentDetails.map((group) => (
                <Link key={group.id} href={`/groups/${group.id}`} className="tap-target flex items-center justify-between gap-3 rounded bg-foam px-4 py-3 font-black text-water">
                  <span className="min-w-0 truncate">{group.name}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs text-coral ring-1 ring-coral/30">コメント{group.count}件</span>
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

        {isAdmin ? (
          <footer className="mt-5 rounded border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-xs font-black text-slate-500">ADMIN</p>
            <Link href="/admin" className="tap-target mt-2 flex items-center justify-between gap-3 rounded bg-slate-900 px-4 py-3 text-sm font-black text-white">
              <span>管理者画面TOP</span>
              <span aria-hidden="true">→</span>
            </Link>
          </footer>
        ) : null}
      </section>
    </main>
  );
}

type ApprovalSummary = {
  groupRequests: number;
  tournamentEntries: number;
  tournamentPaymentReviews: number;
  groupDetails: { id: string; name: string; count: number }[];
  tournamentDetails: { id: string; name: string; count: number }[];
  tournamentPaymentDetails: { id: string; name: string; count: number }[];
  commentDetails: { id: string; name: string; count: number }[];
};

function emptyApprovalSummary(): ApprovalSummary {
  return { groupRequests: 0, tournamentEntries: 0, tournamentPaymentReviews: 0, groupDetails: [], tournamentDetails: [], tournamentPaymentDetails: [], commentDetails: [] };
}

function getInitial(value: string | null | undefined) {
  return (value || "T").trim().slice(0, 1).toUpperCase();
}

function SeoMiniCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded border border-teal-100 bg-white p-3">
      <h2 className="text-sm font-black text-ink">{title}</h2>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{text}</p>
    </article>
  );
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

  const tournamentPaymentDetails = (
    await Promise.all(
      tournaments.map(async (tournament) => {
        if (!tournament.entryFeeEnabled) return null;
        const participants = await getTournamentParticipants(tournament.id);
        const currentParticipant = findParticipant(participants, userId, tournament.ownerId);
        if (!canManageMembers(currentParticipant)) return null;
        const count = participants.filter((participant) => participant.role !== "owner" && participant.paymentStatus === "unpaid").length;
        return count > 0 ? { id: tournament.id, name: tournament.name, count } : null;
      })
    )
  ).filter((item): item is { id: string; name: string; count: number } => Boolean(item));

  const commentDetails = (
    await Promise.all(
      groups.map(async (group) => {
        const [catches, comments] = await Promise.all([getGroupCatches(group.id), getGroupCatchComments(group.id)]);
        const count = getNewCommentCount(group.id, catches, comments, userId);
        return count > 0 ? { id: group.id, name: group.name, count } : null;
      })
    )
  ).filter((item): item is { id: string; name: string; count: number } => Boolean(item));

  return {
    groupRequests: groupDetails.reduce((sum, item) => sum + item.count, 0),
    tournamentEntries: tournamentDetails.reduce((sum, item) => sum + item.count, 0),
    tournamentPaymentReviews: tournamentPaymentDetails.reduce((sum, item) => sum + item.count, 0),
    groupDetails,
    tournamentDetails,
    tournamentPaymentDetails,
    commentDetails
  };
}

function getNewCommentCount(groupId: string, catches: Catch[], comments: GroupCatchComment[], userId: string) {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(`tsurilog:lastViewedGroupComments:${groupId}`);
  const fallback = Date.now() - 7 * 86400000;
  const since = stored ? Number(stored) : fallback;
  const myCatchIds = new Set(
    catches
      .filter((item) => item.userId === userId || item.actualAnglerUserId === userId)
      .map((item) => item.id)
  );
  return comments.filter((comment) => myCatchIds.has(comment.catchId) && comment.userId !== userId && new Date(comment.createdAt).getTime() > since).length;
}
