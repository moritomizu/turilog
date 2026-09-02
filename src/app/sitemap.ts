import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";
import { MEDIA_PUBLIC_BASE_URL, getMediaCanonical, getMediaCategories, getMediaPosts } from "@/lib/wordpress";

const staticRoutes = [
  { path: "/ja", priority: 1 },
  { path: "/ja/about", priority: 0.9 },
  { path: "/ja/features", priority: 0.9 },
  { path: "/ja/pricing", priority: 0.8 },
  { path: "/ja/signup", priority: 0.8 },
  { path: "/ja/install", priority: 0.7 },
  { path: "/ja/feedback", priority: 0.5 }
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
  const [posts, categories] = await Promise.all([
    getMediaPosts({ page: 1, perPage: 100 }).catch(() => null),
    getMediaCategories().catch(() => [])
  ]);
  const safePosts = Array.isArray(posts?.items) ? posts.items : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  return [
    {
      url: MEDIA_PUBLIC_BASE_URL,
      lastModified: fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.8
    },
    ...safePosts.map((post) => ({
      url: getMediaCanonical(post.slug),
      lastModified: post.modified || post.date ? new Date(post.modified || post.date || fallbackDate) : fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...safeCategories.filter((category) => (category.count ?? 0) > 0).map((category) => ({
      url: getMediaCanonical(`category/${category.slug}`),
      lastModified: fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.5
    }))
  ];
}
