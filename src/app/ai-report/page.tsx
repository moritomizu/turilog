"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/AuthGate";
import { FeatureGate } from "@/components/FeatureGate";
import { PageHeader } from "@/components/PageHeader";
import { getFirebaseAuth } from "@/lib/firebase";
import { getUserCatches } from "@/lib/catches";
import type { AiReport, AiReportFilters, AiReportPeriod, Catch } from "@/types";

const periodOptions: { value: AiReportPeriod; label: string }[] = [
  { value: "all", label: "全期間" },
  { value: "last30", label: "直近30日" },
  { value: "last90", label: "直近90日" },
  { value: "thisYear", label: "今年" }
];

export default function AiReportPage() {
  return (
    <AuthGate>
      {(user) => (
        <FeatureGate userId={user.uid} featureKey="aiReport">
          <AiReportContent userId={user.uid} />
        </FeatureGate>
      )}
    </AuthGate>
  );
}

function AiReportContent({ userId }: { userId: string }) {
  const [catches, setCatches] = useState<Catch[]>([]);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [fishType, setFishType] = useState("all");
  const [period, setPeriod] = useState<AiReportPeriod>("all");
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedArea, setPlannedArea] = useState("");
  const [activeReport, setActiveReport] = useState<AiReport | null>(null);
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);

  const fishTypes = useMemo(() => unique(catches.map((item) => item.fishType).filter(Boolean)), [catches]);
  const areaNames = useMemo(() => unique(catches.map((item) => item.areaName).filter(Boolean)), [catches]);

  useEffect(() => {
    getUserCatches(userId)
      .then((items) => {
        setCatches(items);
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "釣果データを読み込めませんでした。"));
  }, [userId]);

  useEffect(() => {
    loadReports().catch(() => undefined);
  }, []);

  async function loadReports() {
    const token = await getIdToken();
    const response = await fetch("/api/ai-report", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) setReports(Array.isArray(data.reports) ? data.reports : []);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("釣果データを集計し、AIレポートを生成しています。");
    try {
      const token = await getIdToken();
      const filters: AiReportFilters = {
        fishType,
        period,
        plannedDate: plannedDate || undefined,
        plannedArea: plannedArea || undefined
      };
      const response = await fetch("/api/ai-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(filters)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AIレポートを生成できませんでした。");
      setActiveReport(data.report);
      setReports((current) => [data.report, ...current.filter((item) => item.id !== data.report.id)]);
      setMessage("AIレポートを生成しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AIレポートを生成できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="AIレポート" actionHref="/" actionLabel="TOP" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <section className="rounded border border-coral/20 bg-orange-50 p-4 shadow-soft">
          <p className="text-xs font-black text-coral">BETA</p>
          <h1 className="mt-1 text-2xl font-black">AI釣果レポートβ</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
            あなたの釣果データから、釣れやすい時間帯・潮位・エリア・タックル傾向を分析し、次回釣行のヒントを提案します。
          </p>
          <p className="mt-3 rounded bg-white/80 p-3 text-xs font-bold leading-5 text-slate-600">
            釣果データが少ない場合は、参考傾向として表示されます。釣果を記録するほど分析精度が高まります。
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-black">分析条件</h2>
          <label className="block">
            <span className="text-sm font-bold">対象魚種</span>
            <select value={fishType} onChange={(event) => setFishType(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
              <option value="all">全魚種</option>
              {fishTypes.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold">分析期間</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as AiReportPeriod)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
              {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold">次回釣行予定日（任意）</span>
            <input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">予定エリア（任意）</span>
            <select value={plannedArea} onChange={(event) => setPlannedArea(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
              <option value="">指定しない</option>
              {areaNames.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          {message ? <p className="rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">{message}</p> : null}
          <button disabled={busy} className="tap-target w-full rounded bg-coral px-5 py-4 text-lg font-black text-white disabled:opacity-60">
            {busy ? "生成中..." : "AIレポートを生成する"}
          </button>
        </form>

        {activeReport ? <ReportCard report={activeReport} title="生成結果" /> : null}

        <section className="space-y-3">
          <h2 className="text-xl font-black">過去のAIレポート</h2>
          {reports.length ? reports.map((report) => <ReportCard key={report.id} report={report} compact />) : <p className="rounded bg-white p-4 text-sm font-bold text-slate-600 shadow-soft">過去に生成したレポートはまだありません。</p>}
        </section>
      </main>
    </>
  );
}

function ReportCard({ report, title, compact = false }: { report: AiReport; title?: string; compact?: boolean }) {
  return (
    <article className="rounded border border-teal-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-water">{title ?? "AI REPORT"}</p>
          <h2 className="mt-1 text-lg font-black">{report.fishType === "all" ? "全魚種" : report.fishType} / {getPeriodLabel(report.period)}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(report.createdAt)} 生成 / 釣果 {report.catchCount}件</p>
        </div>
        {report.plannedDate ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-coral">予定日あり</span> : null}
      </div>
      <div className={`mt-4 space-y-3 text-sm font-bold leading-7 text-slate-700 ${compact ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
        {renderReportText(report.reportText)}
      </div>
    </article>
  );
}

function renderReportText(text: string) {
  return text.split(/\n+/).filter(Boolean).map((line, index) => {
    const heading = /^\d+\.\s/.test(line);
    return (
      <p key={`${line}-${index}`} className={heading ? "mt-4 text-base font-black text-ink first:mt-0" : ""}>
        {renderBold(line)}
      </p>
    );
  });
}

function renderBold(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={`${part}-${index}`} className="font-black text-ink">{part.slice(2, -2)}</strong>
    : <span key={`${part}-${index}`}>{part}</span>);
}

async function getIdToken() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("ログインが必要です。");
  return user.getIdToken();
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ja"));
}

function getPeriodLabel(value: AiReportPeriod) {
  return periodOptions.find((item) => item.value === value)?.label ?? "全期間";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
