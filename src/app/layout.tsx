import type { Metadata } from "next";
import { AppFooter } from "@/components/AppFooter";
import { createPageMetadata, getSiteUrl } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "TsuriLog | 心に残る一枚のための釣果ログ",
    template: "%s | TsuriLog"
  },
  ...createPageMetadata({
    title: "TsuriLog | 心に残る一枚のための釣果ログ",
    description: "釣果写真、潮位、水温、天候、タックル、釣り仲間とのグループや大会まで記録して振り返れる個人用釣りログです。",
    path: "/"
  })
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
