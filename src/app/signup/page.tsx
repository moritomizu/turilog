import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/media/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { APP_NAME, APP_NAME_JA } from "@/lib/brand";
import { localizePath, type AppLocale } from "@/lib/i18n";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";
import { getServerLocale } from "@/lib/serverLocale";

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  return createPageMetadata({
    locale,
    title: locale === "en" ? `Start your free ${APP_NAME} catch log` : `${APP_NAME}に無料登録して釣果ログを始めよう | ${APP_NAME_JA}`,
    description: locale === "en"
      ? "Create a free TSURILOGUE account to log catches and fishing conditions, keep your fishing memories, and make share-ready catch images."
      : "TSURILOGUE（釣りローグ）に無料登録すると、釣果写真、魚種、サイズ、潮位、天候、タックル、ポイントを記録し、仲間との共有やオンライン釣り大会も楽しめます。",
    path: "/signup",
    image: "/images/lp/IMG_7885.jpg"
  });
}

export default function SignupPage() {
  const locale = getServerLocale();
  const content = signupContent[locale];
  const canonical = `${getSiteUrl()}${localizePath("/signup", locale)}`;

  return (
    <>
      <PageHeader title={content.header} titleAs="div" />
      <JsonLd data={[signupPageJsonLd(canonical, locale)]} />
      <main className="bg-gradient-to-b from-[#eefbf7] via-white to-[#f8fafc]">
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0f766e]">Personal Fishing Log</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              {content.heroTitle}
              <span className="block text-[#0f766e]">{content.heroAccent}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-slate-600">
              {content.heroDescription}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={localizePath("/login", locale)} className="tap-target inline-flex items-center justify-center rounded-full bg-[#f97316] px-7 py-3 font-black text-white shadow-lg shadow-orange-500/20">
                {content.start}
              </Link>
              <Link href={localizePath("/features", locale)} className="tap-target inline-flex items-center justify-center rounded-full border border-teal-200 bg-white px-7 py-3 font-black text-[#0f766e]">
                {content.features}
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-xl shadow-slate-900/10">
            <div className="bg-[linear-gradient(135deg,#06131f,#0f766e)] p-6 text-white">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-200">Start Free</p>
              <h2 className="mt-3 text-2xl font-black">{content.benefitsHeading}</h2>
            </div>
            <div className="grid gap-3 p-5">
              {content.benefits.map((benefit) => (
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
            <h2 className="text-2xl font-black text-slate-950">{content.learnMore}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <InternalLink href={localizePath("/about", locale)} title={content.links.about.title} text={content.links.about.text} />
              <InternalLink href={localizePath("/features", locale)} title={content.links.features.title} text={content.links.features.text} />
              {locale === "ja" ? <InternalLink href="/ja/media" title={content.links.media.title} text={content.links.media.text} /> : null}
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

function signupPageJsonLd(canonical: string, locale: AppLocale) {
  const english = locale === "en";
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    inLanguage: locale,
    name: english ? `Start your free ${APP_NAME} catch log` : `${APP_NAME}に無料登録して釣果ログを始めよう`,
    url: canonical,
    description: english
      ? "Create a free TSURILOGUE account to log catches, keep fishing memories, and make share-ready catch images."
      : "釣果記録、釣果共有、オンライン釣り大会を始められるTSURILOGUEの無料登録ページです。",
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: "https://www.tsurilogue.com"
    }
  };
}

const signupContent = {
  ja: {
    header: "無料登録",
    heroTitle: `${APP_NAME}に無料登録して`,
    heroAccent: "釣果ログを始めよう",
    heroDescription: `${APP_NAME}（${APP_NAME_JA}）は、釣果記録・釣果共有・オンライン釣り大会をひとつにした釣り人向けアプリです。まずは今日の1匹を残すところから、自分の釣りをもっと楽しく振り返れます。`,
    start: "無料登録を始める",
    features: "機能を見る",
    benefitsHeading: "登録するとできること",
    benefits: [
      { title: "釣果をかんたんに記録", text: "魚種、サイズ、写真、日時、エリア、潮位、天候、タックルをまとめて残せます。" },
      { title: "仲間と釣果を共有", text: "グループで釣果一覧、ランキング、マップ、コメントを共有できます。" },
      { title: "オンライン釣り大会も楽しめる", text: "大会に参加し、投稿した釣果をもとにランキングを競えます。" }
    ],
    learnMore: "登録前に、TSURILOGUEをもっと知る",
    links: {
      about: { title: "TSURILOGUEとは", text: "なぜ作ったのか、目指す世界を読む" },
      features: { title: "機能紹介", text: "釣果記録、共有、大会、AI分析を見る" },
      media: { title: "メディア", text: "釣果ログ活用や釣りのヒントを読む" }
    }
  },
  en: {
    header: "Start free",
    heroTitle: "Create your free account.",
    heroAccent: "Log your next catch.",
    heroDescription: `${APP_NAME} keeps your catch photos, fish, size, time, fishing area, conditions, and notes together. Start with one catch and build a fishing log you can revisit and share.`,
    start: "Start for free",
    features: "Explore features",
    benefitsHeading: "What you can do",
    benefits: [
      { title: "Log your catch", text: "Keep the fish, size, photo, date, fishing area, conditions, and tackle together." },
      { title: "Keep your fishing memories", text: "Build a personal history of the places, conditions, and methods behind every catch." },
      { title: "Create and share", text: "Turn your catch into a share-ready image without exposing exact GPS coordinates." }
    ],
    learnMore: "Learn more about TSURILOGUE",
    links: {
      about: { title: "About TSURILOGUE", text: "Learn why TSURILOGUE was created and where it is going." },
      features: { title: "Features", text: "Explore catch logging, sharing, conditions, and analysis." },
      media: { title: "Media", text: "Read fishing log tips and stories." }
    }
  }
} satisfies Record<AppLocale, {
  header: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  start: string;
  features: string;
  benefitsHeading: string;
  benefits: { title: string; text: string }[];
  learnMore: string;
  links: Record<"about" | "features" | "media", { title: string; text: string }>;
}>;
