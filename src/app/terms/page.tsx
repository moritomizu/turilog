import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { termsMarkdown } from "@/lib/legal";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "利用規約 | TSURILOGUE",
  description: "TSURILOGUEの利用規約です。",
  path: "/ja/terms"
});

export default function TermsPage() {
  return (
    <>
      <PageHeader title="利用規約" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <LegalDocument markdown={termsMarkdown} />
      </main>
    </>
  );
}
