import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { privacyMarkdown } from "@/lib/legal";

export const metadata: Metadata = {
  title: "プライバシーポリシー | TsuriLog",
  description: "TsuriLogのプライバシーポリシーです。"
};

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
