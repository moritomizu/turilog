import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { privacyMarkdown } from "@/lib/legal";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "プライバシーポリシー | TSURILOGUE",
  description: "TSURILOGUEのプライバシーポリシーです。",
  path: "/ja/privacy"
});

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="プライバシーポリシー" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <LegalDocument markdown={privacyMarkdown} />
      </main>
    </>
  );
}
