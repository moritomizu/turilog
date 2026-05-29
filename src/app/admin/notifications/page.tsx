"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getFirebaseAuth } from "@/lib/firebase";
import { isAdminProfile } from "@/lib/features";
import { getUserProfile } from "@/lib/userProfiles";

type SendResult = {
  sent?: number;
  failed?: number;
  targets?: number;
  diagnostics?: {
    targetUsers?: number;
    existingUsers?: number;
    notificationEnabledUsers?: number;
    categoryEnabledUsers?: number;
    tokenCount?: number;
  };
  failureMessages?: string[];
};

export default function AdminNotificationsPage() {
  return <AuthGate skipOnboardingCheck>{(user) => <AdminNotifications userId={user.uid} />}</AuthGate>;
}

function AdminNotifications({ userId }: { userId: string }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [title, setTitle] = useState("TsuriLogからのお知らせ");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("管理者権限を確認しています。");
  const [result, setResult] = useState<SendResult | null>(null);

  useEffect(() => {
    getUserProfile(userId)
      .then((profile) => {
        const nextAllowed = isAdminProfile(profile);
        setAllowed(nextAllowed);
        setMessage(nextAllowed ? "" : "管理者のみ利用できます。");
      })
      .catch((error) => {
        setAllowed(false);
        setMessage(error instanceof Error ? error.message : "管理者確認に失敗しました。");
      });
  }, [userId]);

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      setMessage("タイトルと本文を入力してください。");
      return;
    }
    if (!url.startsWith("/")) {
      setMessage("遷移先URLは / から始まるアプリ内URLを入力してください。");
      return;
    }
    const confirmed = window.confirm("通知ONのユーザーへ「運営からのお知らせ」を送信します。よろしいですか？");
    if (!confirmed) return;

    setBusy(true);
    setMessage("お知らせ通知を送信しています。");
    setResult(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("ログインが必要です。");
      const idToken = await user.getIdToken();
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          allUsers: true,
          category: "systemNotice",
          title: title.trim(),
          body: body.trim(),
          url
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "通知を送信できませんでした。");
      setResult(data);
      setMessage(`送信しました。送信数: ${data.sent ?? 0}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通知を送信できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="運営通知" actionHref="/settings/notifications" actionLabel="通知設定" />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">ADMIN NOTICE</p>
          <h1 className="mt-1 text-2xl font-black text-ink">運営からのお知らせ配信</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
            通知を有効にしていて、「運営からのお知らせ」を受け取る設定のユーザーへWeb Push通知を送信します。
          </p>
        </section>

        {message ? <p className="rounded bg-white p-4 text-sm font-bold leading-6 text-slate-700 shadow-soft">{message}</p> : null}

        {allowed ? (
          <section className="space-y-4 rounded border border-teal-100 bg-white p-5 shadow-soft">
            <label className="block">
              <span className="text-sm font-black text-ink">通知タイトル</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded border border-teal-100 px-3 py-3 text-base font-bold outline-none focus:border-water"
                maxLength={80}
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-ink">本文</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="mt-2 min-h-32 w-full rounded border border-teal-100 px-3 py-3 text-base font-bold leading-7 outline-none focus:border-water"
                placeholder="例：新しい大会機能を公開しました。ぜひチェックしてみてください。"
                maxLength={180}
              />
              <span className="mt-1 block text-right text-xs font-bold text-slate-400">{body.length}/180</span>
            </label>

            <label className="block">
              <span className="text-sm font-black text-ink">タップ後の遷移先</span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="mt-2 w-full rounded border border-teal-100 px-3 py-3 text-base font-bold outline-none focus:border-water"
                placeholder="/"
              />
              <span className="mt-1 block text-xs font-bold text-slate-500">アプリ内のURLのみ指定できます。例: /plans, /tournaments, /groups</span>
            </label>

            <button
              disabled={busy || !title.trim() || !body.trim()}
              onClick={handleSend}
              className="tap-target w-full rounded bg-coral px-5 py-4 text-base font-black text-white disabled:opacity-60"
            >
              {busy ? "送信中..." : "運営からのお知らせを送信"}
            </button>
          </section>
        ) : null}

        {result ? (
          <section className="rounded border border-teal-100 bg-white p-5 text-sm font-bold leading-6 text-slate-700 shadow-soft">
            <h2 className="text-lg font-black text-ink">送信結果</h2>
            <div className="mt-3 grid gap-2">
              <p>送信数: {result.sent ?? 0}</p>
              <p>失敗数: {result.failed ?? 0}</p>
              <p>対象ユーザー: {result.diagnostics?.targetUsers ?? result.targets ?? 0}</p>
              <p>通知ON: {result.diagnostics?.notificationEnabledUsers ?? 0}</p>
              <p>カテゴリON: {result.diagnostics?.categoryEnabledUsers ?? 0}</p>
              <p>登録トークン: {result.diagnostics?.tokenCount ?? 0}</p>
              {result.failureMessages?.length ? <p className="text-red-600">失敗理由: {result.failureMessages.join(" / ")}</p> : null}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
