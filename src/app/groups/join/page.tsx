"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { joinGroupByInviteCode } from "@/lib/groups";
import { getPreferredParticipantName, rememberParticipantName } from "@/lib/participantName";

export default function JoinGroupPage() {
  return <AuthGate>{(user) => <JoinForm userId={user.uid} userName={user.displayName ?? user.email ?? "メンバー"} email={user.email ?? null} />}</AuthGate>;
}

function JoinForm({ userId, userName, email }: { userId: string; userName: string; email: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteCode, setInviteCode] = useState(searchParams.get("code")?.toUpperCase() ?? "");
  const [joinName, setJoinName] = useState(userName);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setJoinName(getPreferredParticipantName(userName));
  }, [userName]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("参加しています。");
    try {
      const nextName = joinName.trim() || userName;
      const groupId = await joinGroupByInviteCode(inviteCode, userId, nextName, email);
      rememberParticipantName(nextName);
      router.push(`/groups/${groupId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "参加できませんでした。");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="グループ参加" actionHref="/groups" actionLabel="一覧" />
      <main className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
          <div className="rounded bg-orange-50 p-3 text-sm font-bold leading-6 text-slate-700">
            招待コードを入力すると、釣り仲間のグループに参加できます。参加後はグループ釣果・ランキング・マップ・分析を共有できます。
          </div>
          <label className="block">
            <span className="text-sm font-bold">招待コード</span>
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-lg font-black tracking-widest" placeholder="ABC123" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">グループ参加名</span>
            <input value={joinName} onChange={(event) => setJoinName(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" placeholder="仲間に表示する名前" />
            <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">大会で使った参加名がある場合は、同じ名前を初期表示します。</span>
          </label>
          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <button disabled={busy || !inviteCode.trim() || !joinName.trim()} className="tap-target w-full rounded bg-water px-5 py-4 text-lg font-black text-white disabled:opacity-60">{busy ? "参加中..." : "この名前でグループに参加する"}</button>
        </form>
      </main>
    </>
  );
}
