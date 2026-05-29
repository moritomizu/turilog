export const locales = ["ja", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "ja";

export function isAppLocale(value: string | undefined): value is AppLocale {
  return value === "ja" || value === "en";
}

export function getLocaleFromPathname(pathname: string): AppLocale {
  const first = pathname.split("/").filter(Boolean)[0];
  return isAppLocale(first) ? first : defaultLocale;
}

export function stripLocaleFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (isAppLocale(parts[0])) {
    const stripped = `/${parts.slice(1).join("/")}`;
    return stripped === "/" ? "/" : stripped.replace(/\/$/, "") || "/";
  }
  return pathname || "/";
}

export function localizePath(pathname: string, locale: AppLocale) {
  const clean = stripLocaleFromPathname(pathname);
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
