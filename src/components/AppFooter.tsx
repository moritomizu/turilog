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
  const isMediaPath = cleanPathname === "/media" || cleanPathname.startsWith("/media/");
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
            {isMediaPath
              ? "TSURILOGUE Mediaは、釣果記録や釣行の振り返りに役立つ情報を届ける公式メディアです。"
              : t("footerDescription")}
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:justify-end">
            {locale === "en" ? (
              <>
                <FooterLink href="/en">Home</FooterLink>
                <FooterLink href="/en/features">{t("features")}</FooterLink>
                <FooterLink href="/en/signup">{t("signup")}</FooterLink>
                <FooterLink href="/en/login">{t("login")}</FooterLink>
                <FooterLink href="/ja/terms">Terms (Japanese)</FooterLink>
                <FooterLink href="/ja/privacy">Privacy Policy (Japanese)</FooterLink>
              </>
            ) : (
              <>
                <FooterLink href="/ja/about">{t("about")}</FooterLink>
                <FooterLink href="/ja/media">{t("media")}</FooterLink>
                <FooterLink href="/ja/features">{t("features")}</FooterLink>
                <FooterLink href="/ja/pricing">{t("pricing")}</FooterLink>
                <FooterLink href="/ja/plans">{t("plans")}</FooterLink>
                <FooterLink href="/ja/feedback">{t("feedback")}</FooterLink>
                <FooterLink href="/ja/install">{t("install")}</FooterLink>
                <FooterLink href="/ja/terms">{t("terms")}</FooterLink>
                <FooterLink href="/ja/privacy">{t("privacy")}</FooterLink>
              </>
            )}
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

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-water hover:text-teal-900 dark:text-cyan-200">{children}</Link>;
}
