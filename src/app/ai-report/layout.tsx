import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "AI釣果レポートβ",
  description: "釣果データから、時間帯・潮位・エリア・タックル傾向を参考分析し、次回釣行のヒントを提案するAIレポートです。",
  path: "/ai-report"
});

export default function AiReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
