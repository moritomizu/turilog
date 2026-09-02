import Link from "next/link";
import { JsonLd } from "@/components/media/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { APP_NAME, APP_NAME_JA } from "@/lib/brand";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: `${APP_NAME}に無料登録して釣果ログを始めよう | ${APP_NAME_JA}`,
  description:
    "TSURILOGUE（釣りローグ）に無料登録すると、釣果写真、魚種、サイズ、潮位、天候、タックル、ポイントを記録し、仲間との共有やオンライン釣り大会も楽しめます。",
  path: "/ja/signup",
  image: "/images/lp/IMG_7885.jpg"
});

const benefits = [
  {
    title: "釣果をかんたんに記録",
    text: "魚種、サイズ、写真、日時、エリア、潮位、天候、タックルをまとめて残せます。"
  },
  {
    title: "仲間と釣果を共有",
    text: "グループで釣果一覧、ランキング、マップ、コメントを共有できます。"
  },
  {
    title: "オンライン釣り大会も楽しめる",
    text: "大会に参加し、投稿した釣果をもとにランキングを競えます。"
  }
];

export default function SignupPage() {
  const canonical = `${getSiteUrl()}/ja/signup`;

  return (
    <>
      <PageHeader title="無料登録" titleAs="div" />
      <JsonLd data={[signupPageJsonLd(canonical)]} />
      <main className="bg-gradient-to-b from-[#eefbf7] via-white to-[#f8fafc]">
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0f766e]">Personal Fishing Log</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              {APP_NAME}に無料登録して
              <span className="block text-[#0f766e]">釣果ログを始めよう</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-slate-600">
              {APP_NAME}（{APP_NAME_JA}）は、釣果記録・釣果共有・オンライン釣り大会をひとつにした釣り人向けアプリです。まずは今日の1匹を残すところから、自分の釣りをもっと楽しく振り返れます。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/ja/login" className="tap-target inline-flex items-center justify-center rounded-full bg-[#f97316] px-7 py-3 font-black text-white shadow-lg shadow-orange-500/20">
                無料登録を始める
              </Link>
              <Link href="/ja/features" className="tap-target inline-flex items-center justify-center rounded-full border border-teal-200 bg-white px-7 py-3 font-black text-[#0f766e]">
                機能を見る
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-xl shadow-slate-900/10">
            <div className="bg-[linear-gradient(135deg,#06131f,#0f766e)] p-6 text-white">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-200">Start Free</p>
              <h2 className="mt-3 text-2xl font-black">登録するとできること</h2>
            </div>
            <div className="grid gap-3 p-5">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-xl bg-foam p-4">
                  <h2 className="text-base font-black text-slate-950">{benefit.title}</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{benefit.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14">
          <div className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">登録前に、TSURILOGUEをもっと知る</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <InternalLink href="/ja/about" title="TSURILOGUEとは" text="なぜ作ったのか、目指す世界を読む" />
              <InternalLink href="/ja/features" title="機能紹介" text="釣果記録、共有、大会、AI分析を見る" />
              <InternalLink href="/ja/media" title="メディア" text="釣果ログ活用や釣りのヒントを読む" />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function InternalLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-xl border border-teal-100 bg-foam p-4 transition hover:-translate-y-0.5 hover:bg-white">
      <span className="block text-base font-black text-[#0f766e]">{title}</span>
      <span className="mt-2 block text-sm font-bold leading-6 text-slate-600">{text}</span>
    </Link>
  );
}

function signupPageJsonLd(canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${APP_NAME}に無料登録して釣果ログを始めよう`,
    url: canonical,
    description: "釣果記録、釣果共有、オンライン釣り大会を始められるTSURILOGUEの無料登録ページです。",
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: "https://www.tsurilogue.com"
    }
  };
}
