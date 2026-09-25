import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { getServerLocale } from "@/lib/serverLocale";

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  return createPageMetadata({
    locale,
    title: locale === "en" ? "Log a catch" : "釣果投稿",
    description: locale === "en"
      ? "Record your catch photo, fish, size, time, area, fishing conditions, and tackle with TSURILOGUE."
      : "釣行後すぐに写真、魚種、サイズ、場所を記録。潮位、天候、水温、潮流参照情報も自動で保存できるTSURILOGUEの投稿画面です。",
    path: "/post"
  });
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
