"use client";

import { getVerificationFlagLabel, getVerificationScoreLabel } from "@/lib/catchVerification";
import type { Catch, ProofFlag, VerificationLevel } from "@/types";

export function CatchVerificationPanel({ item, compact = false }: { item: Catch; compact?: boolean }) {
  const score = item.verificationScore;
  if (!score) {
    return (
      <section className="rounded border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600">
        <p className="text-xs font-black text-slate-500">釣果デジタル証明 β</p>
        <p className="mt-1">証明スコアはまだ生成されていません。</p>
      </section>
    );
  }

  const total = score.total ?? score.totalScore ?? 0;
  const level = normalizeLevel(score.level);
  const concernFlags = getConcernFlags(score.flags ?? []);
  const eligibility = getEligibilityLabel(item);

  return (
    <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-water">釣果デジタル証明 β</p>
          <p className="mt-1 text-sm font-bold text-slate-500">証明スコア</p>
          <p className="text-3xl font-black text-ink">{total}<span className="text-base text-slate-500"> / 100</span></p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-black ${getLevelClass(level)}`}>
            判定: {getVerificationScoreLabel(score)}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${eligibility.className}`}>
            ランキング反映: {eligibility.label}
          </span>
        </div>
      </div>

      {item.rankingEligibility?.reason ? <p className="mt-3 rounded bg-orange-50 p-2 text-xs font-bold text-coral">{item.rankingEligibility.reason}</p> : null}

      <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <InfoList title="確認済み" items={score.messages?.length ? score.messages : ["確認済み項目はまだありません。"]} tone="ok" />
        <InfoList title="確認事項" items={concernFlags.length ? concernFlags.map(getVerificationFlagLabel) : ["大きな確認事項はありません。"]} tone={concernFlags.length ? "warn" : "ok"} />
      </div>

      <details className="mt-4 rounded bg-foam p-3">
        <summary className="cursor-pointer text-sm font-black text-water">証明パッケージの詳細</summary>
        <div className="mt-3 grid gap-2 text-xs font-bold leading-5 text-slate-700">
          <p>写真: {item.catchProof?.image.hasImage ? "あり" : "なし"}</p>
          <p>EXIF: {item.catchProof?.image.hasExif ? "あり" : "なし"} / 撮影日時: {item.catchProof?.image.hasExifDateTime ? "あり" : "なし"}</p>
          <p>GPS: {item.catchProof?.location.hasExactLocation ? "あり" : "なし"} / 精度: {item.catchProof?.location.accuracyMeters == null ? "未取得" : `${item.catchProof.location.accuracyMeters}m`}</p>
          <p>釣果時刻: {item.catchProof?.time.caughtAt ?? "未取得"}</p>
          <p>投稿時刻: {item.catchProof?.time.createdAt ?? "未取得"}</p>
          <p>潮位: {item.catchProof?.environment.hasTideData ? "あり" : "なし"} / {item.catchProof?.environment.tidePhaseLabel ?? "潮未取得"}</p>
          <p>大会: {item.catchProof?.context.isTournamentEntry ? "大会投稿" : "通常投稿"} / {item.catchProof?.context.tournamentEntryStatus ?? "none"}</p>
          <ScoreBreakdown item={item} />
        </div>
      </details>

      <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
        このスコアは釣果の真正性を完全に保証するものではありません。大会運営や確認作業を補助する参考情報です。
      </p>
    </section>
  );
}

function InfoList({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "warn" }) {
  return (
    <div className={`rounded p-3 ${tone === "ok" ? "bg-emerald-50" : "bg-yellow-50"}`}>
      <p className={`text-xs font-black ${tone === "ok" ? "text-emerald-700" : "text-yellow-700"}`}>{title}</p>
      <ul className="mt-2 space-y-1 text-xs font-bold leading-5 text-slate-700">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}

function ScoreBreakdown({ item }: { item: Catch }) {
  const breakdown = item.verificationScore?.breakdown ?? [];
  if (!breakdown.length) return null;
  return (
    <div className="mt-2 rounded bg-white p-2">
      <p className="font-black text-slate-600">スコア内訳</p>
      {breakdown.map((row) => (
        <p key={row.key}>{row.label}: {row.score}点</p>
      ))}
    </div>
  );
}

function getConcernFlags(flags: ProofFlag[]) {
  return flags.filter((flag) =>
    flag.startsWith("missing_") ||
    flag.startsWith("low_") ||
    flag.includes("mismatch") ||
    flag.includes("out_of_period") ||
    flag.includes("manual") ||
    flag.includes("far_from") ||
    flag.includes("missing")
  );
}

function normalizeLevel(level: VerificationLevel): "high" | "medium" | "low" | "needs_review" {
  if (level === "high" || level === "highTrust") return "high";
  if (level === "medium" || level === "strong" || level === "standard") return "medium";
  if (level === "low" || level === "basic") return "low";
  return "needs_review";
}

function getLevelClass(level: ReturnType<typeof normalizeLevel>) {
  if (level === "high") return "bg-emerald-100 text-emerald-700";
  if (level === "medium") return "bg-sky-100 text-sky-700";
  if (level === "low") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function getEligibilityLabel(item: Catch) {
  if (item.rankingEligibility?.eligible) return { label: "可", className: "bg-emerald-100 text-emerald-700" };
  const flags = item.verificationScore?.criticalFlags ?? item.verificationScore?.flags ?? [];
  const blocked = flags.some((flag) => ["missing_photo", "missing_gps", "tournament_out_of_period", "tournament_target_fish_mismatch"].includes(flag));
  return blocked
    ? { label: "不可", className: "bg-red-100 text-red-700" }
    : { label: "要確認", className: "bg-yellow-100 text-yellow-700" };
}
