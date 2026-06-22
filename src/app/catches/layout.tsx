import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "釣果一覧",
  description: "釣った魚、サイズ、写真、潮位、水温、タックル、釣果ポイントを新着順で見返せるTSURILOGUEの釣果一覧です。",
  path: "/catches"
});

export default function CatchesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
