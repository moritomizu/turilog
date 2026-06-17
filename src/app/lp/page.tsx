import { LandingPage } from "@/components/landing/LandingPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "ツリログ｜釣果記録・釣り大会・AI分析アプリ",
  description: "ツリログは、釣果記録・オンライン釣り大会・グループ共有・AI分析をひとつにした釣り人向け釣果データプラットフォームです。",
  path: "/lp",
  image: "/icons/tsurilog-icon.png"
});

export default function Page() {
  return <LandingPage />;
}
