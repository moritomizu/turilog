import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { AppFooter } from "@/components/AppFooter";
import { AppTabBar } from "@/components/AppTabBar";
import { defaultLocale, isAppLocale } from "@/lib/i18n";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";
import enMessages from "../../messages/en.json";
import jaMessages from "../../messages/ja.json";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: "TSURILOGUE",
  manifest: "/manifest.json",
  title: {
    default: "TSURILOGUE | 心に残る一枚のための釣果ログ",
    template: "%s | TSURILOGUE"
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
    title: "TSURILOGUE",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "TSURILOGUE",
    "apple-mobile-web-app-status-bar-style": "default"
  },
  ...createPageMetadata({
    title: "TSURILOGUE | 心に残る一枚のための釣果ログ",
    description: "釣果写真、潮位、水温、天候、タックル、釣り仲間とのグループや大会まで記録して振り返れる個人用釣りログです。",
    path: "/"
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
