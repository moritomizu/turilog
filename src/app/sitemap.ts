import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";
import { MEDIA_PUBLIC_BASE_URL, getMediaCanonical, getMediaCategories, getMediaPosts, getMediaTags } from "@/lib/wordpress";

const staticRoutes = [
  { path: "/ja", priority: 1 },
  { path: "/en", priority: 0.8 },
  { path: "/ja/about", priority: 0.9 },
  { path: "/en/about", priority: 0.7 },
  { path: "/ja/features", priority: 0.9 },
  { path: "/en/features", priority: 0.7 },
  { path: "/ja/pricing", priority: 0.8 },
  { path: "/en/pricing", priority: 0.6 },
  { path: "/ja/install", priority: 0.7 },
  { path: "/en/install", priority: 0.5 },
  { path: "/ja/feedback", priority: 0.5 },
  { path: "/en/feedback", priority: 0.4 },
  { path: "/ja/terms", priority: 0.3 },
  { path: "/en/terms", priority: 0.2 },
  { path: "/ja/privacy", priority: 0.3 },
  { path: "/en/privacy", priority: 0.2 }
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
  const safePosts = Array.isArray(posts?.items) ? posts.items : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeTags = Array.isArray(tags) ? tags : [];

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
    ...safeCategories.map((category) => ({
      url: getMediaCanonical(`category/${category.slug}`),
      lastModified: fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.5
    })),
    ...safeTags.map((tag) => ({
      url: getMediaCanonical(`tag/${tag.slug}`),
      lastModified: fallbackDate,
      changeFrequency: "weekly" as const,
      priority: 0.4
    }))
  ];
}
