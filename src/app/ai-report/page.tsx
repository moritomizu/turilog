"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/AuthGate";
import { FeatureGate } from "@/components/FeatureGate";
import { SimpleFeedbackPrompt } from "@/components/FeedbackPrompt";
import { PageHeader } from "@/components/PageHeader";
import { getFirebaseAuth } from "@/lib/firebase";
import { getGroupCatches, getUserCatches } from "@/lib/catches";
import { getFeatureAccess } from "@/lib/features";
import { getGroupsForUser } from "@/lib/groups";
import type { AiReport, AiReportFilters, AiReportPeriod, AiReportPlannedTimeBand, AiReportSourceScope, Catch, Group } from "@/types";

const periodOptions: { value: AiReportPeriod; label: string }[] = [
  { value: "all", label: "全期間" },
  { value: "last7", label: "直近7日" },
  { value: "last30", label: "直近30日" },
  { value: "last90", label: "直近90日" },
  { value: "last180", label: "直近180日" },
  { value: "thisYear", label: "今年" },
  { value: "sameSeason", label: "同じ季節" }
];

const plannedTimeBandOptions: { value: AiReportPlannedTimeBand; label: string }[] = [
  { value: "allDay", label: "終日" },
  { value: "morning", label: "朝" },
  { value: "daytime", label: "昼" },
  { value: "evening", label: "夕方" },
  { value: "night", label: "夜" },
  { value: "custom", label: "時間指定" }
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
  const [groupCatches, setGroupCatches] = useState<Catch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [fishType, setFishType] = useState("all");
  const [period, setPeriod] = useState<AiReportPeriod>("all");
  const [sourceScope, setSourceScope] = useState<AiReportSourceScope>("personal");
  const [groupId, setGroupId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTimeBand, setPlannedTimeBand] = useState<AiReportPlannedTimeBand>("allDay");
  const [plannedStartTime, setPlannedStartTime] = useState("06:00");
  const [plannedEndTime, setPlannedEndTime] = useState("12:00");
  const [plannedArea, setPlannedArea] = useState("");
  const [activeReport, setActiveReport] = useState<AiReport | null>(null);
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);
  const [groupAnalysisAllowed, setGroupAnalysisAllowed] = useState(false);

  const sourceCatches = sourceScope === "group" ? groupCatches : catches;
  const fishTypes = useMemo(() => unique(sourceCatches.map((item) => item.fishType).filter(Boolean)), [sourceCatches]);
  const areaNames = useMemo(() => unique(sourceCatches.map((item) => item.areaName).filter(Boolean)), [sourceCatches]);

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

  useEffect(() => {
    Promise.all([getFeatureAccess(userId, "groupAnalysis"), getGroupsForUser(userId)])
      .then(([access, items]) => {
        setGroupAnalysisAllowed(access.allowed);
        setGroups(items);
        if (access.allowed && items[0]) setGroupId((current) => current || items[0].id);
      })
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (sourceScope !== "group" || !groupId) {
      setGroupCatches([]);
      return;
    }
    setMessage("グループ釣果を読み込んでいます。");
    getGroupCatches(groupId)
      .then((items) => {
        setGroupCatches(items);
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "グループ釣果を読み込めませんでした。"));
  }, [sourceScope, groupId]);

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
        sourceScope,
        groupId: sourceScope === "group" ? groupId : undefined,
        plannedDate: plannedDate || undefined,
        plannedTimeBand,
        plannedStartTime: plannedTimeBand === "custom" ? plannedStartTime : undefined,
        plannedEndTime: plannedTimeBand === "custom" ? plannedEndTime : undefined,
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
          <div>
            <span className="text-sm font-bold">分析する母数データ</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setSourceScope("personal");
                  setFishType("all");
                  setPlannedArea("");
                }}
                className={`tap-target rounded border px-4 py-3 text-left font-black ${sourceScope === "personal" ? "border-water bg-foam text-water" : "border-slate-200 bg-white text-slate-700"}`}
              >
                自分の釣果
                <span className="mt-1 block text-xs font-bold text-slate-500">自分の釣り方に寄せて分析</span>
              </button>
              <button
                type="button"
                disabled={!groupAnalysisAllowed || groups.length === 0}
                onClick={() => {
                  setSourceScope("group");
                  setFishType("all");
                  setPlannedArea("");
                }}
                className={`tap-target rounded border px-4 py-3 text-left font-black disabled:opacity-50 ${sourceScope === "group" ? "border-coral bg-orange-50 text-coral" : "border-slate-200 bg-white text-slate-700"}`}
              >
                グループ釣果
                <span className="mt-1 block text-xs font-bold text-slate-500">Group Pro向け。母数を増やして参考傾向を分析</span>
              </button>
            </div>
            {!groupAnalysisAllowed ? <p className="mt-2 text-xs font-bold text-slate-500">グループ釣果を母数にしたAIレポートはGroup Pro向け機能です。</p> : null}
          </div>
          {sourceScope === "group" ? (
            <label className="block">
              <span className="text-sm font-bold">対象グループ</span>
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
              <span className="mt-2 block text-xs font-bold leading-5 text-slate-500">
                グループ全体の釣果は母数が増えるため傾向を見つけやすくなりますが、釣り方や腕前の違いも混ざるため参考傾向として扱います。
              </span>
            </label>
          ) : null}
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
            <span className="mt-2 block text-xs font-bold leading-5 text-slate-500">
              季節や潮回りの違いを見たい時は、直近だけでなく「同じ季節」も試せます。
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-bold">次回釣行予定日（任意）</span>
            <input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold" />
          </label>
          <div>
            <span className="text-sm font-bold">次回釣行の時間帯（任意）</span>
            <select value={plannedTimeBand} onChange={(event) => setPlannedTimeBand(event.target.value as AiReportPlannedTimeBand)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 font-bold">
              {plannedTimeBandOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {plannedTimeBand === "custom" ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500">開始</span>
                  <input type="time" value={plannedStartTime} onChange={(event) => setPlannedStartTime(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-3 font-bold" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500">終了</span>
                  <input type="time" value={plannedEndTime} onChange={(event) => setPlannedEndTime(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-3 font-bold" />
                </label>
              </div>
            ) : null}
            <span className="mt-2 block text-xs font-bold leading-5 text-slate-500">
              予定日と時間帯を入れると、その時間に近い潮位・天候・風・月齢も参考データとしてAIに渡します。
            </span>
          </div>
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

        {activeReport ? <ReportCard report={activeReport} title="生成結果" userId={userId} /> : null}

        <section className="space-y-3">
          <h2 className="text-xl font-black">過去のAIレポート</h2>
          {reports.length ? reports.map((report) => <ReportCard key={report.id} report={report} compact userId={userId} />) : <p className="rounded bg-white p-4 text-sm font-bold text-slate-600 shadow-soft">過去に生成したレポートはまだありません。</p>}
        </section>
      </main>
    </>
  );
}

function ReportCard({ report, title, compact = false, userId }: { report: AiReport; title?: string; compact?: boolean; userId: string }) {
  return (
    <article className="rounded border border-teal-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-water">{title ?? "AI REPORT"}</p>
          <h2 className="mt-1 text-lg font-black">{report.fishType === "all" ? "全魚種" : report.fishType} / {getPeriodLabel(report.period)}</h2>
          <p className="mt-1 text-xs font-black text-water">{report.sourceScope === "group" ? report.groupName ?? "グループ釣果" : "自分の釣果"}を母数に分析</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(report.createdAt)} 生成 / 釣果 {report.catchCount}件</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {report.plannedDate ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-coral">予定日あり</span> : null}
          <button type="button" onClick={() => copyReport(report)} className="rounded border border-teal-100 px-3 py-2 text-xs font-black text-water">コピー</button>
          <button type="button" onClick={() => printReport(report)} className="rounded border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">PDF保存</button>
        </div>
      </div>
      <div className={`mt-4 space-y-3 text-sm font-bold leading-7 text-slate-700 ${compact ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
        {renderReportText(report.reportText)}
      </div>
      <div className="mt-4">
        <SimpleFeedbackPrompt userId={userId} trigger="after_ai_report_viewed" category="ai_report" title="このAIレポートは参考になりましたか？" />
      </div>
    </article>
  );
}

async function copyReport(report: AiReport) {
  await navigator.clipboard.writeText(getReportPlainText(report));
}

function printReport(report: AiReport) {
  const popup = window.open("", "_blank", "width=720,height=900");
  if (!popup) return;
  popup.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>AI釣果レポート</title><style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;line-height:1.8;padding:24px;color:#102a2a}
    h1{font-size:22px;margin:0 0 8px} pre{white-space:pre-wrap;font-family:inherit;font-size:14px}
    .meta{font-size:12px;color:#667;margin-bottom:18px}
  </style></head><body><h1>AI釣果レポートβ</h1><div class="meta">${escapeHtml(getReportMeta(report))}</div><pre>${escapeHtml(report.reportText)}</pre><script>window.print();</script></body></html>`);
  popup.document.close();
}

function getReportPlainText(report: AiReport) {
  return `AI釣果レポートβ
${getReportMeta(report)}

${report.reportText}`;
}

function getReportMeta(report: AiReport) {
  return `${report.fishType === "all" ? "全魚種" : report.fishType} / ${getPeriodLabel(report.period)} / ${report.sourceScope === "group" ? report.groupName ?? "グループ釣果" : "自分の釣果"} / 釣果${report.catchCount}件`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
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
