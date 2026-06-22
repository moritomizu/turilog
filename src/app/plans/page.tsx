import type { Metadata } from "next";
import { PlansClient } from "./plans-client";

export const metadata: Metadata = {
  title: "プラン | TSURILOGUE",
  description: "TSURILOGUEで検討中のPremium、Organizer、Group Proプランと利用できる機能の一覧です。"
};

export default function PlansPage() {
  return <PlansClient />;
}
