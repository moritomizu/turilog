import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { AppFooter } from "@/components/AppFooter";
import { AppTabBar } from "@/components/AppTabBar";
import { APP_NAME, APP_NAME_JA, APP_SEO_TITLE } from "@/lib/brand";
import { defaultLocale, isAppLocale } from "@/lib/i18n";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";
import enMessages from "../../messages/en.json";
import jaMessages from "../../messages/ja.json";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: `${APP_NAME}（${APP_NAME_JA}）`,
  manifest: "/manifest.json",
  title: {
    default: APP_SEO_TITLE,
    template: `%s | ${APP_NAME}`
  },
  icons: {
    icon: [
      { url: "/icons/tsurilog-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/tsurilog-icon.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME_JA,
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": APP_NAME_JA,
    "apple-mobile-web-app-status-bar-style": "default"
  },
  ...createPageMetadata({
    title: APP_SEO_TITLE,
    description: "TSURILOGUE（釣りローグ）は、釣果写真、潮位、水温、天候、タックル、ポイントをかんたんに記録し、あとから振り返れる釣果記録・釣りログアプリです。",
    path: "/ja"
  })
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f766e"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerLocale = headers().get("x-tsurilog-locale") ?? undefined;
  const locale = isAppLocale(headerLocale) ? headerLocale : defaultLocale;
  const messages = locale === "en" ? enMessages : jaMessages;

  return (
    <html lang={locale}>
      <head>
        <script src="https://analytics.ahrefs.com/analytics.js" data-key="cJZ2ML3DPpFOZkZrRe5pyA" async />
      </head>
      <body className="min-h-screen bg-foam text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <AppTabBar />
          <AppFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
