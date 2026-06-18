"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { APP_NAME } from "@/lib/brand";
import { feedbackCategoryOptions, feedbackRatingOptions, submitUserFeedback } from "@/lib/feedback";
import { getLocaleFromPathname } from "@/lib/i18n";
import type { FeedbackCategory, FeedbackRating } from "@/types";

export default function FeedbackPage() {
  return <AuthGate skipOnboardingCheck>{(user) => <FeedbackForm userId={user.uid} />}</AuthGate>;
}

function FeedbackForm({ userId }: { userId: string }) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState<FeedbackRating>("good");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await submitUserFeedback({
        userId,
        trigger: "manual_feedback",
        category,
        rating,
        comment,
        path: pathname,
        locale,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
      });
      setComment("");
      setMessage("ありがとうございます。今後の改善に活用します。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "送信できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="ご意見・ご感想" actionHref="/" actionLabel="TOP" />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">FEEDBACK</p>
          <h1 className="mt-1 text-2xl font-black text-ink">{APP_NAME}へのご意見・ご感想</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
            使ってみて感じたこと、不便だったこと、追加してほしい機能などがあれば教えてください。今後の改善に活用します。
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-teal-100 bg-white p-5 shadow-soft">
          <label className="block">
            <span className="text-sm font-bold">カテゴリ</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
              {feedbackCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <div>
            <span className="text-sm font-bold">評価</span>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {feedbackRatingOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRating(option.value)}
                  className={`tap-target rounded border px-2 py-3 text-xs font-black ${rating === option.value ? "border-coral bg-orange-50 text-coral" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold">コメント</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-2 min-h-40 w-full rounded border border-slate-300 bg-white p-3 text-base"
              placeholder="使っていて良かったところ、不便だったところ、欲しい機能など"
            />
          </label>

          {message ? <p className="rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">{message}</p> : null}
          <button disabled={busy} className="tap-target w-full rounded bg-water px-5 py-4 text-base font-black text-white disabled:opacity-60">
            {busy ? "送信中..." : "送信する"}
          </button>
        </form>
      </main>
    </>
  );
}
