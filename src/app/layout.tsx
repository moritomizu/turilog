import type { Metadata } from "next";
import { AppFooter } from "@/components/AppFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "TsuriLog",
  description: "個人用の釣果ログWebアプリ"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-foam dark:bg-slate-950 dark:text-slate-100">
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
