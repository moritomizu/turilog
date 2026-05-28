"use client";

import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { logFeatureInterest } from "@/lib/featureEvents";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { featureDefinitions, planDefinitions } from "@/lib/plans";
import { getUserProfile } from "@/lib/userProfiles";
import type { FeatureKey, SubscriptionPlan, UserProfile } from "@/types";

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey | null>(null);
  const [revealedPlans, setRevealedPlans] = useState<SubscriptionPlan[]>(["free", "premium"]);
  const [loadingPlan, setLoadingPlan] = useState<"checkout" | "portal" | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), async (authUser) => {
      setUser(authUser);
      setProfile(authUser ? await getUserProfile(authUser.uid) : null);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setMessage("Premium登録を受け付けました。反映まで少し時間がかかる場合があります。");
      if (user) {
        getUserProfile(user.uid).then(setProfile).catch(() => undefined);
        const timer = window.setTimeout(() => getUserProfile(user.uid).then(setProfile).catch(() => undefined), 2500);
        return () => window.clearTimeout(timer);
      }
    }
    if (params.get("checkout") === "cancelled") setMessage("Premium登録はキャンセルされました。");
  }, [user]);

  async function handlePremiumCheckout() {
    if (!user) {
      setMessage("Premium登録にはログインしてください。");
      return;
    }
    setLoadingPlan("checkout");
    setMessage("Stripe Checkoutを準備しています。");
    try {
      await logFeatureInterest(user.uid, "plan_premium", { plan: "premium", priceLabel: planPrices.premium, action: "startCheckout" });
      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(typeof data.error === "string" ? data.error : "Checkoutを開始できませんでした。");
      window.location.href = data.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkoutを開始できませんでした。時間をおいてもう一度お試しください。");
      setLoadingPlan(null);
    }
  }

  async function handleCustomerPortal() {
    if (!user) {
      setMessage("契約管理にはログインしてください。");
      return;
    }
    setLoadingPlan("portal");
    setMessage("契約管理ページを準備しています。");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(typeof data.error === "string" ? data.error : "契約管理ページを開けませんでした。");
      window.location.href = data.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "契約管理ページを開けませんでした。");
      setLoadingPlan(null);
    }
  }

  async function handleRevealPrice(plan: SubscriptionPlan) {
    setRevealedPlans((current) => (current.includes(plan) ? current : [...current, plan]));
    if (!user) {
      setMessage("仮料金を表示しました。ログインすると興味ありとして保存できます。");
      return;
    }
    const featureKey = interestFeatureByPlan[plan];
    if (!featureKey) return;
    try {
      await logFeatureInterest(user.uid, featureKey, { plan, priceLabel: planPrices[plan] ?? "", interested: true, action: "revealPrice" });
      setMessage("料金が気になるプランとして保存しました。");
    } catch {
      setMessage("仮料金を表示しました。反応の保存はできませんでした。");
    }
  }

  return (
    <>
      <PageHeader title="プラン" actionHref="/" actionLabel="TOP" />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">COMING SOON</p>
          <h1 className="mt-1 text-2xl font-black">便利な機能を、必要な人に。準備中です。</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
            Premiumプランだけ先行して月額登録を試せるようになりました。Organizer / Group Pro は引き続きニーズ調査中です。
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
            const priceRevealed = plan === "premium" || revealedPlans.includes(plan);
            const premiumActive = profile?.subscriptionPlan === "premium" || profile?.subscriptionStatus === "active" || profile?.subscriptionStatus === "trialing";
            return (
              <article key={plan} className="flex flex-col rounded border border-teal-100 bg-white p-4 shadow-soft">
                <h2 className="text-xl font-black">{definition.label}</h2>
                {priceRevealed && plan === "free" ? (
                  <div className="mt-3 rounded bg-foam p-3">
                    <p className="text-xs font-black text-slate-500">料金</p>
                    <p className="mt-1 text-2xl font-black text-ink">{planPrices[plan] ?? "未定"}</p>
                  </div>
                ) : !priceRevealed && plan !== "free" ? (
                  <div className="mt-3 rounded border border-dashed border-teal-200 bg-foam p-3">
                    <p className="text-xs font-black text-water">PRICE CHECK</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-700">料金が気になる方は、月額の目安を確認できます。</p>
                  </div>
                ) : null}
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
                ) : !priceRevealed ? (
                  <button type="button" onClick={() => handleRevealPrice(plan)} className="tap-target mt-4 rounded bg-coral px-4 py-3 font-black text-white">
                    月額の目安を見てみる
                  </button>
                ) : (
                  <>
                    <div className="mt-4 rounded border border-coral/30 bg-orange-50 p-3">
                      <p className="text-xs font-black text-coral">{plan === "premium" ? "月額料金" : "仮料金"}</p>
                      <p className="mt-1 text-2xl font-black text-ink">{planPrices[plan] ?? "未定"}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{getPlanCuriosityCopy(plan)}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {plan === "premium" ? "Stripe Checkoutで安全に登録できます。解約やカード変更は契約管理から行えます。" : "ニーズ調査用の仮設定です。決済は行われません。"}
                      </p>
                    </div>
                    {plan === "premium" ? (
                      premiumActive ? (
                        <div className="mt-3 space-y-2">
                          <p className="rounded bg-teal-50 p-3 text-sm font-black text-water">Premium利用中です。</p>
                          <button type="button" onClick={handleCustomerPortal} disabled={loadingPlan !== null} className="tap-target w-full rounded border border-water bg-white px-4 py-3 font-black text-water disabled:opacity-60">
                            {loadingPlan === "portal" ? "準備中..." : "契約・カードを管理する"}
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={handlePremiumCheckout} disabled={loadingPlan !== null} className="tap-target mt-3 w-full rounded bg-water px-4 py-3 font-black text-white disabled:opacity-60">
                          {loadingPlan === "checkout" ? "Checkout準備中..." : "Premiumに登録する"}
                        </button>
                      )
                    ) : null}
                  </>
                )}
              </article>
            );
          })}
        </div>
        {selectedFeature ? <FeatureDescriptionDialog featureKey={selectedFeature} onClose={() => setSelectedFeature(null)} /> : null}
      </main>
    </>
  );
}

function getPlanCuriosityCopy(plan: SubscriptionPlan) {
  if (plan === "premium") return "ランチ１回分 あなたの釣りが楽しく変わる。";
  if (plan === "organizer") return "ルアーセット1個分 大会を開催して盛りあがろう";
  if (plan === "groupPro") return "船釣り１回分 プロレベルの分析をあなたの手に";
  return "基本機能は無料で利用できます。";
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
