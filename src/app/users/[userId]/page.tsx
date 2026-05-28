"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getAgeRangeLabel, getFishingFrequencyLabel, getFishingMotivationLabel } from "@/lib/profileOptions";
import { getUserProfile } from "@/lib/userProfiles";
import type { UserProfile } from "@/types";

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  return <AuthGate skipOnboardingCheck>{() => <PublicProfile userId={params.userId} />}</AuthGate>;
}

function PublicProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState("プロフィールを読み込んでいます。");

  useEffect(() => {
    getUserProfile(userId)
      .then((nextProfile) => {
        setProfile(nextProfile);
        setMessage(nextProfile ? "" : "プロフィールが見つかりません。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。"));
  }, [userId]);

  return (
    <>
      <PageHeader title="プロフィール" actionHref="/groups" actionLabel="グループ" />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {profile ? (
          <>
            <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-4">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-water text-2xl font-black text-white">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="プロフィールアイコン" className="h-full w-full object-cover" /> : (profile.displayName || "T").slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-water">ANGLER PROFILE</p>
                  <h1 className="mt-1 truncate text-2xl font-black text-ink">{profile.displayName || "釣り人"}</h1>
                  <p className="mt-1 text-sm font-bold text-slate-500">{profile.residenceArea || "居住エリア未設定"}</p>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">
                {profile.selfIntroduction || "自己紹介はまだありません。"}
              </p>
            </section>

            <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
              <h2 className="text-lg font-black text-ink">釣りスタイル</h2>
              <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2">
                <ProfileItem label="年代" value={getAgeRangeLabel(profile.ageRange)} />
                <ProfileItem label="釣行頻度" value={getFishingFrequencyLabel(profile.fishingFrequency)} />
                <ProfileItem label="熱量" value={getFishingMotivationLabel(profile.fishingMotivation)} />
                <ProfileItem label="釣行スタイル" value={profile.fishingStyle || "未設定"} />
              </div>
              <TagList title="よく行くエリア" values={profile.fishingAreas ?? []} />
              <TagList title="主なジャンル" values={profile.fishingGenres ?? []} />
            </section>

            <Link href="/groups" className="tap-target block rounded border border-water bg-white px-4 py-3 text-center font-black text-water">
              グループへ戻る
            </Link>
          </>
        ) : null}
      </main>
    </>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-foam p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function TagList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-black text-slate-500">{title}</p>
      {values.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className="rounded-full bg-foam px-3 py-1 text-xs font-black text-slate-700">
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-bold text-slate-500">未設定</p>
      )}
    </div>
  );
}
