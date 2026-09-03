import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { JsonLd } from "@/components/media/JsonLd";
import { MediaListPage } from "@/components/media/MediaListPage";
import { getMediaAlternates, getMediaCanonical, getMediaCategories, getMediaPath, getMediaPosts, getMediaTags, MEDIA_PUBLIC_BASE_URL } from "@/lib/wordpress";

type CategoryPageProps = {
  params: { slug: string };
  searchParams?: { page?: string };
};

export const revalidate = 0;

const MEDIA_OG_IMAGE = "https://www.tsurilogue.com/opengraph-image";

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const categories = await getMediaCategories().catch(() => []);
  const category = categories.find((item) => item.slug === params.slug);
  const title = category ? `${category.name}の記事 | TSURILOGUE Media` : "カテゴリ記事 | TSURILOGUE Media";
  const description = `${category?.name ?? "カテゴリ"}に関するTSURILOGUE（釣りローグ）公式メディアの記事一覧です。釣果記録・釣りログ・釣行データの振り返りに役立つ情報をまとめています。`;
  const canonical = getMediaCanonical(`category/${params.slug}`);
  return {
    title,
    description,
    alternates: getMediaAlternates(`category/${params.slug}`),
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

export default async function MediaCategoryPage({ params, searchParams }: CategoryPageProps) {
  const page = parsePage(searchParams?.page);
  const [posts, categories, tags] = await Promise.all([
    getMediaPosts({ page, perPage: 10, category: params.slug }),
    getMediaCategories().catch(() => []),
    getMediaTags().catch(() => [])
  ]);
  const category = categories.find((item) => item.slug === params.slug);
  if (!category && !posts.items.length) notFound();

  const title = category ? `${category.name}の記事` : "カテゴリ記事";
  const canonical = getMediaCanonical(`category/${params.slug}`);

  return (
    <>
      <PageHeader title="Media" titleAs="div" />
      <JsonLd data={[webPageJsonLd(title, canonical), breadcrumbJsonLd(title, canonical)]} />
      <MediaListPage
        title={title}
        description="釣果記録、釣行データ、釣りの振り返りに役立つカテゴリ記事をまとめています。"
        posts={posts.items}
        pagination={posts.pagination}
        categories={categories}
        tags={tags}
        basePath={getMediaPath(`category/${params.slug}`)}
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

function webPageJsonLd(name: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    url,
    name,
    isPartOf: {
      "@type": "WebSite",
      "@id": MEDIA_PUBLIC_BASE_URL,
      url: MEDIA_PUBLIC_BASE_URL,
      name: "TSURILOGUE Media"
    }
  };
}
