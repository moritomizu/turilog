import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "釣果マップ",
  description: "釣れた地点を地図で振り返り、魚種、サイズ、潮位、天候、コメントを一緒に確認できるTsuriLogの釣果マップです。",
  path: "/map"
});

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
