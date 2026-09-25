import type { Metadata, Viewport } from "next";
import { AppFooter } from "@/components/AppFooter";
import { AppTabBar } from "@/components/AppTabBar";
import { ClientIntlProvider } from "@/components/ClientIntlProvider";
import { APP_NAME, APP_NAME_JA, APP_SEO_TITLE } from "@/lib/brand";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";
import { getServerLocale } from "@/lib/serverLocale";
import "./globals.css";

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  const isEnglish = locale === "en";

  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: isEnglish ? APP_NAME : `${APP_NAME}（${APP_NAME_JA}）`,
    manifest: "/manifest.json",
    title: {
      default: isEnglish ? "TSURILOGUE | Catch. Log. Share." : APP_SEO_TITLE,
      template: `%s | ${APP_NAME}`
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icons/search-icon.svg", sizes: "512x512", type: "image/svg+xml" },
        { url: "/icons/tsurilog-icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/tsurilog-icon.png", sizes: "512x512", type: "image/png" }
      ],
      shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
    },
    appleWebApp: {
      capable: true,
      title: APP_NAME,
      statusBarStyle: "default"
    },
    formatDetection: {
      telephone: false
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": APP_NAME,
      "apple-mobile-web-app-status-bar-style": "default"
    },
    ...createPageMetadata({
      locale,
      title: isEnglish ? "TSURILOGUE | Catch. Log. Share." : APP_SEO_TITLE,
      description: isEnglish
        ? "Keep your fishing memories in one place. Log catches and fishing conditions, create share-ready images, and share your catch with TSURILOGUE."
        : "TSURILOGUE（釣りローグ）は、釣果写真、潮位、水温、天候、タックル、ポイントをかんたんに記録し、あとから振り返れる釣果記録・釣りログアプリです。",
      path: "/"
    })
  };
}

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
  const locale = getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script src="https://analytics.ahrefs.com/analytics.js" data-key="cJZ2ML3DPpFOZkZrRe5pyA" async />
      </head>
      <body className="min-h-screen bg-foam text-ink">
        <ClientIntlProvider locale={locale}>
          {children}
          <AppTabBar />
          <AppFooter />
        </ClientIntlProvider>
      </body>
    </html>
  );
}
