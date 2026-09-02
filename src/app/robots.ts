import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/app/", "/admin/", "/login"]
    },
    sitemap: "https://www.tsurilogue.com/sitemap.xml"
  };
}
