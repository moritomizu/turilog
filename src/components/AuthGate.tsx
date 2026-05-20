"use client";

import Link from "next/link";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase";

export function AuthGate({ children }: { children: (user: FirebaseUser) => React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (!isFirebaseConfigured) {
    return <Notice title="Firebase設定が必要です" message={`${missingFirebaseEnv.join(", ")} を .env.local に設定してください。`} />;
  }

  if (loading) return <Notice title="確認中" message="ログイン状態を確認しています。" />;

  if (!user) {
    return (
      <Notice title="ログインしてください" message="釣果ログはログイン済みユーザーだけが利用できます。">
        <Link className="tap-target mt-4 inline-flex w-full items-center justify-center rounded bg-water px-5 py-3 font-bold text-white" href="/login">
          Googleでログインへ
        </Link>
      </Notice>
    );
  }

  return <>{children(user)}</>;
}

function Notice({ title, message, children }: { title: string; message: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-8">
      <section className="w-full rounded border border-teal-100 bg-white p-5 shadow-soft">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">{message}</p>
        {children}
      </section>
    </main>
  );
}
