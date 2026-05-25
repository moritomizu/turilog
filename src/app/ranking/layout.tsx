import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "釣果ランキング",
  description: "年間最大サイズ、魚種別最大サイズ、月別最大サイズを見返して、自分の釣果記録を楽しく伸ばせるランキング画面です。",
  path: "/ranking"
});

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
