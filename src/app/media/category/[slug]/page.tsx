import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { JsonLd } from "@/components/media/JsonLd";
import { MediaListPage } from "@/components/media/MediaListPage";
import { getMediaCanonical, getMediaCategories, getMediaPath, getMediaPosts, getMediaTags, MEDIA_PUBLIC_BASE_URL } from "@/lib/wordpress";

type CategoryPageProps = {
  params: { slug: string };
  searchParams?: { page?: string };
};

export const revalidate = 3600;

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const categories = await getMediaCategories().catch(() => []);
  const category = categories.find((item) => item.slug === params.slug);
  const title = category ? `${category.name}の記事 | TSURILOGUE Media` : "カテゴリ記事 | TSURILOGUE Media";
  const canonical = getMediaCanonical(`category/${params.slug}`);
  return {
    title,
    description: `${category?.name ?? "カテゴリ"}に関するTSURILOGUE Mediaの記事一覧です。`,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "TSURILOGUE",
      title,
      description: `${category?.name ?? "カテゴリ"}に関するTSURILOGUE Mediaの記事一覧です。`,
      url: canonical
    },
    twitter: { card: "summary_large_image", title }
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

  return (
    <>
      <PageHeader title="Media" />
      <JsonLd data={breadcrumbJsonLd(title, getMediaCanonical(`category/${params.slug}`))} />
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
