import type { Metadata } from "next";
import { createPageMetadata, getPublicCatchMetadata } from "@/lib/metadata";
import { getServerLocale } from "@/lib/serverLocale";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const locale = getServerLocale();
  const item = await getPublicCatchMetadata(params.id, locale).catch(() => null);
  if (!item) {
    return createPageMetadata({
      locale,
      title: locale === "en" ? "TSURILOGUE Catch" : "TSURILOGUE釣果",
      description: locale === "en" ? "View a catch shared from TSURILOGUE." : "TSURILOGUEで公開された釣果を確認できます。釣果写真、サイズ、潮位、水温、タックルを一緒に振り返れる釣りログです。",
      path: `/embed/catches/${params.id}`
    });
  }
  return createPageMetadata({
    locale,
    title: item.title,
    description: item.description,
    path: `/embed/catches/${params.id}`,
    image: item.image
  });
}

export default function EmbedCatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
