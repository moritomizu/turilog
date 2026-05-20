"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { createCatch, getUserCatches, uploadCatchImage } from "@/lib/catches";
import { getCurrentLocation, formatCoordinate } from "@/lib/location";
import { getLunarInfo } from "@/lib/lunar";
import { getOfficialTideReference } from "@/lib/officialTide";
import { fetchTideInfo } from "@/lib/tide";
import { emptyWeatherInfo, fetchWeatherInfo } from "@/lib/weather";
import type { LocationPoint } from "@/types";

export default function PostPage() {
  return (
    <AuthGate>
      {(user) => <PostForm userId={user.uid} />}
    </AuthGate>
  );
}

function PostForm({ userId }: { userId: string }) {
  const [fishType, setFishType] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [caughtAt, setCaughtAt] = useState(toLocalInputValue(new Date()));
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [fishSuggestions, setFishSuggestions] = useState<string[]>([]);
  const [commentSuggestions, setCommentSuggestions] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const canQuickPost = fishType.trim().length > 0 && Number(sizeCm) > 0;

  useEffect(() => {
    getUserCatches(userId)
      .then((items) => {
        setFishSuggestions(topValues(items.map((item) => item.fishType), 8));
        setCommentSuggestions(topValues(items.map((item) => item.comment).filter(Boolean), 6));
      })
      .catch(() => {
        setFishSuggestions(["シーバス", "アジ", "メバル", "クロダイ", "マダイ", "ヒラメ"]);
      });
  }, [userId]);

  async function handleLocation() {
    setMessage("位置情報を取得しています。");
    try {
      setLocation(await getCurrentLocation());
      setMessage("位置情報を取得しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "位置情報を取得できませんでした。");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("投稿を保存しています。");
    try {
      let imageUrl: string | null = null;
      if (file) imageUrl = await uploadCatchImage(userId, file);
      const caughtAtIso = new Date(caughtAt).toISOString();

      let tideInfo = await fetchTideInfo(location?.latitude ?? null, location?.longitude ?? null, caughtAtIso).catch((error) => {
        setMessage(error instanceof Error ? `潮位は未取得で保存します: ${error.message}` : "潮位は未取得で保存します。");
        return null;
      });

      let weather = await fetchWeatherInfo(location?.latitude ?? null, location?.longitude ?? null, caughtAtIso).catch((error) => {
        setMessage(error instanceof Error ? `天候は未取得で保存します: ${error.message}` : "天候は未取得で保存します。");
        return null;
      });

      tideInfo ??= {
        tideHeight: null,
        tideDirection: "unknown",
        tidePhase: null,
        tidePhaseLabel: "潮位未取得",
        previousTideTime: null,
        previousTideType: "unknown",
        nextTideTime: null,
        nextTideType: "unknown",
        minutesToNextTide: null,
        tideStationName: null,
        tideStationDistance: null,
        tideApiProvider: "none"
      };
      weather ??= emptyWeatherInfo();

      await createCatch({
        userId,
        imageUrl,
        fishType,
        sizeCm: Number(sizeCm),
        caughtAt: caughtAtIso,
        comment,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        weather,
        lunar: getLunarInfo(caughtAtIso),
        ...getOfficialTideReference(location?.latitude, location?.longitude, caughtAtIso),
        ...tideInfo
      });

      setFishType("");
      setSizeCm("");
      setComment("");
      setFile(null);
      setCaughtAt(toLocalInputValue(new Date()));
      setMessage("投稿しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "投稿に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="釣果投稿" actionHref="/catches" actionLabel="一覧" />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block rounded border border-teal-100 bg-white p-4 shadow-soft">
            <span className="text-sm font-black">写真</span>
            <input className="mt-3 w-full rounded border border-slate-300 bg-white p-3 text-base" type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {preview ? <img src={preview} alt="投稿プレビュー" className="aspect-[4/3] w-full rounded object-cover" /> : null}

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <Field label="魚種" value={fishType} onChange={setFishType} placeholder="例: シーバス" required listId="fish-suggestions" autoFocus />
            <datalist id="fish-suggestions">
              {fishSuggestions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <SuggestionChips values={fishSuggestions} onPick={setFishType} />
          </section>

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <Field label="サイズ cm" type="number" inputMode="decimal" value={sizeCm} onChange={setSizeCm} placeholder="例: 62" required />
            <SizeStepper value={sizeCm} onChange={setSizeCm} />
          </section>

          <section className="grid grid-cols-2 gap-3">
            <button type="button" onClick={handleLocation} className="tap-target rounded border border-water bg-white px-4 py-3 text-sm font-black text-water shadow-soft">
              {location ? "位置取得済み" : "現在地を取得"}
            </button>
            <button type="button" onClick={() => setCaughtAt(toLocalInputValue(new Date()))} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 text-sm font-black text-ink shadow-soft">
              時刻を今にする
            </button>
          </section>

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <button type="button" onClick={() => setShowDetails((value) => !value)} className="tap-target flex w-full items-center justify-between rounded bg-foam px-4 py-3 text-left font-black">
              <span>詳細入力</span>
              <span>{showDetails ? "閉じる" : "開く"}</span>
            </button>

            {showDetails ? (
              <div className="mt-4 space-y-4">
                <Field label="釣った日時" type="datetime-local" value={caughtAt} onChange={setCaughtAt} required />

                <label className="block">
                  <span className="text-sm font-bold">コメント</span>
                  <textarea className="mt-2 min-h-24 w-full rounded border border-slate-300 bg-white p-3 text-base" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="ルアー、状況、メモなど" />
                </label>
                <SuggestionChips values={commentSuggestions} onPick={setComment} />
              </div>
            ) : (
              <div className="mt-3 text-sm leading-6 text-slate-600">
                <p>日時: {formatLocalDateTime(caughtAt)}</p>
                <p>
                  位置: 緯度 {formatCoordinate(location?.latitude)} / 経度 {formatCoordinate(location?.longitude)}
                </p>
              </div>
            )}
          </section>

          {location ? <p className="rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">潮位、公式潮汐曲線リンク、天候、風速を自動保存します。</p> : null}

          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-teal-100 bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-xl">
              <button disabled={busy || !canQuickPost} className="tap-target w-full rounded bg-water px-5 py-4 text-lg font-black text-white shadow-soft disabled:opacity-60">
                {busy ? "保存中..." : "すぐ投稿する"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  listId,
  inputMode,
  autoFocus
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  listId?: string;
  inputMode?: "decimal" | "numeric" | "text";
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        required={required}
        className="mt-2 w-full rounded border border-slate-300 bg-white p-4 text-lg font-bold"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        inputMode={inputMode}
        autoFocus={autoFocus}
      />
    </label>
  );
}

function SuggestionChips({ values, onPick }: { values: string[]; onPick: (value: string) => void }) {
  if (!values.length) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {values.map((value) => (
        <button key={value} type="button" onClick={() => onPick(value)} className="tap-target shrink-0 rounded border border-teal-100 bg-foam px-4 py-2 text-sm font-black text-ink">
          {value}
        </button>
      ))}
    </div>
  );
}

function SizeStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = Number(value) || 0;
  const steps = [-5, -1, 1, 5];
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {steps.map((step) => (
        <button key={step} type="button" onClick={() => onChange(String(Math.max(0, current + step)))} className="tap-target rounded border border-slate-300 bg-white px-3 py-2 font-black text-ink">
          {step > 0 ? `+${step}` : step}
        </button>
      ))}
    </div>
  );
}

function topValues(values: string[], limit: number) {
  const counts = new Map<string, number>();
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
    .slice(0, limit)
    .map(([value]) => value);
}

function formatLocalDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
