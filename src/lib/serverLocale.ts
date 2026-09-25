import "server-only";

import { headers } from "next/headers";
import { defaultLocale, isAppLocale, type AppLocale } from "@/lib/i18n";

export function getServerLocale(): AppLocale {
  const locale = headers().get("x-tsurilog-locale") ?? undefined;
  return isAppLocale(locale) ? locale : defaultLocale;
}

export function getServerPathname(): string {
  return headers().get("x-tsurilog-pathname") ?? "/";
}
