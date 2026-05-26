"use client";

import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { logFeatureInterest } from "@/lib/featureEvents";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { featureDefinitions, planDefinitions } from "@/lib/plans";
import type { FeatureKey, SubscriptionPlan } from "@/types";

const visiblePlans: SubscriptionPlan[] = ["free", "premium", "organizer", "groupPro"];
const interestFeatureByPlan: Partial<Record<SubscriptionPlan, FeatureKey>> = {
  premium: "plan_premium",
  organizer: "plan_organizer",
  groupPro: "plan_groupPro"
};

export function PlansClient() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);

  async function handleInterest(plan: SubscriptionPlan) {
    if (!user) {
      setMessage("興味ありを送るにはログインしてください。");
      return;
    }
    const featureKey = interestFeatureByPlan[plan];
    if (!featureKey) return;
    setMessage("反応を保存しています。");
    try {
      await logFeatureInterest(user.uid, featureKey, { plan });
      setMessage("ありがとうございます。今後のプラン設計に活用します。");
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
                <p className="mt-2 min-h-16 text-sm font-bold leading-6 text-slate-700">{definition.description}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm font-bold text-slate-700">
                  {definition.features.map((featureKey) => (
                    <li key={featureKey} className="rounded bg-foam px-3 py-2">
                      {featureDefinitions[featureKey]?.name ?? featureKey}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={plan === "free"}
                  onClick={() => handleInterest(plan)}
                  className="tap-target mt-4 rounded bg-coral px-4 py-3 font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {plan === "free" ? "利用中の基本プラン" : "興味あり"}
                </button>
                {plan !== "free" ? <p className="mt-2 text-center text-xs font-bold text-slate-500">決済はまだ行われません</p> : null}
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}
