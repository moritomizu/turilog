import { LandingPage } from "@/components/landing/LandingPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "釣りローグ｜釣果記録・釣り大会・AI分析アプリ",
  description: "釣りローグは、釣果・ポイント・潮位・気象条件・タックルをかんたんに記録し、あとから振り返れる釣り人のためのパーソナル釣果ログです。",
  path: "/",
  image: "/images/lp/IMG_7885.jpg"
});

export default function Page() {
  return <LandingPage />;
}
