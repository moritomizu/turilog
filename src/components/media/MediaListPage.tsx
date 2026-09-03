import Link from "next/link";
import { MediaPagination } from "@/components/media/MediaPagination";
import { MediaPostCard } from "@/components/media/MediaPostCard";
import { getMediaPath, getPostTitle, type WpPagination, type WpPost, type WpTerm } from "@/lib/wordpress";

const pillarArticles = [
  { href: getMediaPath("catch-log-app-comparison"), title: "釣果ログ・釣果投稿アプリ比較", body: "記録、共有、大会で使える釣果アプリの選び方を整理します。" },
  { href: getMediaPath("how-to-choose-catch-record-app"), title: "釣果記録アプリの選び方", body: "初心者が失敗しにくい比較ポイントを確認できます。" },
  { href: getMediaPath("catch-sharing-app-line-sns-difference"), title: "釣果共有アプリでできること", body: "LINEやSNSとの違いと、仲間内共有の使い方を紹介します。" },
  { href: getMediaPath("fishing-tournament-app-benefits"), title: "釣り大会アプリのメリット", body: "集計、ランキング、結果発表をスマホで運用する考え方です。" },
  { href: getMediaPath("online-fishing-tournament-rules"), title: "オンライン釣り大会ルール設計", body: "楽しく公平に大会を運営するためのルール作りをまとめます。" },
  { href: getMediaPath("how-to-start-tsurilogue-first-post"), title: "TSURILOGUEの使い方", body: "初回投稿までの流れと、釣りログ活用術を案内します。" }
];

const priorityCategoryLinks = [
  { href: getMediaPath("category/record"), label: "釣果記録カテゴリ" },
  { href: getMediaPath(`category/${encodeURIComponent("釣果共有")}`), label: "釣果共有カテゴリ" },
  { href: getMediaPath(`category/${encodeURIComponent("釣り大会・イベント")}`), label: "釣り大会カテゴリ" }
];

export function MediaListPage({
  title,
  description,
  posts,
  pagination,
  categories,
  tags,
  basePath
}: {
  title: string;
  description: string;
  posts: WpPost[];
  pagination: WpPagination;
  categories?: WpTerm[];
  tags?: WpTerm[];
  basePath: string;
}) {
  return (
    <main className="bg-gradient-to-b from-[#eefbf7] via-white to-[#f8fafc]">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0f766e]">TSURILOGUE MEDIA</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-slate-600">{description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/ja" className="inline-flex min-h-12 items-center justify-center rounded-full border border-teal-200 bg-white px-5 text-sm font-black text-[#0f766e]">
                TSURILOGUEトップ
              </Link>
              <Link href="/ja/signup" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f97316] px-5 text-sm font-black text-white shadow-lg shadow-orange-500/20">
                無料登録して釣果ログを始める
              </Link>
              <Link href="/ja/features" className="inline-flex min-h-12 items-center justify-center rounded-full border border-teal-200 bg-white px-5 text-sm font-black text-[#0f766e]">
                TSURILOGUEの機能を見る
              </Link>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-teal-100 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
            <p className="text-sm font-black text-slate-950">釣果を、次の一匹のヒントに。</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">釣果記録・AI分析・大会・グループ機能とつながる、TSURILOGUE公式メディアです。</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-8">
          <section className="rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0f766e]">Start here</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">主要親記事</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
              釣果記録アプリの選び方、釣果共有、オンライン釣り大会、TSURILOGUEの使い方を知るための入り口です。
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {pillarArticles.map((article) => (
                <Link key={article.href} href={article.href} className="rounded-2xl bg-foam p-4 transition hover:-translate-y-0.5 hover:bg-teal-50">
                  <span className="block text-sm font-black leading-6 text-slate-950">{article.title}</span>
                  <span className="mt-2 block text-xs font-bold leading-5 text-slate-600">{article.body}</span>
                </Link>
              ))}
            </div>
          </section>
          {posts.length ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {posts.map((post) => (
                <MediaPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-teal-100 bg-white p-8 text-center font-bold text-slate-600">記事がまだありません。</div>
          )}
          <MediaPagination pagination={pagination} basePath={basePath} />
        </div>

        <aside className="space-y-5">
          <section className="rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-950">注目カテゴリ</h2>
            <div className="mt-4 grid gap-2">
              {priorityCategoryLinks.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl bg-foam px-4 py-3 text-sm font-black text-[#0f766e]">
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
          <TermBox title="カテゴリ" terms={categories ?? []} pathPrefix="category" />
          <TermBox title="タグ" terms={tags ?? []} pathPrefix="tag" />
          <section className="rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-950">TSURILOGUEを知る</h2>
            <nav className="mt-4 grid gap-2 text-sm font-black" aria-label="TSURILOGUE関連ページ">
              <Link href="/ja" className="text-[#0f766e] underline underline-offset-4">トップページ</Link>
              <Link href="/ja/about" className="text-[#0f766e] underline underline-offset-4">TSURILOGUEとは</Link>
              <Link href="/ja/features" className="text-[#0f766e] underline underline-offset-4">機能一覧</Link>
              <Link href="/ja/signup" className="text-[#0f766e] underline underline-offset-4">無料登録</Link>
            </nav>
          </section>
          <section className="rounded-[1.5rem] border border-orange-100 bg-orange-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">TSURILOGUE</p>
            <h2 className="mt-2 text-lg font-black text-slate-950">今日の釣果を記録しよう</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
              釣果写真、潮位、天候、タックルを残すほど、自分だけの釣れる条件が見えてきます。
            </p>
            <Link href="/ja/signup" className="mt-4 inline-flex w-full min-h-12 items-center justify-center rounded-full bg-[#f97316] px-4 text-sm font-black text-white">
              無料で始める
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}

function TermBox({ title, terms, pathPrefix }: { title: string; terms: WpTerm[]; pathPrefix: "category" | "tag" }) {
  return (
    <section className="rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {terms.length ? (
          terms.slice(0, 16).map((term) => (
            <Link key={`${pathPrefix}-${term.slug}`} href={getMediaPath(`${pathPrefix}/${term.slug}`)} className="rounded-full bg-foam px-3 py-2 text-xs font-black text-[#0f766e]">
              {term.name}
            </Link>
          ))
        ) : (
          <p className="text-sm font-bold text-slate-500">準備中です。</p>
        )}
      </div>
    </section>
  );
}
