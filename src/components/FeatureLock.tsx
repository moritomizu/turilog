"use client";

import { useEffect, useRef, useState } from "react";
import { logFeatureEvent, logFeatureInterest, logLockedFeatureView } from "@/lib/featureEvents";
import { getLockedFeatureMessage } from "@/lib/features";
import { featureDefinitions, getPlanLabel } from "@/lib/plans";
import type { FeatureKey } from "@/types";

export function FeatureLock({ userId, featureKey, compact = false }: { userId: string; featureKey: FeatureKey; compact?: boolean }) {
  const [message, setMessage] = useState("");
  const loggedRef = useRef(false);
  const definition = featureDefinitions[featureKey];

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logLockedFeatureView(userId, featureKey).catch(() => undefined);
  }, [featureKey, userId]);

  async function handleInterested() {
    setMessage("反応を保存しています。");
    try {
      await logFeatureInterest(userId, featureKey);
      setMessage("ありがとうございます。今後のプラン設計に活用します。");
    } catch {
      setMessage("保存できませんでした。時間をおいてもう一度お試しください。");
    }
  }

  async function handleLearnMore() {
    try {
      await logFeatureEvent(userId, featureKey, "clickLearnMore");
    } catch {
      // ログ保存に失敗しても画面遷移は止めません。
    }
    window.location.href = "/plans";
  }

  return (
    <section className={`rounded border border-coral/20 bg-white p-4 shadow-soft ${compact ? "space-y-3" : "space-y-4"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xl" aria-hidden="true">
          🔒
        </div>
        <div>
          <p className="text-xs font-black text-coral">PREMIUM FEATURE</p>
          <h2 className={`${compact ? "text-lg" : "text-2xl"} font-black text-ink`}>{definition?.name ?? "準備中の機能"}</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{definition?.description ?? "便利な機能として準備中です。"}</p>
        </div>
      </div>
      <div className="rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">
        <p>{getLockedFeatureMessage(featureKey)}</p>
        {definition ? <p className="mt-1 text-xs text-slate-500">想定プラン: {getPlanLabel(definition.suggestedPlan)}</p> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={handleInterested} className="tap-target rounded bg-coral px-4 py-3 font-black text-white">
          興味あり
        </button>
        <button type="button" onClick={handleLearnMore} className="tap-target rounded border border-water bg-white px-4 py-3 font-black text-water">
          詳しく知りたい
        </button>
      </div>
      {message ? <p className="text-sm font-bold text-slate-600">{message}</p> : null}
    </section>
  );
}
