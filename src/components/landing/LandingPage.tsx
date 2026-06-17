import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";

const navItems = [
  { href: "#features", label: "機能" },
  { href: "#ai", label: "AI分析" },
  { href: "#group", label: "グループ" },
  { href: "#premium", label: "Premium" }
];

const catchFields = ["魚種", "サイズ", "時間帯", "エリア", "潮位", "風向き", "風速", "水温", "天気", "タックル"];

const aiInsights = [
  "下げ潮と北西風の日に良型が出やすい傾向",
  "マダイは朝の釣行データに反応が集中",
  "タイラバ用メインで平均サイズが高め"
];

const proofMessages = ["GPS確認済み", "潮位データ取得済み", "サイズ確認写真あり", "異常検知なし"];
const catchValues = ["マダイ", "62cm", "朝", "大阪湾", "下げ三分", "北西", "3m", "18.7℃", "くもり", "タイラバ"];
const catchDashboardTags = ["最大サイズ", "よく釣れる魚種", "好調な潮", "よく行くエリア", "平均釣速"];
const proofInputs = ["写真", "GPS", "時刻", "潮位", "サイズ確認写真", "大会条件"];
const proofJudgements = ["信頼度スコア", "要確認フラグ", "異常検知", "ランキング反映可否"];
const locationRules = ["本人：正確位置", "仲間：ぼかし表示", "一般：エリア表示", "非公開：位置非表示"];
const locationCards = ["個人ログでは正確に記録", "グループでは共有範囲に応じて表示", "大会では主催者・参加者で表示を切替", "公開時はポイント流出を防止"];

export function LandingPage() {
  return (
    <main data-landing-page="true" className="min-h-screen overflow-hidden bg-[#f6fbfb] text-slate-950">
      <LandingHeader />
      <HeroSection />
      <FeatureSection />
      <AIReportSection />
      <GroupSection />
      <TournamentSection />
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
      <HeroBackground imageUrl="/images/lp/IMG_7885.jpg" overlayOpacity={0.72} objectPosition="center right" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_0.88fr] lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-200">PERSONAL FISHING LOG</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-normal sm:text-5xl lg:text-6xl">
            記録するほど、
            <span className="block text-[#7dd3fc]">理想の1匹に近づく。</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg font-bold leading-9 text-slate-100 sm:text-xl">
            ツリログは、釣果・ポイント・潮位・気象条件・タックルをかんたんに記録し、あとから振り返れる釣り人のためのパーソナル釣果ログです。
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

function HeroBackground({ imageUrl, overlayOpacity, objectPosition }: { imageUrl?: string; overlayOpacity?: number; objectPosition?: string }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition }}
        />
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_70%_30%,rgba(14,165,233,0.34),transparent_34%),linear-gradient(135deg,#06131f,#0f766e)]" />
      )}
      <div
        className="absolute inset-0 bg-[linear-gradient(105deg,rgba(3,7,18,0.92)_0%,rgba(6,19,31,0.78)_36%,rgba(6,19,31,0.34)_62%,rgba(6,19,31,0.08)_100%)]"
        style={{ opacity: overlayOpacity ?? 0.7 }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_34%)]" />
    </div>
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
    <section id="features" className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">Catch log</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-[1.15] text-slate-950 sm:text-4xl lg:text-[2.65rem]">その日の釣りを、次の釣りのヒントに。</h2>
            <p className="mt-5 text-lg font-bold leading-9 text-slate-600">
              魚種、サイズ、釣れた時間、エリア、潮位、風向き、水温、天気、タックルをまとめて記録。あとから見返すことで、自分だけの釣れる条件が見えてきます。
            </p>
            <p className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm font-black leading-7 text-orange-800">
              記録するだけでは終わらない。釣果を重ねるほど、自分だけの釣れる条件が見えてきます。
            </p>
          </div>
          <CatchLogMockup />
        </div>
        <CatchDashboardScreenshot />
      </div>
    </section>
  );
}

function CatchLogMockup() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10">
      <div className="rounded-3xl bg-[#f8fafc] p-4">
        <div className="relative h-56 overflow-hidden rounded-2xl bg-[url('/images/lp/IMG_7638.jpg')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">記録から見えてくる釣果データ</p>
            <p className="mt-1 text-2xl font-black text-white">今日の釣りを残す</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {catchFields.map((field, index) => (
            <div key={field} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-black text-slate-400">{field}</p>
              <p className="mt-1 text-base font-black text-slate-900">{catchValues[index]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CatchDashboardScreenshot() {
  return (
    <div className="mt-14 rounded-[2rem] border border-teal-100 bg-gradient-to-br from-white via-[#f8fffd] to-[#e9fbf6] p-4 shadow-2xl shadow-slate-900/10 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.6fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">Actual screen</p>
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">実際のツリログ画面</h3>
          <p className="mt-4 text-base font-bold leading-8 text-slate-600">
            記録した釣果は、ダイジェストとして自動集計。最大サイズ、よく釣れる魚種、好調な潮、よく行くエリアなどをひと目で振り返れます。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {catchDashboardTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#0f766e] shadow-sm ring-1 ring-teal-100">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="-mx-2 overflow-x-auto px-2 pb-2">
          <div className="min-w-[760px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 lg:min-w-0">
            <Image
              src="/images/lp/catch-dashboard-screenshot.png"
              alt="釣果ダイジェストを表示した実際のツリログ画面"
              width={2066}
              height={1554}
              className="h-auto w-full"
              sizes="(min-width: 1024px) 760px, 760px"
            />
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs font-bold leading-6 text-slate-500">
        画面内の数値はサンプル表示です。釣果を記録するほど、自分の釣りを振り返る材料が増えていきます。
      </p>
    </div>
  );
}

function AIReportSection() {
  return (
    <FeatureBlock
      id="ai"
      eyebrow="AI report beta"
      title="あなたの釣果から、釣れるパターンを見つける。"
      description="過去の釣果と潮位・気象条件・タックル情報をもとに、釣れやすい時間帯や条件を分析。次回釣行のヒントをレポートします。"
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
      title="仲間と、オンライン釣り大会を楽しむ。"
      description="釣り仲間やグループメンバー同士で、オンライン釣り大会を開催できます。魚種や期間を設定すれば、投稿された釣果をもとにランキングを自動集計。離れた場所にいても、同じ大会を楽しめます。"
      visual={<TournamentMockup />}
      note="まずは仲間内の小さな大会から。大会を安心して楽しむために、釣果の信頼性を確認する仕組みも用意しています。"
      cta={<Link href="/tournaments" className="inline-flex rounded-full bg-[#0f766e] px-6 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-[#115e59]">大会機能を見る</Link>}
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
      <TagRow items={["仲間内大会", "月例チャレンジ", "自動ランキング", "承認管理", "釣果デジタル証明"]} />
    </div>
  );
}

function GroupSection() {
  return (
    <FeatureBlock
      id="group"
      eyebrow="Group"
      title="仲間と釣果を共有し、理想の釣りを見つける。"
      description="仲間の釣果を見ることで、釣れた時間帯、使っていたタックル、魚種ごとの傾向など、自分だけでは気づけなかったヒントが見つかります。"
      reverse
      visual={<GroupMockup />}
      note="仲間と切磋琢磨することで、新しい釣り方や釣果アップのヒントが見つかります。大切なポイントを守りながら、必要な範囲で釣果を共有できます。"
      cta={<Link href="/groups" className="inline-flex rounded-full bg-[#0f766e] px-6 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-[#115e59]">グループ機能を見る</Link>}
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
      <TagRow items={["釣果共有", "仲間内ランキング", "月別振り返り", "魚種別分析", "エリア別傾向"]} />
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
      title="釣果の信頼性を、独自技術で見える化。"
      description="オンライン大会や釣果共有では、「本当にその日時・場所で釣った魚なのか」を確認したい場面があります。ツリログでは、写真・GPS・時刻・潮位・サイズ確認写真・大会条件などをもとに、釣果の信頼度を参考スコアとして表示します。"
      visual={<VerificationMockup />}
      note="ツリログでは、この仕組みを「釣果デジタル証明」として特許出願準備中です。このスコアは釣果の真正性を完全に保証するものではなく、大会運営や確認作業を補助する参考情報です。"
    />
  );
}

function VerificationMockup() {
  return (
    <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-2xl shadow-slate-900/10">
      <div className="flex flex-wrap gap-2">
        {["Catch Proof β", "特許出願準備中", "独自技術", "参考スコア"].map((label) => (
          <span key={label} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-[#0f766e]">{label}</span>
        ))}
      </div>
      <p className="mt-4 text-sm font-black text-[#0f766e]">釣果デジタル証明 β</p>
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
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ProofListCard title="取得する情報" items={proofInputs} />
        <ProofListCard title="判定する内容" items={proofJudgements} />
      </div>
    </div>
  );
}

function ProofListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl bg-[#f8fafc] p-5">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">{item}</div>
        ))}
      </div>
    </div>
  );
}

function MapBlurSection() {
  return (
    <FeatureBlock
      eyebrow="Location privacy"
      title="釣果共有と、ポイント保護を両立する。"
      description="釣り人にとって、釣れる場所は大切な情報です。ツリログでは、正確な位置を保存しながら、共有時にはエリア表示やぼかし表示に切り替えることができます。"
      reverse
      visual={<MapBlurMockup />}
      note="共有したい。でも、守りたい。その両方を実現するための位置情報設計です。"
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
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {locationRules.map((item) => (
          <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm font-black text-white ring-1 ring-white/10">{item}</div>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {locationCards.map((item) => (
          <div key={item} className="rounded-2xl bg-white p-4 text-sm font-black text-slate-800">{item}</div>
        ))}
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
          <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-[2.65rem]">もっと深く、自分の釣りを知りたい人へ。</h2>
          <p className="mt-5 text-lg font-bold leading-8 text-slate-200">AI分析、詳細潮位分析、気象条件分析、タックル別分析など、釣果を伸ばしたいアングラー向けの機能を用意しています。</p>
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
            items={["AI釣果レポート", "詳細潮位分析", "気象条件分析", "タックル別分析", "年間/月間レポート", "高度な検索"]}
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
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#06131f] p-8 text-white shadow-2xl shadow-teal-950/20 sm:p-12 lg:p-16">
        <div className="absolute inset-0 bg-[url('/images/lp/IMG_7748.jpg')] bg-cover bg-center opacity-45" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/20" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-100">Vision</p>
          <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-[2.65rem]">釣果データが、釣りの未来を変える。</h2>
          <p className="mt-6 max-w-3xl text-lg font-bold leading-9 text-slate-100">
            ツリログは、日々の釣果記録から始まり、AI分析、仲間との共有、大会運営へ広がる釣りの意思決定インフラを目指します。
          </p>
          <TagRow items={["AI", "大会", "データ分析", "国際展開", "API", "釣果証明"]} light />
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 py-24 lg:px-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[#06131f] px-6 py-20 text-center text-white shadow-2xl shadow-slate-900/15 sm:px-10">
        <div className="absolute inset-0 bg-[url('/images/lp/IMG_7638.jpg')] bg-cover bg-center opacity-50" aria-hidden="true" />
        <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-200">Start today</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">まずは、今日の1匹を記録しよう。</h2>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#f97316] px-8 font-black text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#ea580c]">無料で始める</Link>
            <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20">ログインする</Link>
          </div>
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
          <h2 className="mt-4 max-w-3xl text-3xl font-black leading-[1.15] text-slate-950 sm:text-4xl lg:text-[2.65rem]">{title}</h2>
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
      <h2 className="mt-4 text-3xl font-black leading-[1.15] text-slate-950 sm:text-4xl lg:text-[2.65rem]">{title}</h2>
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
