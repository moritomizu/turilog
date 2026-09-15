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

export type MediaCategoryMetadata = {
  title: string;
  heading: string;
  description: string;
  classification: "KEEP_INDEX" | "NOINDEX_CANDIDATE" | "MERGE_CANDIDATE";
  notes: string;
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
  const title = getPostTitle(post);
  const category = post.categories?.[0]?.name;
  const seoDescription = htmlToText(post.seo?.description || "");
  const seoLead = toCompleteLead(seoDescription);
  if (seoLead && !looksTruncated(seoDescription)) return seoLead;

  const excerpt = htmlToText(post.excerpt?.raw || post.excerpt?.rendered || "");
  const excerptLead = toCompleteLead(excerpt);
  if (excerptLead && !looksTruncated(excerpt)) return excerptLead;

  const paragraphLead = getContentLeadDescription(post.content?.rendered || post.content?.raw || "");
  if (paragraphLead) return paragraphLead;

  return category
    ? `この記事では「${title}」をテーマに、${category}に役立つ考え方や実践のヒントを整理します。本文で詳しく見ていきましょう。`
    : `この記事では「${title}」について、釣果記録や次の釣行に活かせるヒントを整理します。本文で詳しく見ていきましょう。`;
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
  const cleanPath = encodeMediaPath(path);
  return cleanPath ? `${MEDIA_PUBLIC_BASE_URL}/${cleanPath}` : `${MEDIA_PUBLIC_BASE_URL}`;
}

export function getMediaAlternates(path = "") {
  const cleanPath = encodeMediaPath(path);
  const suffix = cleanPath ? `/${cleanPath}` : "";
  return {
    canonical: getMediaCanonical(cleanPath),
    languages: {
      ja: `${MEDIA_PUBLIC_BASE_URL}${suffix}`
    }
  };
}

export function getMediaPath(path = "") {
  const cleanPath = encodeMediaPath(path);
  return cleanPath ? `/ja/media/${cleanPath}` : "/ja/media";
}

export function normalizeMediaSlug(value = "") {
  const trimmed = value.trim().replace(/^\/+/, "").replace(/\/$/, "");
  try {
    return decodeURIComponent(trimmed).normalize("NFC");
  } catch {
    return trimmed.normalize("NFC");
  }
}

export function encodeMediaPath(value = "") {
  const cleanPath = value.replace(/^\/+/, "").replace(/\/$/, "");
  if (!cleanPath) return "";
  return cleanPath
    .split("/")
    .map((segment) => encodeURIComponent(normalizeMediaSlug(segment)))
    .join("/");
}

export function findMediaTermBySlug(terms: WpTerm[], slug: string) {
  const normalizedSlug = normalizeMediaSlug(slug);
  return terms.find((term) => normalizeMediaSlug(term.slug) === normalizedSlug);
}

export function getCategoryMetadata(category?: WpTerm): MediaCategoryMetadata {
  const name = category?.name || "カテゴリ";
  const normalizedName = name.replace(/\s+/g, "");
  const custom = category ? categoryMetadataByName[normalizedName] : undefined;
  if (custom) return custom;

  return {
    title: `${name}の記事一覧｜TSURILOGUE Media`,
    heading: `${name}の記事一覧`,
    description: `${name}に関するTSURILOGUE（釣りローグ）公式メディアの記事一覧です。釣果記録・釣りログ・釣行データの振り返りに役立つ情報をまとめています。`,
    classification: (category?.count ?? 0) >= 3 ? "KEEP_INDEX" : "NOINDEX_CANDIDATE",
    notes: category ? "カテゴリ固有メタデータ未定義のため、カテゴリ名ベースで生成。" : "カテゴリ取得に失敗したfallback。"
  };
}

export function formatMediaDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function getPostPublishedAt(post: WpPost) {
  return normalizeMediaDateString(post.date);
}

export function getPostModifiedAt(post: WpPost) {
  const published = parseMediaDate(post.date);
  const modified = parseMediaDate(post.modified);
  if (!published && !modified) return undefined;
  if (!published) return modified?.toISOString();
  if (!modified) return published.toISOString();
  return (modified.getTime() >= published.getTime() ? modified : published).toISOString();
}

export function getPostSitemapLastModified(post: WpPost) {
  const modified = getPostModifiedAt(post);
  return modified ? new Date(modified) : undefined;
}

export function getLatestPostModifiedAt(posts: WpPost[]) {
  const timestamps = posts
    .map((post) => getPostSitemapLastModified(post)?.getTime())
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!timestamps.length) return undefined;
  return new Date(Math.max(...timestamps));
}

export function getLatestPostModifiedAtByCategory(posts: WpPost[], categorySlug: string) {
  const normalizedSlug = normalizeMediaSlug(categorySlug);
  return getLatestPostModifiedAt(
    posts.filter((post) => post.categories?.some((item) => normalizeMediaSlug(item.slug) === normalizedSlug))
  );
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

const categoryMetadataByName: Record<string, MediaCategoryMetadata> = {
  コミュニティ: {
    title: "コミュニティの記事一覧｜TSURILOGUE Media",
    heading: "コミュニティの記事一覧",
    description: "釣り仲間、グループ、チームでの釣果共有や活動記録に関する記事を紹介。仲間と釣りを楽しむヒントをまとめています。",
    classification: "KEEP_INDEX",
    notes: "グループ・釣り仲間文脈のカテゴリとしてindex継続候補。"
  },
  "遊漁船・事業者向け": {
    title: "遊漁船・事業者向けの記事一覧｜TSURILOGUE Media",
    heading: "遊漁船・事業者向けの記事一覧",
    description: "遊漁船、釣具店、釣り事業者が釣果投稿やオンラインイベントを活用する方法を紹介。集客や釣果発信のヒントを解説します。",
    classification: "NOINDEX_CANDIDATE",
    notes: "記事数が少ないため、将来的に事業者向けカテゴリ統合も検討。"
  },
  釣りログ: {
    title: "釣りログの記事一覧｜TSURILOGUE Media",
    heading: "釣りログの記事一覧",
    description: "釣りログ、釣行記録、スマホでの釣果メモの残し方を紹介。釣れた条件を次の釣行に活かすための記事をまとめています。",
    classification: "KEEP_INDEX",
    notes: "主要検索意図に近いためindex継続候補。"
  },
  釣り仲間: {
    title: "釣り仲間の記事一覧｜TSURILOGUE Media",
    heading: "釣り仲間の記事一覧",
    description: "釣り仲間との釣果共有、グループ活動、仲間内ランキングに関する記事を紹介。釣果記録を仲間と楽しむ方法を解説します。",
    classification: "KEEP_INDEX",
    notes: "釣果共有カテゴリと近いため、将来的に役割整理を検討。"
  },
  "釣り大会・イベント": {
    title: "釣り大会・イベントの記事一覧｜TSURILOGUE Media",
    heading: "釣り大会・イベントの記事一覧",
    description: "オンライン釣り大会、仲間内ランキング、大会ルールや運営方法を紹介。スマホで楽しめる釣り大会の始め方を解説します。",
    classification: "KEEP_INDEX",
    notes: "大会系親カテゴリとしてindex継続候補。"
  },
  釣り日記: {
    title: "釣り日記の記事一覧｜TSURILOGUE Media",
    heading: "釣り日記の記事一覧",
    description: "釣り日記、釣行メモ、スマホでの記録習慣に関する記事を紹介。釣行後に振り返りやすい記録方法を解説します。",
    classification: "MERGE_CANDIDATE",
    notes: "釣行ログ・釣りログと検索意図が近いため、将来的に統合候補。"
  },
  釣果共有: {
    title: "釣果共有の記事一覧｜TSURILOGUE Media",
    heading: "釣果共有の記事一覧",
    description: "釣果共有、釣り仲間との記録共有、グループでの釣果管理に関する記事を紹介。TSURILOGUEを使った共有方法も解説します。",
    classification: "KEEP_INDEX",
    notes: "主要検索意図に近いためindex継続候補。"
  },
  釣果写真: {
    title: "釣果写真の記事一覧｜TSURILOGUE Media",
    heading: "釣果写真の記事一覧",
    description: "釣果写真の残し方、SNS共有、釣れた魚の見せ方に関する記事を紹介。釣果をきれいに記録して振り返る方法をまとめています。",
    classification: "NOINDEX_CANDIDATE",
    notes: "記事数が少ないため、釣果共有カテゴリへの統合も検討。"
  },
  釣果記録: {
    title: "釣果記録の記事一覧｜TSURILOGUE Media",
    heading: "釣果記録の記事一覧",
    description: "釣果記録、釣果ログ、釣果記録アプリの使い方や続け方を紹介。釣れた魚をスマホで記録し、次の釣行に活かす方法を解説します。",
    classification: "KEEP_INDEX",
    notes: "最重要カテゴリとしてindex継続候補。"
  },
  釣行ログ: {
    title: "釣行ログの記事一覧｜TSURILOGUE Media",
    heading: "釣行ログの記事一覧",
    description: "釣行ログ、釣行メモ、釣りの振り返りに関する記事を紹介。潮位や天候、タックルを含めて釣行を記録する方法を解説します。",
    classification: "MERGE_CANDIDATE",
    notes: "釣りログ・釣り日記と近いため、将来的に統合候補。"
  }
};

function normalizeMediaDateString(value?: string) {
  const date = parseMediaDate(value);
  return date?.toISOString();
}

function parseMediaDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
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

function getContentLeadDescription(value: string) {
  const paragraphs = [...value.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((paragraph) => htmlToText(paragraph[1] || ""))
    .filter((text) => text.length >= 12 && !looksTruncated(text));
  const combined = paragraphs.slice(0, 4).join(" ");
  const lead = toCompleteLead(combined);
  if (lead) return lead;
  return toCompleteLead(getFirstParagraphText(value));
}

function looksTruncated(value: string) {
  const text = value.trim();
  return /(\.\.\.|…|\[…\]|\[...\]|続きを読む|Read more)$/i.test(text);
}

function toCompleteLead(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || looksTruncated(text)) return "";
  if (text.length <= 140 && /[。！？!?]$/.test(text)) return text;

  const sentences = text.match(/[^。！？!?]+[。！？!?]/g) ?? [];
  let lead = "";
  for (const sentence of sentences) {
    const next = `${lead}${sentence}`.trim();
    if (next.length > 150) break;
    lead = next;
    if (lead.length >= 56) break;
  }

  if (lead) return lead;
  return "";
}

function ensureTerminalPunctuation(value: string) {
  return /[。！？!?]$/.test(value) ? value : `${value}。`;
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
