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

export type MediaHeading = {
  id: string;
  text: string;
  level: 2 | 3;
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
    next: { revalidate: MEDIA_REVALIDATE_SECONDS, tags: ["wordpress-media"] }
  });

  if (!response.ok) {
    throw new Error(`WordPress API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const getMediaPosts = cache(async ({ page = 1, perPage = 10, category, tag }: PostListParams = {}) => {
  const response = await wpFetch<unknown>("/wp-json/tsurilogue/v1/posts", {
    page,
    per_page: perPage,
    category,
    tag
  });
  return normalizePostListResponse(response, page, perPage);
});

export const getMediaPost = cache(async (slug: string) => {
  return wpFetch<WpPost>(`/wp-json/tsurilogue/v1/posts/${encodeURIComponent(slug)}`);
});

export const getMediaCategories = cache(async () => {
  const response = await wpFetch<unknown>("/wp-json/tsurilogue/v1/categories");
  return normalizeTerms(response);
});

export const getMediaTags = cache(async () => {
  const response = await wpFetch<unknown>("/wp-json/tsurilogue/v1/tags");
  return normalizeTerms(response);
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

export function getPostExcerpt(post: WpPost, maxLength = 160) {
  const excerpt = getPostFullExcerpt(post);
  if (maxLength <= 0 || excerpt.length <= maxLength) return excerpt;
  return `${excerpt.slice(0, maxLength).trimEnd()}...`;
}

export function getPostFullExcerpt(post: WpPost) {
  return htmlToText(post.seo?.description || post.excerpt?.raw || post.excerpt?.rendered || "");
}

export function getPostLeadDescription(post: WpPost) {
  const seoDescription = htmlToText(post.seo?.description || "");
  if (seoDescription && !looksTruncated(seoDescription)) return seoDescription;

  const excerpt = htmlToText(post.excerpt?.raw || post.excerpt?.rendered || "");
  if (excerpt && !looksTruncated(excerpt)) return excerpt;

  const firstParagraph = getFirstParagraphText(post.content?.rendered || post.content?.raw || "");
  if (firstParagraph) return firstParagraph;

  return seoDescription || excerpt;
}

export function getPostKeywords(post: WpPost) {
  return [...(post.categories ?? []), ...(post.tags ?? [])]
    .map((term) => term.name)
    .filter(Boolean);
}

export function getPostWordCount(post: WpPost) {
  const text = htmlToText(post.content?.rendered || post.content?.raw || "");
  return text ? text.split(/\s+/).filter(Boolean).length : undefined;
}

export function enhanceArticleHtml(value: string) {
  const usedIds = new Set<string>();
  const headings: MediaHeading[] = [];

  const html = value.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, levelValue: string, attrs: string, innerHtml: string) => {
    const level = Number(levelValue) as 2 | 3;
    const text = htmlToText(innerHtml);
    if (!text) return match;

    const existingId = attrs.match(/\sid=(["'])(.*?)\1/i)?.[2];
    const baseId = existingId || slugifyHeading(text);
    const id = uniqueId(baseId, usedIds);
    usedIds.add(id);
    headings.push({ id, text, level });

    const cleanAttrs = existingId ? attrs : `${attrs} id="${id}"`;
    return `<h${level}${cleanAttrs}>${innerHtml}</h${level}>`;
  });

  return { html, headings };
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

function slugifyHeading(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~、。・「」『』（）【】\s]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "section";
}

function uniqueId(baseId: string, usedIds: Set<string>) {
  let id = baseId;
  let index = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }
  return id;
}

function getFirstParagraphText(value: string) {
  const paragraphs = [...value.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  for (const paragraph of paragraphs) {
    const text = htmlToText(paragraph[1] || "");
    if (text.length >= 24) return text;
  }
  return "";
}

function looksTruncated(value: string) {
  const text = value.trim();
  return /(\.\.\.|…|\[…\]|\[...\]|続きを読む|Read more)$/i.test(text);
}

function normalizeTerms(value: unknown): WpTerm[] {
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value as Record<string, unknown>)
      : [];

  return candidates.filter((item): item is WpTerm => {
    if (!item || typeof item !== "object") return false;
    const term = item as Record<string, unknown>;
    return typeof term.slug === "string" && typeof term.name === "string";
  });
}

function normalizePostListResponse(value: unknown, page: number, perPage: number): WpPostListResponse {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const items = Array.isArray(data.items)
    ? data.items.filter((item): item is WpPost => {
        if (!item || typeof item !== "object") return false;
        const post = item as Record<string, unknown>;
        return typeof post.id === "number" && typeof post.slug === "string";
      })
    : [];
  const pagination = data.pagination && typeof data.pagination === "object"
    ? (data.pagination as Record<string, unknown>)
    : {};
  const total = toFiniteNumber(pagination.total, items.length);
  const totalPages = toFiniteNumber(pagination.totalPages, Math.max(1, Math.ceil(total / perPage)));

  return {
    items,
    pagination: {
      page: toFiniteNumber(pagination.page, page),
      perPage: toFiniteNumber(pagination.perPage, perPage),
      total,
      totalPages,
      hasNextPage: typeof pagination.hasNextPage === "boolean" ? pagination.hasNextPage : page < totalPages
    }
  };
}

function toFiniteNumber(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}
