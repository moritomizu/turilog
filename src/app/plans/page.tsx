import { createPageMetadata } from "@/lib/metadata";
import { PlansClient } from "./plans-client";

export const metadata = createPageMetadata({
  title: "プラン | TSURILOGUE（釣りローグ）",
  description: "釣果記録・釣りログアプリTSURILOGUE（釣りローグ）で検討中のPremium、Organizer、Group Proプランと利用できる機能の一覧です。",
  path: "/pricing"
});

export default function PlansPage() {
  return <PlansClient />;
}
