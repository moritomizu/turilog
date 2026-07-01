import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

type RevalidateRequestBody = {
  secret?: unknown;
  path?: unknown;
  slug?: unknown;
  category?: unknown;
  categorySlug?: unknown;
  categories?: unknown;
  tag?: unknown;
  tagSlug?: unknown;
  tags?: unknown;
  paths?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = await readBody(request);
    const configuredSecret = process.env.WORDPRESS_REVALIDATE_SECRET?.trim() || process.env.REVALIDATE_SECRET?.trim();
    const providedSecret = request.headers.get("x-revalidate-secret") || toText(body.secret) || request.nextUrl.searchParams.get("secret");

    if (!configuredSecret) {
      return NextResponse.json({ revalidated: false, error: "WORDPRESS_REVALIDATE_SECRET is not configured." }, { status: 500 });
    }

    if (!providedSecret || providedSecret !== configuredSecret) {
      return NextResponse.json({ revalidated: false, error: "Invalid revalidation secret." }, { status: 401 });
    }

    const paths = getRevalidatePaths(body);
    revalidateTag("wordpress-media");
    paths.forEach((path) => revalidatePath(path));

    return NextResponse.json({
      revalidated: true,
      tags: ["wordpress-media"],
      paths,
      received: {
        path: toText(body.path) || null,
        paths: toTextArray(body.paths)
      },
      now: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown revalidation error.";
    console.error("[api/revalidate] failed", error);
    return NextResponse.json({ revalidated: false, error: message }, { status: 500 });
  }
}

async function readBody(request: NextRequest): Promise<RevalidateRequestBody> {
  try {
    return (await request.json()) as RevalidateRequestBody;
  } catch {
    return {};
  }
}

function getRevalidatePaths(body: RevalidateRequestBody) {
  const paths = new Set<string>(["/media", "/sitemap.xml"]);
  const slug = normalizeMediaPathSegment(body.slug);

  if (slug) {
    paths.add(`/media/${slug}`);
  }

  getUniqueSegments([body.category, body.categorySlug, ...toTextArray(body.categories)]).forEach((category) => {
    paths.add(`/media/category/${category}`);
  });

  getUniqueSegments([body.tag, body.tagSlug, ...toTextArray(body.tags)]).forEach((tag) => {
    paths.add(`/media/tag/${tag}`);
  });

  [body.path, ...toTextArray(body.paths)].forEach((path) => {
    if (!path) return;
    const normalized = normalizeRevalidatePath(path);
    if (normalized) paths.add(normalized);
  });

  return [...paths];
}

function getUniqueSegments(values: unknown[]) {
  return [...new Set(values.map(normalizeMediaPathSegment).filter((value): value is string => Boolean(value)))];
}

function normalizeMediaPathSegment(value: unknown) {
  const text = toText(value);
  if (!text) return "";
  const path = getPathname(text)
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

function normalizeRevalidatePath(value: unknown) {
  const text = toText(value);
  if (!text) return "";
  const pathname = getPathname(text).replace(/\/+$/, "") || "/media";
  if (pathname === "/media" || pathname.startsWith("/media/")) return pathname;
  if (pathname === "/ja/media") return "/media";
  if (pathname.startsWith("/ja/media/")) return pathname.replace(/^\/ja\/media/, "/media");
  return "";
}

function getPathname(value: string) {
  const text = value.trim();
  if (!text) return "";
  try {
    return new URL(text).pathname;
  } catch {
    return text.startsWith("/") ? text : `/${text}`;
  }
}

function toText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

function toTextArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(toText).filter(Boolean);
}
