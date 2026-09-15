"use client";

import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/lib/i18n";
import enMessages from "../../messages/en.json";
import jaMessages from "../../messages/ja.json";

export function ClientIntlProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const messages = locale === "en" ? enMessages : jaMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
