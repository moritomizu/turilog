import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { JsonLd } from "@/components/media/JsonLd";
import { MediaCta } from "@/components/media/MediaCta";
import { MediaPostCard } from "@/components/media/MediaPostCard";
import {
  MEDIA_PUBLIC_BASE_URL,
  formatMediaDate,
  getMediaCanonical,
  getMediaPath,
  getMediaPost,
  getPostExcerpt,
  getPostFullExcerpt,
  getPostTitle,
  getRelatedMediaPosts,
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

  return {
    title,
    description,
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
  const excerpt = getPostFullExcerpt(post);

  return (
    <>
      <PageHeader title="Media" />
      <JsonLd data={[articleJsonLd(post, canonical), breadcrumbJsonLd(post, canonical), organizationJsonLd()]} />
      <main className="bg-gradient-to-b from-[#eefbf7] via-white to-[#f8fafc]">
        <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            {post.categories?.map((category) => (
              <Link key={category.slug} href={getMediaPath(`category/${category.slug}`)} className="rounded-full bg-teal-50 px-3 py-1 text-[#0f766e]">
                {category.name}
              </Link>
            ))}
            {post.date ? <time dateTime={post.date}>{formatMediaDate(post.date)}</time> : null}
          </div>

          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">{title}</h1>
          {excerpt ? <p className="mt-5 text-base font-bold leading-8 text-slate-600">{excerpt}</p> : null}

          {post.featuredImage?.url ? (
            <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-[2rem] bg-teal-50 shadow-2xl shadow-slate-900/10">
              <Image src={post.featuredImage.url} alt={post.featuredImage.alt || title} fill className="object-cover" priority sizes="(min-width: 768px) 768px, 100vw" />
            </div>
          ) : null}

          <div
            className="mt-10 rounded-[1.5rem] bg-white p-5 text-slate-800 shadow-sm sm:p-8 [&_a]:font-bold [&_a]:text-[#0f766e] [&_blockquote]:border-l-4 [&_blockquote]:border-teal-300 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:leading-tight [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-black [&_img]:rounded-2xl [&_li]:my-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_p]:text-base [&_p]:font-medium [&_p]:leading-8 [&_strong]:font-black [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: post.content?.rendered || "" }}
          />

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

function articleJsonLd(post: WpPost, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: getPostTitle(post),
    description: getPostExcerpt(post),
    datePublished: post.date,
    dateModified: post.modified || post.date,
    mainEntityOfPage: canonical,
    image: getOgImage(post),
    author: {
      "@type": "Organization",
      name: "TSURILOGUE"
    },
    publisher: {
      "@type": "Organization",
      name: "TSURILOGUE"
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
