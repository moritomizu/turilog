"use client";

import { Loader } from "@googlemaps/js-api-loader";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard, formatDate } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { deleteCatch, getGroupCatches, updateCatch } from "@/lib/catches";
import { addGroupCatchComment, getGroupCatchComments } from "@/lib/groupCatchComments";
import { canDeleteGroupCatchSync, canEditGroupCatchSync, canManageGroupMembersSync, canViewGroupExactLocationSync, findGroupMember } from "@/lib/groupPermissions";
import { deleteGroup, getGroup, getGroupMembers } from "@/lib/groups";
import { getDisplayLocation } from "@/lib/locationBlur";
import type { Catch, DisplayLocation, Group, GroupCatchComment, GroupMember } from "@/types";

export default function GroupDetailPage({ params }: { params: { groupId: string } }) {
  return <AuthGate>{(user) => <GroupDetail groupId={params.groupId} userId={user.uid} />}</AuthGate>;
}

function GroupDetail({ groupId, userId }: { groupId: string; userId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [items, setItems] = useState<Catch[]>([]);
  const [comments, setComments] = useState<GroupCatchComment[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const currentMember = findGroupMember(members, userId);
  const canView = Boolean(currentMember);
  const canViewExact = canViewGroupExactLocationSync(group, currentMember);
  const canManageMembers = canManageGroupMembersSync(currentMember);
  const canDeleteGroup = currentMember?.role === "owner" || currentMember?.role === "admin";
  const memberNames = useMemo(() => new Map(members.map((member) => [member.userId, member.userName])), [members]);
  const commentsByCatch = useMemo(() => groupCommentsByCatch(comments), [comments]);
  const digest = useMemo(() => buildDigest(items), [items]);
  const ranking = useMemo(() => buildRanking(items, memberNames), [items, memberNames]);

  async function reloadItems() {
    setItems(await getGroupCatches(groupId));
  }

  async function reloadComments() {
    setComments(await getGroupCatchComments(groupId));
  }

  async function handleSaveCatch(item: Catch, patch: Partial<Pick<Catch, "fishType" | "sizeCm" | "comment" | "caughtAt" | "actualAnglerUserId">>) {
    await updateCatch(item.id, patch);
    await reloadItems();
  }

  async function handleDeleteCatch(item: Catch) {
    if (!window.confirm("このグループ釣果を削除しますか？")) return;
    await deleteCatch(item.id);
    await reloadItems();
  }

  async function handleAddComment(item: Catch, body: string, replyTo?: GroupCatchComment | null) {
    if (!currentMember) throw new Error("グループメンバーのみコメントできます。");
    await addGroupCatchComment({
      groupId,
      catchId: item.id,
      userId,
      userName: currentMember.userName,
      body,
      replyToCommentId: replyTo?.id ?? null,
      replyToUserName: replyTo?.userName ?? null
    });
    await reloadComments();
  }

  async function copyInviteLink(inviteCode: string) {
    const origin = window.location.origin;
    const url = `${origin}/groups/invite/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setMessage("招待リンクをコピーしました。LINEやSNSで仲間に送れます。");
  }

  async function handleDeleteGroup() {
    if (!group || !canDeleteGroup) return;
    if (!window.confirm(`グループ「${group.name}」を削除しますか？\n個人の釣果ログは削除されません。`)) return;
    try {
      setMessage("グループを削除しています。");
      await deleteGroup(group.id);
      window.location.href = "/groups";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "グループを削除できませんでした。");
    }
  }

  useEffect(() => {
    Promise.all([getGroup(groupId), getGroupMembers(groupId), getGroupCatches(groupId), getGroupCatchComments(groupId)])
      .then(([nextGroup, nextMembers, nextItems, nextComments]) => {
        setGroup(nextGroup);
        setMembers(nextMembers);
        setItems(nextItems);
        setComments(nextComments);
        setMessage(nextGroup ? "" : "グループが見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "グループを読み込めませんでした。"));
  }, [groupId]);

  useEffect(() => {
    if (!group || !canView) return;
    window.localStorage.setItem(`tsurilog:lastViewedGroup:${groupId}`, String(Date.now()));
    window.localStorage.setItem(`tsurilog:lastViewedGroupComments:${groupId}`, String(Date.now()));
  }, [group, canView, groupId]);

  if (group && !canView) {
    return (
      <>
        <PageHeader title="グループ詳細" actionHref="/groups" actionLabel="一覧" />
        <main className="mx-auto max-w-xl px-4 py-5">
          <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">グループメンバーのみ閲覧できます。招待コードで参加してください。</p>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="グループ詳細" actionHref="/groups" actionLabel="一覧" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {group ? (
          <>
            <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
              <p className="text-xs font-black text-water">GROUP</p>
              <h1 className="mt-1 text-2xl font-black">{group.name}</h1>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{group.description || "説明なし"}</p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2">
                <p>メンバー数: {members.length}人</p>
                <p>管理者: {members.find((member) => member.role === "owner")?.userName ?? "未取得"}</p>
                <p>招待コード: <span className="font-black tracking-widest text-coral">{group.inviteCode}</span></p>
                <p>位置情報: {getLocationLabel(group.locationVisibilityDefault)}</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {currentMember?.canPost ? <Link href={`/groups/${group.id}/post`} className="tap-target rounded bg-coral px-4 py-3 text-center font-black text-white">釣果投稿</Link> : null}
                <Link href={`/groups/${group.id}/analysis`} className="tap-target rounded border border-water px-4 py-3 text-center font-black text-water">分析</Link>
                {canManageMembers ? <Link href={`/groups/${group.id}/members`} className="tap-target rounded border border-slate-300 px-4 py-3 text-center font-black text-ink">メンバー管理</Link> : null}
                {canManageMembers ? <Link href={`/groups/${group.id}/edit`} className="tap-target rounded border border-slate-300 px-4 py-3 text-center font-black text-ink">グループ編集</Link> : null}
              </div>
            </section>

            <section className="rounded border border-coral/20 bg-orange-50 p-4 shadow-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black text-coral">INVITE</p>
                  <h2 className="mt-1 text-xl font-black">仲間を招待</h2>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">招待リンクを送ると、未ログインの人にも参加案内ページが表示されます。</p>
                </div>
                <div className="rounded bg-white px-4 py-3 text-center">
                  <p className="text-xs font-bold text-slate-500">招待コード</p>
                  <p className="text-xl font-black tracking-widest text-coral">{group.inviteCode}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button onClick={() => copyInviteLink(group.inviteCode)} className="tap-target rounded bg-coral px-4 py-3 font-black text-white">
                  招待リンクをコピー
                </button>
                <Link href={`/groups/invite/${group.inviteCode}`} className="tap-target rounded border border-coral bg-white px-4 py-3 text-center font-black text-coral">
                  招待ページを確認
                </Link>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <DigestCard label="今月の釣果" value={`${digest.monthCount}件`} />
              <DigestCard label="今月最大" value={digest.monthMax ? `${digest.monthMax}cm` : "なし"} />
              <DigestCard label="最多魚種" value={digest.topFish || "なし"} />
              <DigestCard label="直近7日" value={`${digest.weekCount}件`} />
              <DigestCard label="潮比率" value={digest.tideRatio} />
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black">グループランキング</h2>
              <div className="space-y-2">
                {ranking.length ? ranking.map((row, index) => <RankingRow key={row.userId} row={row} rank={index + 1} />) : <Empty text="釣果がありません。" />}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black">グループ釣果マップ</h2>
              <GroupCatchMap items={items} memberNames={memberNames} group={group} member={currentMember} userId={userId} />
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black">グループ釣果一覧</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.length ? items.map((item) => (
                  <GroupCatch
                    key={item.id}
                    item={maskLocation(item, getDisplayLocation(userId, item, { type: "group", group, member: currentMember }))}
                    displayLocation={getDisplayLocation(userId, item, { type: "group", group, member: currentMember })}
                    members={members}
                    memberNames={memberNames}
                    comments={commentsByCatch.get(item.id) ?? []}
                    canEdit={canEditGroupCatchSync(currentMember, item, userId)}
                    canDelete={canDeleteGroupCatchSync(currentMember, item, userId)}
                    onSave={(patch) => handleSaveCatch(item, patch)}
                    onDelete={() => handleDeleteCatch(item)}
                    onAddComment={(body, replyTo) => handleAddComment(item, body, replyTo)}
                  />
                )) : <Empty text="釣果がありません。" />}
              </div>
            </section>

            {canDeleteGroup ? (
              <section className="rounded border border-red-100 bg-white p-4 shadow-soft">
                <h2 className="text-base font-black text-red-700">危険な操作</h2>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-600">グループを削除すると、グループページとメンバー情報は削除されます。個人の釣果ログ自体は削除されません。</p>
                <button onClick={handleDeleteGroup} className="mt-3 rounded border border-red-200 px-3 py-2 text-sm font-black text-red-700">
                  グループを削除
                </button>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}

function GroupCatch({
  item,
  displayLocation,
  members,
  memberNames,
  comments,
  canEdit,
  canDelete,
  onSave,
  onDelete,
  onAddComment
}: {
  item: Catch;
  displayLocation: DisplayLocation;
  members: GroupMember[];
  memberNames: Map<string, string>;
  comments: GroupCatchComment[];
  canEdit: boolean;
  canDelete: boolean;
  onSave: (patch: Partial<Pick<Catch, "fishType" | "sizeCm" | "comment" | "caughtAt" | "actualAnglerUserId">>) => Promise<void>;
  onDelete: () => void;
  onAddComment: (body: string, replyTo?: GroupCatchComment | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<GroupCatchComment | null>(null);
  const [fishType, setFishType] = useState(item.fishType);
  const [sizeCm, setSizeCm] = useState(String(item.sizeCm));
  const [caughtAt, setCaughtAt] = useState(toLocalInputValue(new Date(item.caughtAt)));
  const [comment, setComment] = useState(item.comment);
  const [actualAnglerUserId, setActualAnglerUserId] = useState(item.actualAnglerUserId);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);

  async function handleSave() {
    const nextSize = Number(sizeCm);
    const nextCaughtAt = new Date(caughtAt);
    if (!fishType.trim()) {
      setMessage("魚種を入力してください。");
      return;
    }
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      setMessage("サイズを正しく入力してください。");
      return;
    }
    if (!Number.isFinite(nextCaughtAt.getTime())) {
      setMessage("釣った日時を正しく入力してください。");
      return;
    }
    setBusy(true);
    setMessage("保存しています。");
    try {
      await onSave({
        fishType: fishType.trim(),
        sizeCm: nextSize,
        caughtAt: nextCaughtAt.toISOString(),
        comment,
        actualAnglerUserId
      });
      setMessage("編集内容を保存しました。");
      setEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "編集できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommentSubmit() {
    if (!commentBody.trim()) {
      setMessage("コメントを入力してください。");
      return;
    }
    setCommentBusy(true);
    setMessage("コメントを追加しています。");
    try {
      await onAddComment(commentBody, replyTo);
      setCommentBody("");
      setReplyTo(null);
      setMessage(replyTo ? "返信を追加しました。" : "コメントを追加しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "コメントを追加できませんでした。");
    } finally {
      setCommentBusy(false);
    }
  }

  return (
    <div>
      <CatchCard item={item} />
      <div className="rounded-b border-x border-b border-teal-100 bg-white p-3 text-xs font-bold leading-5 text-slate-600 shadow-soft">
        <p>釣った人: {memberNames.get(item.actualAnglerUserId) ?? "メンバー"}</p>
        <p>投稿者: {memberNames.get(item.postedByUserId) ?? "メンバー"}{item.isProxyPost ? " / 代理投稿" : ""}</p>
        {displayLocation.type === "exact" ? <p>緯度経度: {displayLocation.latitude != null ? `${displayLocation.latitude.toFixed(5)}, ${displayLocation.longitude?.toFixed(5)}` : "未取得"}</p> : null}
        {(canEdit || canDelete) ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {canEdit ? <button onClick={() => setEditing((value) => !value)} className="rounded border border-water px-3 py-2 font-black text-water">{editing ? "編集を閉じる" : "編集"}</button> : null}
            {canDelete ? <button onClick={onDelete} className="rounded border border-coral px-3 py-2 font-black text-coral">削除</button> : null}
          </div>
        ) : null}
        {editing ? (
          <div className="mt-3 space-y-3 rounded bg-foam p-3">
            <EditField label="魚種" value={fishType} onChange={setFishType} />
            <EditField label="サイズ cm" type="number" value={sizeCm} onChange={setSizeCm} />
            <EditField label="釣った日時" type="datetime-local" value={caughtAt} onChange={setCaughtAt} />
            <label className="block">
              <span className="text-xs font-black text-slate-600">釣った人</span>
              <select value={actualAnglerUserId} onChange={(event) => setActualAnglerUserId(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm font-bold">
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black text-slate-600">コメント</span>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1 min-h-20 w-full rounded border border-slate-300 bg-white p-2 text-sm" />
            </label>
            <button type="button" disabled={busy} onClick={handleSave} className="tap-target w-full rounded bg-water px-4 py-3 text-sm font-black text-white disabled:opacity-60">
              {busy ? "保存中..." : "編集内容を保存"}
            </button>
            {message ? <p className="text-xs font-bold leading-5 text-slate-600">{message}</p> : null}
          </div>
        ) : null}
        <div className="mt-3 rounded bg-foam p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-slate-600">コメント</p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-500">{comments.length}件</span>
          </div>
          {comments.length ? (
            <div className="mt-2 space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className={`rounded bg-white p-2 ${comment.replyToCommentId ? "ml-4 border-l-4 border-water/30" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-ink">{comment.userName}</p>
                    <p className="shrink-0 text-[11px] text-slate-400">{formatCommentDate(comment.createdAt)}</p>
                  </div>
                  {comment.replyToUserName ? <p className="mt-1 text-[11px] font-black text-water">@{comment.replyToUserName} への返信</p> : null}
                  <p className="mt-1 whitespace-pre-wrap text-sm font-bold leading-5 text-slate-700">{comment.body}</p>
                  <button type="button" onClick={() => setReplyTo(comment)} className="mt-2 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-600">
                    返信
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs font-bold text-slate-500">まだコメントはありません。</p>
          )}
          <div className="mt-3 flex gap-2">
            <div className="min-w-0 flex-1">
              {replyTo ? (
                <div className="mb-2 flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-xs font-bold text-slate-600">
                  <span className="min-w-0 truncate">@{replyTo.userName} に返信</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 text-coral">解除</button>
                </div>
              ) : null}
              <input
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                className="w-full rounded border border-slate-300 bg-white p-2 text-sm font-bold"
                placeholder={replyTo ? "返信を書く" : "ナイス、状況メモなど"}
              />
            </div>
            <button type="button" disabled={commentBusy || !commentBody.trim()} onClick={handleCommentSubmit} className="rounded bg-water px-3 py-2 text-sm font-black text-white disabled:opacity-50">
              {replyTo ? "返信" : "送信"}
            </button>
          </div>
          {!editing && message ? <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm font-bold" />
    </label>
  );
}

function GroupCatchMap({ items, memberNames, group, member, userId }: { items: Catch[]; memberNames: Map<string, string>; group: Group; member: GroupMember | null; userId: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("地図を準備しています。");
  useEffect(() => {
    async function load() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMessage("Google Maps APIキーが未設定です。");
        return;
      }
      const positioned = items
        .map((item) => ({ item, displayLocation: getDisplayLocation(userId, item, { type: "group", group, member }) }))
        .filter((entry): entry is { item: Catch; displayLocation: DisplayLocation & { latitude: number; longitude: number } } => entry.displayLocation.latitude != null && entry.displayLocation.longitude != null);
      if (!positioned.length) {
        setMessage("表示できる位置情報付き釣果がありません。");
        return;
      }
      const google = await new Loader({ apiKey, version: "weekly" }).load();
      const map = new google.maps.Map(mapRef.current as HTMLDivElement, { center: { lat: positioned[0].displayLocation.latitude, lng: positioned[0].displayLocation.longitude }, zoom: 10 });
      const info = new google.maps.InfoWindow();
      positioned.forEach(({ item, displayLocation }) => {
        const marker = new google.maps.Marker({ position: { lat: displayLocation.latitude, lng: displayLocation.longitude }, map, title: `${item.fishType} ${item.sizeCm}cm` });
        marker.addListener("click", () => {
          info.setContent(`<strong>${escapeHtml(item.fishType)} ${item.sizeCm}cm</strong><p>${formatDate(item.caughtAt)}</p><p>釣った人: ${escapeHtml(memberNames.get(item.actualAnglerUserId) ?? "メンバー")}</p><p>${escapeHtml(item.comment || "")}</p><p>${item.isProxyPost ? "代理投稿" : "本人投稿"}</p><p>${escapeHtml(displayLocation.message)}</p>`);
          info.open({ map, anchor: marker });
        });
      });
      setMessage("");
    }
    load().catch((error) => setMessage(error instanceof Error ? error.message : "地図を表示できませんでした。"));
  }, [items, memberNames, group, member, userId]);
  return <div>{message ? <p className="mb-3 rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}<div ref={mapRef} className="h-[52vh] min-h-[340px] rounded border border-teal-100 bg-white shadow-soft" /></div>;
}

function buildDigest(items: Catch[]) {
  const now = new Date();
  const monthItems = items.filter((item) => new Date(item.caughtAt).getFullYear() === now.getFullYear() && new Date(item.caughtAt).getMonth() === now.getMonth());
  const weekItems = items.filter((item) => Date.now() - new Date(item.caughtAt).getTime() <= 7 * 86400000);
  const rising = items.filter((item) => item.tideDirection === "rising").length;
  const falling = items.filter((item) => item.tideDirection === "falling").length;
  return {
    monthCount: monthItems.length,
    monthMax: monthItems.length ? Math.max(...monthItems.map((item) => item.sizeCm)) : 0,
    topFish: topValue(monthItems.map((item) => item.fishType)),
    weekCount: weekItems.length,
    tideRatio: rising + falling ? `上げ${rising} / 下げ${falling}` : "未取得"
  };
}

function buildRanking(items: Catch[], memberNames: Map<string, string>) {
  const groups = new Map<string, Catch[]>();
  items.forEach((item) => groups.set(item.actualAnglerUserId, [...(groups.get(item.actualAnglerUserId) ?? []), item]));
  return [...groups.entries()].map(([userId, userItems]) => ({ userId, userName: memberNames.get(userId) ?? "メンバー", best: Math.max(...userItems.map((item) => item.sizeCm)), count: userItems.length })).sort((a, b) => b.best - a.best);
}

function groupCommentsByCatch(comments: GroupCatchComment[]) {
  const groups = new Map<string, GroupCatchComment[]>();
  comments.forEach((comment) => groups.set(comment.catchId, [...(groups.get(comment.catchId) ?? []), comment]));
  return groups;
}

function RankingRow({ row, rank }: { row: { userName: string; best: number; count: number }; rank: number }) {
  return <div className="rounded border border-teal-100 bg-white p-3 shadow-soft"><p className="text-xs font-black text-coral">#{rank}</p><p className="font-black">{row.userName}</p><p className="text-sm font-bold text-slate-600">最大 {row.best}cm / {row.count}件</p></div>;
}

function DigestCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-teal-100 bg-white p-3 shadow-soft"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-ink">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{text}</p>;
}

function maskLocation(item: Catch, displayLocation: DisplayLocation): Catch {
  if (displayLocation.type === "exact") return item;
  return { ...item, latitude: null, longitude: null, pointName: "" };
}

function topValue(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function getLocationLabel(value: Group["locationVisibilityDefault"]) {
  if (value === "exactForAllMembers") return "全メンバーに正確位置";
  if (value === "blurredForMembers") return "メンバーにはぼかし位置";
  if (value === "hidden") return "非表示";
  return "管理者のみ正確位置";
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}
