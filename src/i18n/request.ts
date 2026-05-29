import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isAppLocale } from "@/lib/i18n";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const headerLocale = headers().get("x-tsurilog-locale") ?? undefined;
  const locale = isAppLocale(requested) ? requested : isAppLocale(headerLocale) ? headerLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
