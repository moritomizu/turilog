"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getGroupCatches } from "@/lib/catches";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { getGroupCatchComments } from "@/lib/groupCatchComments";
import { getDiscoverableGroups, getGroupMembers, getGroupsForUser, joinGroup, requestJoinGroup } from "@/lib/groups";
import { getPreferredParticipantName, rememberParticipantName } from "@/lib/participantName";
import type { Catch, Group, GroupCatchComment } from "@/types";

type GroupListItem = Group & { latestCatchCount: number; memberTotal: number; newCommentCount: number };
type GroupListItemWithUnread = GroupListItem & { newCatchCount: number };

export default function GroupsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<GroupListItem[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joinName, setJoinName] = useState("");
  const [openRequestGroupId, setOpenRequestGroupId] = useState("");
  const [requestMessages, setRequestMessages] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("グループ一覧を読み込んでいます。");
  const [busyId, setBusyId] = useState("");
  const visibleGroups = useMemo(() => buildGroupSections(items, joinedIds), [items, joinedIds]);
  const joinedCount = visibleGroups.joined.length;

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      if (nextUser) setJoinName(getPreferredParticipantName(nextUser.displayName ?? nextUser.email ?? "メンバー"));
    });
  }, []);

  async function load(nextUser: User | null = user) {
    const [groups, joined] = await Promise.all([getDiscoverableGroups(), nextUser ? getGroupsForUser(nextUser.uid) : Promise.resolve([])]);
    const groupMap = new Map([...groups, ...joined].map((group) => [group.id, group]));
    const nextItems = await Promise.all(
      [...groupMap.values()].map(async (group) => {
        const [catches, comments] = await Promise.all([getGroupCatches(group.id), getGroupCatchComments(group.id)]);
        return {
          ...group,
          memberTotal: (await getGroupMembers(group.id)).length,
          latestCatchCount: catches.filter((item) => Date.now() - new Date(item.caughtAt).getTime() <= 30 * 86400000).length,
          newCatchCount: getNewCatchCount(group.id, catches),
          newCommentCount: nextUser ? getNewCommentCount(group.id, catches, comments, nextUser.uid) : 0
        };
      })
    );
    setItems(nextItems);
    setJoinedIds(new Set(joined.map((group) => group.id)));
    setMessage(nextItems.length ? "" : "公開中のグループはまだありません。");
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "グループを読み込めませんでした。"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function handleJoin(group: Group, groupMessage = "") {
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
        await requestJoinGroup(group, user.uid, nextName, user.email ?? null, groupMessage);
        rememberParticipantName(nextName);
        setOpenRequestGroupId("");
        setRequestMessages((current) => ({ ...current, [group.id]: "" }));
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
            <div className="mt-4">
              <label className="block">
                <span className="text-xs font-black text-slate-600">参加名</span>
                <input value={joinName} onChange={(event) => setJoinName(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-3 text-sm font-bold" />
                <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">参加・申請時にグループ管理者へ表示される名前です。</span>
              </label>
            </div>
          ) : (
            <Link href="/login?next=/groups" className="tap-target mt-4 inline-flex w-full items-center justify-center rounded bg-water px-5 py-3 font-black text-white sm:w-auto">ログインして参加する</Link>
          )}
        </section>
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <GroupSection title="参加中のグループ" items={visibleGroups.joined} joinedIds={joinedIds} user={user} joinName={joinName} busyId={busyId} openRequestGroupId={openRequestGroupId} requestMessages={requestMessages} onJoin={handleJoin} onOpenRequest={setOpenRequestGroupId} onRequestMessageChange={setRequestMessages} />
        <GroupSection title="参加可能なグループ" items={visibleGroups.publicGroups} joinedIds={joinedIds} user={user} joinName={joinName} busyId={busyId} openRequestGroupId={openRequestGroupId} requestMessages={requestMessages} onJoin={handleJoin} onOpenRequest={setOpenRequestGroupId} onRequestMessageChange={setRequestMessages} />
        <GroupSection title="申請制のグループ" items={visibleGroups.requestGroups} joinedIds={joinedIds} user={user} joinName={joinName} busyId={busyId} openRequestGroupId={openRequestGroupId} requestMessages={requestMessages} onJoin={handleJoin} onOpenRequest={setOpenRequestGroupId} onRequestMessageChange={setRequestMessages} />
      </main>
    </>
  );
}

function GroupSection({
  title,
  items,
  joinedIds,
  user,
  joinName,
  busyId,
  openRequestGroupId,
  requestMessages,
  onJoin,
  onOpenRequest,
  onRequestMessageChange
}: {
  title: string;
  items: GroupListItemWithUnread[];
  joinedIds: Set<string>;
  user: User | null;
  joinName: string;
  busyId: string;
  openRequestGroupId: string;
  requestMessages: Record<string, string>;
  onJoin: (group: Group, groupMessage?: string) => Promise<void>;
  onOpenRequest: (groupId: string) => void;
  onRequestMessageChange: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-xl font-black">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((group) => {
            const joined = joinedIds.has(group.id);
            const requestOpen = openRequestGroupId === group.id;
            const requestMessage = requestMessages[group.id] ?? "";
            return (
              <article key={group.id} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-ink">{group.name}</h3>
                    {joined && (group.newCatchCount > 0 || group.newCommentCount > 0) ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {group.newCatchCount > 0 ? <span className="inline-flex rounded-full bg-coral px-2 py-0.5 text-xs font-black text-white">{group.newCatchCount}件の新着</span> : null}
                        {group.newCommentCount > 0 ? <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-black text-coral ring-1 ring-coral/30">コメント{group.newCommentCount}件</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {user?.uid === group.ownerId ? <span className="rounded-full bg-ink px-2 py-1 text-xs font-black text-white">主催者</span> : null}
                    {joined ? <span className="rounded-full bg-water px-2 py-1 text-xs font-black text-white">参加中</span> : null}
                    <span className={`rounded-full px-2 py-1 text-xs font-black ${group.visibility === "public" ? "bg-water/10 text-water" : "bg-orange-100 text-coral"}`}>
                      {getVisibilityLabel(group.visibility)}
                    </span>
                  </div>
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
                  ) : !user ? (
                    <div className="rounded bg-foam p-3">
                      <p className="text-xs font-bold leading-5 text-slate-600">
                        {group.visibility === "public"
                          ? "新規登録またはログインすると、このグループに参加できます。"
                          : "新規登録またはログインすると、このグループへ参加申請を送れます。"}
                      </p>
                      <Link href="/login?next=/groups" className="tap-target mt-2 flex items-center justify-center rounded bg-water px-4 py-3 text-sm font-black text-white">
                        ログイン / 新規登録へ
                      </Link>
                    </div>
                  ) : group.visibility === "public" ? (
                    <button disabled={busyId === group.id || !joinName.trim()} onClick={() => onJoin(group)} className="tap-target rounded bg-water px-4 py-3 font-black text-white disabled:opacity-50">
                      {busyId === group.id ? "参加中..." : "このグループに参加"}
                    </button>
                  ) : (
                    <div className="rounded border border-orange-100 bg-orange-50 p-3">
                      {!requestOpen ? (
                        <>
                          <p className="text-xs font-bold leading-5 text-slate-700">このグループは申請制です。概要を確認して、管理者へメッセージを添えて申請できます。</p>
                          <button type="button" disabled={!joinName.trim()} onClick={() => onOpenRequest(group.id)} className="tap-target mt-2 w-full rounded border border-coral bg-white px-4 py-3 font-black text-coral disabled:opacity-50">
                            参加申請フォームを開く
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded bg-white p-3 text-xs font-bold leading-5 text-slate-700">
                            <p className="font-black text-ink">申請先: {group.name}</p>
                            <p className="mt-1">{group.description || "説明なし"}</p>
                          </div>
                          <label className="block">
                            <span className="text-xs font-black text-slate-600">管理者へのメッセージ</span>
                            <textarea
                              value={requestMessage}
                              onChange={(event) => onRequestMessageChange((current) => ({ ...current, [group.id]: event.target.value }))}
                              className="mt-1 min-h-24 w-full rounded border border-orange-200 bg-white p-3 text-sm font-bold"
                              placeholder="例: いつも大阪湾でシーバスをしています。参加よろしくお願いします。"
                            />
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button type="button" onClick={() => onOpenRequest("")} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 font-black text-slate-700">
                              キャンセル
                            </button>
                            <button disabled={busyId === group.id || !joinName.trim()} onClick={() => onJoin(group, requestMessage)} className="tap-target rounded bg-coral px-4 py-3 font-black text-white disabled:opacity-50">
                              {busyId === group.id ? "申請中..." : "この内容で申請"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}

function buildGroupSections(items: GroupListItem[], joinedIds: Set<string>) {
  const withUnread = items as GroupListItemWithUnread[];
  return {
    joined: withUnread.filter((item) => joinedIds.has(item.id)).sort((a, b) => b.newCommentCount + b.newCatchCount - (a.newCommentCount + a.newCatchCount)),
    publicGroups: withUnread.filter((item) => !joinedIds.has(item.id) && item.visibility === "public"),
    requestGroups: withUnread.filter((item) => !joinedIds.has(item.id) && item.visibility === "inviteOnly")
  };
}

function getNewCatchCount(groupId: string, catches: { caughtAt: string }[]) {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(`tsurilog:lastViewedGroup:${groupId}`);
  const fallback = Date.now() - 7 * 86400000;
  const since = stored ? Number(stored) : fallback;
  return catches.filter((item) => new Date(item.caughtAt).getTime() > since).length;
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

function getVisibilityLabel(value: Group["visibility"]) {
  if (value === "public") return "参加可能";
  if (value === "inviteOnly") return "申請制";
  return "非公開";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
