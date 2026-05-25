"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { TackleFormFields, emptyTackleInput } from "@/components/TackleFormFields";
import { createTackle, deleteTackle, getUserTackles, updateTackle, type TackleInput } from "@/lib/tackles";
import type { Tackle } from "@/types";

export default function TacklesPage() {
  return <AuthGate skipOnboardingCheck>{(user) => <TackleManager userId={user.uid} />}</AuthGate>;
}

function TackleManager({ userId }: { userId: string }) {
  const [items, setItems] = useState<Tackle[]>([]);
  const [form, setForm] = useState<TackleInput>(emptyTackleInput());
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);

  async function load() {
    const next = await getUserTackles(userId);
    setItems(next);
    setMessage(next.length ? "" : "登録済みタックルはまだありません。");
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "タックルを読み込めませんでした。"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleSave() {
    if (!form.name.trim()) {
      setMessage("タックルセット名を入力してください。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (editingId) {
        await updateTackle(editingId, form);
        setMessage("タックルを更新しました。");
      } else {
        await createTackle(userId, form);
        setMessage("タックルを登録しました。");
      }
      setForm(emptyTackleInput());
      setEditingId("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: Tackle) {
    if (!window.confirm(`${item.name} を削除しますか？`)) return;
    setBusy(true);
    try {
      await deleteTackle(item.id);
      setMessage("タックルを削除しました。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "削除できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: Tackle) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      fishingGenre: item.fishingGenre ?? "",
      rod: item.rod ?? "",
      reel: item.reel ?? "",
      line: item.line ?? "",
      leader: item.leader ?? "",
      lure: item.lure ?? "",
      memo: item.memo ?? "",
      isDefault: item.isDefault === true
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <PageHeader title="タックル管理" actionHref="/profile" actionLabel="プロフィール" />
      <main className="mx-auto max-w-xl space-y-5 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h1 className="text-2xl font-black">タックル管理</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">よく使うタックルを登録しておくと、釣果投稿時に選ぶだけでロッド・リール・ラインなどを記録できます。</p>
        </section>

        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-black">{editingId ? "タックルを編集" : "新しいタックルを登録"}</h2>
          <TackleFormFields value={form} onChange={setForm} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button disabled={busy} onClick={handleSave} className="tap-target rounded bg-water px-5 py-3 font-black text-white disabled:opacity-50">
              {busy ? "保存中..." : editingId ? "更新する" : "登録する"}
            </button>
            <button type="button" onClick={() => { setEditingId(""); setForm(emptyTackleInput()); }} className="tap-target rounded border border-slate-300 bg-white px-5 py-3 font-black text-slate-700">
              入力をクリア
            </button>
          </div>
        </section>

        {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}

        <section className="space-y-3">
          <h2 className="text-xl font-black">登録済みタックル</h2>
          {items.map((item) => (
            <article key={item.id} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-ink">{item.name}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-600">{[item.fishingGenre, item.lure].filter(Boolean).join(" / ") || "ジャンル未設定"}</p>
                </div>
                {item.isDefault ? <span className="rounded-full bg-water px-2 py-1 text-xs font-black text-white">よく使う</span> : null}
              </div>
              <div className="mt-3 space-y-1 text-sm font-bold text-slate-700">
                {item.rod ? <p>ロッド: {item.rod}</p> : null}
                {item.reel ? <p>リール: {item.reel}</p> : null}
                {item.line || item.leader ? <p>ライン: {[item.line, item.leader].filter(Boolean).join(" / ")}</p> : null}
                {item.memo ? <p className="whitespace-pre-wrap text-slate-600">{item.memo}</p> : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => startEdit(item)} className="tap-target rounded border border-water bg-white px-4 py-3 font-black text-water">編集</button>
                <button type="button" disabled={busy} onClick={() => handleDelete(item)} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 font-black text-slate-500 disabled:opacity-50">削除</button>
              </div>
            </article>
          ))}
        </section>

        <Link href="/post" className="tap-target flex items-center justify-center rounded bg-coral px-5 py-3 font-black text-white">
          釣果投稿へ
        </Link>
      </main>
    </>
  );
}
