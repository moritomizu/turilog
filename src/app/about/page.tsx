import Link from "next/link";
import { JsonLd } from "@/components/media/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { APP_NAME, APP_NAME_JA } from "@/lib/brand";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: `${APP_NAME}（${APP_NAME_JA}）とは | 釣果記録・釣りログから釣りの未来をつくる`,
  description:
    "TSURILOGUE（釣りローグ）は、釣果記録、釣りログ、潮位・気象データ、AI分析、グループ共有、オンライン釣り大会を通じて、釣り人の次の一匹と釣り文化の未来を支えるサービスです。",
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
        <section className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-sm">
          <div className="bg-[linear-gradient(135deg,#06131f,#0f766e)] p-6 text-white sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-200">Personal Fishing Log</p>
            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
              今日の1匹を、
              <span className="block text-cyan-200">未来の釣りにつなげる。</span>
            </h2>
            <p className="mt-6 max-w-3xl text-base font-bold leading-8 text-slate-100 sm:text-lg">
              {APP_NAME}（{APP_NAME_JA}）は、釣果をただ残すだけのアプリではありません。釣った魚、時間、潮、天気、タックル、ポイントの記録を積み重ね、次の釣行や仲間との学びにつなげるためのパーソナル釣果ログです。
            </p>
          </div>
          <div className="p-6 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">Personal Fishing Log</p>
          <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            釣果を記録するほど、
            <span className="block text-[#0f766e]">次の1匹に近づく。</span>
          </h2>
          <p className="mt-6 text-base font-bold leading-8 text-slate-600 sm:text-lg">
            釣りは、経験と勘と自然の変化を読む遊びです。だからこそ、記憶だけに頼るのではなく、釣果写真、魚種、サイズ、ポイント、潮位、気象条件、タックルを残しておくことで、自分だけの「釣れる条件」が少しずつ見えてきます。
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {entities.map((item) => (
              <span key={item} className="rounded-full bg-[#ecfeff] px-3 py-2 text-xs font-black text-[#0f766e] ring-1 ring-teal-100">
                {item}
              </span>
            ))}
          </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <InfoCard title="釣り人へ" text="釣果をすばやく残し、潮位・気象・タックルと一緒に振り返れます。なんとなく釣れた1匹を、次につながるヒントへ変えていきます。" />
          <InfoCard title="釣り仲間へ" text="グループで釣果を共有し、仲間内ランキングや釣果マップ、コメントで盛り上がれます。個人の記録が、仲間との学びになります。" />
          <InfoCard title="釣りを知らない人へ" text="TSURILOGUEは、釣り人が何を考え、どんな自然条件と向き合っているのかをデータで見える化する入り口でもあります。" />
        </section>

        <section className="mt-8 rounded-[2rem] border border-orange-100 bg-orange-50 p-6 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-700">Why we build</p>
          <h2 className="mt-4 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">なぜ、TSURILOGUEを作ったのか。</h2>
          <div className="mt-6 grid gap-6 text-sm font-bold leading-8 text-slate-700 md:grid-cols-2">
            <p>
              釣りの楽しさは、魚が釣れた瞬間だけでは終わりません。なぜ釣れたのか、次はどうすればもっと良い1匹に出会えるのか。帰ってから写真を見返し、潮や風やタックルを思い出す時間にも、釣りの楽しさがあります。
            </p>
            <p>
              でも、その大切な記録はスマホの写真フォルダや記憶の中に散らばりがちです。TSURILOGUEは、心に残る1匹をきちんと残し、未来の自分や仲間の釣りに活かせる形にしたいという思いから生まれました。
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-teal-100 bg-white p-6 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">How to start</p>
          <h2 className="mt-4 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">まずは、今日の釣果を残すところから。</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <StepCard number="1" title="写真を残す" text="釣れた魚の写真を投稿します。" />
            <StepCard number="2" title="条件を記録" text="魚種、サイズ、潮、天気、タックルを残します。" />
            <StepCard number="3" title="あとで振り返る" text="自分だけの釣れる傾向を見つけます。" />
            <StepCard number="4" title="仲間と広げる" text="グループや大会で楽しみを広げます。" />
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] bg-[#06131f] p-6 text-white sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-200">Vision</p>
          <h2 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">釣りが、いつか世界で競われる日を夢見て。</h2>
          <div className="mt-6 grid gap-6 text-sm font-bold leading-8 text-slate-100 md:grid-cols-2">
            <p>
              釣りは、自然を読み、道具を選び、技術を磨き、時には仲間と競い合う奥深い文化です。いつか釣りが、より多くの人に開かれたスポーツとして評価され、世界の舞台やオリンピック競技のような夢につながっていくなら、その土台には信頼できる記録と公平な仕組みが必要だと考えています。
            </p>
            <p>
              釣果を公開するだけではなく、ポイントを守りながら共有すること。釣果の信頼性を参考スコアとして見える化すること。個人の釣果ログから、仲間とのコミュニティ、オンライン大会、そして未来の釣り文化へ。TSURILOGUEは、その一歩目をつくっていきます。
            </p>
          </div>
          <div className="mt-7 rounded-2xl bg-white/10 p-5 ring-1 ring-white/10">
            <p className="text-sm font-black leading-7 text-cyan-50">
              まだ小さなサービスです。それでも、釣りをもっと記録しやすく、もっと振り返りやすく、もっとフェアに楽しめるものにしたい。その考えに共感してくれる釣り人と一緒に育てていきたいです。
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

function StepCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <article className="rounded-[1.25rem] bg-[#f8fafc] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f766e] text-sm font-black text-white">{number}</div>
      <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{text}</p>
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
      "釣果記録、潮位・気象データ、AI分析、グループ共有、オンライン釣り大会、釣果デジタル証明を備え、釣り人の記録と未来の釣り文化を支えるサービス。",
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
      description: "釣り人の釣果記録、分析、共有、大会運営を支援し、釣り文化の未来をデータで支えるサービス。"
    }
  };
}
