import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t border-teal-100 bg-foam px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 text-xs font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>created by TaPiYoTa</p>
        <nav className="flex gap-4">
          <Link href="/terms" className="text-water">
            利用規約
          </Link>
          <Link href="/privacy" className="text-water">
            プライバシーポリシー
          </Link>
          <Link href="/plans" className="text-water">
            プラン
          </Link>
        </nav>
      </div>
    </footer>
  );
}
