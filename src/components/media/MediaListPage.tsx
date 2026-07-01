import Link from "next/link";
import { MediaPagination } from "@/components/media/MediaPagination";
import { MediaPostCard } from "@/components/media/MediaPostCard";
import { getMediaPath, type WpPagination, type WpPost, type WpTerm } from "@/lib/wordpress";

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
          </div>
          <div className="rounded-[1.5rem] border border-teal-100 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
            <p className="text-sm font-black text-slate-950">釣果を、次の一匹のヒントに。</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">釣果記録・AI分析・大会・グループ機能とつながる、TSURILOGUE公式メディアです。</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-8">
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
