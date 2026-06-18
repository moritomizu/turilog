"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { feedbackCategoryOptions, feedbackRatingOptions, feedbackTriggerLabels, getRecentFeedbacks } from "@/lib/feedback";
import { isAdminProfile } from "@/lib/features";
import { getUserProfile } from "@/lib/userProfiles";
import type { FeedbackCategory, FeedbackRating, FeedbackTrigger, UserFeedback } from "@/types";

export default function FeedbacksAdminPage() {
  return <AuthGate skipOnboardingCheck>{(user) => <FeedbacksAdmin userId={user.uid} />}</AuthGate>;
}

function FeedbacksAdmin({ userId }: { userId: string }) {
  const [items, setItems] = useState<UserFeedback[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [category, setCategory] = useState<FeedbackCategory | "all">("all");
  const [rating, setRating] = useState<FeedbackRating | "all">("all");
  const [trigger, setTrigger] = useState<FeedbackTrigger | "all">("all");

  useEffect(() => {
    getUserProfile(userId)
      .then((profile) => {
        const nextAllowed = isAdminProfile(profile);
        setAllowed(nextAllowed);
        if (!nextAllowed) {
          setMessage("管理者のみ閲覧できます。");
          return;
        }
        getRecentFeedbacks(500)
          .then((feedbacks) => {
            setItems(feedbacks);
            setMessage(feedbacks.length ? "" : "まだフィードバックがありません。");
          })
          .catch((error) => setMessage(error instanceof Error ? error.message : "フィードバックを読み込めませんでした。"));
      })
      .catch((error) => {
        setAllowed(false);
        setMessage(error instanceof Error ? error.message : "管理者確認に失敗しました。");
      });
  }, [userId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (rating !== "all" && item.rating !== rating) return false;
      if (trigger !== "all" && item.trigger !== trigger) return false;
      return true;
    });
  }, [items, category, rating, trigger]);

  return (
    <>
      <PageHeader title="フィードバック" actionHref="/admin" actionLabel="管理TOP" />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">PMF RESEARCH</p>
          <h1 className="mt-1 text-2xl font-black text-ink">ユーザーフィードバック一覧</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            釣果投稿後、AIレポート閲覧後、手動送信で届いた声を確認します。
          </p>
        </section>

        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}

        {allowed ? (
          <>
            <section className="grid gap-3 rounded border border-teal-100 bg-white p-4 shadow-soft md:grid-cols-3">
              <FilterSelect label="カテゴリ" value={category} onChange={(value) => setCategory(value as FeedbackCategory | "all")} options={feedbackCategoryOptions} />
              <FilterSelect label="評価" value={rating} onChange={(value) => setRating(value as FeedbackRating | "all")} options={feedbackRatingOptions} />
              <FilterSelect
                label="トリガー"
                value={trigger}
                onChange={(value) => setTrigger(value as FeedbackTrigger | "all")}
                options={Object.entries(feedbackTriggerLabels).map(([value, label]) => ({ value, label }))}
              />
            </section>

            <section className="rounded border border-teal-100 bg-white shadow-soft">
              <div className="flex items-center justify-between gap-3 border-b border-teal-100 p-4">
                <h2 className="text-lg font-black">一覧</h2>
                <p className="text-sm font-black text-water">{filteredItems.length}件</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-foam">
                    <tr>
                      {["日時", "評価", "カテゴリ", "トリガー", "コメント", "ユーザー", "ページ", "言語"].map((label) => (
                        <th key={label} className="whitespace-nowrap p-3 font-black">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="border-t border-teal-50 align-top">
                        <td className="whitespace-nowrap p-3 font-bold">{formatDate(item.createdAt)}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{getRatingLabel(item.rating)}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{getCategoryLabel(item.category)}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{feedbackTriggerLabels[item.trigger]}</td>
                        <td className="min-w-80 p-3 font-bold leading-6 text-slate-700">{item.comment || "コメントなし"}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{item.userId}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{item.path || "-"}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{item.locale || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
        <option value="all">すべて</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function getRatingLabel(value?: FeedbackRating) {
  return feedbackRatingOptions.find((item) => item.value === value)?.label ?? "-";
}

function getCategoryLabel(value?: FeedbackCategory) {
  return feedbackCategoryOptions.find((item) => item.value === value)?.label ?? "-";
}

function formatDate(value: UserFeedback["createdAt"]) {
  if (!value) return "未取得";
  return new Intl.DateTimeFormat("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
