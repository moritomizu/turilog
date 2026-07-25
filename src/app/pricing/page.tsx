import { createPageMetadata } from "@/lib/metadata";
import { PlansClient } from "@/app/plans/plans-client";

export const metadata = createPageMetadata({
  title: "料金プラン | TSURILOGUE",
  description: "TSURILOGUEで利用できるFree、Premium、Organizer、Group Proプランの機能と料金を確認できます。",
  path: "/ja/pricing"
});

export default function PricingPage() {
  return <PlansClient />;
}
