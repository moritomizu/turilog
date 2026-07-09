"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserCatches } from "@/lib/catches";
import { getLocaleFromPathname, localizePath } from "@/lib/i18n";

const DISMISS_DAYS = 7;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;

export function PwaInstallBanner({ userId }: { userId: string }) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (isStandaloneMode()) {
      setVisible(false);
      return;
    }

    const dismissedUntil = Number(window.localStorage.getItem(getDismissKey(userId)) ?? 0);
    if (Number.isFinite(dismissedUntil) && dismissedUntil > Date.now()) {
      setVisible(false);
      return;
    }

    const loginCount = incrementLoginCountOncePerSession(userId);
    getUserCatches(userId)
      .then((items) => {
        setVisible(items.length >= 1 || loginCount >= 3);
      })
      .catch(() => {
        setVisible(loginCount >= 3);
      });
  }, [userId]);

  if (!visible) return null;

  return (
    <section className="mb-4 rounded border border-teal-100 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] shadow-sm ring-1 ring-slate-200" aria-hidden="true">
          <Image
            src="/icons/tsurilog-icon-192.png"
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-ink">釣りローグをアプリのように使えます</h2>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                ホーム画面に追加すると、釣り場でもすぐ起動できます。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(getDismissKey(userId), String(Date.now() + DISMISS_MS));
                setVisible(false);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="PWA利用促進バナーを閉じる"
            >
              ×
            </button>
          </div>
          <Link href={localizePath("/how-to-use-app", locale)} className="tap-target mt-3 inline-flex items-center justify-center rounded bg-water px-4 py-2 text-sm font-black text-white">
            追加方法を見る
          </Link>
        </div>
      </div>
    </section>
  );
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function incrementLoginCountOncePerSession(userId: string) {
  const sessionKey = `tsurilog:pwa-login-counted:${userId}`;
  const countKey = `tsurilog:pwa-login-count:${userId}`;
  const current = Number(window.localStorage.getItem(countKey) ?? 0);
  if (window.sessionStorage.getItem(sessionKey) === "1") {
    return Number.isFinite(current) ? current : 0;
  }
  const next = (Number.isFinite(current) ? current : 0) + 1;
  window.localStorage.setItem(countKey, String(next));
  window.sessionStorage.setItem(sessionKey, "1");
  return next;
}

function getDismissKey(userId: string) {
  return `tsurilog:pwa-install-dismissed-until:${userId}`;
}
