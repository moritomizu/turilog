"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getTournament, updateTournament } from "@/lib/tournaments";
import type { Tournament, TournamentRankingType, TournamentVisibility } from "@/types";

export default function EditTournamentPage({ params }: { params: { tournamentId: string } }) {
  return (
    <AuthGate>
      {(user) => <TournamentEditForm tournamentId={params.tournamentId} userId={user.uid} />}
    </AuthGate>
  );
}

function TournamentEditForm({ tournamentId, userId }: { tournamentId: string; userId: string }) {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [targetFishTypes, setTargetFishTypes] = useState("");
  const [rankingType, setRankingType] = useState<TournamentRankingType>("biggest");
  const [rules, setRules] = useState("");
  const [visibility, setVisibility] = useState<TournamentVisibility>("public");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTournament(tournamentId)
      .then((result) => {
        setTournament(result);
        if (!result) {
          setMessage("大会が見つかりません。");
          return;
        }
        setName(result.name);
        setDescription(result.description);
        setStartAt(toLocalInputValue(result.startAt));
        setEndAt(toLocalInputValue(result.endAt));
        setTargetFishTypes(result.targetFishTypes.join(", "));
        setRankingType(result.rankingType);
        setRules(result.rules);
        setVisibility(result.visibility);
        setMaxParticipants(result.maxParticipants == null ? "" : String(result.maxParticipants));
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "大会を読み込めませんでした。"));
  }, [tournamentId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("保存しています。");
    try {
      await updateTournament(tournamentId, userId, {
        name,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        targetFishTypes: targetFishTypes.split(",").map((item) => item.trim()).filter(Boolean),
        rankingType,
        rules,
        visibility,
        maxParticipants: maxParticipants ? Number(maxParticipants) : null
      });
      router.push(`/tournaments/${tournamentId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
      setBusy(false);
    }
  }

  if (tournament && tournament.ownerId !== userId) {
    return (
      <>
        <PageHeader title="大会編集" actionHref={`/tournaments/${tournamentId}`} actionLabel="詳細" />
        <main className="mx-auto max-w-xl px-4 py-5">
          <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">大会作成者のみ編集できます。</p>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="大会編集" actionHref={`/tournaments/${tournamentId}`} actionLabel="詳細" />
      <main className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
          <Field label="大会名" value={name} onChange={setName} required />
          <TextArea label="説明" value={description} onChange={setDescription} />
          <Field label="開始日時" type="datetime-local" value={startAt} onChange={setStartAt} required />
          <Field label="終了日時" type="datetime-local" value={endAt} onChange={setEndAt} required />
          <Field label="対象魚種（カンマ区切り）" value={targetFishTypes} onChange={setTargetFishTypes} />
          <label className="block">
            <span className="text-sm font-bold">ランキング方式</span>
            <select value={rankingType} onChange={(event) => setRankingType(event.target.value as TournamentRankingType)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
              <option value="biggest">最大サイズ1匹勝負</option>
              <option value="totalSize">合計サイズ</option>
              <option value="count">匹数勝負</option>
            </select>
          </label>
          <TextArea label="ルール説明" value={rules} onChange={setRules} />
          <label className="block">
            <span className="text-sm font-bold">公開設定</span>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as TournamentVisibility)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
              <option value="public">公開</option>
              <option value="private">非公開</option>
            </select>
          </label>
          <Field label="参加上限人数" type="number" value={maxParticipants} onChange={setMaxParticipants} />
          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <button disabled={busy || !tournament} className="tap-target w-full rounded bg-coral px-5 py-4 text-lg font-black text-white disabled:opacity-60">
            {busy ? "保存中..." : "大会を保存する"}
          </button>
        </form>
      </main>
    </>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full rounded border border-slate-300 bg-white p-3 font-bold" />
    </label>
  );
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
