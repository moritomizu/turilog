import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";

const staticRoutes = [
  { path: "/", priority: 1 },
  { path: "/features", priority: 0.9 },
  { path: "/pricing", priority: 0.8 },
  { path: "/ja/media", priority: 0.8 },
  { path: "/install", priority: 0.7 },
  { path: "/feedback", priority: 0.5 },
  { path: "/app/ja", priority: 0.6 },
  { path: "/app/en", priority: 0.5 }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.path === "/" ? "weekly" : "monthly",
    priority: route.priority
  }));
}

// Future extension points:
// - /media/*
// - /media/category/*
// - /media/tag/*
