import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { JsonLd } from "@/components/media/JsonLd";
import { MediaListPage } from "@/components/media/MediaListPage";
import { getMediaCanonical, getMediaCategories, getMediaPath, getMediaPosts, getMediaTags, MEDIA_PUBLIC_BASE_URL } from "@/lib/wordpress";

type TagPageProps = {
  params: { slug: string };
  searchParams?: { page?: string };
};

export const revalidate = 0;

const MEDIA_OG_IMAGE = "https://www.tsurilogue.com/opengraph-image";

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tags = await getMediaTags().catch(() => []);
  const tag = tags.find((item) => item.slug === params.slug);
  const title = tag ? `#${tag.name}の記事 | TSURILOGUE Media` : "タグ記事 | TSURILOGUE Media";
  const description = `${tag?.name ?? "タグ"}に関するTSURILOGUE Mediaの記事一覧です。`;
  const canonical = getMediaCanonical(`tag/${params.slug}`);
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "TSURILOGUE",
      locale: "ja_JP",
      title,
      description,
      url: canonical,
      images: [{ url: MEDIA_OG_IMAGE, width: 1200, height: 630, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [MEDIA_OG_IMAGE]
    }
  };
}

export default async function MediaTagPage({ params, searchParams }: TagPageProps) {
  const page = parsePage(searchParams?.page);
  const [posts, categories, tags] = await Promise.all([
    getMediaPosts({ page, perPage: 10, tag: params.slug }),
    getMediaCategories().catch(() => []),
    getMediaTags().catch(() => [])
  ]);
  const tag = tags.find((item) => item.slug === params.slug);
  if (!tag && !posts.items.length) notFound();

  const title = tag ? `#${tag.name}の記事` : "タグ記事";

  return (
    <>
      <PageHeader title="Media" />
      <JsonLd data={breadcrumbJsonLd(title, getMediaCanonical(`tag/${params.slug}`))} />
      <MediaListPage
        title={title}
        description="釣果記録、釣行データ、釣りの振り返りに役立つタグ記事をまとめています。"
        posts={posts.items}
        pagination={posts.pagination}
        categories={categories}
        tags={tags}
        basePath={getMediaPath(`tag/${params.slug}`)}
      />
    </>
  );
}

function parsePage(value?: string) {
  const page = Number(value ?? 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function breadcrumbJsonLd(name: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Media", item: MEDIA_PUBLIC_BASE_URL },
      { "@type": "ListItem", position: 2, name, item: url }
    ]
  };
}
