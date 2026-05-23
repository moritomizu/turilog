"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { getGroupByInviteCode, getGroupMembers, joinGroup } from "@/lib/groups";
import type { Group } from "@/types";

export default function GroupInvitePage({ params }: { params: { inviteCode: string } }) {
  const inviteCode = params.inviteCode.toUpperCase();
  const [group, setGroup] = useState<Group | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("招待内容を確認しています。");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getGroupByInviteCode(inviteCode)
      .then(async (nextGroup) => {
        setGroup(nextGroup);
        setMemberCount(nextGroup ? (await getGroupMembers(nextGroup.id)).length : 0);
        setMessage(nextGroup ? "" : "招待コードに一致するグループが見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "招待内容を読み込めませんでした。"));
  }, [inviteCode]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);

  async function handleJoin() {
    if (!group || !user) return;
    setBusy(true);
    setMessage("グループに参加しています。");
    try {
      await joinGroup(group, user.uid, user.displayName ?? user.email ?? "メンバー", user.email ?? null);
      window.location.href = `/groups/${group.id}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "グループに参加できませんでした。");
      setBusy(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(`/groups/invite/${inviteCode}`)}`;

  return (
    <>
      <PageHeader title="グループ招待" actionHref="/groups/join" actionLabel="コード入力" />
      <main className="mx-auto max-w-xl px-4 py-6">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">GROUP INVITE</p>
          <h1 className="mt-2 text-2xl font-black">{group?.name ?? "グループ招待"}</h1>
          {group ? (
            <>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{group.description || "釣り仲間からグループに招待されています。"}</p>
              <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
                <p className="rounded bg-foam p-3">メンバー: {memberCount}人</p>
                <p className="rounded bg-foam p-3">招待コード: <span className="font-black tracking-widest text-coral">{group.inviteCode}</span></p>
              </div>
              <div className="mt-5 rounded bg-orange-50 p-4 text-sm font-bold leading-6 text-slate-700">
                <p>参加すると、仲間の釣果一覧・ランキング・釣果マップ・分析を見られます。</p>
                <p className="mt-1">位置情報はグループ設定に従って保護されます。</p>
              </div>
              {user ? (
                <button disabled={busy} onClick={handleJoin} className="tap-target mt-5 w-full rounded bg-coral px-5 py-4 text-lg font-black text-white disabled:opacity-60">
                  {busy ? "参加中..." : "このグループに参加する"}
                </button>
              ) : (
                <Link href={loginHref} className="tap-target mt-5 flex w-full items-center justify-center rounded bg-water px-5 py-4 text-lg font-black text-white">
                  ログインして参加する
                </Link>
              )}
            </>
          ) : null}
          {message ? <p className="mt-4 rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
        </section>
      </main>
    </>
  );
}
