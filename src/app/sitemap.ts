import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";
import { MEDIA_PUBLIC_BASE_URL, getAllMediaPosts, getLatestPostModifiedAt, getLatestPostModifiedAtByCategory, getMediaCanonical, getMediaCategories, getPostSitemapLastModified, isIndexableMediaCategory } from "@/lib/wordpress";

const staticRoutes: Array<{ path: string; priority: number; lastModified: string; localizedPath?: string }> = [
  { path: "/ja", priority: 1, lastModified: "2026-10-17T00:00:00.000Z", localizedPath: "/" },
  { path: "/en", priority: 1, lastModified: "2026-10-17T00:00:00.000Z", localizedPath: "/" },
  { path: "/ja/about", priority: 0.9, lastModified: "2026-09-15T00:00:00.000Z" },
  { path: "/ja/features", priority: 0.9, lastModified: "2026-10-17T00:00:00.000Z", localizedPath: "/features" },
  { path: "/en/features", priority: 0.9, lastModified: "2026-10-17T00:00:00.000Z", localizedPath: "/features" },
  { path: "/ja/pricing", priority: 0.8, lastModified: "2026-09-15T00:00:00.000Z" },
  { path: "/ja/signup", priority: 0.8, lastModified: "2026-10-17T00:00:00.000Z", localizedPath: "/signup" },
  { path: "/en/signup", priority: 0.8, lastModified: "2026-10-17T00:00:00.000Z", localizedPath: "/signup" },
  { path: "/ja/install", priority: 0.7, lastModified: "2026-09-15T00:00:00.000Z" },
  { path: "/ja/feedback", priority: 0.5, lastModified: "2026-09-15T00:00:00.000Z" }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const mediaRoutes = await getMediaSitemapRoutes();
  const staticSitemapRoutes: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.localizedPath === "/" ? "weekly" : "monthly",
    priority: route.priority,
    ...(route.localizedPath
      ? {
          alternates: {
            languages: {
              ja: `${siteUrl}/ja${route.localizedPath === "/" ? "" : route.localizedPath}`,
              en: `${siteUrl}/en${route.localizedPath === "/" ? "" : route.localizedPath}`
            }
          }
        }
      : {})
  }));

  return [...staticSitemapRoutes, ...mediaRoutes];
}

async function getMediaSitemapRoutes(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([
    getAllMediaPosts().catch(() => []),
    getMediaCategories().catch(() => [])
  ]);
  const safePosts = Array.isArray(posts) ? posts : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const latestPostModified = getLatestPostModifiedAt(safePosts);

  return [
    {
      url: MEDIA_PUBLIC_BASE_URL,
      lastModified: latestPostModified,
      changeFrequency: "weekly" as const,
      priority: 0.8
    },
    ...safePosts.map((post) => ({
      url: getMediaCanonical(post.slug),
      lastModified: getPostSitemapLastModified(post),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...safeCategories.filter((category) => (category.count ?? 0) > 0 && isIndexableMediaCategory(category)).map((category) => ({
      url: getMediaCanonical(`category/${category.slug}`),
      lastModified: getLatestPostModifiedAtByCategory(safePosts, category.slug),
      changeFrequency: "weekly" as const,
      priority: 0.5
    }))
  ];
}
