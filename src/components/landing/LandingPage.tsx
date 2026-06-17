import Link from "next/link";
import type { ReactNode } from "react";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";

const navItems = [
  { href: "#features", label: "機能" },
  { href: "#ai", label: "AI分析" },
  { href: "#tournament", label: "大会" },
  { href: "#premium", label: "Premium" }
];

const catchFields = ["魚種", "サイズ", "時間", "エリア", "潮位", "タックル"];

const aiInsights = [
  "今月は下げ潮で大型率が高い傾向",
  "マダイは朝7〜10時台に集中",
  "タイラバ用メインで平均サイズが高め"
];

const proofMessages = ["GPS確認済み", "潮位データ取得済み", "サイズ確認写真あり", "異常検知なし"];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6fbfb] text-slate-950">
      <LandingHeader />
      <HeroSection />
      <FeatureSection />
      <AIReportSection />
      <TournamentSection />
      <GroupSection />
      <VerificationSection />
      <MapBlurSection />
      <PricingSection />
      <UseCaseSection />
      <VisionSection />
      <FinalCTA />
      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/50 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
        <Link href="/lp" aria-label="ツリログLPトップ" className="flex items-center">
          <TsuriLogLogo className="h-9 w-36 object-contain sm:h-10 sm:w-40" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-black text-slate-700 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-[#0f766e]">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100 sm:inline-flex">
            ログイン
          </Link>
          <Link href="/login" className="rounded-full bg-[#f97316] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#ea580c]">
            無料で始める
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative isolate min-h-[760px] overflow-hidden bg-[#06131f] pt-24 text-white">
      <div className="absolute inset-0 bg-[url('/icons/tsurilog-icon.png')] bg-cover bg-center opacity-35" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.36),transparent_34%),linear-gradient(110deg,rgba(3,7,18,0.95)_0%,rgba(6,19,31,0.76)_48%,rgba(15,118,110,0.54)_100%)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_0.88fr] lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-200">Personal fishing data platform</p>
          <h1 className="mt-5 text-5xl font-black leading-[1.04] tracking-normal sm:text-6xl lg:text-7xl">
            釣果を記録するたび、
            <span className="block text-[#7dd3fc]">次の1匹に近づく。</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg font-bold leading-9 text-slate-100 sm:text-xl">
            ツリログは、釣果記録・大会・グループ共有・AI分析をひとつにした、釣り人のための釣果データプラットフォームです。
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#f97316] px-7 text-base font-black text-white shadow-xl shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-[#ea580c]">
              無料で始める
            </Link>
            <a href="#features" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 text-base font-black text-white backdrop-blur transition hover:bg-white/20">
              機能を見る
            </a>
          </div>
        </div>
        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[430px] animate-[float_6s_ease-in-out_infinite]">
      <div className="absolute -inset-8 rounded-[3rem] bg-cyan-300/15 blur-3xl" aria-hidden="true" />
      <MockupPhone>
        <div className="relative h-64 overflow-hidden rounded-[1.7rem] bg-slate-900">
          <div className="absolute inset-0 bg-[url('/icons/tsurilog-icon.png')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Catch log</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-black text-white">マダイ</p>
                <p className="text-sm font-bold text-white/85">62cm / 下げ三分</p>
              </div>
              <span className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-black text-slate-950">82/100</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricPill label="潮位" value="下げ三分" />
          <MetricPill label="水温" value="18.7℃" />
          <MetricPill label="風" value="北西 3m" />
        </div>
        <div className="mt-4 rounded-2xl bg-[#ecfeff] p-4">
          <p className="text-xs font-black text-[#0f766e]">AI COMMENT</p>
          <p className="mt-1 text-sm font-black leading-6 text-slate-800">次回は朝の下げ始めが狙い目の可能性があります。</p>
        </div>
      </MockupPhone>
    </div>
  );
}

function FeatureSection() {
  return (
    <FeatureBlock
      id="features"
      eyebrow="Catch log"
      title="その日の釣果を、次の釣果につなげる。"
      description="魚種・サイズ・釣れた時間・エリア・潮位・タックルを記録。釣果を重ねるほど、自分だけの釣れるパターンが見えてきます。"
      visual={<CatchLogMockup />}
    />
  );
}

function CatchLogMockup() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10">
      <div className="rounded-3xl bg-[#f8fafc] p-4">
        <div className="h-48 rounded-2xl bg-[url('/icons/tsurilog-icon.png')] bg-cover bg-center" />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {catchFields.map((field, index) => (
            <div key={field} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-black text-slate-400">{field}</p>
              <p className="mt-1 text-base font-black text-slate-900">{["マダイ", "62cm", "06:42", "大阪湾", "下げ三分", "タイラバ"][index]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIReportSection() {
  return (
    <FeatureBlock
      id="ai"
      eyebrow="AI report beta"
      title="釣果を記録するほど、AIが賢くなる。"
      description="過去の釣果から、釣れやすい潮・時間帯・エリア・タックル傾向を分析。次回釣行のヒントをレポートします。"
      reverse
      visual={<AIReportMockup />}
      cta={<Link href="/ai-report" className="inline-flex rounded-full bg-[#0f766e] px-6 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-[#115e59]">AI分析を試す</Link>}
    />
  );
}

function AIReportMockup() {
  return (
    <div className="rounded-[2rem] bg-[#071827] p-6 text-white shadow-2xl shadow-cyan-950/25">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">AI釣果レポートβ</p>
          <h3 className="mt-2 text-2xl font-black">次回釣行へのヒント</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0f766e]">参考傾向</span>
      </div>
      <div className="mt-6 space-y-3">
        {aiInsights.map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-sm font-bold leading-6 text-slate-100">{item}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-cyan-300/15 p-4">
        <p className="text-sm font-bold leading-6 text-cyan-50">釣果数が増えるほど、潮・季節・タックルの比較が深くなります。</p>
      </div>
    </div>
  );
}

function TournamentSection() {
  return (
    <FeatureBlock
      id="tournament"
      eyebrow="Tournament"
      title="仲間と、全国と、オンラインで競える。"
      description="大会を作成し、釣果を投稿するだけでランキングを自動更新。主催者は承認管理や釣果確認も行えます。"
      visual={<TournamentMockup />}
    />
  );
}

function TournamentMockup() {
  const rows = [
    ["1", "82cm", "ブリ"],
    ["2", "76cm", "サワラ"],
    ["3", "72cm", "マダイ"]
  ];
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-900/10">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-2xl font-black text-slate-950">大会ランキング</h3>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">承認制</span>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map(([rank, size, fish]) => (
          <div key={rank} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-black ${rank === "1" ? "bg-amber-300 text-amber-950" : rank === "2" ? "bg-slate-300 text-slate-950" : "bg-orange-300 text-orange-950"}`}>{rank}</span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-slate-950">{fish}</p>
              <p className="text-sm font-bold text-slate-500">釣果デジタル証明つき</p>
            </div>
            <p className="text-xl font-black text-[#0f766e]">{size}</p>
          </div>
        ))}
      </div>
      <TagRow items={["大会作成", "ランキング", "承認管理", "釣果デジタル証明"]} />
    </div>
  );
}

function GroupSection() {
  return (
    <FeatureBlock
      eyebrow="Group"
      title="釣り仲間の釣果が、見える。"
      description="グループ内で釣果を共有し、月別・魚種別・エリア別に振り返れます。仲間内ランキングや釣果マップにも対応。"
      reverse
      visual={<GroupMockup />}
    />
  );
}

function GroupMockup() {
  return (
    <div className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-900/10">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="月間釣果数" value="24" />
        <MetricCard label="最大サイズ" value="82cm" />
      </div>
      <div className="rounded-3xl bg-[#eefcf8] p-5">
        <p className="text-sm font-black text-[#0f766e]">メンバーランキング</p>
        <div className="mt-4 space-y-3">
          {["TaPiYoTa", "MIZU", "Captain"].map((name, index) => (
            <div key={name} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
              <span className="font-black text-slate-900">{index + 1}. {name}</span>
              <span className="text-sm font-black text-slate-500">{[8, 6, 4][index]}投稿</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-44 overflow-hidden rounded-3xl bg-[#dbeafe]">
        <div className="absolute left-5 top-7 h-20 w-20 rounded-full bg-[#0f766e]/20" />
        <div className="absolute right-7 top-10 h-28 w-28 rounded-full bg-blue-500/20" />
        <div className="absolute bottom-6 left-1/2 h-16 w-16 rounded-full bg-orange-400/25" />
        <MapPin className="left-[22%] top-[30%]" />
        <MapPin className="left-[57%] top-[46%]" />
        <MapPin className="left-[74%] top-[26%]" />
      </div>
    </div>
  );
}

function VerificationSection() {
  return (
    <FeatureBlock
      eyebrow="Catch proof beta"
      title="釣果の信頼性を、見える化。"
      description="写真・GPS・時刻・潮位・サイズ確認写真・大会条件などをもとに、釣果の信頼度を参考スコアとして表示します。"
      visual={<VerificationMockup />}
      note="このスコアは釣果の真正性を完全に保証するものではなく、大会運営や確認作業を補助する参考情報です。"
    />
  );
}

function VerificationMockup() {
  return (
    <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-2xl shadow-slate-900/10">
      <p className="text-sm font-black text-[#0f766e]">釣果デジタル証明 β</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">証明スコア</p>
          <p className="text-6xl font-black text-slate-950">82<span className="text-2xl text-slate-400">/100</span></p>
        </div>
        <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">高信頼</span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {proofMessages.map((item) => (
          <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700">{item}</div>
        ))}
      </div>
    </div>
  );
}

function MapBlurSection() {
  return (
    <FeatureBlock
      eyebrow="Location privacy"
      title="釣れる場所は、守る。"
      description="釣果は共有しながら、正確なポイントは自動でぼかして表示。仲間との共有と漁場保護を両立します。"
      reverse
      visual={<MapBlurMockup />}
    />
  );
}

function MapBlurMockup() {
  return (
    <div className="rounded-[2rem] bg-[#082f49] p-5 text-white shadow-2xl shadow-sky-950/20">
      <div className="relative h-80 overflow-hidden rounded-3xl bg-[#bae6fd]">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(8,47,73,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(8,47,73,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="absolute left-[17%] top-[28%] rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-lg">正確位置</div>
        <div className="absolute left-[42%] top-[38%] h-28 w-28 rounded-full border-4 border-[#0f766e] bg-[#0f766e]/20" />
        <div className="absolute left-[47%] top-[50%] rounded-full bg-[#0f766e] px-4 py-2 text-sm font-black text-white shadow-lg">ぼかし位置</div>
        <div className="absolute bottom-5 right-5 rounded-2xl bg-white/90 p-4 text-slate-950">
          <p className="text-xs font-black text-slate-500">AREA</p>
          <p className="text-lg font-black">大阪湾北部</p>
        </div>
      </div>
    </div>
  );
}

function PricingSection() {
  return (
    <section id="premium" className="bg-[#06131f] px-5 py-24 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-200">Premium</p>
          <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">本気で釣果を伸ばしたいアングラーへ。</h2>
          <p className="mt-5 text-lg font-bold leading-8 text-slate-200">無料で釣果記録を始め、本気で分析したくなったらPremiumへ。</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <PlanCard
            name="Free"
            price="無料"
            items={["釣果記録", "大会参加", "グループ参加", "基本ランキング"]}
            href="/login"
            action="無料で始める"
          />
          <PlanCard
            name="Premium"
            price="月額980円"
            caption="現在のPremium設定に合わせた価格です。"
            highlight
            items={["AI釣果レポート", "詳細潮位分析", "タックル分析", "高度な検索", "デジタル証明詳細"]}
            href="/plans"
            action="Premiumを試す"
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({ name, price, caption, items, href, action, highlight = false }: { name: string; price: string; caption?: string; items: string[]; href: string; action: string; highlight?: boolean }) {
  return (
    <article className={`rounded-[2rem] p-7 ${highlight ? "bg-white text-slate-950 ring-4 ring-orange-400" : "bg-white/10 text-white ring-1 ring-white/15"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black">{name}</h3>
          <p className={`mt-2 text-sm font-bold ${highlight ? "text-slate-500" : "text-slate-300"}`}>{caption ?? "まずは記録から始められます。"}</p>
        </div>
        <p className={`rounded-full px-4 py-2 text-sm font-black ${highlight ? "bg-orange-100 text-orange-700" : "bg-white text-slate-950"}`}>{price}</p>
      </div>
      <ul className="mt-7 grid gap-3">
        {items.map((item) => (
          <li key={item} className={`rounded-2xl px-4 py-3 text-sm font-black ${highlight ? "bg-slate-50 text-slate-800" : "bg-white/10 text-slate-100"}`}>{item}</li>
        ))}
      </ul>
      <Link href={href} className={`mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full text-sm font-black transition hover:-translate-y-0.5 ${highlight ? "bg-[#f97316] text-white hover:bg-[#ea580c]" : "bg-white text-slate-950 hover:bg-slate-100"}`}>
        {action}
      </Link>
    </article>
  );
}

function UseCaseSection() {
  const cases = [
    ["個人アングラー", "自分の釣果を記録・分析"],
    ["釣り仲間グループ", "仲間内で共有・ランキング"],
    ["大会主催者", "オンライン大会の運営・承認管理"]
  ];
  return (
    <section className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Use cases" title="ひとりでも、仲間とも、大会でも。" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cases.map(([title, body]) => (
            <article key={title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1">
              <h3 className="text-2xl font-black text-slate-950">{title}</h3>
              <p className="mt-4 text-base font-bold leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function VisionSection() {
  return (
    <section className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-gradient-to-br from-[#0f766e] via-[#0f3b55] to-[#06131f] p-8 text-white shadow-2xl shadow-teal-950/20 sm:p-12 lg:p-16">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-100">Vision</p>
        <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">釣果データが、釣りの未来を変える。</h2>
        <p className="mt-6 max-w-3xl text-lg font-bold leading-9 text-slate-100">
          ツリログは、釣果記録アプリではなく、釣果データを活用した釣りの意思決定インフラを目指します。
        </p>
        <TagRow items={["AI", "大会", "データ分析", "国際展開", "API", "釣果証明"]} light />
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">Start today</p>
        <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-6xl">まずは、今日の1匹を記録しよう。</h2>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#f97316] px-8 font-black text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#ea580c]">無料で始める</Link>
          <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 bg-white px-8 font-black text-slate-950 transition hover:-translate-y-0.5 hover:border-[#0f766e]">ログインする</Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 pb-28 pt-10 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <TsuriLogLogo className="h-9 w-36 object-contain" />
          <p className="mt-3 text-sm font-bold text-slate-500">Copyright © TsuriLog</p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-black text-slate-600">
          <Link href="/terms" className="hover:text-[#0f766e]">利用規約</Link>
          <Link href="/privacy" className="hover:text-[#0f766e]">プライバシーポリシー</Link>
          <Link href="/login" className="hover:text-[#0f766e]">お問い合わせ</Link>
        </div>
      </div>
    </footer>
  );
}

function FeatureBlock({ id, eyebrow, title, description, visual, cta, note, reverse = false }: { id?: string; eyebrow: string; title: string; description: string; visual: ReactNode; cta?: ReactNode; note?: string; reverse?: boolean }) {
  return (
    <section id={id} className="px-5 py-24 lg:px-8">
      <div className={`mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">{eyebrow}</p>
          <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">{title}</h2>
          <p className="mt-5 text-lg font-bold leading-9 text-slate-600">{description}</p>
          {note ? <p className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm font-bold leading-7 text-orange-800">{note}</p> : null}
          {cta ? <div className="mt-7">{cta}</div> : null}
        </div>
        <div>{visual}</div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">{eyebrow}</p>
      <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">{title}</h2>
    </div>
  );
}

function MockupPhone({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2.4rem] border border-white/15 bg-slate-950 p-3 shadow-2xl shadow-slate-950/40">
      <div className="rounded-[2rem] bg-white p-4 text-slate-950">{children}</div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function TagRow({ items, light = false }: { items: string[]; light?: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-3 py-1.5 text-xs font-black ${light ? "bg-white/15 text-white" : "bg-[#eefcf8] text-[#0f766e]"}`}>{item}</span>
      ))}
    </div>
  );
}

function MapPin({ className }: { className: string }) {
  return (
    <span className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-[#f97316] shadow-lg ring-4 ring-white ${className}`}>
      <span className="h-2 w-2 rounded-full bg-white" />
    </span>
  );
}
