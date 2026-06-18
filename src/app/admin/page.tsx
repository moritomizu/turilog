"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { isAdminProfile } from "@/lib/features";
import { getUserProfile } from "@/lib/userProfiles";

const adminLinks = [
  {
    href: "/admin/notifications",
    title: "運営からのお知らせ",
    body: "通知ONのユーザーへ運営メッセージを配信します。",
    label: "通知配信"
  },
  {
    href: "/admin/feature-events",
    title: "アクセスログ・反応ログ",
    body: "プランや有料候補機能への反応を確認します。",
    label: "ログ確認"
  },
  {
    href: "/admin/feedbacks",
    title: "ユーザーフィードバック",
    body: "投稿後・AIレポート・手動送信で届いた感想や不満を確認します。",
    label: "声を確認"
  },
  {
    href: "/admin/generate-catch-proof",
    title: "釣果デジタル証明",
    body: "既存釣果の証明スコア生成・再計算を行います。",
    label: "証明管理"
  }
];

export default function AdminHomePage() {
  return <AuthGate skipOnboardingCheck>{(user) => <AdminHome userId={user.uid} />}</AuthGate>;
}

function AdminHome({ userId }: { userId: string }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [message, setMessage] = useState("管理者権限を確認しています。");

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

  return (
    <>
      <PageHeader title="管理者TOP" actionHref="/" actionLabel="TOP" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">ADMIN</p>
          <h1 className="mt-1 text-2xl font-black text-ink">管理者メニュー</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
            運営通知、機能反応ログ、釣果デジタル証明の管理画面をまとめています。
          </p>
        </section>

        {message ? <p className="rounded bg-white p-4 text-sm font-bold leading-6 text-slate-700 shadow-soft">{message}</p> : null}

        {allowed ? (
          <section className="grid gap-3">
            {adminLinks.map((item) => (
              <Link key={item.href} href={item.href} className="tap-target rounded border border-teal-100 bg-white p-5 shadow-soft transition hover:border-water">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-ink">{item.title}</h2>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{item.body}</p>
                  </div>
                  <span className="shrink-0 rounded bg-water px-3 py-2 text-xs font-black text-white">{item.label}</span>
                </div>
              </Link>
            ))}
          </section>
        ) : null}
      </main>
    </>
  );
}
