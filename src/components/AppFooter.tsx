"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getLocaleFromPathname, localizePath, stripLocaleFromPathname } from "@/lib/i18n";

export function AppFooter() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const cleanPathname = stripLocaleFromPathname(pathname);
  const t = useTranslations("common");

  if (cleanPathname.startsWith("/lp")) return null;

  return (
    <footer className="border-t border-teal-100 bg-foam px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:pb-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 text-xs font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("createdBy")}</p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href={localizePath("/terms", locale)} className="text-water">
            {t("terms")}
          </Link>
          <Link href={localizePath("/privacy", locale)} className="text-water">
            {t("privacy")}
          </Link>
          <Link href={localizePath("/plans", locale)} className="text-water">
            {t("plans")}
          </Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </footer>
  );
}
