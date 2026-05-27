"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { ProfileStepBasic, ProfileStepMotivation, ProfileStepStyle, initialProfileSurveyState, toProfilePayload, type ProfileSurveyState } from "@/components/ProfileSurveyForm";
import { getAgeRangeLabel, getFishingFrequencyLabel, getFishingMotivationLabel } from "@/lib/profileOptions";
import { getUserProfile, saveUserProfileData, uploadUserAvatar } from "@/lib/userProfiles";

export default function ProfilePage() {
  return <AuthGate skipOnboardingCheck>{(user) => <ProfileEditor userId={user.uid} fallbackName={user.displayName ?? user.email ?? ""} />}</AuthGate>;
}

function ProfileEditor({ userId, fallbackName }: { userId: string; fallbackName: string }) {
  const [profile, setProfile] = useState<ProfileSurveyState>(() => initialProfileSurveyState(null, fallbackName));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUserProfile(userId)
      .then((current) => {
        setProfile(initialProfileSurveyState(current, fallbackName));
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。"));
  }, [fallbackName, userId]);

  async function handleSave() {
    setBusy(true);
    setMessage("");
    try {
      const avatarUrl = avatarFile ? await uploadUserAvatar(userId, avatarFile) : profile.avatarUrl;
      await saveUserProfileData(userId, { ...toProfilePayload(profile), avatarUrl });
      setProfile((current) => ({ ...current, avatarUrl }));
      setAvatarFile(null);
      setMessage("プロフィールを保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="プロフィール" actionHref="/profile/tackles" actionLabel="タックル" />
      <main className="mx-auto max-w-xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h1 className="text-2xl font-black">プロフィール編集</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">釣りスタイルを更新しておくと、投稿や分析を少しずつ自分仕様にできます。</p>
          <Link href="/settings/notifications" className="tap-target mt-4 inline-flex rounded border border-water bg-white px-4 py-3 text-sm font-black text-water">
            通知設定
          </Link>
          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3">
            <p className="rounded bg-foam p-2">年代: {getAgeRangeLabel(profile.ageRange)}</p>
            <p className="rounded bg-foam p-2">頻度: {getFishingFrequencyLabel(profile.fishingFrequency)}</p>
            <p className="rounded bg-foam p-2">熱量: {getFishingMotivationLabel(profile.fishingMotivation)}</p>
          </div>
        </section>

        {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}

        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-black">基本プロフィール</h2>
          <AvatarField avatarUrl={profile.avatarUrl} file={avatarFile} displayName={profile.displayName} onChange={setAvatarFile} />
          <div className="mt-4" />
          <ProfileStepBasic state={profile} setState={setProfile} />
        </section>
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-black">釣りスタイル</h2>
          <ProfileStepStyle state={profile} setState={setProfile} />
        </section>
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-black">熱量・利用目的</h2>
          <ProfileStepMotivation state={profile} setState={setProfile} />
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <button disabled={busy} onClick={handleSave} className="tap-target rounded bg-water px-5 py-3 font-black text-white disabled:opacity-50">
            {busy ? "保存中..." : "プロフィールを保存"}
          </button>
          <Link href="/post" className="tap-target rounded border border-slate-300 bg-white px-5 py-3 text-center font-black text-ink">
            投稿へ戻る
          </Link>
        </div>
      </main>
    </>
  );
}

function AvatarField({ avatarUrl, file, displayName, onChange }: { avatarUrl: string; file: File | null; displayName: string; onChange: (file: File | null) => void }) {
  const preview = file ? URL.createObjectURL(file) : avatarUrl;
  return (
    <label className="flex items-center gap-4 rounded bg-foam p-3">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-water text-xl font-black text-white">
        {preview ? <img src={preview} alt="プロフィールアイコン" className="h-full w-full object-cover" /> : (displayName || "T").slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-700">自分のアイコン</span>
        <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">プロフィールや今後の表示に使います。</span>
        <span className="mt-2 inline-flex rounded border border-water bg-white px-3 py-2 text-xs font-black text-water">画像を選択</span>
      </span>
      <input type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="hidden" />
    </label>
  );
}
