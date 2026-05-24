"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { createGroup } from "@/lib/groups";
import { getPreferredParticipantName, rememberParticipantName } from "@/lib/participantName";
import type { GroupLocationVisibility, GroupVisibility } from "@/types";

export default function NewGroupPage() {
  return <AuthGate>{(user) => <GroupForm userId={user.uid} userName={user.displayName ?? user.email ?? "オーナー"} email={user.email ?? null} />}</AuthGate>;
}

function GroupForm({ userId, userName, email }: { userId: string; userName: string; email: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState(userName);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("inviteOnly");
  const [locationVisibilityDefault, setLocationVisibilityDefault] = useState<GroupLocationVisibility>("exactForAdminsOnly");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOwnerName(getPreferredParticipantName(userName));
  }, [userName]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("グループを作成しています。");
    try {
      const nextOwnerName = ownerName.trim() || userName;
      const id = await createGroup({ ownerId: userId, ownerUserName: nextOwnerName, ownerEmail: email, name, description, visibility, locationVisibilityDefault });
      rememberParticipantName(nextOwnerName);
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
          <Field label="グループ参加名" value={ownerName} onChange={setOwnerName} required helper="グループ内で仲間に表示される名前です。大会や他グループで使った参加名があれば初期表示します。" />
          <TextArea label="説明" value={description} onChange={setDescription} />
          <Select
            label="公開範囲"
            value={visibility}
            onChange={(value) => setVisibility(value as GroupVisibility)}
            options={[
              ["private", "非公開"],
              ["inviteOnly", "招待制"],
              ["public", "公開"]
            ]}
          />
          <Select
            label="グループ内の位置情報表示"
            value={locationVisibilityDefault}
            onChange={(value) => setLocationVisibilityDefault(value as GroupLocationVisibility)}
            options={[
              ["exactForAdminsOnly", "管理者のみ正確位置を表示"],
              ["exactForAllMembers", "メンバー全員に正確位置を表示"],
              ["blurredForMembers", "メンバーにはぼかして表示"],
              ["hidden", "メンバーには表示しない"]
            ]}
          />
          <p className="rounded bg-foam p-3 text-xs font-bold leading-5 text-slate-600">作成後に招待コードが発行されます。仲間には /groups/join から招待コードを入力して参加してもらえます。</p>
          {message ? <p className="rounded bg-orange-50 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <button disabled={busy || !ownerName.trim()} className="tap-target w-full rounded bg-coral px-5 py-4 text-lg font-black text-white disabled:opacity-60">{busy ? "作成中..." : "グループを作成する"}</button>
        </form>
      </main>
    </>
  );
}

function Field({ label, value, onChange, required, helper }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; helper?: string }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold" />{helper ? <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">{helper}</span> : null}</label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full rounded border border-slate-300 bg-white p-3 font-bold" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">{options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}</select></label>;
}
