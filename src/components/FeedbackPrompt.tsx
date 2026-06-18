"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { dismissFeedbackPrompt, feedbackRatingOptions, submitUserFeedback } from "@/lib/feedback";
import { getLocaleFromPathname } from "@/lib/i18n";
import type { FeedbackCategory, FeedbackRating, FeedbackTrigger } from "@/types";

type FeedbackPromptProps = {
  userId: string;
  trigger: FeedbackTrigger;
  category: FeedbackCategory;
  title?: string;
  compact?: boolean;
  initialRating?: FeedbackRating | null;
  onClose?: () => void;
};

export function FeedbackPrompt({ userId, trigger, category, title, compact = false, initialRating = null, onClose }: FeedbackPromptProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const [rating, setRating] = useState<FeedbackRating | null>(initialRating);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      await submitUserFeedback({
        userId,
        trigger,
        category,
        rating: rating ?? undefined,
        comment,
        path: pathname,
        locale,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
      });
      setDone(true);
      setMessage("ありがとうございます。改善の参考にします。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "送信できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function dismiss() {
    await dismissFeedbackPrompt(userId).catch(() => undefined);
    onClose?.();
  }

  if (done) {
    return (
      <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
        <p className="text-sm font-black text-water">{message}</p>
        <button type="button" onClick={onClose} className="mt-3 rounded bg-water px-4 py-2 text-sm font-black text-white">
          閉じる
        </button>
      </section>
    );
  }

  return (
    <section className={`rounded border border-orange-200 bg-orange-50 p-4 shadow-soft ${compact ? "" : "space-y-3"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-coral">FEEDBACK</p>
          <h2 className="mt-1 text-lg font-black text-ink">{title ?? `${APP_NAME}の使い心地はいかがですか？`}</h2>
        </div>
        <button type="button" onClick={dismiss} className="rounded-full bg-white px-3 py-1 text-lg font-black text-slate-500" aria-label="閉じる">
          ×
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {feedbackRatingOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRating(option.value)}
            className={`tap-target rounded border px-2 py-3 text-xs font-black ${rating === option.value ? "border-coral bg-white text-coral" : "border-orange-100 bg-white/70 text-slate-700"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {rating ? (
        <label className="block">
          <span className="text-sm font-bold text-slate-700">よければ、感じたことや改善してほしいことを教えてください</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="mt-2 min-h-24 w-full rounded border border-orange-100 bg-white p-3 text-base"
            placeholder="例: 投稿はしやすいけど、場所指定をもう少し簡単にしたい"
          />
        </label>
      ) : null}

      {message ? <p className="text-sm font-bold text-slate-700">{message}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={!rating || busy} onClick={submit} className="tap-target rounded bg-coral px-4 py-3 text-sm font-black text-white disabled:opacity-50">
          {busy ? "送信中..." : "送信する"}
        </button>
        <button type="button" onClick={dismiss} className="tap-target rounded border border-orange-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
          今はしない
        </button>
      </div>
    </section>
  );
}

export function SimpleFeedbackPrompt({ userId, trigger, category, title }: FeedbackPromptProps) {
  const [initialRating, setInitialRating] = useState<FeedbackRating | null>(null);
  const open = initialRating != null;

  if (!open) {
    return (
      <section className="rounded border border-teal-100 bg-foam p-4">
        <p className="text-sm font-black text-ink">{title}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setInitialRating("good")} className="tap-target rounded bg-water px-4 py-3 text-sm font-black text-white">
            👍 参考になった
          </button>
          <button type="button" onClick={() => setInitialRating("poor")} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700">
            👎 期待と違った
          </button>
        </div>
      </section>
    );
  }

  return <FeedbackPrompt userId={userId} trigger={trigger} category={category} title="理由があれば教えてください" compact initialRating={initialRating} onClose={() => setInitialRating(null)} />;
}
