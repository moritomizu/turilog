"use client";

import { NextIntlClientProvider } from "next-intl";
import type { AppLocale } from "@/lib/i18n";
import enMessages from "../../messages/en.json";
import jaMessages from "../../messages/ja.json";

export function ClientIntlProvider({ children, locale }: { children: React.ReactNode; locale: AppLocale }) {
  const messages = locale === "en" ? enMessages : jaMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
