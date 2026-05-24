"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getGroupCatches } from "@/lib/catches";
import { getGroupMembers, getGroupsForUser } from "@/lib/groups";
import type { Group } from "@/types";

type GroupListItem = Group & { latestCatchCount: number; memberTotal: number };

export default function MyGroupsPage() {
  return <AuthGate>{(user) => <GroupList userId={user.uid} />}</AuthGate>;
}

function GroupList({ userId }: { userId: string }) {
  const [items, setItems] = useState<GroupListItem[]>([]);
  const [message, setMessage] = useState("読み込み中です。");

  useEffect(() => {
    getGroupsForUser(userId)
      .then(async (groups) => {
        const next = await Promise.all(
          groups.map(async (group) => ({
            ...group,
            memberTotal: (await getGroupMembers(group.id)).length,
            latestCatchCount: (await getGroupCatches(group.id)).filter((item) => Date.now() - new Date(item.caughtAt).getTime() <= 30 * 86400000).length
          }))
        );
        setItems(next);
        setMessage(next.length ? "" : "所属しているグループはまだありません。公開グループ一覧から参加できます。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "グループを読み込めませんでした。"));
  }, [userId]);

  return (
    <>
      <PageHeader title="参加中グループ" actionHref="/groups" actionLabel="探す" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
          <h1 className="text-2xl font-black">参加中のグループ</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">自分が参加しているグループの釣果・ランキング・マップ・分析を見返せます。</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link href="/groups" className="tap-target rounded border border-water px-4 py-3 text-center font-black text-water">公開グループを探す</Link>
            <Link href="/groups/new" className="tap-target rounded bg-coral px-4 py-3 text-center font-black text-white">新規グループ作成</Link>
          </div>
        </section>
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
              <h2 className="text-lg font-black text-ink">{group.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{group.description || "説明なし"}</p>
              <div className="mt-3 space-y-1 text-xs font-bold text-slate-600">
                <p>メンバー: {group.memberTotal}人</p>
                <p>最新30日釣果: {group.latestCatchCount}件</p>
                <p>作成日: {formatDate(group.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
