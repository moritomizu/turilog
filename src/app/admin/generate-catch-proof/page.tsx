"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchVerificationPanel } from "@/components/CatchVerificationPanel";
import { PageHeader } from "@/components/PageHeader";
import { buildCatchProofPackage, calculateVerificationScore, checkRankingEligibility } from "@/lib/catchVerification";
import { getAllCatchesForAdmin, updateCatchVerificationData } from "@/lib/catches";
import { isAdminProfile } from "@/lib/features";
import { getTournament } from "@/lib/tournaments";
import { getUserProfile } from "@/lib/userProfiles";
import type { Catch } from "@/types";

export default function GenerateCatchProofPage() {
  return <AuthGate skipOnboardingCheck>{(user) => <GenerateCatchProof userId={user.uid} />}</AuthGate>;
}

function GenerateCatchProof({ userId }: { userId: string }) {
  const [items, setItems] = useState<Catch[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);
  const missingItems = useMemo(() => items.filter((item) => !item.catchProof || !item.verificationScore), [items]);

  useEffect(() => {
    getUserProfile(userId)
      .then((profile) => {
        const nextAllowed = isAdminProfile(profile);
        setAllowed(nextAllowed);
        if (!nextAllowed) {
          setMessage("管理者のみ利用できます。");
          return;
        }
        loadItems();
      })
      .catch((error) => {
        setAllowed(false);
        setMessage(error instanceof Error ? error.message : "管理者確認に失敗しました。");
      });
  }, [userId]);

  async function loadItems() {
    setMessage("釣果を読み込んでいます。");
    try {
      const catches = await getAllCatchesForAdmin();
      setItems(catches);
      setMessage(catches.length ? "" : "釣果がありません。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "釣果を読み込めませんでした。");
    }
  }

  async function regenerate(item: Catch) {
    const tournament = item.tournamentId ? await getTournament(item.tournamentId).catch(() => null) : null;
    const generatedAt = new Date().toISOString();
    const catchProof = buildCatchProofPackage(item, {
      generatedAt,
      tournamentStartAt: tournament?.startAt ?? null,
      tournamentEndAt: tournament?.endAt ?? null,
      tournamentTargetFishTypes: tournament?.targetFishTypes ?? []
    });
    const verificationScore = calculateVerificationScore(catchProof);
    const rankingEligibility = checkRankingEligibility(item, verificationScore);
    await updateCatchVerificationData(item.id, { catchProof, verificationScore, rankingEligibility });
    return { ...item, catchProof, verificationScore, rankingEligibility };
  }

  async function handleOne(item: Catch) {
    setBusy(true);
    setMessage(`${item.fishType} の証明情報を再生成しています。`);
    try {
      const nextItem = await regenerate(item);
      setItems((current) => current.map((row) => (row.id === item.id ? nextItem : row)));
      setMessage("証明情報を保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "証明情報を保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulk(target: "missing" | "all") {
    const targets = target === "missing" ? missingItems : items;
    if (!targets.length) {
      setMessage("対象の釣果がありません。");
      return;
    }
    setBusy(true);
    setMessage(`${targets.length}件を処理しています。`);
    try {
      const updated: Catch[] = [];
      for (const item of targets) {
        updated.push(await regenerate(item));
      }
      setItems((current) => current.map((row) => updated.find((item) => item.id === row.id) ?? row));
      setMessage(`${updated.length}件の証明情報を保存しました。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "一括処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="釣果証明生成" actionHref="/" actionLabel="TOP" />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {allowed ? (
          <>
            <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
              <p className="text-xs font-black text-water">ADMIN</p>
              <h1 className="mt-1 text-2xl font-black">釣果デジタル証明 β 生成</h1>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                既存釣果へ catchProof / verificationScore / rankingEligibility を後付け生成できます。スコア仕様を変えた場合は一括再計算してください。
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button disabled={busy} onClick={() => handleBulk("missing")} className="tap-target rounded bg-water px-4 py-3 text-sm font-black text-white disabled:opacity-60">未生成を一括生成</button>
                <button disabled={busy} onClick={() => handleBulk("all")} className="tap-target rounded border border-coral px-4 py-3 text-sm font-black text-coral disabled:opacity-60">全件を一括再計算</button>
                <button disabled={busy} onClick={loadItems} className="tap-target rounded border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-60">再読み込み</button>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">全{items.length}件 / 未生成{missingItems.length}件</p>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">{item.fishType} {item.sizeCm}cm</h2>
                      <p className="text-xs font-bold text-slate-500">{new Date(item.caughtAt).toLocaleString("ja-JP")}</p>
                    </div>
                    <button disabled={busy} onClick={() => handleOne(item)} className="shrink-0 rounded border border-water px-3 py-2 text-xs font-black text-water disabled:opacity-60">再生成</button>
                  </div>
                  <div className="mt-3">
                    <CatchVerificationPanel item={item} compact showRawJson />
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}
