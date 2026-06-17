"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { getLocaleFromPathname, localizePath, stripLocaleFromPathname } from "@/lib/i18n";

const tabs = [
  { href: "/catches", labelKey: "catches", icon: ListIcon },
  { href: "/ranking", labelKey: "ranking", icon: TrophyIcon },
  { href: "/post", labelKey: "post", icon: PlusIcon },
  { href: "/map", labelKey: "map", icon: PinIcon },
  { href: "/analysis", labelKey: "analysis", icon: ChartIcon }
];

const hiddenPrefixes = ["/embed", "/login", "/lp", "/post", "/catches/"];

export function AppTabBar() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const cleanPathname = stripLocaleFromPathname(pathname);
  const t = useTranslations("menu");
  if (hiddenPrefixes.some((prefix) => cleanPathname.startsWith(prefix))) return null;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-teal-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,118,110,0.08)] backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {tabs.map((tab) => {
            const active = cleanPathname === tab.href || (tab.href !== "/post" && cleanPathname.startsWith(`${tab.href}/`));
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={localizePath(tab.href, locale)} className={`tap-target flex flex-col items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] font-black ${active ? "bg-foam text-water" : "text-slate-500"}`} aria-current={active ? "page" : undefined}>
                <Icon className="h-5 w-5" />
                <span>{t(tab.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="h-20" aria-hidden="true" />
    </>
  );
}

function PlusIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ListIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function TrophyIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 12v5M9 20h6M10 17h4" />
    </svg>
  );
}

function PinIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function ChartIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16v-5M12 16V8M16 16v-7" />
    </svg>
  );
}
