import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "ご意見・ご感想 | TSURILOGUE",
  description: "TSURILOGUEへのご意見、不具合報告、改善要望、追加してほしい機能を送信できます。",
  path: "/ja/feedback"
});

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
