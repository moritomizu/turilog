"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import {
  defaultNotificationPreferences,
  enablePushNotifications,
  getNotificationPermissionLabel,
  notificationCategories,
  saveNotificationPreferences,
  sendSelfTestNotification
} from "@/lib/notificationSettings";
import { getUserProfile } from "@/lib/userProfiles";
import type { NotificationPreferences, UserProfile } from "@/types";

export default function NotificationSettingsPage() {
  return <AuthGate>{(user) => <NotificationSettings userId={user.uid} />}</AuthGate>;
}

function NotificationSettings({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissionLabel, setPermissionLabel] = useState("確認中");
  const [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [message, setMessage] = useState("通知設定を読み込んでいます。");
  const [busy, setBusy] = useState(false);
  const tokenCount = profile?.fcmTokens?.length ?? 0;
  const supported = useMemo(() => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator, []);

  useEffect(() => {
    setPermissionLabel(getNotificationPermissionLabel());
    getUserProfile(userId)
      .then((nextProfile) => {
        setProfile(nextProfile);
        setEnabled(nextProfile?.notificationEnabled === true);
        setPreferences(nextProfile?.notificationPreferences ?? defaultNotificationPreferences);
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "通知設定を読み込めませんでした。"));
  }, [userId]);

  async function handleEnable() {
    setBusy(true);
    setMessage("通知許可を確認しています。");
    try {
      await enablePushNotifications(userId);
      const nextProfile = await getUserProfile(userId);
      setProfile(nextProfile);
      setEnabled(true);
      setPreferences(nextProfile?.notificationPreferences ?? defaultNotificationPreferences);
      setPermissionLabel(getNotificationPermissionLabel());
      setMessage("通知を有効にしました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通知を有効にできませんでした。");
      setPermissionLabel(getNotificationPermissionLabel());
    } finally {
      setBusy(false);
    }
  }

  async function handlePreferenceChange(key: keyof NotificationPreferences, value: boolean) {
    const nextPreferences = { ...preferences, [key]: value };
    setPreferences(nextPreferences);
    try {
      await saveNotificationPreferences(userId, nextPreferences, enabled);
      setMessage("通知カテゴリを更新しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通知カテゴリを保存できませんでした。");
    }
  }

  async function handleEnabledChange(value: boolean) {
    setEnabled(value);
    try {
      await saveNotificationPreferences(userId, preferences, value);
      setMessage(value ? "通知設定をONにしました。" : "通知設定をOFFにしました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通知設定を保存できませんでした。");
    }
  }

  async function handleTest() {
    setBusy(true);
    setMessage("テスト通知を送信しています。");
    try {
      const result = await sendSelfTestNotification();
      const sent = result.sent ?? 0;
      const detail = typeof result.message === "string" && sent === 0 ? ` ${result.message}` : "";
      const failures = Array.isArray(result.failureMessages) && result.failureMessages.length ? ` 失敗理由: ${result.failureMessages.join(" / ")}` : "";
      const diagnostics = result.diagnostics
        ? ` 対象:${result.diagnostics.targetUsers ?? 0} / ユーザー:${result.diagnostics.existingUsers ?? 0} / ON:${result.diagnostics.notificationEnabledUsers ?? 0} / トークン:${result.diagnostics.tokenCount ?? 0}`
        : "";
      setMessage(`テスト通知を送信しました。送信数: ${sent}${detail}${diagnostics}${failures}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "テスト通知を送信できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="通知設定" actionHref="/profile" actionLabel="プロフィール" />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">PWA NOTIFICATION</p>
          <h1 className="mt-1 text-2xl font-black text-ink">通知設定</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
            大会投稿の承認、グループ釣果、AIレポート完了など、重要な動きを通知できます。通知はいつでもOFFにできます。
          </p>
          <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
            <p>ブラウザ対応: {supported ? "対応" : "非対応または制限あり"}</p>
            <p>通知許可状態: {permissionLabel}</p>
            <p>登録済み端末: {tokenCount}件</p>
          </div>
          <button disabled={busy || !supported} onClick={handleEnable} className="tap-target mt-4 w-full rounded bg-water px-5 py-4 text-base font-black text-white disabled:opacity-60">
            {busy ? "処理中..." : "通知を有効にする"}
          </button>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">iPhoneでは、ホーム画面に追加したPWAから開いた場合のみ通知が使えることがあります。</p>
        </section>

        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-ink">通知全体</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">OFFにすると、カテゴリ設定に関係なく通知を送りません。</p>
            </div>
            <input type="checkbox" className="h-6 w-6" checked={enabled} onChange={(event) => handleEnabledChange(event.target.checked)} />
          </div>
        </section>

        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-black text-ink">受け取りたい通知</h2>
          <div className="mt-4 space-y-3">
            {notificationCategories.map((item) => (
              <label key={item.key} className="flex items-start justify-between gap-3 rounded bg-foam p-3">
                <span>
                  <span className="block text-sm font-black text-ink">{item.label}</span>
                  <span className="mt-1 block text-xs font-bold leading-5 text-slate-600">{item.description}</span>
                </span>
                <input type="checkbox" className="mt-1 h-5 w-5" checked={preferences[item.key]} onChange={(event) => handlePreferenceChange(item.key, event.target.checked)} />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded border border-orange-100 bg-orange-50 p-5 shadow-soft">
          <h2 className="text-lg font-black text-ink">テスト通知</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-700">通知設定後、実際に届くか確認できます。</p>
          <button disabled={busy || !enabled || tokenCount === 0} onClick={handleTest} className="tap-target mt-4 w-full rounded bg-coral px-5 py-4 text-base font-black text-white disabled:opacity-60">
            テスト通知を送る
          </button>
        </section>

        {message ? <p className="rounded bg-white p-4 text-sm font-bold leading-6 text-slate-700 shadow-soft">{message}</p> : null}
      </main>
    </>
  );
}
