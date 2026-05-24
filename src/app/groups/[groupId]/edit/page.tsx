"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { canManageGroupMembersSync, findGroupMember } from "@/lib/groupPermissions";
import { getGroup, getGroupMembers, updateGroup } from "@/lib/groups";
import type { Group, GroupLocationVisibility, GroupMember, GroupVisibility } from "@/types";

export default function GroupEditPage({ params }: { params: { groupId: string } }) {
  return <AuthGate>{(user) => <GroupEdit groupId={params.groupId} userId={user.uid} />}</AuthGate>;
}

function GroupEdit({ groupId, userId }: { groupId: string; userId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [currentMember, setCurrentMember] = useState<GroupMember | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("inviteOnly");
  const [locationVisibilityDefault, setLocationVisibilityDefault] = useState<GroupLocationVisibility>("exactForAdminsOnly");
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getGroup(groupId), getGroupMembers(groupId)])
      .then(([nextGroup, members]) => {
        const member = findGroupMember(members, userId);
        setGroup(nextGroup);
        setCurrentMember(member);
        if (nextGroup) {
          setName(nextGroup.name);
          setDescription(nextGroup.description);
          setVisibility(nextGroup.visibility);
          setLocationVisibilityDefault(nextGroup.locationVisibilityDefault);
        }
        setMessage(nextGroup ? "" : "グループが見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "グループを読み込めませんでした。"));
  }, [groupId, userId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("保存しています。");
    try {
      await updateGroup(groupId, userId, { name, description, visibility, locationVisibilityDefault });
      router.push(`/groups/${groupId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "グループを保存できませんでした。");
      setBusy(false);
    }
  }

  if (group && !canManageGroupMembersSync(currentMember)) {
    return (
      <>
        <PageHeader title="グループ編集" actionHref={`/groups/${groupId}`} actionLabel="戻る" />
        <main className="mx-auto max-w-xl px-4 py-5">
          <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">グループ管理者のみ編集できます。</p>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="グループ編集" actionHref={`/groups/${groupId}`} actionLabel="戻る" />
      <main className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <Field label="グループ名" value={name} onChange={setName} required />
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
          <button disabled={busy || !name.trim()} className="tap-target w-full rounded bg-water px-5 py-4 text-lg font-black text-white disabled:opacity-60">
            {busy ? "保存中..." : "変更を保存"}
          </button>
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
