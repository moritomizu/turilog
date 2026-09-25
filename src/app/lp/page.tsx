import { LandingPage } from "@/components/landing/LandingPage";
import type { Metadata } from "next";
import { APP_SEO_TITLE } from "@/lib/brand";
import { createPageMetadata } from "@/lib/metadata";
import { getServerLocale } from "@/lib/serverLocale";

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  return createPageMetadata({
    locale,
    title: locale === "en" ? "Catch. Log. Share." : APP_SEO_TITLE,
    description: locale === "en"
      ? "Log your catches and fishing conditions, keep your fishing memories, and create beautiful images ready to share."
      : "TSURILOGUE（釣りローグ）は、釣果・ポイント・潮位・気象条件・タックルをかんたんに記録し、あとから振り返れる釣り人のための釣果記録・釣りログアプリです。",
    path: "/lp",
    image: "/images/lp/IMG_7885.jpg"
  });
}

export default function Page() {
  return <LandingPage />;
}
