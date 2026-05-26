import Link from "next/link";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";

export function PageHeader({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-teal-100 bg-foam/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <Link href="/" className="flex min-w-0 items-center justify-self-start text-ink dark:text-white" aria-label="TsuriLog TOP">
          <TsuriLogLogo className="h-9 w-32 max-w-[34vw] sm:h-[3.6rem] sm:w-[13.2rem] sm:max-w-[48vw]" />
        </Link>
        <h1 className="max-w-[32vw] truncate text-center text-sm font-bold text-ink dark:text-white sm:max-w-[44vw]">{title}</h1>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="justify-self-end rounded bg-water px-3 py-2 text-sm font-bold text-white">
            {actionLabel}
          </Link>
        ) : (
          <span className="w-14 justify-self-end" />
        )}
      </div>
    </header>
  );
}
