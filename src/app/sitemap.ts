import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";
import { MEDIA_PUBLIC_BASE_URL, getMediaCanonical, getMediaCategories, getMediaPosts, getMediaTags } from "@/lib/wordpress";

const staticRoutes = [
  { path: "/", priority: 1 },
  { path: "/features", priority: 0.9 },
  { path: "/pricing", priority: 0.8 },
  { path: "/install", priority: 0.7 },
  { path: "/feedback", priority: 0.5 },
  { path: "/app/ja", priority: 0.6 },
  { path: "/app/en", priority: 0.5 }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  const mediaRoutes = await getMediaSitemapRoutes(lastModified);
  const staticSitemapRoutes: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.path === "/" ? "weekly" : "monthly",
    priority: route.priority
  }));

  return [...staticSitemapRoutes, ...mediaRoutes];
}

async function getMediaSitemapRoutes(fallbackDate: Date): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, tags] = await Promise.all([
    getMediaPosts({ page: 1, perPage: 100 }).catch(() => null),
    getMediaCategories().catch(() => []),
    getMediaTags().catch(() => [])
  ]);

  return [
    {
      url: MEDIA_PUBLIC_BASE_URL,
      lastModified: fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.8
    },
    ...(posts?.items ?? []).map((post) => ({
      url: getMediaCanonical(post.slug),
      lastModified: post.modified || post.date ? new Date(post.modified || post.date || fallbackDate) : fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...categories.map((category) => ({
      url: getMediaCanonical(`category/${category.slug}`),
      lastModified: fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.5
    })),
    ...tags.map((tag) => ({
      url: getMediaCanonical(`tag/${tag.slug}`),
      lastModified: fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.4
    }))
  ];
}
