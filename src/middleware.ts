import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isAppLocale, localizePath, stripLocaleFromPathname } from "@/lib/i18n";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (shouldSkip(pathname)) return NextResponse.next();

  if (shouldRedirectMediaTrailingSlash(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    url.search = search;
    return NextResponse.redirect(url, 301);
  }

  const appLocaleMatch = pathname.match(/^\/app\/(ja|en)\/?$/);
  if (appLocaleMatch) {
    const locale = appLocaleMatch[1];
    const headers = new Headers(request.headers);
    headers.set("x-tsurilog-locale", locale);

    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = search;

    const response = NextResponse.rewrite(url, { request: { headers } });
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax" });
    return response;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!isAppLocale(firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath(pathname, defaultLocale);
    return NextResponse.redirect(url);
  }

  const locale = firstSegment;
  const headers = new Headers(request.headers);
  headers.set("x-tsurilog-locale", locale);

  const url = request.nextUrl.clone();
  url.pathname = stripLocaleFromPathname(pathname);
  url.search = search;

  const response = NextResponse.rewrite(url, { request: { headers } });
  response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax" });
  return response;
}

function shouldRedirectMediaTrailingSlash(pathname: string) {
  return /^\/(ja|en)\/media\/.+\/$/.test(pathname);
}

function shouldSkip(pathname: string) {
  return (
    isPublicSeoRoute(pathname) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/firebase-messaging-sw.js") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname)
  );
}

function isPublicSeoRoute(pathname: string) {
  return ["/features", "/pricing", "/install", "/feedback"].includes(pathname.replace(/\/$/, ""));
}

export const config = {
  matcher: ["/((?!_next|api).*)"]
};
