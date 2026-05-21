"use client";

import Link from "next/link";
import { signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseAuth, getFirebaseDb, googleProvider, isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { PageHeader } from "@/components/PageHeader";

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
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
      await setDoc(
        doc(getFirebaseDb(), "users", result.user.uid),
        {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
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
      setMessage("ログインしました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ログインに失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="ログイン" />
      <main className="mx-auto max-w-xl px-4 py-6">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h1 className="text-2xl font-black">Googleログイン</h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">投稿・一覧・分析はログイン済みユーザーだけが利用できます。</p>

          {!isFirebaseConfigured ? (
            <p className="mt-4 rounded bg-orange-50 p-3 text-sm font-bold text-orange-800">
              Firebase設定が不足しています: {missingFirebaseEnv.join(", ")}
            </p>
          ) : user ? (
            <div className="mt-5 space-y-3">
              <p className="rounded bg-foam p-3 text-sm font-bold">{user.displayName ?? user.email} でログイン中です。</p>
              <Link href="/post" className="tap-target flex items-center justify-center rounded bg-water px-5 py-3 font-bold text-white">
                釣果を投稿する
              </Link>
              <button className="tap-target w-full rounded border border-slate-300 px-5 py-3 font-bold" onClick={() => signOut(getFirebaseAuth())}>
                ログアウト
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
                <span>
                  <Link href="/terms" className="text-water underline">
                    利用規約
                  </Link>
                  と
                  <Link href="/privacy" className="text-water underline">
                    プライバシーポリシー
                  </Link>
                  に同意します。
                </span>
              </label>
              <button disabled={busy || !acceptedLegal} onClick={handleLogin} className="tap-target w-full rounded bg-water px-5 py-4 font-black text-white disabled:opacity-60">
                {busy ? "ログイン中..." : "Googleでログイン"}
              </button>
            </div>
          )}

          {message ? <p className="mt-4 rounded bg-foam p-3 text-sm text-slate-700">{message}</p> : null}
        </section>
      </main>
    </>
  );
}
