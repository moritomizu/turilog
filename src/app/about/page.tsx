import Link from "next/link";
import { JsonLd } from "@/components/media/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { APP_NAME, APP_NAME_JA } from "@/lib/brand";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: `${APP_NAME}とは | 釣果記録・釣りデータプラットフォーム`,
  description:
    "TSURILOGUE（釣りローグ）は、釣果記録、潮位・気象データ、AI分析、グループ共有、オンライン釣り大会、釣果デジタル証明を備えた釣り人向けデータプラットフォームです。",
  path: "/ja/about",
  image: "/images/lp/IMG_7885.jpg"
});

const featureLinks = [
  { href: "/features", label: "機能を見る" },
  { href: "/media", label: "メディアを読む" },
  { href: "/pricing", label: "料金プランを見る" },
  { href: "/feedback", label: "意見を送る" }
];

const entities = [
  "釣果記録",
  "潮位データ",
  "気象データ",
  "タックル記録",
  "AI釣果レポート",
  "グループ共有",
  "オンライン釣り大会",
  "釣果デジタル証明",
  "位置情報保護"
];

export default function AboutPage() {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/ja/about`;

  return (
    <>
      <JsonLd data={[softwareApplicationJsonLd(canonical), aboutPageJsonLd(canonical)]} />
      <PageHeader title={`${APP_NAME}とは`} titleAs="h1" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <section className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">Personal Fishing Log</p>
          <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            釣果を記録するほど、
            <span className="block text-[#0f766e]">次の1匹に近づく。</span>
          </h2>
          <p className="mt-6 text-base font-bold leading-8 text-slate-600 sm:text-lg">
            {APP_NAME}（{APP_NAME_JA}）は、釣果写真、魚種、サイズ、ポイント、潮位、気象条件、タックルをかんたんに残し、あとから振り返れる釣り人のための釣果記録・釣りデータプラットフォームです。
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {entities.map((item) => (
              <span key={item} className="rounded-full bg-[#ecfeff] px-3 py-2 text-xs font-black text-[#0f766e] ring-1 ring-teal-100">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <InfoCard title="個人の釣果を資産にする" text="魚種、サイズ、釣った日時、エリア、潮位、風向き、水温、天気、タックルをまとめて記録し、自分だけの釣れる条件を見つけやすくします。" />
          <InfoCard title="仲間と学びを共有する" text="グループ機能では、釣り仲間同士の釣果、ランキング、釣果マップ、分析を共有できます。個人の記録が仲間との学びに変わります。" />
          <InfoCard title="大会を安心して楽しむ" text="オンライン釣り大会では、ランキング、承認管理、釣果デジタル証明、位置情報保護により、楽しく安全な運営を支援します。" />
        </section>

        <section className="mt-8 rounded-[2rem] bg-[#06131f] p-6 text-white sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-200">Vision</p>
          <h2 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">日本発の釣り文化を、データで次の世代へ。</h2>
          <div className="mt-6 grid gap-6 text-sm font-bold leading-8 text-slate-100 md:grid-cols-2">
            <p>
              釣りは、経験、勘、自然条件、仲間との情報交換によって深まる遊びです。TSURILOGUEは、その大切な感覚を壊さず、記録とデータによって釣りの振り返りを少しだけ賢くすることを目指しています。
            </p>
            <p>
              釣果を公開するだけではなく、ポイントを守りながら共有すること。釣果の信頼性を参考スコアとして見える化すること。個人、仲間、大会、メディアがつながる釣りデータ基盤を育てていきます。
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-10">
          <h2 className="text-2xl font-black text-slate-950">運営と関連ページ</h2>
          <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
            TSURILOGUEは、TaPiYoTaによる釣り人向けサービス開発プロジェクトです。利用規約、プライバシーポリシー、フィードバック窓口を公開し、ユーザーの声をもとに改善を続けています。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {featureLinks.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full bg-[#0f766e] px-5 py-3 text-sm font-black text-white transition hover:bg-[#115e59]">
                {item.label}
              </Link>
            ))}
            <Link href="/terms" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#0f766e] hover:text-[#0f766e]">
              利用規約
            </Link>
            <Link href="/privacy" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#0f766e] hover:text-[#0f766e]">
              プライバシーポリシー
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-[1.5rem] border border-teal-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function softwareApplicationJsonLd(url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    alternateName: [APP_NAME_JA, "釣りローグ"],
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web, iOS, Android",
    url,
    description:
      "釣果記録、潮位・気象データ、AI分析、グループ共有、オンライン釣り大会、釣果デジタル証明を備えた釣り人向けデータプラットフォーム。",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY"
    }
  };
}

function aboutPageJsonLd(url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `${APP_NAME}とは`,
    url,
    mainEntity: {
      "@type": "Thing",
      name: APP_NAME,
      alternateName: [APP_NAME_JA, "釣りローグ"],
      description: "釣り人の釣果記録、分析、共有、大会運営を支援する釣りデータプラットフォーム。"
    }
  };
}
