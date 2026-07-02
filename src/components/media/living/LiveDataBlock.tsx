export type LiveDataBlockData = {
  periodLabel: string;
  postCount30Days: number;
  averageSizeCm: number;
  maxSizeCm: number;
  popularTimeRange: string;
  popularFishType: string;
  popularArea: string;
  updatedAtLabel?: string;
};

type LiveDataBlockProps = {
  title?: string;
  description?: string;
  data?: LiveDataBlockData;
};

const defaultLiveData: LiveDataBlockData = {
  periodLabel: "直近30日",
  postCount30Days: 128,
  averageSizeCm: 42.6,
  maxSizeCm: 86,
  popularTimeRange: "朝マズメ",
  popularFishType: "マダイ",
  popularArea: "大阪湾",
  updatedAtLabel: "サンプルデータ"
};

export function LiveDataBlock({
  title = "TSURILOGUE Live Data",
  description = "記事に関連する釣果傾向を、TSURILOGUEの集計データとして表示するためのLiving Componentです。",
  data = defaultLiveData
}: LiveDataBlockProps) {
  const metrics = [
    { label: "投稿数", value: `${data.postCount30Days.toLocaleString("ja-JP")}件`, helper: data.periodLabel },
    { label: "平均サイズ", value: `${data.averageSizeCm.toFixed(1)}cm`, helper: "記録サイズ平均" },
    { label: "最大サイズ", value: `${data.maxSizeCm.toFixed(0)}cm`, helper: "最大記録" },
    { label: "人気時間帯", value: data.popularTimeRange, helper: "投稿が多い時間" },
    { label: "人気魚種", value: data.popularFishType, helper: "投稿数ベース" },
    { label: "人気エリア", value: data.popularArea, helper: "エリア集計" }
  ];

  return (
    <section className="mt-12 overflow-hidden rounded-[1.75rem] border border-teal-100 bg-white shadow-xl shadow-slate-900/5">
      <div className="relative overflow-hidden bg-[#06131f] px-5 py-6 text-white sm:px-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(45,212,191,0.28),transparent_32%),linear-gradient(135deg,rgba(15,118,110,0.42),transparent_52%)]" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-white/15">Live Data Block</span>
            {data.updatedAtLabel ? <span className="rounded-full bg-orange-400 px-3 py-1 text-[11px] font-black text-slate-950">{data.updatedAtLabel}</span> : null}
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-200">{description}</p>
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
        <p className="text-xs font-bold leading-6 text-slate-600">
          現在はダミーデータです。今後、Firebaseの釣果集計や記事カテゴリに応じたライブ統計へ差し替える想定です。
        </p>
      </div>
    </section>
  );
}
