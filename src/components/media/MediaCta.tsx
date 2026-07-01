import Link from "next/link";

export function MediaCta() {
  return (
    <section className="rounded-[2rem] bg-gradient-to-br from-[#0f766e] via-[#0f766e] to-[#0b4f6c] p-6 text-white shadow-2xl shadow-teal-950/20 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">TSURILOGUE</p>
      <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">今日の釣果、未来につながります。</h2>
      <p className="mt-4 text-sm font-bold leading-7 text-teal-50 sm:text-base">
        TSURILOGUEなら、潮位・風向・気温・水温・釣果写真・AI分析まで記録できます。
      </p>
      <Link href="https://tsurilogue.com" className="mt-6 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-900/20 transition hover:bg-orange-400">
        無料ではじめる
      </Link>
    </section>
  );
}
