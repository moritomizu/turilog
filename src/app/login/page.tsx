"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getFirebaseAuth, getFirebaseDb, googleProvider, isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase";
import { getDefaultUnitSystem } from "@/lib/units";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { getLocaleFromPathname, localizePath } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { captureAcquisitionFromUrl, readAcquisition } from "@/lib/referralTracking";

const EMAIL_LINK_STORAGE_KEY = "tsurilogEmailForSignIn";
const EMAIL_LINK_NAME_STORAGE_KEY = "tsurilogEmailLinkDisplayName";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPathname(pathname);
  const t = useTranslations("login");
  const [user, setUser] = useState<User | null>(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") captureAcquisitionFromUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || typeof window === "undefined") return;
    if (!isSignInWithEmailLink(getFirebaseAuth(), window.location.href)) return;

    const storedEmail = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY) ?? "";
    const inputEmail = storedEmail || window.prompt(locale === "en" ? "Enter the email address you used for login." : "ログインに使ったメールアドレスを入力してください。") || "";
    if (!inputEmail.trim()) {
      setMessage(locale === "en" ? "Email is required for email-link login." : "メールリンク認証にはメールアドレスが必要です。");
      return;
    }

    setBusy(true);
    setMessage(locale === "en" ? "Signing in with your email link." : "メールリンクでログインしています。");
    signInWithEmailLink(getFirebaseAuth(), inputEmail.trim(), window.location.href)
      .then(async (result) => {
        const storedName = window.localStorage.getItem(EMAIL_LINK_NAME_STORAGE_KEY) ?? "";
        if (!result.user.displayName && storedName.trim()) {
          await updateProfile(result.user, { displayName: storedName.trim() });
        }
        await saveUserProfile(result.user, storedName.trim() || undefined);
        window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
        window.localStorage.removeItem(EMAIL_LINK_NAME_STORAGE_KEY);
        setMessage(locale === "en" ? "Signed in with your email link." : "メールリンクでログインしました。");
        goNext();
      })
      .catch((error) => setMessage(getAuthErrorMessage(error)))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin() {
    if (!acceptedLegal) {
      setMessage("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await signInWithPopup(getFirebaseAuth(), googleProvider);
      await saveUserProfile(result.user);
      setMessage("ログインしました。");
      goNext();
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailLogin(mode: "login" | "signup") {
    if (!acceptedLegal) {
      setMessage(locale === "en" ? "Please agree to the Terms and Privacy Policy." : "利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    if (!email.trim() || password.length < 6) {
      setMessage(locale === "en" ? "Enter your email address and a password of at least 6 characters." : "メールアドレスと6文字以上のパスワードを入力してください。");
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      setMessage(locale === "en" ? "Enter a display name to sign up." : "新規登録では表示名を入力してください。");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const auth = getFirebaseAuth();
      const result =
        mode === "signup"
          ? await createUserWithEmailAndPassword(auth, email.trim(), password)
          : await signInWithEmailAndPassword(auth, email.trim(), password);
      if (mode === "signup" && displayName.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() });
      }
      await saveUserProfile(result.user, mode === "signup" ? displayName.trim() : undefined);
      setMessage(mode === "signup" ? (locale === "en" ? "Signed up." : "登録しました。") : locale === "en" ? "Signed in." : "ログインしました。");
      goNext();
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendEmailLink() {
    if (!acceptedLegal) {
      setMessage(locale === "en" ? "Please agree to the Terms and Privacy Policy." : "利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    if (!email.trim()) {
      setMessage(locale === "en" ? "Enter your email address." : "メールアドレスを入力してください。");
      return;
    }

    setBusy(true);
    setMessage(locale === "en" ? "Sending login link." : "ログインリンクを送信しています。");
    try {
      const url = new URL(localizePath("/login", locale), window.location.origin);
      const next = searchParams.get("next");
      if (next?.startsWith("/")) url.searchParams.set("next", next);
      await sendSignInLinkToEmail(getFirebaseAuth(), email.trim(), {
        url: url.toString(),
        handleCodeInApp: true
      });
      window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email.trim());
      if (displayName.trim()) window.localStorage.setItem(EMAIL_LINK_NAME_STORAGE_KEY, displayName.trim());
      setMessage(locale === "en" ? "Login link sent. Open the link in your email to finish." : "ログインリンクを送信しました。メール内のリンクを開くと登録/ログインが完了します。");
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveUserProfile(nextUser: User, overrideName?: string) {
    const acquisition = readAcquisition();
    await setDoc(
      doc(getFirebaseDb(), "users", nextUser.uid),
      {
        uid: nextUser.uid,
        displayName: overrideName ?? nextUser.displayName,
        email: nextUser.email,
        avatarUrl: nextUser.photoURL ?? null,
        preferredLocale: locale,
        unitSystem: getDefaultUnitSystem(locale),
        ...(acquisition ? { acquisition } : {}),
        createdAt: serverTimestamp(),
        termsAccepted: true,
        privacyAccepted: true,
        termsAcceptedAt: serverTimestamp(),
        privacyAcceptedAt: serverTimestamp(),
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION
      },
      { merge: true }
    );
  }

  function goNext() {
    const next = searchParams.get("next");
    if (next?.startsWith("/")) router.push(next);
    else router.push(localizePath("/post", locale));
  }

  return (
    <>
      <PageHeader title={t("title")} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h1 className="text-2xl font-black">{t("heading")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">{t("description")}</p>

          {!isFirebaseConfigured ? (
            <p className="mt-4 rounded bg-orange-50 p-3 text-sm font-bold text-orange-800">
              Firebase設定が不足しています: {missingFirebaseEnv.join(", ")}
            </p>
          ) : user ? (
            <div className="mt-5 space-y-3">
              <p className="rounded bg-foam p-3 text-sm font-bold">{t("loggedIn", { name: user.displayName ?? user.email ?? "TSURILOGUE user" })}</p>
              <Link href={searchParams.get("next") ?? localizePath("/post", locale)} className="tap-target flex items-center justify-center rounded bg-water px-5 py-3 font-bold text-white">
                {searchParams.get("next") ? t("backToInvite") : t("goPost")}
              </Link>
              <button className="tap-target w-full rounded border border-slate-300 px-5 py-3 font-bold" onClick={() => signOut(getFirebaseAuth())}>
                {t("logout")}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="flex items-start gap-3 rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(event) => setAcceptedLegal(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
                />
                <span>{t("termsAgreement")}</span>
              </label>
              <button disabled={busy || !acceptedLegal} onClick={handleLogin} className="tap-target w-full rounded bg-water px-5 py-4 font-black text-white disabled:opacity-60">
                {busy ? t("googleBusy") : t("google")}
              </button>
              <div className="flex items-center gap-3 text-xs font-black text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span>{t("or")}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="space-y-3 rounded border border-teal-100 bg-white p-3">
                <label className="block">
                  <span className="text-sm font-bold">{t("displayName")}</span>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" placeholder="例: TaPiYoTa" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">{t("email")}</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" placeholder="you@example.com" autoComplete="email" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">{t("password")}</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" placeholder={locale === "en" ? "At least 6 characters" : "6文字以上"} autoComplete="current-password" />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" disabled={busy || !acceptedLegal} onClick={() => handleEmailLogin("login")} className="tap-target rounded border border-water bg-white px-5 py-3 font-black text-water disabled:opacity-60">
                    {t("emailLogin")}
                  </button>
                  <button type="button" disabled={busy || !acceptedLegal} onClick={() => handleEmailLogin("signup")} className="tap-target rounded bg-coral px-5 py-3 font-black text-white disabled:opacity-60">
                    {t("emailSignup")}
                  </button>
                </div>
                <p className="text-xs font-bold leading-5 text-slate-500">{t("emailHelp")}</p>
              </div>
              <div className="space-y-3 rounded border border-sky-100 bg-sky-50 p-3">
                <div>
                  <p className="text-sm font-black text-sky-900">{t("emailLinkTitle")}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{t("emailLinkDescription")}</p>
                </div>
                <button type="button" disabled={busy || !acceptedLegal || !email.trim()} onClick={handleSendEmailLink} className="tap-target w-full rounded bg-water px-5 py-3 font-black text-white disabled:opacity-60">
                  {t("sendEmailLink")}
                </button>
              </div>
            </div>
          )}

          {message ? <p className="mt-4 rounded bg-foam p-3 text-sm text-slate-700">{message}</p> : null}
        </section>
      </main>
    </>
  );
}

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "auth/email-already-in-use") return "このメールアドレスはすでに登録されています。ログインをお試しください。";
  if (code === "auth/invalid-email") return "メールアドレスの形式が正しくありません。";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "メールアドレスまたはパスワードが違います。";
  if (code === "auth/weak-password") return "パスワードは6文字以上で設定してください。";
  if (code === "auth/operation-not-allowed") return "メール/パスワード認証がFirebaseで有効になっていません。Firebase Consoleで有効化してください。";
  if (code === "auth/expired-action-code") return "メールリンクの有効期限が切れています。もう一度送信してください。";
  if (code === "auth/invalid-action-code") return "メールリンクが無効です。もう一度送信してください。";
  if (code === "auth/popup-closed-by-user") return "ログイン画面が閉じられました。もう一度お試しください。";
  return error instanceof Error ? error.message : "ログインに失敗しました。";
}

function LoginShell() {
  return (
    <>
      <PageHeader title="Login" />
      <main className="mx-auto max-w-xl px-4 py-6">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-slate-700">Loading...</p>
        </section>
      </main>
    </>
  );
}
