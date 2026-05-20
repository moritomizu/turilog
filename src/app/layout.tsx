import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
