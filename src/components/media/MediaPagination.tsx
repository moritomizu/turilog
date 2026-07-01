import Link from "next/link";
import type { WpPagination } from "@/lib/wordpress";

export function MediaPagination({ pagination, basePath }: { pagination: WpPagination; basePath: string }) {
  if (pagination.totalPages <= 1) return null;

  const current = Math.max(1, pagination.page);
  const previous = current > 1 ? current - 1 : null;
  const next = pagination.hasNextPage ? current + 1 : null;

  return (
    <nav className="flex items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white p-3 text-sm font-black shadow-sm">
      {previous ? (
        <Link href={withPage(basePath, previous)} className="rounded-full border border-teal-200 px-4 py-2 text-[#0f766e]">
          前へ
        </Link>
      ) : (
        <span className="rounded-full border border-slate-100 px-4 py-2 text-slate-300">前へ</span>
      )}
      <span className="text-slate-600">
        {current} / {pagination.totalPages}
      </span>
      {next ? (
        <Link href={withPage(basePath, next)} className="rounded-full bg-[#0f766e] px-4 py-2 text-white">
          次へ
        </Link>
      ) : (
        <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-300">次へ</span>
      )}
    </nav>
  );
}

function withPage(basePath: string, page: number) {
  if (page <= 1) return basePath;
  return `${basePath}?page=${page}`;
}
