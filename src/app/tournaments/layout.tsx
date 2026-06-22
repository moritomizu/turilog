import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "釣り大会",
  description: "期間中の釣果投稿でランキングを競えるTSURILOGUEの釣り大会機能。最大サイズ、合計サイズ、匹数勝負に対応しています。",
  path: "/tournaments"
});

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
