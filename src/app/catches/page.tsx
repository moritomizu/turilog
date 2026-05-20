"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { getUserCatches } from "@/lib/catches";
import type { Catch } from "@/types";

export default function CatchesPage() {
  return (
    <AuthGate>
      {(user) => <CatchList userId={user.uid} />}
    </AuthGate>
  );
}

function CatchList({ userId }: { userId: string }) {
  const [items, setItems] = useState<Catch[]>([]);
  const [message, setMessage] = useState("読み込み中です。");

  useEffect(() => {
    getUserCatches(userId)
      .then((result) => {
        setItems(result);
        setMessage(result.length ? "" : "まだ釣果がありません。最初の一匹を投稿しましょう。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "釣果を読み込めませんでした。"));
  }, [userId]);

  return (
    <>
      <PageHeader title="釣果一覧" actionHref="/post" actionLabel="投稿" />
      <main className="mx-auto max-w-5xl px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CatchCard key={item.id} item={item} />
          ))}
        </div>
      </main>
    </>
  );
}
