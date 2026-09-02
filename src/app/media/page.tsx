import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { JsonLd } from "@/components/media/JsonLd";
import { MediaListPage } from "@/components/media/MediaListPage";
import { getMediaAlternates, getMediaCategories, getMediaPath, getMediaPosts, getMediaTags, MEDIA_PUBLIC_BASE_URL, type WpPostListResponse } from "@/lib/wordpress";

type MediaPageProps = {
  searchParams?: { page?: string };
};

export const revalidate = 0;

export const metadata: Metadata = {
  title: "TSURILOGUE Media | 釣果記録・釣りログと釣り分析のヒント",
  description: "釣果記録、釣りログ、潮位、気象、タックル、AI分析を次の一匹につなげるためのTSURILOGUE（釣りローグ）公式メディアです。",
  alternates: getMediaAlternates(),
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "TSURILOGUE",
    title: "TSURILOGUE Media | 釣果記録・釣りログと釣り分析のヒント",
    description: "釣果記録、釣りログ、潮位、気象、タックル、AI分析を次の一匹につなげるためのTSURILOGUE（釣りローグ）公式メディアです。",
    url: MEDIA_PUBLIC_BASE_URL,
    images: [{ url: "https://www.tsurilogue.com/opengraph-image", width: 1200, height: 630, alt: "TSURILOGUE Media" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "TSURILOGUE Media | 釣果記録・釣りログと釣り分析のヒント",
    description: "釣果記録、釣りログ、潮位、気象、タックル、AI分析を次の一匹につなげるためのTSURILOGUE（釣りローグ）公式メディアです。",
    images: ["https://www.tsurilogue.com/opengraph-image"]
  }
};

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const page = parsePage(searchParams?.page);
  const [posts, categories, tags] = await Promise.all([getMediaPosts({ page, perPage: 10 }).catch(() => emptyPostList(page)), getMediaCategories().catch(() => []), getMediaTags().catch(() => [])]);

  return (
    <>
      <PageHeader title="Media" titleAs="div" />
      <JsonLd data={[organizationJsonLd(), breadcrumbJsonLd([{ name: "Media", url: MEDIA_PUBLIC_BASE_URL }])]} />
      <MediaListPage
        title="釣果を、次の一匹のヒントに。"
        description="TSURILOGUE Mediaは、釣果記録・潮位・気象・タックル・AI分析をもっと楽しく活用するための公式メディアです。"
        posts={posts.items}
        pagination={posts.pagination}
        categories={categories}
        tags={tags}
        basePath={getMediaPath()}
      />
    </>
  );
}

function parsePage(value?: string) {
  const page = Number(value ?? 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function emptyPostList(page: number): WpPostListResponse {
  return {
    items: [],
    pagination: {
      page,
      perPage: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false
    }
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

function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}
