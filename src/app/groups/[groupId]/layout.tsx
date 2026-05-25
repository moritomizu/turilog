import type { Metadata } from "next";
import { createPageMetadata, getGroupMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: { groupId: string } }): Promise<Metadata> {
  const group = await getGroupMetadata(params.groupId).catch(() => null);
  return createPageMetadata({
    title: group?.title ?? "TsuriLogグループ",
    description: group?.description ?? "釣り仲間と釣果一覧、ランキング、釣果マップ、分析を共有できるTsuriLogグループです。",
    path: `/groups/${params.groupId}`,
    image: `/groups/${params.groupId}/opengraph-image`
  });
}

export default function GroupDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
