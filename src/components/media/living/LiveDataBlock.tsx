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

export function LiveDataBlock({
  title = "TSURILOGUE Live Data",
  description = "記事に関連する釣果傾向を、TSURILOGUEの公開集計データとして表示するLiving Componentです。",
  data,
  query = { fish: "チヌ", area: "大阪湾", method: "チニング", days: 30 }
}: LiveDataBlockProps) {
  const [liveData, setLiveData] = useState<LiveDataBlockData>(data ?? defaultLiveData);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(data ? "ready" : "loading");
  const periodLabel = `直近${query.days ?? 30}日`;
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query.fish) params.set("fish", query.fish);
    if (query.area) params.set("area", query.area);
    if (query.method) params.set("method", query.method);
    if (query.days) params.set("days", String(query.days));
    return params.toString();
  }, [query.area, query.days, query.fish, query.method]);

  useEffect(() => {
    if (data) return;
    let ignore = false;
    setStatus("loading");
    fetch(`/api/media/live-data${queryString ? `?${queryString}` : ""}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("live data fetch failed");
        return (await response.json()) as LiveDataBlockData;
      })
      .then((result) => {
        if (ignore) return;
        setLiveData(result);
        setStatus(result.totalCatches > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, [data, queryString]);

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
            集計条件: {query.fish || "全魚種"} / {query.area || "全エリア"} / {query.method || "全釣法"} / {periodLabel}
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
        ) : (
          <p className="text-xs font-bold leading-6 text-slate-600">
            公開共有された釣果だけを集計しています。個人情報や正確なGPS座標は表示しません。
          </p>
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
}
