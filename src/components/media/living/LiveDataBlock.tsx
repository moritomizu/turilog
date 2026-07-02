"use client";

import { useEffect, useMemo, useState } from "react";

export type LiveDataBlockQuery = {
  fish?: string;
  area?: string;
  method?: string;
  days?: number;
};

export type LiveDataBlockData = {
  totalCatches: number;
  averageSize: number;
  maxSize: number;
  popularTimeRange: string;
  popularFish: string;
  popularArea: string;
  latestUpdatedAt?: string | null;
};

type LiveDataBlockProps = {
  title?: string;
  description?: string;
  data?: LiveDataBlockData;
  query?: LiveDataBlockQuery;
  fallbackQuery?: LiveDataBlockQuery;
};

const defaultLiveData: LiveDataBlockData = {
  totalCatches: 0,
  averageSize: 0,
  maxSize: 0,
  popularTimeRange: "朝マズメ",
  popularFish: "マダイ",
  popularArea: "大阪湾",
  latestUpdatedAt: null
};

const defaultQuery: LiveDataBlockQuery = { fish: "チヌ", area: "大阪", days: 30 };
const defaultFallbackQuery: LiveDataBlockQuery = { fish: "チヌ", area: "大阪", days: 365 };

export function LiveDataBlock({
  title = "TSURILOGUE Live Data",
  description = "記事に関連する釣果傾向を、TSURILOGUEの公開集計データとして表示するLiving Componentです。",
  data,
  query = defaultQuery,
  fallbackQuery = defaultFallbackQuery
}: LiveDataBlockProps) {
  const primaryQuery = useMemo(
    () => ({ fish: query.fish, area: query.area, method: query.method, days: query.days }),
    [query]
  );
  const fallback = useMemo(
    () => (fallbackQuery ? { fish: fallbackQuery.fish, area: fallbackQuery.area, method: fallbackQuery.method, days: fallbackQuery.days } : undefined),
    [fallbackQuery]
  );
  const [liveData, setLiveData] = useState<LiveDataBlockData>(data ?? defaultLiveData);
  const [activeQuery, setActiveQuery] = useState<LiveDataBlockQuery>(primaryQuery);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback" | "empty" | "error">(data ? "ready" : "loading");
  const periodLabel = `直近${activeQuery.days ?? 30}日`;
  const queryString = useMemo(() => serializeQuery(primaryQuery), [primaryQuery]);
  const fallbackQueryString = useMemo(() => serializeQuery(fallback ?? {}), [fallback]);

  useEffect(() => {
    if (data) return;
    let ignore = false;
    setStatus("loading");
    setActiveQuery(primaryQuery);
    fetchLiveData(queryString)
      .then(async (result) => {
        if (ignore) return;
        if (result.totalCatches > 0 || !fallbackQueryString) {
          setLiveData(result);
          setStatus(result.totalCatches > 0 ? "ready" : "empty");
          return;
        }
        const fallbackResult = await fetchLiveData(fallbackQueryString);
        if (ignore) return;
        setLiveData(fallbackResult);
        setActiveQuery(fallback ?? primaryQuery);
        setStatus(fallbackResult.totalCatches > 0 ? "fallback" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, [data, fallback, fallbackQueryString, primaryQuery, queryString]);

  const updatedAtLabel = liveData.latestUpdatedAt ? `${formatDate(liveData.latestUpdatedAt)} 更新` : "";
  const metrics = [
    { label: "投稿数", value: `${liveData.totalCatches.toLocaleString("ja-JP")}件`, helper: periodLabel },
    { label: "平均サイズ", value: `${liveData.averageSize.toFixed(1)}cm`, helper: "公開釣果の平均" },
    { label: "最大サイズ", value: `${liveData.maxSize.toFixed(1)}cm`, helper: "公開釣果の最大" },
    { label: "人気時間帯", value: liveData.popularTimeRange, helper: "投稿が多い時間" },
    { label: "人気魚種", value: liveData.popularFish, helper: "投稿数ベース" },
    { label: "人気エリア", value: liveData.popularArea, helper: "エリア集計" }
  ];

  return (
    <section className="mt-12 overflow-hidden rounded-[1.75rem] border border-teal-100 bg-white shadow-xl shadow-slate-900/5">
      <div className="relative overflow-hidden bg-[#06131f] px-5 py-6 text-white sm:px-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(45,212,191,0.28),transparent_32%),linear-gradient(135deg,rgba(15,118,110,0.42),transparent_52%)]" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-white/15">Live Data Block</span>
            {updatedAtLabel ? <span className="rounded-full bg-orange-400 px-3 py-1 text-[11px] font-black text-slate-950">{updatedAtLabel}</span> : null}
            {status === "loading" ? <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-black text-cyan-100 ring-1 ring-white/15">読み込み中</span> : null}
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-200">{description}</p>
          <p className="mt-3 text-xs font-bold leading-6 text-cyan-100">
            集計条件: {activeQuery.fish || "全魚種"} / {activeQuery.area || "全エリア"} / {activeQuery.method || "全釣法"} / {periodLabel}
          </p>
        </div>
      </div>

      <div className="grid gap-3 bg-gradient-to-br from-[#f8fffd] to-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-teal-50 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{metric.value}</p>
            <p className="mt-1 text-xs font-bold text-[#0f766e]">{metric.helper}</p>
          </article>
        ))}
      </div>

      <div className="border-t border-teal-50 bg-teal-50/50 px-5 py-4 sm:px-7">
        {status === "empty" ? (
          <p className="text-xs font-bold leading-6 text-slate-600">まだ十分な釣果データがありません。投稿が増えるほど、この記事のデータも成長していきます。</p>
        ) : status === "error" ? (
          <p className="text-xs font-bold leading-6 text-red-700">現在データを取得できません</p>
        ) : status === "fallback" ? (
          <p className="text-xs font-bold leading-6 text-slate-600">
            直近30日は十分なデータがないため、参考として直近365日の公開釣果を表示しています。個人情報や正確なGPS座標は表示しません。
          </p>
        ) : (
          <p className="text-xs font-bold leading-6 text-slate-600">
            公開共有された釣果だけを集計しています。個人情報や正確なGPS座標は表示しません。
          </p>
        )}
      </div>
    </section>
  );
}

async function fetchLiveData(queryString: string) {
  const response = await fetch(`/api/media/live-data${queryString ? `?${queryString}` : ""}`);
  if (!response.ok) throw new Error("live data fetch failed");
  return (await response.json()) as LiveDataBlockData;
}

function serializeQuery(query: LiveDataBlockQuery) {
  const params = new URLSearchParams();
  if (query.fish) params.set("fish", query.fish);
  if (query.area) params.set("area", query.area);
  if (query.method) params.set("method", query.method);
  if (query.days) params.set("days", String(query.days));
  return params.toString();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
}
