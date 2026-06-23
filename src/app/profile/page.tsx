"use client";

import Link from "next/link";
import type { User as FirebaseUser } from "firebase/auth";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { ProfileStepBasic, ProfileStepMotivation, ProfileStepStyle, initialProfileSurveyState, toProfilePayload, type ProfileSurveyState } from "@/components/ProfileSurveyForm";
import { planDefinitions } from "@/lib/plans";
import { getAgeRangeLabel, getFishingFrequencyLabel, getFishingMotivationLabel } from "@/lib/profileOptions";
import { isPremiumProfile, syncPremiumStatus } from "@/lib/stripeSubscriptionClient";
import { getUserProfile, saveUserProfileData, uploadUserAvatar } from "@/lib/userProfiles";
import type { UserProfile } from "@/types";

export default function ProfilePage() {
  return <AuthGate skipOnboardingCheck>{(user) => <ProfileEditor user={user} fallbackName={user.displayName ?? user.email ?? ""} />}</AuthGate>;
}

function ProfileEditor({ user, fallbackName }: { user: FirebaseUser; fallbackName: string }) {
  const userId = user.uid;
  const [profile, setProfile] = useState<ProfileSurveyState>(() => initialProfileSurveyState(null, fallbackName));
  const [accountProfile, setAccountProfile] = useState<UserProfile | null>(null);
  const [planChecking, setPlanChecking] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUserProfile(userId)
      .then((current) => {
        setAccountProfile(current);
        setProfile(initialProfileSurveyState(current, fallbackName));
        setMessage("");
        if (!isPremiumProfile(current)) {
          setPlanChecking(true);
          syncPremiumStatus(user)
            .then((synced) => {
              if (synced) return getUserProfile(userId).then(setAccountProfile);
              return undefined;
            })
            .finally(() => setPlanChecking(false));
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。"));
  }, [fallbackName, user, userId]);

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
          <PlanStatusCard profile={accountProfile} checking={planChecking} />
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

function PlanStatusCard({ profile, checking }: { profile: UserProfile | null; checking: boolean }) {
  const plan = profile?.subscriptionPlan ?? "free";
  const definition = planDefinitions[plan] ?? planDefinitions.free;
  const isPremium = isPremiumProfile(profile);
  return (
    <div className="mt-3 rounded border border-teal-100 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-500">現在のプラン</p>
          <p className="mt-1 text-lg font-black text-ink">{checking ? "確認中..." : isPremium ? "Premium" : definition.label}</p>
          {profile?.currentPeriodEnd ? <p className="mt-1 text-xs font-bold text-slate-500">次回更新目安: {new Date(profile.currentPeriodEnd).toLocaleDateString("ja-JP")}</p> : null}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${isPremium ? "bg-water text-white" : "bg-slate-100 text-slate-600"}`}>
          {checking ? "確認中" : isPremium ? "利用中" : "Free"}
        </span>
      </div>
      <Link href="/plans" className="mt-3 inline-flex rounded border border-water bg-white px-3 py-2 text-xs font-black text-water">
        プランを見る
      </Link>
    </div>
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
