import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "釣りローグをスマホアプリのように使う方法 | TSURILOGUE",
  description: "TSURILOGUE（釣りローグ）をスマホのホーム画面に追加して、釣り場でも釣果記録・釣りログをアプリのようにすばやく起動する方法を案内します。",
  path: "/ja/install"
});

const benefits = [
  ["すぐに開ける", "ホーム画面のアイコンから、釣りローグをすぐ起動できます。"],
  ["釣果投稿がしやすい", "釣れた直後に、写真と記録をすばやく残せます。"],
  ["ブラウザ検索の手間がない", "URL検索やブックマーク探しをせずに開けます。"],
  ["釣行中でも迷わず使える", "海上や釣り場でも、いつものアプリ感覚で使えます。"],
  ["今後の機能にもつながる", "通知やオフライン下書きなど、将来の便利機能にも対応しやすくなります。"]
];

const faqs = [
  ["App Storeからインストールする必要はありますか？", "いいえ。ブラウザからホーム画面に追加できます。"],
  ["普通のアプリと何が違いますか？", "Webアプリですが、ホーム画面から直接起動でき、アプリのように使えます。"],
  ["料金はかかりますか？", "ホーム画面への追加自体は無料です。"],
  ["ログインは必要ですか？", "釣果記録などの機能を使うにはログインが必要です。"]
];

export default function HowToUseAppPage() {
  return <HowToUseAppContent />;
}

export function HowToUseAppContent() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6fbfb] text-slate-950">
      <section className="relative bg-[#06131f] px-4 pb-16 pt-8 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.24),transparent_34%),linear-gradient(135deg,#06131f,#0f766e)]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <Link href="/ja" className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
              トップへ戻る
            </Link>
            <p className="mt-10 text-sm font-black uppercase tracking-[0.22em] text-orange-200">HOME SCREEN</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
              釣りローグを、
              <span className="block text-cyan-200">スマホアプリのように使おう。</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-bold leading-9 text-slate-100">
              釣りローグは、スマホのホーム画面に追加することで、アプリのようにすばやく起動できます。釣り場で釣果を記録したいときにも便利です。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#steps" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#f97316] px-7 text-base font-black text-white shadow-xl shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-[#ea580c]">
                ホーム画面に追加する方法を見る
              </a>
              <Link href="/ja" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 text-base font-black text-white backdrop-blur transition hover:bg-white/20">
                釣りローグを開く
              </Link>
            </div>
          </div>
          <PhoneGuideMockup />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Benefits" title="ホーム画面に追加するメリット" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {benefits.map(([title, body]) => (
              <article key={title} className="rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-xl shadow-slate-900/5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-xl" aria-hidden="true">📱</div>
                <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="steps" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <HowToCard
            label="iPhone"
            title="iPhoneでホーム画面に追加する方法"
            note="iPhoneではSafariから追加してください。"
            accent="bg-sky-50 text-sky-700"
            steps={[
              "Safariで釣りローグを開く",
              "画面下の共有ボタンをタップ",
              "「ホーム画面に追加」を選択",
              "名前を確認して「追加」をタップ",
              "ホーム画面のアイコンから釣りローグを開く"
            ]}
          />
          <HowToCard
            label="Android"
            title="Androidでホーム画面に追加する方法"
            accent="bg-emerald-50 text-emerald-700"
            steps={[
              "Chromeで釣りローグを開く",
              "メニューを開く",
              "「アプリをインストール」または「ホーム画面に追加」を選択",
              "追加をタップ",
              "ホーム画面のアイコンから釣りローグを開く"
            ]}
          />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <SectionHeading eyebrow="FAQ" title="よくある質問" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {faqs.map(([question, answer]) => (
              <article key={question} className="rounded-2xl bg-[#f8fafc] p-5">
                <h2 className="text-base font-black text-slate-950">Q. {question}</h2>
                <p className="mt-3 text-sm font-bold leading-7 text-slate-600">A. {answer}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm font-bold leading-7 text-orange-800">
            補足：この仕組みはPWAと呼ばれるWebアプリの仕組みを使っています。専門的な設定は不要で、ブラウザからホーム画面に追加するだけで使えます。
          </p>
        </div>
      </section>

      <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#06131f] p-8 text-center text-white shadow-2xl shadow-slate-900/15 sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-200">Ready</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
            釣り場ですぐ使えるように、ホーム画面に追加しておきましょう。
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/ja" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#f97316] px-8 font-black text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#ea580c]">
              釣りローグを開く
            </Link>
            <Link href="/ja/login" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 font-black text-white backdrop-blur transition hover:bg-white/20">
              無料で始める
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function PhoneGuideMockup() {
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[2.4rem] border border-white/20 bg-white/12 p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur">
      <div className="overflow-hidden rounded-[2rem] bg-white text-slate-950">
        <div className="bg-[#0f766e] px-5 py-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">TSURILOG</p>
          <p className="mt-2 text-2xl font-black">釣果投稿</p>
        </div>
        <div className="space-y-3 p-5">
          <div className="h-36 rounded-3xl bg-[url('/icons/tsurilog-icon.png')] bg-cover bg-center" />
          <div className="rounded-2xl bg-[#eefcf8] p-4">
            <p className="text-xs font-black text-[#0f766e]">HOME SCREEN</p>
            <p className="mt-1 text-lg font-black">ホーム画面からすぐ起動</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["写真", "魚種", "場所"].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-3 text-center text-xs font-black text-slate-600">{item}</div>
            ))}
          </div>
          <div className="rounded-full bg-[#f97316] py-3 text-center text-sm font-black text-white">投稿する</div>
        </div>
      </div>
    </div>
  );
}

function HowToCard({ label, title, steps, note, accent }: { label: string; title: string; steps: string[]; note?: string; accent: string }) {
  return (
    <article className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-xl shadow-slate-900/5">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${accent}`}>{label}</span>
      <h2 className="mt-4 text-2xl font-black leading-tight text-slate-950">{title}</h2>
      {note ? <p className="mt-3 rounded-2xl bg-orange-50 p-4 text-sm font-bold leading-7 text-orange-800">{note}</p> : null}
      <ol className="mt-5 grid gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 rounded-2xl bg-[#f8fafc] p-4 text-sm font-bold leading-6 text-slate-700">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-xs font-black text-white">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>
    </div>
  );
}
