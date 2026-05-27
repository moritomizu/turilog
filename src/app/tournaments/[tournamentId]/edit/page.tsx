"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getFeatureAccess } from "@/lib/features";
import { deleteTournament, getTournament, parseTargetFishTypes, updateTournament } from "@/lib/tournaments";
import type { Tournament, TournamentLocationVisibility, TournamentRankingType, TournamentVisibility } from "@/types";

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
  const [locationVisibilityDefault, setLocationVisibilityDefault] = useState<TournamentLocationVisibility>("exactForOrganizersOnly");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [requiresParticipantInfo, setRequiresParticipantInfo] = useState(false);
  const [canUsePaidTournament, setCanUsePaidTournament] = useState(false);
  const [entryFeeEnabled, setEntryFeeEnabled] = useState(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFeatureAccess(userId, "paidTournament").then((access) => setCanUsePaidTournament(access.allowed)).catch(() => setCanUsePaidTournament(false));
  }, [userId]);

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
        setLocationVisibilityDefault(result.locationVisibilityDefault);
        setMaxParticipants(result.maxParticipants == null ? "" : String(result.maxParticipants));
        setRequiresParticipantInfo(result.requiresParticipantInfo);
        setEntryFeeEnabled(result.entryFeeEnabled);
        setEntryFeeAmount(result.entryFeeAmount == null ? "" : String(result.entryFeeAmount));
        setPaymentInstructions(result.paymentInstructions);
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
        targetFishTypes: parseTargetFishTypes(targetFishTypes),
        rankingType,
        rules,
        visibility,
        locationVisibilityDefault,
        requiresParticipantInfo,
        entryFeeEnabled: canUsePaidTournament && entryFeeEnabled,
        entryFeeAmount: canUsePaidTournament && entryFeeEnabled ? Number(entryFeeAmount) : null,
        entryFeeCurrency: "JPY",
        paymentInstructions: canUsePaidTournament && entryFeeEnabled ? paymentInstructions : "",
        maxParticipants: maxParticipants ? Number(maxParticipants) : null
      });
      router.push(`/tournaments/${tournamentId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
      setBusy(false);
    }
  }

  async function handleDeleteTournament() {
    if (!tournament) return;
    const ok = window.confirm("この大会を削除しますか？参加者データと大会ランキングは削除されます。釣果ログ自体は残ります。");
    if (!ok) return;
    setBusy(true);
    setMessage("大会を削除しています。");
    try {
      await deleteTournament(tournament.id, userId);
      router.push("/tournaments");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "大会を削除できませんでした。");
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
              <option value="public">公開大会</option>
              <option value="private">非公開大会</option>
            </select>
          </label>
          <VisibilityHelp visibility={visibility} />
          <label className="block">
            <span className="text-sm font-bold">大会内の位置情報表示</span>
            <select value={locationVisibilityDefault} onChange={(event) => setLocationVisibilityDefault(event.target.value as TournamentLocationVisibility)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
              <option value="exactForOrganizersOnly">主催者のみ正確位置を表示</option>
              <option value="blurredForParticipants">参加者にはぼかして表示</option>
              <option value="areaOnlyForParticipants">参加者にはエリア名のみ表示</option>
              <option value="hiddenForParticipants">参加者には表示しない</option>
            </select>
          </label>
          <Field label="参加上限人数" type="number" value={maxParticipants} onChange={setMaxParticipants} />
          <section className="rounded border border-orange-100 bg-orange-50 p-3">
            <label className="flex items-start gap-3 text-sm font-bold leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={entryFeeEnabled}
                disabled={!canUsePaidTournament}
                onChange={(event) => setEntryFeeEnabled(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 disabled:opacity-50"
              />
              <span>
                <span className="block font-black text-coral">参加費を徴収する</span>
                <span className="mt-1 block text-xs">参加者は支払い確認後に大会投稿できるようになります。</span>
              </span>
            </label>
            {!canUsePaidTournament ? <p className="mt-2 rounded bg-white p-2 text-xs font-bold text-slate-600">現在のプランでは有料大会設定を利用できません。</p> : null}
            {entryFeeEnabled && canUsePaidTournament ? (
              <div className="mt-3 space-y-3">
                <Field label="参加費（税込・円）" type="number" value={entryFeeAmount} onChange={setEntryFeeAmount} required />
                <TextArea label="支払い方法・案内" value={paymentInstructions} onChange={setPaymentInstructions} />
              </div>
            ) : null}
          </section>
          <label className="flex items-start gap-3 rounded border border-orange-100 bg-orange-50 p-3 text-sm font-bold leading-6 text-slate-700">
            <input type="checkbox" checked={requiresParticipantInfo} onChange={(event) => setRequiresParticipantInfo(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
            <span>
              <span className="block font-black text-coral">参加者情報を取得する</span>
              <span className="mt-1 block text-xs">賞品発送や安全管理のため、参加時に氏名・住所・年齢・性別・非常連絡先の入力を求めます。</span>
            </span>
          </label>
          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <button disabled={busy || !tournament} className="tap-target w-full rounded bg-coral px-5 py-4 text-lg font-black text-white disabled:opacity-60">
            {busy ? "保存中..." : "大会を保存する"}
          </button>
        </form>
        {tournament ? (
          <section className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-xs font-bold leading-5 text-slate-500">大会を削除すると、参加者データと大会ランキングは削除されます。釣果ログ自体は削除せず、通常の個人ログとして残します。</p>
            <button type="button" disabled={busy} onClick={handleDeleteTournament} className="mt-3 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-500 disabled:opacity-50">
              大会を削除する
            </button>
          </section>
        ) : null}
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

function VisibilityHelp({ visibility }: { visibility: TournamentVisibility }) {
  return (
    <div className="rounded border border-orange-100 bg-orange-50 p-3 text-xs font-bold leading-5 text-slate-700">
      {visibility === "public" ? (
        <>
          <p className="font-black text-coral">公開大会</p>
          <p className="mt-1">誰でも参加できる公募大会です。大会一覧に表示され、ランキングと大会釣果はログイン中の一般ユーザーも閲覧できます。</p>
        </>
      ) : (
        <>
          <p className="font-black text-slate-800">非公開大会</p>
          <p className="mt-1">仲間だけで行うクローズド大会です。大会一覧には表示されず、詳細URLを共有された人が参加できます。ランキング・参加者・大会釣果は参加者と作成者のみ閲覧できます。</p>
        </>
      )}
    </div>
  );
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
