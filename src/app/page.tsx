import Link from "next/link";

const links = [
  { href: "/post", label: "釣果を投稿", body: "写真・魚種・サイズ・場所・潮位を記録" },
  { href: "/catches", label: "釣果一覧", body: "新着順で自分の釣果を確認" },
  { href: "/ranking", label: "ランキング", body: "年間・魚種別・月別の最大サイズ" },
  { href: "/map", label: "マップ", body: "釣れた地点を地図で振り返る" },
  { href: "/analysis", label: "潮位分析", body: "上げ潮・下げ潮・何分目の傾向" }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-foam px-4 py-6">
      <section className="mx-auto max-w-2xl">
        <div className="py-8">
          <p className="text-sm font-bold text-water">Personal fishing log</p>
          <h1 className="mt-2 text-4xl font-black tracking-normal text-ink">TsuriLog</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
            created by TaPiYoTa
            <br />
            心に残る一枚のために。釣果を残して振り返ろう。
            <br />
            潮位や水温、釣行データなどデータから振り返ることができる個人用釣りログです。
          </p>
        </div>

        <div className="grid gap-3">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="tap-target rounded border border-teal-100 bg-white p-5 shadow-soft transition hover:border-water">
              <span className="block text-xl font-black text-ink">{item.label}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">{item.body}</span>
            </Link>
          ))}
        </div>

        <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded border border-water px-5 py-4 font-bold text-water">
          ログイン設定
        </Link>
      </section>
    </main>
  );
}
