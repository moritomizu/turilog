"use client";

import { useEffect, useState } from "react";
import { CatchCard } from "@/components/CatchCard";
import { getPublicCatch } from "@/lib/catches";
import { isFirebaseConfigured, missingFirebaseEnv } from "@/lib/firebase";
import type { Catch } from "@/types";

export default function EmbedCatchPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<Catch | null>(null);
  const [message, setMessage] = useState("釣果を読み込んでいます。");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setMessage(`Firebase設定が不足しています: ${missingFirebaseEnv.join(", ")}`);
      return;
    }

    getPublicCatch(params.id)
      .then((result) => {
        setItem(result);
        setMessage(result ? "" : "この釣果は公開されていないか、見つかりませんでした。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "釣果を読み込めませんでした。"));
  }, [params.id]);

  return (
    <main className="min-h-screen bg-foam p-3">
      <div className="mx-auto max-w-md">
        {item ? <CatchCard item={item} /> : <Notice message={message} />}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 block rounded bg-white px-3 py-2 text-center text-xs font-black text-water shadow-soft"
        >
          TsuriLog
        </a>
      </div>
    </main>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <section className="rounded border border-teal-100 bg-white p-4 text-sm font-bold leading-6 text-slate-700 shadow-soft">
      {message}
    </section>
  );
}
