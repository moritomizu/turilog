"use client";

import { Loader } from "@googlemaps/js-api-loader";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard, formatDate } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { deleteCatch, getGroupCatches, updateCatch } from "@/lib/catches";
import { canDeleteGroupCatchSync, canEditGroupCatchSync, canManageGroupMembersSync, canViewGroupExactLocationSync, findGroupMember } from "@/lib/groupPermissions";
import { getGroup, getGroupMembers } from "@/lib/groups";
import type { Catch, Group, GroupMember } from "@/types";

export default function GroupDetailPage({ params }: { params: { groupId: string } }) {
  return <AuthGate>{(user) => <GroupDetail groupId={params.groupId} userId={user.uid} />}</AuthGate>;
}

function GroupDetail({ groupId, userId }: { groupId: string; userId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [items, setItems] = useState<Catch[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const currentMember = findGroupMember(members, userId);
  const canView = Boolean(currentMember);
  const canViewExact = canViewGroupExactLocationSync(group, currentMember);
  const canManageMembers = canManageGroupMembersSync(currentMember);
  const memberNames = useMemo(() => new Map(members.map((member) => [member.userId, member.userName])), [members]);
  const digest = useMemo(() => buildDigest(items), [items]);
  const ranking = useMemo(() => buildRanking(items, memberNames), [items, memberNames]);

  async function reloadItems() {
    setItems(await getGroupCatches(groupId));
  }

  async function handleEditCatch(item: Catch) {
    const fishType = window.prompt("魚種", item.fishType);
    if (fishType == null) return;
    const sizeText = window.prompt("サイズ cm", String(item.sizeCm));
    if (sizeText == null) return;
    const comment = window.prompt("コメント", item.comment);
    if (comment == null) return;
    await updateCatch(item.id, { fishType, sizeCm: Number(sizeText), comment });
    await reloadItems();
  }

  async function handleDeleteCatch(item: Catch) {
    if (!window.confirm("このグループ釣果を削除しますか？")) return;
    await deleteCatch(item.id);
    await reloadItems();
  }

  useEffect(() => {
    Promise.all([getGroup(groupId), getGroupMembers(groupId), getGroupCatches(groupId)])
      .then(([nextGroup, nextMembers, nextItems]) => {
        setGroup(nextGroup);
        setMembers(nextMembers);
        setItems(nextItems);
        setMessage(nextGroup ? "" : "グループが見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "グループを読み込めませんでした。"));
  }, [groupId]);

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
              <GroupCatchMap items={items} memberNames={memberNames} canViewExact={canViewExact} />
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black">グループ釣果一覧</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.length ? items.map((item) => (
                  <GroupCatch
                    key={item.id}
                    item={maskLocation(item, canViewExact)}
                    memberNames={memberNames}
                    showExact={canViewExact}
                    canEdit={canEditGroupCatchSync(currentMember, item, userId)}
                    canDelete={canDeleteGroupCatchSync(currentMember, item, userId)}
                    onEdit={() => handleEditCatch(item)}
                    onDelete={() => handleDeleteCatch(item)}
                  />
                )) : <Empty text="釣果がありません。" />}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}

function GroupCatch({ item, memberNames, showExact, canEdit, canDelete, onEdit, onDelete }: { item: Catch; memberNames: Map<string, string>; showExact: boolean; canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div>
      <CatchCard item={item} />
      <div className="rounded-b border-x border-b border-teal-100 bg-white p-3 text-xs font-bold leading-5 text-slate-600 shadow-soft">
        <p>釣った人: {memberNames.get(item.actualAnglerUserId) ?? "メンバー"}</p>
        <p>投稿者: {memberNames.get(item.postedByUserId) ?? "メンバー"}{item.isProxyPost ? " / 代理投稿" : ""}</p>
        {showExact ? <p>緯度経度: {item.latitude != null ? `${item.latitude.toFixed(5)}, ${item.longitude?.toFixed(5)}` : "未取得"}</p> : <p>位置情報: 非表示</p>}
        {(canEdit || canDelete) ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {canEdit ? <button onClick={onEdit} className="rounded border border-water px-3 py-2 font-black text-water">簡易編集</button> : null}
            {canDelete ? <button onClick={onDelete} className="rounded border border-coral px-3 py-2 font-black text-coral">削除</button> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GroupCatchMap({ items, memberNames, canViewExact }: { items: Catch[]; memberNames: Map<string, string>; canViewExact: boolean }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("地図を準備しています。");
  useEffect(() => {
    async function load() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMessage("Google Maps APIキーが未設定です。");
        return;
      }
      const positioned = items.map((item) => ({ item, point: getMapPoint(item, canViewExact) })).filter((entry): entry is { item: Catch; point: { lat: number; lng: number } } => Boolean(entry.point));
      if (!positioned.length) {
        setMessage("表示できる位置情報付き釣果がありません。");
        return;
      }
      const google = await new Loader({ apiKey, version: "weekly" }).load();
      const map = new google.maps.Map(mapRef.current as HTMLDivElement, { center: positioned[0].point, zoom: 10 });
      const info = new google.maps.InfoWindow();
      positioned.forEach(({ item, point }) => {
        const marker = new google.maps.Marker({ position: point, map, title: `${item.fishType} ${item.sizeCm}cm` });
        marker.addListener("click", () => {
          info.setContent(`<strong>${escapeHtml(item.fishType)} ${item.sizeCm}cm</strong><p>${formatDate(item.caughtAt)}</p><p>釣った人: ${escapeHtml(memberNames.get(item.actualAnglerUserId) ?? "メンバー")}</p><p>${escapeHtml(item.comment || "")}</p><p>${item.isProxyPost ? "代理投稿" : "本人投稿"}</p>`);
          info.open({ map, anchor: marker });
        });
      });
      setMessage("");
    }
    load().catch((error) => setMessage(error instanceof Error ? error.message : "地図を表示できませんでした。"));
  }, [items, memberNames, canViewExact]);
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

function RankingRow({ row, rank }: { row: { userName: string; best: number; count: number }; rank: number }) {
  return <div className="rounded border border-teal-100 bg-white p-3 shadow-soft"><p className="text-xs font-black text-coral">#{rank}</p><p className="font-black">{row.userName}</p><p className="text-sm font-bold text-slate-600">最大 {row.best}cm / {row.count}件</p></div>;
}

function DigestCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-teal-100 bg-white p-3 shadow-soft"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-ink">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{text}</p>;
}

function maskLocation(item: Catch, canViewExact: boolean): Catch {
  if (canViewExact) return item;
  return { ...item, latitude: null, longitude: null, pointName: "" };
}

function getMapPoint(item: Catch, canViewExact: boolean) {
  if (canViewExact && item.latitude != null && item.longitude != null) return { lat: item.latitude, lng: item.longitude };
  if (item.publicLatitude != null && item.publicLongitude != null) return { lat: item.publicLatitude, lng: item.publicLongitude };
  return null;
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

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}
