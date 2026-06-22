import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "釣り仲間グループ",
  description: "釣り仲間と釣果一覧、ランキング、釣果マップ、分析を共有。仲間内で日々の投稿が楽しく続くTSURILOGUEグループ機能です。",
  path: "/groups"
});

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
