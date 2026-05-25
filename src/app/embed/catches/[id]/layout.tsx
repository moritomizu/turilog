import type { Metadata } from "next";
import { createPageMetadata, getPublicCatchMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getPublicCatchMetadata(params.id).catch(() => null);
  if (!item) {
    return createPageMetadata({
      title: "TsuriLog釣果",
      description: "TsuriLogで公開された釣果を確認できます。釣果写真、サイズ、潮位、水温、タックルを一緒に振り返れる釣りログです。",
      path: `/embed/catches/${params.id}`
    });
  }
  return createPageMetadata({
    title: item.title,
    description: item.description,
    path: `/embed/catches/${params.id}`,
    image: item.image
  });
}

export default function EmbedCatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
