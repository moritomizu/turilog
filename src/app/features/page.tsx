import { LandingPage } from "@/components/landing/LandingPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "機能 | TSURILOGUE",
  description: "TSURILOGUEの釣果記録、AI分析、グループ共有、オンライン釣り大会、釣果デジタル証明、ポイント保護機能を紹介します。",
  path: "/features",
  image: "/images/lp/IMG_7885.jpg"
});

export default function FeaturesPage() {
  return <LandingPage />;
}
