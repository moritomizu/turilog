import { createPageMetadata } from "@/lib/metadata";
import { HowToUseAppContent } from "@/app/how-to-use-app/page";

export const metadata = createPageMetadata({
  title: "スマホアプリのように使う方法 | TSURILOGUE",
  description: "TSURILOGUEをスマホのホーム画面に追加して、釣り場でもアプリのようにすばやく起動する方法を案内します。",
  path: "/install"
});

export default function InstallPage() {
  return <HowToUseAppContent />;
}
