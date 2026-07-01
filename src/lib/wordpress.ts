import { cache } from "react";

export const WORDPRESS_API_ORIGIN = "https://tsurilogue.tapiyota.com";
export const MEDIA_PUBLIC_BASE_URL = "https://www.tsurilogue.com/ja/media";
export const MEDIA_REVALIDATE_SECONDS = 3600;

export type WpTerm = {
  id?: number;
  slug: string;
  name: string;
  count?: number;
};

export type WpFeaturedImage = {
  url?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type WpPost = {
  id: number;
  slug: string;
  url?: string;
  title?: {
    raw?: string;
    rendered?: string;
  };
  excerpt?: {
    raw?: string;
    rendered?: string;
  };
  content?: {
    raw?: string;
    rendered?: string;
  };
  date?: string;
  modified?: string;
  featuredImage?: WpFeaturedImage;
  categories?: WpTerm[];
  tags?: WpTerm[];
  seo?: {
    title?: string;
    description?: string;
    canonical?: string;
    ogImage?: string;
  };
};

export type WpPagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type WpPostListResponse = {
  items: WpPost[];
  pagination: WpPagination;
};

type PostListParams = {
  page?: number;
  perPage?: number;
  category?: string;
  tag?: string;
};

async function wpFetch<T>(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, WORDPRESS_API_ORIGIN);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    next: { revalidate: MEDIA_REVALIDATE_SECONDS }
  });

  if (!response.ok) {
    throw new Error(`WordPress API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const getMediaPosts = cache(async ({ page = 1, perPage = 10, category, tag }: PostListParams = {}) => {
  return wpFetch<WpPostListResponse>("/wp-json/tsurilogue/v1/posts", {
    page,
    per_page: perPage,
    category,
    tag
  });
});

export const getMediaPost = cache(async (slug: string) => {
  return wpFetch<WpPost>(`/wp-json/tsurilogue/v1/posts/${encodeURIComponent(slug)}`);
});

export const getMediaCategories = cache(async () => {
  return wpFetch<WpTerm[]>("/wp-json/tsurilogue/v1/categories");
});

export const getMediaTags = cache(async () => {
  return wpFetch<WpTerm[]>("/wp-json/tsurilogue/v1/tags");
});

export async function getRelatedMediaPosts(post: WpPost, limit = 3) {
  const related = new Map<number, WpPost>();
  const categorySlug = post.categories?.[0]?.slug;
  const tagSlug = post.tags?.[0]?.slug;

  if (categorySlug) {
    const categoryPosts = await getMediaPosts({ category: categorySlug, perPage: limit + 1 }).catch(() => null);
    categoryPosts?.items.forEach((item) => {
      if (item.id !== post.id) related.set(item.id, item);
    });
  }

  if (related.size < limit && tagSlug) {
    const tagPosts = await getMediaPosts({ tag: tagSlug, perPage: limit + 1 }).catch(() => null);
    tagPosts?.items.forEach((item) => {
      if (item.id !== post.id) related.set(item.id, item);
    });
  }

  return [...related.values()].slice(0, limit);
}

export function getPostTitle(post: WpPost) {
  return htmlToText(post.title?.raw || post.title?.rendered || "TSURILOGUE Media");
}

export function getPostExcerpt(post: WpPost) {
  return htmlToText(post.excerpt?.raw || post.excerpt?.rendered || post.seo?.description || "").slice(0, 160);
}

export function getMediaCanonical(path = "") {
  const cleanPath = path.replace(/^\/+/, "").replace(/\/$/, "");
  return cleanPath ? `${MEDIA_PUBLIC_BASE_URL}/${cleanPath}/` : `${MEDIA_PUBLIC_BASE_URL}`;
}

export function getMediaPath(path = "") {
  const cleanPath = path.replace(/^\/+/, "").replace(/\/$/, "");
  return cleanPath ? `/ja/media/${cleanPath}` : "/ja/media";
}

export function formatMediaDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function htmlToText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
