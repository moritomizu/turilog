import type { Metadata, Viewport } from "next";
import { AppFooter } from "@/components/AppFooter";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: "TsuriLog",
  manifest: "/manifest.json",
  title: {
    default: "TsuriLog | 心に残る一枚のための釣果ログ",
    template: "%s | TsuriLog"
  },
  icons: {
    icon: [
      { url: "/icons/tsurilog-icon.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/tsurilog-icon.png", sizes: "512x512", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    title: "TsuriLog",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "TsuriLog",
    "apple-mobile-web-app-status-bar-style": "default"
  },
  ...createPageMetadata({
    title: "TsuriLog | 心に残る一枚のための釣果ログ",
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
  return (
    <html lang="ja">
      <body className="min-h-screen bg-foam text-ink">
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
