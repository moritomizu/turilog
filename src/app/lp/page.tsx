import { LandingPage } from "@/components/landing/LandingPage";
import { APP_SEO_TITLE } from "@/lib/brand";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: APP_SEO_TITLE,
  description: "TSURILOGUE（釣りローグ）は、釣果・ポイント・潮位・気象条件・タックルをかんたんに記録し、あとから振り返れる釣り人のための釣果記録・釣りログアプリです。",
  path: "/",
  image: "/images/lp/IMG_7885.jpg"
});

export default function Page() {
  return <LandingPage />;
}
