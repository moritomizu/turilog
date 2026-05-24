"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getGroupCatches } from "@/lib/catches";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { getDiscoverableGroups, getGroupMembers, getGroupsForUser, joinGroup, requestJoinGroup } from "@/lib/groups";
import { getPreferredParticipantName, rememberParticipantName } from "@/lib/participantName";
import type { Group } from "@/types";

type GroupListItem = Group & { latestCatchCount: number; memberTotal: number };

export default function GroupsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<GroupListItem[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joinName, setJoinName] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [message, setMessage] = useState("グループ一覧を読み込んでいます。");
  const [busyId, setBusyId] = useState("");
  const joinedCount = useMemo(() => items.filter((item) => joinedIds.has(item.id)).length, [items, joinedIds]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      if (nextUser) setJoinName(getPreferredParticipantName(nextUser.displayName ?? nextUser.email ?? "メンバー"));
    });
  }, []);

  async function load(nextUser: User | null = user) {
    const [groups, joined] = await Promise.all([getDiscoverableGroups(), nextUser ? getGroupsForUser(nextUser.uid) : Promise.resolve([])]);
    const nextItems = await Promise.all(
      groups.map(async (group) => ({
        ...group,
        memberTotal: (await getGroupMembers(group.id)).length,
        latestCatchCount: (await getGroupCatches(group.id)).filter((item) => Date.now() - new Date(item.caughtAt).getTime() <= 30 * 86400000).length
      }))
    );
    setItems(nextItems);
    setJoinedIds(new Set(joined.map((group) => group.id)));
    setMessage(nextItems.length ? "" : "公開中のグループはまだありません。");
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "グループを読み込めませんでした。"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function handleJoin(group: Group) {
    if (!user) {
      setMessage("参加するにはログインしてください。");
      return;
    }
    const nextName = joinName.trim() || user.displayName || user.email || "メンバー";
    setBusyId(group.id);
    setMessage(group.visibility === "public" ? "グループに参加しています。" : "参加申請を送信しています。");
    try {
      if (group.visibility === "public") {
        await joinGroup(group, user.uid, nextName, user.email ?? null);
        rememberParticipantName(nextName);
        setMessage("グループに参加しました。");
      } else {
        await requestJoinGroup(group, user.uid, nextName, user.email ?? null, requestMessage);
        rememberParticipantName(nextName);
        setMessage("参加申請を送信しました。承認されるとグループに参加できます。");
      }
      await load(user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作できませんでした。");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeader title="グループ" actionHref="/groups/new" actionLabel="作成" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
          <h1 className="text-2xl font-black">釣り仲間グループ</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">いま動いているグループを見つけて、仲間の釣果・ランキング・分析を楽しめます。</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Link href="/groups/mine" className="tap-target rounded border border-water px-4 py-3 text-center font-black text-water">参加中 {user ? `${joinedCount}件` : ""}</Link>
            <Link href="/groups/new" className="tap-target rounded bg-coral px-4 py-3 text-center font-black text-white">新規グループ作成</Link>
            <Link href="/groups/join" className="tap-target rounded border border-slate-300 px-4 py-3 text-center font-black text-ink">招待コードで参加</Link>
          </div>
          {user ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black text-slate-600">参加名</span>
                <input value={joinName} onChange={(event) => setJoinName(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-3 text-sm font-bold" />
              </label>
              <label className="block">
                <span className="text-xs font-black text-slate-600">申請メッセージ（任意）</span>
                <input value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-3 text-sm font-bold" placeholder="よろしくお願いします" />
              </label>
            </div>
          ) : (
            <Link href="/login?next=/groups" className="tap-target mt-4 inline-flex w-full items-center justify-center rounded bg-water px-5 py-3 font-black text-white sm:w-auto">ログインして参加する</Link>
          )}
        </section>
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((group) => {
            const joined = joinedIds.has(group.id);
            return (
              <article key={group.id} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-black text-ink">{group.name}</h2>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-black ${group.visibility === "public" ? "bg-water text-white" : "bg-orange-100 text-coral"}`}>
                    {getVisibilityLabel(group.visibility)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{group.description || "説明なし"}</p>
                <div className="mt-3 space-y-1 text-xs font-bold text-slate-600">
                  <p>メンバー: {group.memberTotal}人</p>
                  <p>最新30日釣果: {group.latestCatchCount}件</p>
                  <p>作成日: {formatDate(group.createdAt)}</p>
                </div>
                <div className="mt-3 grid gap-2">
                  {joined ? (
                    <Link href={`/groups/${group.id}`} className="tap-target rounded bg-foam px-4 py-3 text-center font-black text-water">参加中・詳細を見る</Link>
                  ) : group.visibility === "public" ? (
                    <button disabled={!user || busyId === group.id || !joinName.trim()} onClick={() => handleJoin(group)} className="tap-target rounded bg-water px-4 py-3 font-black text-white disabled:opacity-50">
                      {busyId === group.id ? "参加中..." : "このグループに参加"}
                    </button>
                  ) : (
                    <button disabled={!user || busyId === group.id || !joinName.trim()} onClick={() => handleJoin(group)} className="tap-target rounded border border-coral px-4 py-3 font-black text-coral disabled:opacity-50">
                      {busyId === group.id ? "申請中..." : "参加申請する"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}

function getVisibilityLabel(value: Group["visibility"]) {
  if (value === "public") return "参加可能";
  if (value === "inviteOnly") return "申請制";
  return "非公開";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
