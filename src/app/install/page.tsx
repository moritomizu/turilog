import { createPageMetadata } from "@/lib/metadata";
import { HowToUseAppContent } from "@/app/how-to-use-app/page";

export const metadata = createPageMetadata({
  title: "釣りローグをスマホアプリのように使う方法 | TSURILOGUE",
  description: "TSURILOGUE（釣りローグ）をスマホのホーム画面に追加して、釣り場でも釣果記録・釣りログをすばやく開く方法を案内します。",
  path: "/ja/install"
});

export default function InstallPage() {
  return <HowToUseAppContent />;
}
