import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { JsonLd } from "@/components/media/JsonLd";
import { MediaListPage } from "@/components/media/MediaListPage";
import { findMediaTermBySlug, getCategoryMetadata, getMediaAlternates, getMediaCanonical, getMediaCategories, getMediaPath, getMediaPosts, getMediaTags, MEDIA_PUBLIC_BASE_URL, MEDIA_REVALIDATE_SECONDS } from "@/lib/wordpress";

type CategoryPageProps = {
  params: { slug: string };
  searchParams?: { page?: string };
};

export const revalidate = MEDIA_REVALIDATE_SECONDS;
export const dynamic = "force-static";
export const dynamicParams = true;

const MEDIA_OG_IMAGE = "https://www.tsurilogue.com/opengraph-image";

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const categories = await getMediaCategories().catch(() => []);
  const category = findMediaTermBySlug(categories, params.slug);
  const categoryMeta = getCategoryMetadata(category);
  const slug = category?.slug ?? params.slug;
  const canonical = getMediaCanonical(`category/${slug}`);
  return {
    title: categoryMeta.title,
    description: categoryMeta.description,
    alternates: getMediaAlternates(`category/${slug}`),
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "TSURILOGUE",
      locale: "ja_JP",
      title: categoryMeta.title,
      description: categoryMeta.description,
      url: canonical,
      images: [{ url: MEDIA_OG_IMAGE, width: 1200, height: 630, alt: categoryMeta.title }]
    },
    twitter: {
      card: "summary_large_image",
      title: categoryMeta.title,
      description: categoryMeta.description,
      images: [MEDIA_OG_IMAGE]
    }
  };
}

export default async function MediaCategoryPage({ params, searchParams }: CategoryPageProps) {
  const page = parsePage(searchParams?.page);
  const categories = await getMediaCategories().catch(() => []);
  const category = findMediaTermBySlug(categories, params.slug);
  const slug = category?.slug ?? params.slug;
  const [posts, tags] = await Promise.all([
    getMediaPosts({ page, perPage: 10, category: slug }),
    getMediaTags().catch(() => [])
  ]);
  if (!category && !posts.items.length) notFound();

  const categoryMeta = getCategoryMetadata(category);
  const canonical = getMediaCanonical(`category/${slug}`);

  return (
    <>
      <PageHeader title="Media" titleAs="div" />
      <JsonLd data={[webPageJsonLd(categoryMeta.heading, canonical), breadcrumbJsonLd(categoryMeta.heading, canonical)]} />
      <MediaListPage
        title={categoryMeta.heading}
        description={categoryMeta.description}
        posts={posts.items}
        pagination={posts.pagination}
        categories={categories}
        tags={tags}
        basePath={getMediaPath(`category/${slug}`)}
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
