"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { createGroup } from "@/lib/groups";
import type { GroupLocationVisibility, GroupVisibility } from "@/types";

export default function NewGroupPage() {
  return <AuthGate>{(user) => <GroupForm userId={user.uid} userName={user.displayName ?? user.email ?? "オーナー"} email={user.email ?? null} />}</AuthGate>;
}

function GroupForm({ userId, userName, email }: { userId: string; userName: string; email: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("inviteOnly");
  const [locationVisibilityDefault, setLocationVisibilityDefault] = useState<GroupLocationVisibility>("exactForAdminsOnly");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("グループを作成しています。");
    try {
      const id = await createGroup({ ownerId: userId, ownerUserName: userName, ownerEmail: email, name, description, visibility, locationVisibilityDefault });
      router.push(`/groups/${id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "グループを作成できませんでした。");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="グループ作成" actionHref="/groups" actionLabel="一覧" />
      <main className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
          <Field label="グループ名" value={name} onChange={setName} required />
          <TextArea label="説明" value={description} onChange={setDescription} />
          <Select label="公開範囲" value={visibility} onChange={(value) => setVisibility(value as GroupVisibility)} options={[["private", "private"], ["inviteOnly", "inviteOnly"], ["public", "public"]]} />
          <Select
            label="位置情報表示設定"
            value={locationVisibilityDefault}
            onChange={(value) => setLocationVisibilityDefault(value as GroupLocationVisibility)}
            options={[
              ["exactForAdminsOnly", "管理者のみ正確位置"],
              ["exactForAllMembers", "全メンバーに正確位置"],
              ["blurredForMembers", "メンバーにはぼかし位置"],
              ["hidden", "位置情報非表示"]
            ]}
          />
          <p className="rounded bg-foam p-3 text-xs font-bold leading-5 text-slate-600">作成後に招待コードが発行されます。仲間には /groups/join から招待コードを入力して参加してもらえます。</p>
          {message ? <p className="rounded bg-orange-50 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <button disabled={busy} className="tap-target w-full rounded bg-coral px-5 py-4 text-lg font-black text-white disabled:opacity-60">{busy ? "作成中..." : "グループを作成する"}</button>
        </form>
      </main>
    </>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full rounded border border-slate-300 bg-white p-3 font-bold" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">{options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}</select></label>;
}
