import { LandingPage } from "@/components/landing/LandingPage";
import { createPageMetadata } from "@/lib/metadata";
import { getServerLocale } from "@/lib/serverLocale";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  return createPageMetadata({
    locale,
    alternateLocales: ["ja", "en"],
    title: locale === "en" ? "Fishing log features" : "機能 | TSURILOGUE（釣りローグ）",
    description: locale === "en"
      ? "Explore TSURILOGUE features for logging catches, fishing conditions and tackle, protecting exact fishing spots, and creating share-ready catch images."
      : "TSURILOGUE（釣りローグ）の釣果記録、釣りログ、AI分析、グループ共有、オンライン釣り大会、釣果デジタル証明、ポイント保護機能を紹介します。",
    path: "/features",
    image: "/images/lp/IMG_7885.jpg"
  });
}

export default function FeaturesPage() {
  return <LandingPage />;
}
