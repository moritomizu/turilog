"use client";

import Link from "next/link";
import { signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseAuth, getFirebaseDb, googleProvider, isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase";
import { PageHeader } from "@/components/PageHeader";

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);

  async function handleLogin() {
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
          createdAt: serverTimestamp()
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
            <button disabled={busy} onClick={handleLogin} className="tap-target mt-5 w-full rounded bg-water px-5 py-4 font-black text-white disabled:opacity-60">
              {busy ? "ログイン中..." : "Googleでログイン"}
            </button>
          )}

          {message ? <p className="mt-4 rounded bg-foam p-3 text-sm text-slate-700">{message}</p> : null}
        </section>
      </main>
    </>
  );
}
