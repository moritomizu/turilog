import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "ログイン",
  description: "Googleログイン、メールアドレスログイン、メールリンク認証でTsuriLogに参加。釣果を記録して振り返りましょう。",
  path: "/login"
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
