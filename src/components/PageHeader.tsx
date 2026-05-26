import Link from "next/link";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";

export function PageHeader({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-teal-100 bg-foam/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center text-ink dark:text-white" aria-label="TsuriLog TOP">
          <TsuriLogLogo className="h-12 w-44" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold text-ink dark:text-white">{title}</h1>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="rounded bg-water px-3 py-2 text-sm font-bold text-white">
            {actionLabel}
          </Link>
        ) : (
          <span className="w-14" />
        )}
      </div>
    </header>
  );
}
