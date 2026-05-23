"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { canManageGroupMembersSync, findGroupMember } from "@/lib/groupPermissions";
import { getGroup, getGroupMembers, updateGroupMemberPermissions } from "@/lib/groups";
import type { Group, GroupMember, GroupRole } from "@/types";

export default function GroupMembersPage({ params }: { params: { groupId: string } }) {
  return <AuthGate>{(user) => <GroupMembers groupId={params.groupId} userId={user.uid} />}</AuthGate>;
}

function GroupMembers({ groupId, userId }: { groupId: string; userId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const requester = findGroupMember(members, userId);
  const canManage = canManageGroupMembersSync(requester);

  const load = useCallback(async () => {
    const [nextGroup, nextMembers] = await Promise.all([getGroup(groupId), getGroupMembers(groupId)]);
    setGroup(nextGroup);
    setMembers(nextMembers);
    setMessage(nextGroup ? "" : "グループが見つかりません。");
  }, [groupId]);

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "メンバーを読み込めませんでした。"));
  }, [load]);

  async function updateMember(member: GroupMember, patch: Partial<Pick<GroupMember, "role" | "canViewExactLocation" | "canPost" | "canProxyPost" | "canEditGroupCatches" | "canDeleteGroupCatches">>) {
    if (!requester) return;
    if (member.role === "owner") {
      setMessage("ownerは変更できません。");
      return;
    }
    if (patch.role === "admin" && requester.role !== "owner") {
      setMessage("adminを設定できるのはownerのみです。");
      return;
    }
    await updateGroupMemberPermissions(member, {
      role: patch.role ?? member.role,
      canViewExactLocation: patch.canViewExactLocation ?? member.canViewExactLocation,
      canPost: patch.canPost ?? member.canPost,
      canProxyPost: patch.canProxyPost ?? member.canProxyPost,
      canEditGroupCatches: patch.canEditGroupCatches ?? member.canEditGroupCatches,
      canDeleteGroupCatches: patch.canDeleteGroupCatches ?? member.canDeleteGroupCatches
    });
    await load();
    setMessage("権限を更新しました。");
  }

  if (group && !canManage) {
    return <><PageHeader title="メンバー管理" actionHref={`/groups/${groupId}`} actionLabel="詳細" /><main className="mx-auto max-w-xl px-4 py-5"><p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">owner/adminのみアクセスできます。</p></main></>;
  }

  return (
    <>
      <PageHeader title="メンバー管理" actionHref={`/groups/${groupId}`} actionLabel="詳細" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {group ? <h1 className="text-2xl font-black">{group.name} メンバー管理</h1> : null}
        <div className="grid gap-3">
          {members.map((member) => {
            const locked = member.role === "owner" || (requester?.role === "admin" && member.role === "admin");
            return (
              <article key={member.id} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><h2 className="text-lg font-black">{member.userName}</h2><p className="text-xs font-bold text-slate-500">{member.email ?? "メール未取得"}</p><p className="mt-1 text-xs font-bold text-slate-500">参加日: {formatDate(member.joinedAt)}</p></div>
                  <label className="block min-w-44"><span className="text-xs font-black text-slate-600">role</span><select disabled={locked} value={member.role} onChange={(event) => updateMember(member, { role: event.target.value as GroupRole })} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm font-bold disabled:opacity-50">{member.role === "owner" ? <option value="owner">owner</option> : null}<option value="admin">admin</option><option value="moderator">moderator</option><option value="member">member</option><option value="viewer">viewer</option></select></label>
                </div>
                <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2 lg:grid-cols-5">
                  <Toggle label="正確位置" checked={member.canViewExactLocation} disabled={locked} onChange={(value) => updateMember(member, { canViewExactLocation: value })} />
                  <Toggle label="投稿" checked={member.canPost} disabled={locked} onChange={(value) => updateMember(member, { canPost: value })} />
                  <Toggle label="代理投稿" checked={member.canProxyPost} disabled={locked} onChange={(value) => updateMember(member, { canProxyPost: value })} />
                  <Toggle label="釣果編集" checked={member.canEditGroupCatches} disabled={locked} onChange={(value) => updateMember(member, { canEditGroupCatches: value })} />
                  <Toggle label="釣果削除" checked={member.canDeleteGroupCatches} disabled={locked} onChange={(value) => updateMember(member, { canDeleteGroupCatches: value })} />
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded bg-foam p-3"><span>{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5" /></label>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
