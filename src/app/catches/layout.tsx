import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { getServerLocale } from "@/lib/serverLocale";

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  return createPageMetadata({
    locale,
    title: locale === "en" ? "Catch log" : "釣果一覧",
    description: locale === "en"
      ? "Review your catches, photos, sizes, fishing conditions, tackle, and fishing areas in your TSURILOGUE catch log."
      : "釣った魚、サイズ、写真、潮位、水温、タックル、釣果ポイントを新着順で見返せるTSURILOGUEの釣果一覧です。",
    path: "/catches"
  });
}

export default function CatchesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
