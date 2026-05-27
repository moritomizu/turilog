"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getRecentFeatureEvents } from "@/lib/featureEvents";
import { isAdminProfile } from "@/lib/features";
import { featureDefinitions } from "@/lib/plans";
import { getUserProfile } from "@/lib/userProfiles";
import type { FeatureEvent } from "@/types";

export default function FeatureEventsAdminPage() {
  return <AuthGate skipOnboardingCheck>{(user) => <FeatureEventsAdmin userId={user.uid} />}</AuthGate>;
}

function FeatureEventsAdmin({ userId }: { userId: string }) {
  const [items, setItems] = useState<FeatureEvent[]>([]);
  const [message, setMessage] = useState("読み込み中です。");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const summary = useMemo(() => buildSummary(items), [items]);

  useEffect(() => {
    getUserProfile(userId)
      .then((profile) => {
        const nextAllowed = isAdminProfile(profile);
        setAllowed(nextAllowed);
        if (!nextAllowed) {
          setMessage("管理者のみ閲覧できます。");
          return;
        }
        getRecentFeatureEvents(300)
          .then((events) => {
            setItems(events);
            setMessage(events.length ? "" : "まだイベントがありません。");
          })
          .catch((error) => setMessage(error instanceof Error ? error.message : "イベントを読み込めませんでした。"));
      })
      .catch((error) => {
        setAllowed(false);
        setMessage(error instanceof Error ? error.message : "管理者確認に失敗しました。");
      });
  }, [userId]);

  return (
    <>
      <PageHeader title="機能反応ログ" actionHref="/" actionLabel="TOP" />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {allowed ? (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <SummaryTable title="機能別" rows={summary.byFeature} />
              <SummaryTable title="イベント種別" rows={summary.byEventType} />
              <SummaryTable title="ユーザー別関心" rows={summary.byUser} />
            </section>
            <section className="overflow-hidden rounded border border-teal-100 bg-white shadow-soft">
              <h2 className="border-b border-teal-100 p-4 text-lg font-black">直近イベント</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-foam">
                    <tr>
                      {["日時", "機能", "イベント", "プラン", "ユーザー", "ページ"].map((label) => (
                        <th key={label} className="whitespace-nowrap p-3 font-black">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-teal-50">
                        <td className="whitespace-nowrap p-3 font-bold">{formatDate(item.createdAt)}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{featureDefinitions[item.featureKey]?.name ?? item.featureKey}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{item.eventType}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{item.planAtEvent}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{item.userId}</td>
                        <td className="whitespace-nowrap p-3 font-bold">{item.pagePath}</td>
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

function SummaryTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3 space-y-2 text-sm">
        {rows.length ? rows.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded bg-foam px-3 py-2 font-bold">
            <span className="truncate">{label}</span>
            <span className="shrink-0 text-water">{count}</span>
          </div>
        )) : <p className="text-slate-500">データなし</p>}
      </div>
    </section>
  );
}

function buildSummary(items: FeatureEvent[]) {
  return {
    byFeature: countBy(items, (item) => featureDefinitions[item.featureKey]?.name ?? item.featureKey),
    byEventType: countBy(items, (item) => item.eventType),
    byUser: countBy(items.filter((item) => item.eventType === "clickInterested" || item.eventType === "clickNotInterested" || item.eventType === "clickLearnMore"), (item) => item.userId)
  };
}

function countBy(items: FeatureEvent[], getKey: (item: FeatureEvent) => string): [string, number][] {
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(getKey(item), (counts.get(getKey(item)) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

function formatDate(value: string) {
  if (!value) return "未取得";
  return new Intl.DateTimeFormat("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
