"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { FeatureGate } from "@/components/FeatureGate";
import { PageHeader } from "@/components/PageHeader";
import { getFeatureAccess } from "@/lib/features";
import { createTournament, parseTargetFishTypes, uploadTournamentImage } from "@/lib/tournaments";
import type { TournamentLocationVisibility, TournamentRankingType, TournamentVisibility } from "@/types";

export default function NewTournamentPage() {
  return (
    <AuthGate>
      {(user) => (
        <FeatureGate userId={user.uid} featureKey="tournamentCreate">
          <TournamentForm userId={user.uid} userName={user.displayName ?? user.email ?? "主催者"} email={user.email ?? null} />
        </FeatureGate>
      )}
    </AuthGate>
  );
}

function TournamentForm({ userId, userName, email }: { userId: string; userName: string; email: string | null }) {
  const router = useRouter();
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFeatureAccess(userId, "paidTournament").then((access) => setCanUsePaidTournament(access.allowed)).catch(() => setCanUsePaidTournament(false));
  }, [userId]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("大会を作成しています。");
    try {
      const imageUrl = imageFile ? await uploadTournamentImage(userId, imageFile) : null;
      const id = await createTournament({
        ownerId: userId,
        name,
        description,
        imageUrl,
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
        maxParticipants: maxParticipants ? Number(maxParticipants) : null,
        ownerUserName: userName,
        ownerEmail: email
      });
      router.push(`/tournaments/${id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "大会を作成できませんでした。");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="大会作成" actionHref="/tournaments" actionLabel="一覧" />
      <main className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
          <Field label="大会名" value={name} onChange={setName} required />
          <TextArea label="説明" value={description} onChange={setDescription} />
          <label className="block">
            <span className="text-sm font-bold">大会画像（任意）</span>
            <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-sm font-bold" />
          </label>
          {imagePreview ? <img src={imagePreview} alt="" className="aspect-[16/9] w-full rounded object-cover" /> : null}
          <Field label="開始日時" type="datetime-local" value={startAt} onChange={setStartAt} required />
          <Field label="終了日時" type="datetime-local" value={endAt} onChange={setEndAt} required />
          <Field label="対象魚種（カンマ区切り）" value={targetFishTypes} onChange={setTargetFishTypes} placeholder="シーバス, マダイ" />
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
          <Field label="参加上限人数" type="number" value={maxParticipants} onChange={setMaxParticipants} placeholder="未入力なら上限なし" />
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
                <span className="mt-1 block text-xs">
                  Organizerプラン以上向けの想定機能です。参加者は支払い確認後に大会投稿できるようになります。
                </span>
              </span>
            </label>
            {!canUsePaidTournament ? <p className="mt-2 rounded bg-white p-2 text-xs font-bold text-slate-600">現在のプランでは有料大会設定を利用できません。</p> : null}
            {entryFeeEnabled && canUsePaidTournament ? (
              <div className="mt-3 space-y-3">
                <Field label="参加費（税込・円）" type="number" value={entryFeeAmount} onChange={setEntryFeeAmount} placeholder="例: 3000" required />
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
          <button disabled={busy} className="tap-target w-full rounded bg-coral px-5 py-4 text-lg font-black text-white disabled:opacity-60">
            {busy ? "作成中..." : "大会を作成する"}
          </button>
        </form>
      </main>
    </>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold" />
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
