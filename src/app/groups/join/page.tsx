"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { joinGroupByInviteCode } from "@/lib/groups";

export default function JoinGroupPage() {
  return <AuthGate>{(user) => <JoinForm userId={user.uid} userName={user.displayName ?? user.email ?? "メンバー"} email={user.email ?? null} />}</AuthGate>;
}

function JoinForm({ userId, userName, email }: { userId: string; userName: string; email: string | null }) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("参加しています。");
    try {
      const groupId = await joinGroupByInviteCode(inviteCode, userId, userName, email);
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
          <label className="block">
            <span className="text-sm font-bold">招待コード</span>
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-lg font-black tracking-widest" placeholder="ABC123" />
          </label>
          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <button disabled={busy || !inviteCode.trim()} className="tap-target w-full rounded bg-water px-5 py-4 text-lg font-black text-white disabled:opacity-60">{busy ? "参加中..." : "グループに参加する"}</button>
        </form>
      </main>
    </>
  );
}
