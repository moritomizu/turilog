import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

type RevalidateRequestBody = {
  secret?: string;
  slug?: string;
  category?: string;
  categorySlug?: string;
  categories?: string[];
  tag?: string;
  tagSlug?: string;
  tags?: string[];
  paths?: string[];
};

export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const configuredSecret = process.env.WORDPRESS_REVALIDATE_SECRET?.trim() || process.env.REVALIDATE_SECRET?.trim();
  const providedSecret = request.headers.get("x-revalidate-secret") || body.secret || request.nextUrl.searchParams.get("secret");

  if (!configuredSecret) {
    return NextResponse.json({ revalidated: false, error: "WORDPRESS_REVALIDATE_SECRET is not configured." }, { status: 500 });
  }

  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ revalidated: false, error: "Invalid revalidation secret." }, { status: 401 });
  }

  const paths = getRevalidatePaths(body);
  paths.forEach((path) => revalidatePath(path));

  return NextResponse.json({
    revalidated: true,
    paths,
    now: new Date().toISOString()
  });
}

async function readBody(request: NextRequest): Promise<RevalidateRequestBody> {
  try {
    return (await request.json()) as RevalidateRequestBody;
  } catch {
    return {};
  }
}

function getRevalidatePaths(body: RevalidateRequestBody) {
  const paths = new Set<string>(["/media", "/ja/media", "/sitemap.xml"]);
  const slug = normalizeMediaPathSegment(body.slug);

  if (slug) {
    paths.add(`/media/${slug}`);
    paths.add(`/ja/media/${slug}`);
  }

  getUniqueSegments([body.category, body.categorySlug, ...(body.categories ?? [])]).forEach((category) => {
    paths.add(`/media/category/${category}`);
    paths.add(`/ja/media/category/${category}`);
  });

  getUniqueSegments([body.tag, body.tagSlug, ...(body.tags ?? [])]).forEach((tag) => {
    paths.add(`/media/tag/${tag}`);
    paths.add(`/ja/media/tag/${tag}`);
  });

  (body.paths ?? []).forEach((path) => {
    const normalized = normalizeRevalidatePath(path);
    if (normalized) paths.add(normalized);
  });

  return [...paths];
}

function getUniqueSegments(values: Array<string | undefined>) {
  return [...new Set(values.map(normalizeMediaPathSegment).filter((value): value is string => Boolean(value)))];
}

function normalizeMediaPathSegment(value?: string) {
  if (!value) return "";
  const path = getPathname(value.trim())
    .replace(/^\/+/, "")
    .replace(/^ja\/media\/?/, "")
    .replace(/^media\/?/, "")
    .replace(/^category\/?/, "")
    .replace(/^tag\/?/, "")
    .replace(/\/+$/, "");

  return path
    .split("/")
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/");
}

function normalizeRevalidatePath(value: string) {
  const pathname = getPathname(value.trim()).replace(/\/+$/, "");
  if (pathname === "/media" || pathname === "/ja/media" || pathname.startsWith("/media/") || pathname.startsWith("/ja/media/")) {
    return pathname;
  }
  return "";
}

function getPathname(value: string) {
  if (!value) return "";
  try {
    return new URL(value).pathname;
  } catch {
    return value.startsWith("/") ? value : `/${value}`;
  }
}
