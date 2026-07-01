import Image from "next/image";
import Link from "next/link";
import { formatMediaDate, getMediaPath, getPostExcerpt, getPostTitle, type WpPost } from "@/lib/wordpress";

export function MediaPostCard({ post }: { post: WpPost }) {
  const title = getPostTitle(post);
  const excerpt = getPostExcerpt(post);
  const image = post.featuredImage;
  const category = post.categories?.[0];

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-teal-100 bg-white shadow-xl shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/10">
      <Link href={getMediaPath(post.slug)} className="block">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-teal-50 to-sky-100">
          {image?.url ? (
            <Image
              src={image.url}
              alt={image.alt || title}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-black text-teal-700">TSURILOGUE MEDIA</div>
          )}
        </div>
      </Link>
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
          {category ? (
            <Link href={getMediaPath(`category/${category.slug}`)} className="rounded-full bg-teal-50 px-3 py-1 text-[#0f766e]">
              {category.name}
            </Link>
          ) : null}
          {post.date ? <time dateTime={post.date}>{formatMediaDate(post.date)}</time> : null}
        </div>
        <Link href={getMediaPath(post.slug)} className="block">
          <h2 className="text-xl font-black leading-snug text-slate-950">{title}</h2>
        </Link>
        {excerpt ? <p className="line-clamp-3 text-sm font-bold leading-7 text-slate-600">{excerpt}</p> : null}
        <Link href={getMediaPath(post.slug)} className="inline-flex text-sm font-black text-[#0f766e]">
          記事を読む
        </Link>
      </div>
    </article>
  );
}
