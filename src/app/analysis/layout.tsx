import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "潮位分析",
  description: "上げ潮、下げ潮、潮の何分目、魚種別傾向、サイズ傾向を表で振り返れるTSURILOGUEの釣果分析画面です。",
  path: "/analysis"
});

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
