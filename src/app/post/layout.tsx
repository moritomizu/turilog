import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "釣果投稿",
  description: "釣行後すぐに写真、魚種、サイズ、場所を記録。潮位、天候、水温、潮流参照情報も自動で保存できるTsuriLogの投稿画面です。",
  path: "/post"
});

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
