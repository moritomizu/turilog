import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";
import { MEDIA_PUBLIC_BASE_URL, getLatestPostModifiedAt, getMediaCanonical, getMediaCategories, getMediaPosts, getPostSitemapLastModified } from "@/lib/wordpress";

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
  const mediaRoutes = await getMediaSitemapRoutes();
  const staticSitemapRoutes: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    changeFrequency: route.path === "/" ? "weekly" : "monthly",
    priority: route.priority
  }));

  return [...staticSitemapRoutes, ...mediaRoutes];
}

async function getMediaSitemapRoutes(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([
    getMediaPosts({ page: 1, perPage: 100 }).catch(() => null),
    getMediaCategories().catch(() => [])
  ]);
  const safePosts = Array.isArray(posts?.items) ? posts.items : [];
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
    ...safeCategories.filter((category) => (category.count ?? 0) > 0).map((category) => ({
      url: getMediaCanonical(`category/${category.slug}`),
      lastModified: getLatestPostModifiedAt(safePosts.filter((post) => post.categories?.some((item) => item.slug === category.slug))),
      changeFrequency: "weekly" as const,
      priority: 0.5
    }))
  ];
}
