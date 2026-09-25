import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { getServerLocale } from "@/lib/serverLocale";

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  return createPageMetadata({
    locale,
    title: locale === "en" ? "Log in or sign up" : "ログイン",
    description: locale === "en"
      ? "Log in or create a TSURILOGUE account to record catches, review fishing conditions, and share your fishing memories."
      : "Googleログイン、メールアドレスログイン、メールリンク認証でTSURILOGUEに参加。釣果を記録して振り返りましょう。",
    path: "/login"
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
