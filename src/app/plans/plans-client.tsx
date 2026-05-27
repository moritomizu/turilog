"use client";

import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { logFeatureInterest, logFeatureNotInterested } from "@/lib/featureEvents";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { featureDefinitions, planDefinitions } from "@/lib/plans";
import type { FeatureKey, SubscriptionPlan } from "@/types";

const visiblePlans: SubscriptionPlan[] = ["free", "premium", "organizer", "groupPro"];
const interestFeatureByPlan: Partial<Record<SubscriptionPlan, FeatureKey>> = {
  premium: "plan_premium",
  organizer: "plan_organizer",
  groupPro: "plan_groupPro"
};
const planPrices: Partial<Record<SubscriptionPlan, string>> = {
  free: "0円/月",
  premium: "980円/月",
  organizer: "2,980円/月",
  groupPro: "9,800円/月"
};

export function PlansClient() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [message, setMessage] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);

  async function handlePlanReaction(plan: SubscriptionPlan, interested: boolean) {
    if (!user) {
      setMessage("反応を送るにはログインしてください。");
      return;
    }
    const featureKey = interestFeatureByPlan[plan];
    if (!featureKey) return;
    setMessage("反応を保存しています。");
    try {
      const metadata = { plan, priceLabel: planPrices[plan] ?? "", interested };
      if (interested) {
        await logFeatureInterest(user.uid, featureKey, metadata);
      } else {
        await logFeatureNotInterested(user.uid, featureKey, metadata);
      }
      setMessage(interested ? "ありがとうございます。興味ありとして保存しました。" : "ありがとうございます。今はなしとして保存しました。");
    } catch {
      setMessage("保存できませんでした。時間をおいてもう一度お試しください。");
    }
  }

  return (
    <>
      <PageHeader title="プラン" actionHref="/" actionLabel="TOP" />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">COMING SOON</p>
          <h1 className="mt-1 text-2xl font-black">便利な機能を、必要な人に届けるための準備中プランです。</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
            まだ決済は実装していません。興味があるプランを教えていただくことで、今後の機能優先度や価格設計の参考にします。
          </p>
          {message ? <p className="mt-3 rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          {!user ? (
            <Link href="/login" className="tap-target mt-4 inline-flex rounded bg-water px-4 py-3 font-black text-white">
              ログインして興味を送る
            </Link>
          ) : null}
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visiblePlans.map((plan) => {
            const definition = planDefinitions[plan];
            return (
              <article key={plan} className="flex flex-col rounded border border-teal-100 bg-white p-4 shadow-soft">
                <h2 className="text-xl font-black">{definition.label}</h2>
                <div className="mt-3 rounded bg-foam p-3">
                  <p className="text-xs font-black text-slate-500">仮料金</p>
                  <p className="mt-1 text-2xl font-black text-ink">{planPrices[plan] ?? "未定"}</p>
                  {plan !== "free" ? <p className="mt-1 text-xs font-bold text-slate-500">ニーズ調査用の仮設定です</p> : null}
                </div>
                <p className="mt-2 min-h-16 text-sm font-bold leading-6 text-slate-700">{definition.description}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm font-bold text-slate-700">
                  {definition.features.map((featureKey) => (
                    <li key={featureKey} className="flex items-center justify-between gap-2 rounded bg-foam px-3 py-2">
                      <span>{getFeatureDisplayName(featureKey, plan)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFeature(featureKey)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-black text-slate-600"
                        aria-label={`${getFeatureDisplayName(featureKey, plan)}の説明を見る`}
                      >
                        ?
                      </button>
                    </li>
                  ))}
                </ul>
                {plan === "free" ? (
                  <button type="button" disabled className="tap-target mt-4 rounded bg-slate-200 px-4 py-3 font-black text-slate-500">
                    利用中の基本プラン
                  </button>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => handlePlanReaction(plan, true)} className="tap-target rounded bg-coral px-4 py-3 font-black text-white">
                      興味あり
                    </button>
                    <button type="button" onClick={() => handlePlanReaction(plan, false)} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 font-black text-slate-700">
                      今はなし
                    </button>
                  </div>
                )}
                {plan !== "free" ? <p className="mt-2 text-center text-xs font-bold text-slate-500">決済はまだ行われません</p> : null}
              </article>
            );
          })}
        </div>
        {selectedFeature ? <FeatureDescriptionDialog featureKey={selectedFeature} onClose={() => setSelectedFeature(null)} /> : null}
      </main>
    </>
  );
}

function getFeatureDisplayName(featureKey: FeatureKey, plan: SubscriptionPlan) {
  if (featureKey === "aiReport" && plan === "premium") return "AIレポート(自分のみ)";
  if (featureKey === "aiReport" && plan === "groupPro") return "AIレポート(グループ)";
  return featureDefinitions[featureKey]?.name ?? featureKey;
}

function FeatureDescriptionDialog({ featureKey, onClose }: { featureKey: FeatureKey; onClose: () => void }) {
  const feature = featureDefinitions[featureKey];
  if (!feature) return null;
  const plan = planDefinitions[feature.suggestedPlan];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-5 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="feature-dialog-title">
      <section className="w-full max-w-md rounded border border-teal-100 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-water">機能説明</p>
            <h2 id="feature-dialog-title" className="mt-1 text-xl font-black text-ink">{feature.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="tap-target rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-600" aria-label="閉じる">
            ×
          </button>
        </div>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-700">{feature.description}</p>
        <div className="mt-4 rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">
          <p className="text-xs font-black text-slate-500">利用できるプラン</p>
          <p className="mt-1">{plan?.label ?? feature.suggestedPlan}プラン以上</p>
        </div>
        <button type="button" onClick={onClose} className="tap-target mt-4 w-full rounded bg-water px-4 py-3 font-black text-white">
          閉じる
        </button>
      </section>
    </div>
  );
}
