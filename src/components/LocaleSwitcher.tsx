"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { getLocaleFromPathname, localizePath, type AppLocale } from "@/lib/i18n";
import { saveUserProfileData } from "@/lib/userProfiles";

const labels: Record<AppLocale, string> = {
  ja: "日本語",
  en: "English"
};

export function LocaleSwitcher({ compact = false, className = "" }: { compact?: boolean; className?: string } = {}) {
  const pathname = usePathname();
  const currentLocale = getLocaleFromPathname(pathname);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), (user) => setUserId(user?.uid ?? null));
  }, []);

  async function rememberLocale(locale: AppLocale) {
    if (!userId) return;
    await saveUserProfileData(userId, { preferredLocale: locale }).catch(() => undefined);
  }

  return (
    <div className={`flex items-center gap-1 rounded-full bg-white p-1 shadow-soft ring-1 ring-teal-100 ${className}`} aria-label="言語切替">
      {(["ja", "en"] as const).map((locale) => (
        <Link
          key={locale}
          href={localizePath(pathname, locale)}
          onClick={() => rememberLocale(locale)}
          className={`rounded-full ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"} font-black ${currentLocale === locale ? "bg-water text-white" : "text-slate-600"}`}
          aria-current={currentLocale === locale ? "true" : undefined}
        >
          {compact ? locale.toUpperCase() : labels[locale]}
        </Link>
      ))}
    </div>
  );
}
