"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { ProfileStepBasic, ProfileStepMotivation, ProfileStepStyle, initialProfileSurveyState, toProfilePayload, type ProfileSurveyState } from "@/components/ProfileSurveyForm";
import { TackleFormFields, emptyTackleInput } from "@/components/TackleFormFields";
import { createTackle, type TackleInput } from "@/lib/tackles";
import { completeOnboarding, getUserProfile, skipOnboarding, uploadUserAvatar } from "@/lib/userProfiles";

export default function OnboardingPage() {
  return <AuthGate skipOnboardingCheck>{(user) => <OnboardingForm userId={user.uid} fallbackName={user.displayName ?? user.email ?? ""} />}</AuthGate>;
}

function OnboardingForm({ userId, fallbackName }: { userId: string; fallbackName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileSurveyState>(() => initialProfileSurveyState(null, fallbackName));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [tackle, setTackle] = useState<TackleInput>(emptyTackleInput());
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);
  const steps = ["基本", "スタイル", "目的", "タックル"];

  useEffect(() => {
    getUserProfile(userId)
      .then((current) => {
        setProfile(initialProfileSurveyState(current, fallbackName));
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。"));
  }, [fallbackName, userId]);

  async function handleComplete() {
    setBusy(true);
    setMessage("");
    try {
      const avatarUrl = avatarFile ? await uploadUserAvatar(userId, avatarFile) : profile.avatarUrl;
      await completeOnboarding(userId, { ...toProfilePayload(profile), avatarUrl });
      if (tackle.name.trim()) await createTackle(userId, tackle);
      router.push("/post");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    setBusy(true);
    try {
      await skipOnboarding(userId);
      router.push("/post");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "スキップできませんでした。");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="初期設定" actionHref="/post" actionLabel="投稿へ" />
      <main className="mx-auto max-w-xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">WELCOME</p>
          <h1 className="mt-1 text-2xl font-black">あなたの釣りスタイルを教えてください</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            よく行くエリアや好きな釣りを登録しておくと、釣果投稿や分析がもっと便利になります。あとから変更できます。
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {steps.map((label, index) => (
              <div key={label} className={`rounded-full px-2 py-2 text-center text-xs font-black ${index <= step ? "bg-water text-white" : "bg-foam text-slate-500"}`}>
                {index + 1}. {label}
              </div>
            ))}
          </div>
        </section>

        {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}

        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          {step === 0 ? (
            <div className="space-y-4">
              <AvatarField avatarUrl={profile.avatarUrl} file={avatarFile} displayName={profile.displayName} onChange={setAvatarFile} />
              <ProfileStepBasic state={profile} setState={setProfile} />
            </div>
          ) : null}
          {step === 1 ? <ProfileStepStyle state={profile} setState={setProfile} /> : null}
          {step === 2 ? <ProfileStepMotivation state={profile} setState={setProfile} /> : null}
          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded bg-foam p-3">
                <h2 className="text-lg font-black">よく使うタックルを登録</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-600">釣果投稿時に選ぶだけで記録できます。ここはスキップしても大丈夫です。</p>
              </div>
              <TackleFormFields value={tackle} onChange={setTackle} />
            </div>
          ) : null}
        </section>

        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" disabled={busy} onClick={handleSkip} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 font-black text-slate-600 disabled:opacity-50">
            あとで設定する
          </button>
          <button type="button" disabled={busy || step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} className="tap-target rounded border border-water bg-white px-4 py-3 font-black text-water disabled:opacity-50">
            戻る
          </button>
          {step < steps.length - 1 ? (
            <button type="button" disabled={busy} onClick={() => setStep((value) => value + 1)} className="tap-target rounded bg-water px-4 py-3 font-black text-white disabled:opacity-50">
              次へ
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={handleComplete} className="tap-target rounded bg-coral px-4 py-3 font-black text-white disabled:opacity-50">
              {busy ? "保存中..." : "初期設定を保存"}
            </button>
          )}
        </div>
      </main>
    </>
  );
}

function AvatarField({ avatarUrl, file, displayName, onChange }: { avatarUrl: string; file: File | null; displayName: string; onChange: (file: File | null) => void }) {
  const preview = file ? URL.createObjectURL(file) : avatarUrl;
  return (
    <label className="flex items-center gap-4 rounded bg-foam p-3">
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-water text-xl font-black text-white">
        {preview ? <img src={preview} alt="プロフィールアイコン" className="h-full w-full object-cover" /> : (displayName || "T").slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-700">自分のアイコン</span>
        <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">大会やプロフィールで使える画像です。あとから変更できます。</span>
        <span className="mt-2 inline-flex rounded border border-water bg-white px-3 py-2 text-xs font-black text-water">画像を選択</span>
      </span>
      <input type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="hidden" />
    </label>
  );
}
