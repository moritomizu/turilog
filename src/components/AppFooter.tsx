"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { TsuriLogLogo } from "@/components/TsuriLogLogo";
import { getLocaleFromPathname, localizePath, stripLocaleFromPathname } from "@/lib/i18n";
import { APP_NAME } from "@/lib/brand";

export function AppFooter() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const cleanPathname = stripLocaleFromPathname(pathname);
  const t = useTranslations("common");

  if (cleanPathname.startsWith("/lp")) return null;

  return (
    <footer className="border-t border-teal-100 bg-white px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 sm:pb-10 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-5xl gap-6 text-xs font-bold text-slate-600 sm:grid-cols-[1.15fr_1fr] sm:items-start dark:text-slate-300">
        <div className="max-w-3xl">
          <Link href={localizePath("/", locale)} aria-label={`${APP_NAME} TOP`} className="inline-flex">
            <TsuriLogLogo className="h-9 w-36 object-contain dark:brightness-0 dark:invert" />
          </Link>
          <p className="mt-3 leading-6">
            {t("footerDescription")}
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:justify-end">
            <Link href={localizePath("/about", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("about")}
            </Link>
            <Link href={localizePath("/media", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("media")}
            </Link>
            <Link href={localizePath("/features", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("features")}
            </Link>
            <Link href={localizePath("/pricing", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("pricing")}
            </Link>
            <Link href={localizePath("/plans", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("plans")}
            </Link>
            <Link href={localizePath("/feedback", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("feedback")}
            </Link>
            <Link href={localizePath("/install", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("install")}
            </Link>
            <Link href={localizePath("/terms", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("terms")}
            </Link>
            <Link href={localizePath("/privacy", locale)} className="text-water hover:text-teal-900 dark:text-cyan-200">
              {t("privacy")}
            </Link>
          </nav>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <LocaleSwitcher compact />
            <p>{t("createdBy")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
