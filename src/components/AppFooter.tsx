"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getLocaleFromPathname, localizePath, stripLocaleFromPathname } from "@/lib/i18n";
import { APP_NAME } from "@/lib/brand";

export function AppFooter() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const cleanPathname = stripLocaleFromPathname(pathname);
  const t = useTranslations("common");

  if (cleanPathname.startsWith("/lp")) return null;

  return (
    <footer className="border-t border-teal-100 bg-foam px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:pb-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 text-xs font-bold text-slate-600">
        <div className="max-w-3xl">
          <p className="text-sm font-black text-slate-900">{APP_NAME}</p>
          <p className="mt-2 leading-6">
            TSURILOGUE（釣りローグ）は、釣果記録、潮位・気象データ、AI分析、グループ共有、オンライン釣り大会、釣果デジタル証明を通じて、釣り人の次の1匹を支援する釣りデータプラットフォームです。
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("createdBy")}</p>
          <nav className="flex flex-wrap items-center gap-4">
          <Link href={localizePath("/about", locale)} className="text-water">
            TSURILOGUEとは
          </Link>
          <Link href={localizePath("/media", locale)} className="text-water">
            メディア
          </Link>
          <Link href={localizePath("/features", locale)} className="text-water">
            機能
          </Link>
          <Link href={localizePath("/pricing", locale)} className="text-water">
            料金プラン
          </Link>
          <Link href={localizePath("/terms", locale)} className="text-water">
            {t("terms")}
          </Link>
          <Link href={localizePath("/privacy", locale)} className="text-water">
            {t("privacy")}
          </Link>
          <Link href={localizePath("/plans", locale)} className="text-water">
            {t("plans")}
          </Link>
          <Link href={localizePath("/feedback", locale)} className="text-water">
            ご意見・ご感想
          </Link>
          <Link href={localizePath("/install", locale)} className="text-water">
            ホーム画面に追加する方法
          </Link>
          <LocaleSwitcher />
          </nav>
        </div>
      </div>
    </footer>
  );
}
