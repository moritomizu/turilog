import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ツリログをアプリのように使う | TsuriLog",
  description: "ツリログをスマートフォンのホーム画面に追加して、釣り場でもすぐ起動する方法を案内します。"
};

export default function HowToUseAppPage() {
  return (
    <main className="min-h-screen bg-foam px-4 py-6">
      <section className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-black text-water">
          ← トップへ戻る
        </Link>

        <header className="mt-5 rounded bg-white p-6 shadow-soft">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-water">PWA</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ink">ツリログをアプリのように使う</h1>
          <p className="mt-4 text-base font-bold leading-8 text-slate-600">
            ホーム画面に追加すると、ブラウザを開かなくてもツリログをすぐ起動できます。釣り場での投稿や確認が少し楽になります。
          </p>
        </header>

        <div className="mt-5 grid gap-4">
          <HowToCard
            title="iPhone / Safari"
            steps={[
              "Safariでツリログを開きます。",
              "画面下の共有ボタンをタップします。",
              "「ホーム画面に追加」を選びます。",
              "名前を確認して「追加」をタップします。"
            ]}
          />
          <HowToCard
            title="Android / Chrome"
            steps={[
              "Chromeでツリログを開きます。",
              "画面右上のメニューをタップします。",
              "「ホーム画面に追加」または「アプリをインストール」を選びます。",
              "案内に従って追加します。"
            ]}
          />
        </div>

        <section className="mt-5 rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black text-ink">注意点</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
            OSやブラウザのバージョンにより表示名や手順が少し異なる場合があります。PWAとして起動している場合、この案内バナーは表示されません。
          </p>
        </section>
      </section>
    </main>
  );
}

function HowToCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <article className="rounded bg-white p-5 shadow-soft">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <ol className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-water text-xs font-black text-white">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
