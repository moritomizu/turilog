import Link from "next/link";
import { MediaPagination } from "@/components/media/MediaPagination";
import { MediaPostCard } from "@/components/media/MediaPostCard";
import { getMediaPath, getPostTitle, type WpPagination, type WpPost, type WpTerm } from "@/lib/wordpress";

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
            <h2 className="mt-2 text-xl font-black text-slate-950">まず読んでおきたい記事</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
              釣果記録の始め方、釣果の振り返り方、TSURILOGUEの活用方法を知るための入り口です。
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(posts.length ? posts.slice(0, 3) : []).map((post) => (
                <Link key={post.id} href={getMediaPath(post.slug)} className="rounded-2xl bg-foam p-4 text-sm font-black leading-6 text-slate-950 transition hover:-translate-y-0.5 hover:bg-teal-50">
                  {getPostTitle(post)}
                </Link>
              ))}
              {!posts.length ? (
                <>
                  <Link href={getMediaPath("what-is-catch-log")} className="rounded-2xl bg-foam p-4 text-sm font-black leading-6 text-slate-950">釣果ログの基本を知る</Link>
                  <Link href={getMediaPath("review-catch-records-tsurilogue")} className="rounded-2xl bg-foam p-4 text-sm font-black leading-6 text-slate-950">釣果を振り返る方法</Link>
                  <Link href={getMediaPath("hello-tsurilogue")} className="rounded-2xl bg-foam p-4 text-sm font-black leading-6 text-slate-950">TSURILOGUE Mediaについて</Link>
                </>
              ) : null}
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
          <TermBox title="カテゴリ" terms={categories ?? []} pathPrefix="category" />
          <TermBox title="タグ" terms={tags ?? []} pathPrefix="tag" />
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
