import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { JsonLd } from "@/components/media/JsonLd";
import { MediaCta } from "@/components/media/MediaCta";
import { MediaPostCard } from "@/components/media/MediaPostCard";
import { LiveDataBlock } from "@/components/media/living/LiveDataBlock";
import {
  MEDIA_PUBLIC_BASE_URL,
  enhanceArticleHtml,
  formatMediaDate,
  getMediaCanonical,
  getMediaPath,
  getMediaPost,
  getPostExcerpt,
  getPostKeywords,
  getPostTitle,
  getPostWordCount,
  getRelatedMediaPosts,
  type MediaHeading,
  type WpPost
} from "@/lib/wordpress";

type MediaArticlePageProps = {
  params: { slug: string };
};

export const revalidate = 3600;

export async function generateMetadata({ params }: MediaArticlePageProps): Promise<Metadata> {
  const post = await getMediaPost(params.slug).catch(() => null);
  if (!post) {
    return {
      title: "記事が見つかりません | TSURILOGUE Media",
      robots: { index: false, follow: false }
    };
  }

  const title = post.seo?.title || `${getPostTitle(post)} | TSURILOGUE Media`;
  const description = post.seo?.description || getPostExcerpt(post);
  const canonical = getMediaCanonical(post.slug);
  const image = getOgImage(post);
  const keywords = getPostKeywords(post);

  return {
    title,
    description,
    keywords,
    authors: [{ name: "TSURILOGUE編集部", url: "https://www.tsurilogue.com" }],
    category: post.categories?.[0]?.name,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      siteName: "TSURILOGUE",
      title,
      description,
      url: canonical,
      publishedTime: post.date,
      modifiedTime: post.modified,
      images: image ? [{ url: image, width: post.featuredImage?.width || 1200, height: post.featuredImage?.height || 630, alt: post.featuredImage?.alt || getPostTitle(post) }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined
    }
  };
}

export default async function MediaArticlePage({ params }: MediaArticlePageProps) {
  const post = await getMediaPost(params.slug).catch(() => null);
  if (!post) notFound();

  const related = await getRelatedMediaPosts(post).catch(() => []);
  const title = getPostTitle(post);
  const canonical = getMediaCanonical(post.slug);
  const { html, headings } = enhanceArticleHtml(post.content?.rendered || "");
  const publishedLabel = formatMediaDate(post.date);
  const modifiedLabel = post.modified && post.modified !== post.date ? formatMediaDate(post.modified) : "";
  const jsonLd = [
    articleJsonLd(post, canonical),
    breadcrumbJsonLd(post, canonical),
    organizationJsonLd(),
    ...(related.length ? [relatedItemListJsonLd(related)] : [])
  ];

  return (
    <>
      <PageHeader title="Media" titleAs="div" />
      <JsonLd data={jsonLd} />
      <main className="bg-gradient-to-b from-[#eefbf7] via-white to-[#f8fafc]">
        <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            {post.categories?.map((category) => (
              <Link key={category.slug} href={getMediaPath(`category/${category.slug}`)} className="rounded-full bg-teal-50 px-3 py-1 text-[#0f766e]">
                {category.name}
              </Link>
            ))}
            {post.date ? <time dateTime={post.date}>公開日: {publishedLabel}</time> : null}
            {modifiedLabel ? <time dateTime={post.modified}>更新日: {modifiedLabel}</time> : null}
          </div>

          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">{title}</h1>
          <ArticleDigest post={post} title={title} headings={headings} />

          <dl className="mt-6 grid gap-3 rounded-[1.5rem] border border-teal-100 bg-white/90 p-4 text-sm font-bold text-slate-600 shadow-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">Author</dt>
              <dd className="mt-1 text-slate-950">TSURILOGUE編集部</dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">Published</dt>
              <dd className="mt-1 text-slate-950">{publishedLabel || "準備中"}</dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">Category</dt>
              <dd className="mt-1 text-slate-950">{post.categories?.[0]?.name || "Media"}</dd>
            </div>
          </dl>

          {post.featuredImage?.url ? (
            <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-[2rem] bg-teal-50 shadow-2xl shadow-slate-900/10">
              <Image src={post.featuredImage.url} alt={post.featuredImage.alt || title} fill className="object-cover" priority sizes="(min-width: 768px) 768px, 100vw" />
            </div>
          ) : null}

          {headings.length ? <ArticleToc headings={headings} /> : null}

          <div
            className="mt-10 rounded-[1.5rem] bg-white p-5 text-slate-800 shadow-sm sm:p-8 [&_a]:font-bold [&_a]:text-[#0f766e] [&_blockquote]:border-l-4 [&_blockquote]:border-teal-300 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:leading-tight [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:text-xl [&_h3]:font-black [&_img]:rounded-2xl [&_li]:my-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_p]:text-base [&_p]:font-medium [&_p]:leading-8 [&_strong]:font-black [&_table]:my-6 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-teal-100 [&_td]:border [&_td]:border-teal-50 [&_td]:p-3 [&_th]:border [&_th]:border-teal-50 [&_th]:bg-teal-50 [&_th]:p-3 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <LiveDataBlock />

          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags?.map((tag) => (
              <Link key={tag.slug} href={getMediaPath(`tag/${tag.slug}`)} className="rounded-full border border-teal-100 bg-white px-3 py-2 text-xs font-black text-[#0f766e]">
                #{tag.name}
              </Link>
            ))}
          </div>

          <div className="mt-12">
            <MediaCta />
          </div>
        </article>

        {related.length ? (
          <section className="mx-auto max-w-6xl px-4 pb-16">
            <h2 className="text-2xl font-black text-slate-950">関連記事</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <MediaPostCard key={item.id} post={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}

function getOgImage(post: WpPost) {
  return post.seo?.ogImage || post.featuredImage?.url || `${MEDIA_PUBLIC_BASE_URL}/opengraph-image`;
}

function ArticleDigest({ post, title, headings }: { post: WpPost; title: string; headings: MediaHeading[] }) {
  const items = getArticleDigestItems(post, title, headings);

  return (
    <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-teal-50 shadow-sm" aria-label="この記事でわかること">
      <div className="flex items-center gap-3 border-b border-orange-100 px-5 py-3">
        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-white">要点</span>
        <h2 className="text-base font-black text-slate-950">この記事でわかること</h2>
      </div>
      <ul className="grid gap-2 px-5 py-4 text-sm font-bold leading-7 text-slate-700 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#0f766e]" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleToc({ headings }: { headings: MediaHeading[] }) {
  const compactHeadings = headings.filter((heading) => heading.level === 2);
  const items = compactHeadings.length >= 2 ? compactHeadings : headings;

  return (
    <nav className="mt-8 overflow-hidden rounded-[1.25rem] border border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-sm" aria-label="記事の目次">
      <div className="flex items-center gap-3 border-b border-teal-100 px-4 py-3">
        <span className="rounded-full bg-[#0f766e] px-3 py-1 text-xs font-black text-white">目次</span>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">Contents</p>
      </div>
      <ol className="grid gap-x-4 gap-y-1 px-4 py-3 text-sm font-bold leading-6 text-slate-700 sm:grid-cols-2">
        {items.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "text-xs text-slate-500" : ""}>
            <a className="line-clamp-2 rounded-lg px-2 py-1 transition hover:bg-white hover:text-[#0f766e]" href={`#${heading.id}`}>
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function getArticleDigestItems(post: WpPost, title: string, headings: MediaHeading[]) {
  const h2Items = headings
    .filter((heading) => heading.level === 2)
    .map((heading) => normalizeDigestText(heading.text))
    .filter(Boolean)
    .slice(0, 4);

  if (h2Items.length >= 3) return h2Items;

  const category = post.categories?.[0]?.name;
  const fallbackItems = [
    `「${title}」の基本的なポイント`,
    category ? `${category}で押さえておきたい考え方` : "釣果記録に活かせる考え方",
    "次の釣行で見直したいヒント",
    "TSURILOGUEで記録を振り返る視点"
  ];

  return [...h2Items, ...fallbackItems].filter((item, index, array) => array.indexOf(item) === index).slice(0, 4);
}

function normalizeDigestText(value: string) {
  return value.replace(/^[\d０-９]+[.)．、\s-]*/, "").trim();
}

function articleJsonLd(post: WpPost, canonical: string) {
  const image = getOgImage(post);
  const keywords = getPostKeywords(post);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: getPostTitle(post),
    description: getPostExcerpt(post),
    inLanguage: "ja-JP",
    datePublished: post.date,
    dateModified: post.modified || post.date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical
    },
    url: canonical,
    image: image ? [image] : undefined,
    articleSection: post.categories?.map((category) => category.name),
    keywords,
    wordCount: getPostWordCount(post),
    author: {
      "@type": "Organization",
      name: "TSURILOGUE編集部",
      url: "https://www.tsurilogue.com"
    },
    publisher: {
      "@type": "Organization",
      name: "TSURILOGUE",
      logo: {
        "@type": "ImageObject",
        url: "https://www.tsurilogue.com/icons/trlg-logo.png"
      }
    }
  };
}

function breadcrumbJsonLd(post: WpPost, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Media", item: MEDIA_PUBLIC_BASE_URL },
      { "@type": "ListItem", position: 2, name: getPostTitle(post), item: canonical }
    ]
  };
}

function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TSURILOGUE",
    url: "https://www.tsurilogue.com",
    sameAs: ["https://tsurilogue.com"]
  };
}

function relatedItemListJsonLd(posts: WpPost[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: getMediaCanonical(post.slug),
      name: getPostTitle(post)
    }))
  };
}
