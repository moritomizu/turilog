import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isAppLocale, localizePath, stripLocaleFromPathname } from "@/lib/i18n";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const canonicalMediaPathname = normalizeMediaPercentEncoding(pathname);
  if (canonicalMediaPathname !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = canonicalMediaPathname;
    url.search = search;
    return NextResponse.redirect(url, 301);
  }

  const isPublicMediaPath = shouldAvoidLocaleCookie(pathname);

  const missingMediaResponse = await getMissingMediaArticleResponse(pathname);
  if (missingMediaResponse) return missingMediaResponse;

  if (shouldRedirectMediaTrailingSlash(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    url.search = search;
    return NextResponse.redirect(url, 301);
  }

  if (shouldSkip(pathname)) return NextResponse.next();

  if (pathname === "/en/terms" || pathname === "/en/privacy") {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en\//, "/ja/");
    return NextResponse.redirect(url, 308);
  }

  const appLocaleMatch = pathname.match(/^\/app\/(ja|en)\/?$/);
  if (appLocaleMatch) {
    const locale = isAppLocale(appLocaleMatch[1]) ? appLocaleMatch[1] : defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = search;

    const response = rewriteWithLocale(request, url, locale);
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax" });
    return response;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!isAppLocale(firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath(pathname, defaultLocale);
    return NextResponse.redirect(url, 301);
  }

  const locale = firstSegment;
  const url = request.nextUrl.clone();
  url.pathname = stripLocaleFromPathname(pathname);
  url.search = search;

  const response = rewriteWithLocale(request, url, locale);
  if (!isPublicMediaPath) {
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax" });
  }
  return response;
}

async function getMissingMediaArticleResponse(pathname: string) {
  const match = pathname.match(/^\/(ja)\/media\/([^/]+)$/);
  if (!match || match[2] === "category" || match[2] === "tag") return null;

  let slug: string;
  try {
    slug = decodeURIComponent(match[2]).normalize("NFC");
  } catch {
    return null;
  }

  try {
    const lookupUrl = new URL("/wp-json/wp/v2/posts", "https://tsurilogue.tapiyota.com");
    lookupUrl.searchParams.set("slug", slug);
    lookupUrl.searchParams.set("status", "publish");
    lookupUrl.searchParams.set("_fields", "id");

    const response = await fetch(lookupUrl, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 }
    });
    if (!response.ok) return null;

    const posts = (await response.json()) as Array<{ id?: number }>;
    if (posts.length > 0) return null;

    const locale = "ja";
    const title = "記事が見つかりません";
    const backLabel = "メディア一覧へ戻る";
    const backPath = `/${locale}/media`;
    const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} | TSURILOGUE Media</title></head><body><main><h1>${title}</h1><p><a href="${backPath}">${backLabel}</a></p></main></body></html>`;

    return new NextResponse(html, {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex, nofollow"
      }
    });
  } catch {
    // Do not turn an upstream outage into a false 404. The page-level fetch will
    // either recover through the list endpoint or surface a retryable 5xx.
    return null;
  }
}

export function normalizeMediaPercentEncoding(pathname: string) {
  if (!/^\/(?:ja|en)\/media(?:\/|$)/.test(pathname)) return pathname;
  return pathname.replace(/%[0-9a-fA-F]{2}/g, (triplet) => triplet.toUpperCase());
}

function rewriteWithLocale(request: NextRequest, url: URL, locale: "ja" | "en") {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tsurilog-locale", locale);
  requestHeaders.set("x-tsurilog-pathname", request.nextUrl.pathname);

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders
    }
  });
}

function shouldRedirectMediaTrailingSlash(pathname: string) {
  return /^\/(ja|en)\/media\/$/.test(pathname) || /^\/(ja|en)\/media\/.+\/$/.test(pathname);
}

function shouldAvoidLocaleCookie(pathname: string) {
  return /^\/(ja|en)\/media(?:\/|$)/.test(pathname);
}

function shouldSkip(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/firebase-messaging-sw.js") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    shouldAvoidLocaleCookie(pathname) ||
    PUBLIC_FILE.test(pathname)
  );
}

export const config = {
  matcher: ["/((?!_next|api).*)"]
};
