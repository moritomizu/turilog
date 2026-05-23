"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { createCatch, emptyTackleInfo, uploadCatchImage } from "@/lib/catches";
import { canProxyPostToGroup } from "@/lib/groupPermissions";
import { getGroup, getGroupMembers } from "@/lib/groups";
import { getCurrentLocation } from "@/lib/location";
import { getLunarInfo } from "@/lib/lunar";
import { getOfficialCurrentReference } from "@/lib/officialCurrent";
import { getOfficialTideReference } from "@/lib/officialTide";
import { rememberLastPostGroupId } from "@/lib/postPreferences";
import { emptySeaTemperatureInfo } from "@/lib/seaTemperature";
import { emptyWeatherInfo } from "@/lib/weather";
import type { Group, GroupMember } from "@/types";

export default function GroupPostPage({ params }: { params: { groupId: string } }) {
  return <AuthGate>{(user) => <GroupPost groupId={params.groupId} userId={user.uid} />}</AuthGate>;
}

function GroupPost({ groupId, userId }: { groupId: string; userId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [canProxy, setCanProxy] = useState(false);
  const [actualAnglerUserId, setActualAnglerUserId] = useState(userId);
  const [fishType, setFishType] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [caughtAt, setCaughtAt] = useState(toLocalInputValue(new Date()));
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getGroup(groupId), getGroupMembers(groupId), canProxyPostToGroup(userId, groupId)])
      .then(([nextGroup, nextMembers, nextCanProxy]) => {
        setGroup(nextGroup);
        setMembers(nextMembers);
        setCanProxy(nextCanProxy);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "グループ投稿を準備できませんでした。"));
  }, [groupId, userId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!group) return;
    setBusy(true);
    setMessage("投稿しています。");
    try {
      const location = await getCurrentLocation().catch(() => null);
      const caughtAtIso = new Date(caughtAt).toISOString();
      const imageUrl = file ? await uploadCatchImage(userId, file) : null;
      const isProxyPost = actualAnglerUserId !== userId;
      await createCatch({
        userId: actualAnglerUserId,
        imageUrl,
        fishType,
        sizeCm: Number(sizeCm),
        caughtAt: caughtAtIso,
        comment,
        tackle: emptyTackleInfo(),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        publicLatitude: null,
        publicLongitude: null,
        locationVisibility: location ? "exact" : "hidden",
        areaName: "",
        pointName: "",
        isPublic: false,
        publicShareEnabledAt: null,
        tournamentId: null,
        isTournamentEntry: false,
        tournamentEntryStatus: "none",
        tournamentSubmittedAt: null,
        groupIds: [group.id],
        primaryGroupId: group.id,
        postedByUserId: userId,
        actualAnglerUserId,
        isProxyPost,
        proxyPostReason: isProxyPost ? "グループ管理者による代理投稿" : "",
        weather: emptyWeatherInfo(),
        seaTemperature: emptySeaTemperatureInfo(),
        lunar: getLunarInfo(caughtAtIso),
        ...getOfficialCurrentReference(location?.latitude, location?.longitude, caughtAtIso),
        ...getOfficialTideReference(location?.latitude, location?.longitude, caughtAtIso),
        tideHeight: null,
        tideDirection: "unknown",
        tidePhase: null,
        tidePhaseLabel: "潮位未取得",
        previousTideTime: null,
        previousTideType: "unknown",
        nextTideTime: null,
        nextTideType: "unknown",
        minutesToNextTide: null,
        tideStationName: null,
        tideStationDistance: null,
        tideApiProvider: "none"
      });
      rememberLastPostGroupId(group.id);
      router.push(`/groups/${group.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "投稿できませんでした。");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="グループ釣果投稿" actionHref={`/groups/${groupId}`} actionLabel="詳細" />
      <main className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
          <Field label="魚種" value={fishType} onChange={setFishType} required />
          <Field label="サイズ cm" value={sizeCm} onChange={setSizeCm} type="number" required />
          <Field label="釣った日時" value={caughtAt} onChange={setCaughtAt} type="datetime-local" required />
          <TextArea label="コメント" value={comment} onChange={setComment} />
          <label className="block"><span className="text-sm font-bold">写真</span><input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3" /></label>
          {canProxy ? (
            <label className="block">
              <span className="text-sm font-bold">釣った人</span>
              <select value={actualAnglerUserId} onChange={(event) => setActualAnglerUserId(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
                {members.map((member) => <option key={member.userId} value={member.userId}>{member.userName}</option>)}
              </select>
            </label>
          ) : null}
          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <button disabled={busy} className="tap-target w-full rounded bg-coral px-5 py-4 text-lg font-black text-white disabled:opacity-60">{busy ? "投稿中..." : "グループに投稿する"}</button>
        </form>
      </main>
    </>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full rounded border border-slate-300 bg-white p-3 font-bold" /></label>;
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
