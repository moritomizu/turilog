"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard } from "@/components/CatchCard";
import { PageHeader } from "@/components/PageHeader";
import { getUserCatches, updateCatch, updateCatchPublicStatus } from "@/lib/catches";
import { canEditCatchLog } from "@/lib/catchPermissions";
import { getDisplayLocation } from "@/lib/locationBlur";
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
  const digest = useMemo(() => buildDigest(items), [items]);
  const canEdit = canEditCatchLog(userId);

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
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {items.length ? <CatchDigest digest={digest} /> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <CatchCard item={item} displayLocation={getDisplayLocation(userId, item, { type: "personal" })} />
              <EmbedControls
                item={item}
                userId={userId}
                onChange={(nextItem) => setItems((current) => current.map((value) => (value.id === nextItem.id ? nextItem : value)))}
              />
              {canEdit ? (
                <EditCatchControls
                  item={item}
                  onChange={(nextItem) => setItems((current) => current.map((value) => (value.id === nextItem.id ? nextItem : value)))}
                />
              ) : null}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

function EditCatchControls({ item, onChange }: { item: Catch; onChange: (item: Catch) => void }) {
  const [open, setOpen] = useState(false);
  const [fishType, setFishType] = useState(item.fishType);
  const [sizeCm, setSizeCm] = useState(String(item.sizeCm));
  const [caughtAt, setCaughtAt] = useState(toLocalInputValue(new Date(item.caughtAt)));
  const [comment, setComment] = useState(item.comment);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    const nextSize = Number(sizeCm);
    const nextCaughtAt = new Date(caughtAt);
    if (!fishType.trim()) {
      setMessage("魚種を入力してください。");
      return;
    }
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      setMessage("サイズを正しく入力してください。");
      return;
    }
    if (!Number.isFinite(nextCaughtAt.getTime())) {
      setMessage("釣った日時を正しく入力してください。");
      return;
    }

    setBusy(true);
    setMessage("保存しています。");
    try {
      const patch = {
        fishType: fishType.trim(),
        sizeCm: nextSize,
        caughtAt: nextCaughtAt.toISOString(),
        comment
      };
      await updateCatch(item.id, patch);
      onChange({ ...item, ...patch });
      setMessage("編集内容を保存しました。");
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "編集内容を保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title="釣果を編集"
        aria-label="釣果を編集"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="tap-target absolute left-3 top-3 z-10 rounded-full border border-white/80 bg-white/95 px-3 py-2 text-xs font-black text-ink shadow-soft"
      >
        編集
      </button>
      {open ? (
        <section className="absolute left-3 right-3 top-16 z-30 rounded border border-teal-100 bg-white p-3 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-ink">釣果編集</p>
            <button type="button" onClick={() => setOpen(false)} className="rounded border border-slate-300 px-2 py-1 text-xs font-black text-slate-600">
              閉じる
            </button>
          </div>
          <div className="mt-3 space-y-3">
            <EditField label="魚種" value={fishType} onChange={setFishType} />
            <EditField label="サイズ cm" type="number" value={sizeCm} onChange={setSizeCm} />
            <EditField label="釣った日時" type="datetime-local" value={caughtAt} onChange={setCaughtAt} />
            <label className="block">
              <span className="text-xs font-black text-slate-600">コメント</span>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1 min-h-20 w-full rounded border border-slate-300 bg-white p-2 text-sm" />
            </label>
            <button type="button" disabled={busy} onClick={handleSave} className="tap-target w-full rounded bg-water px-4 py-3 text-sm font-black text-white disabled:opacity-60">
              {busy ? "保存中..." : "保存する"}
            </button>
            {message ? <p className="text-xs font-bold leading-5 text-slate-600">{message}</p> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}

function EditField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm font-bold" />
    </label>
  );
}

function EmbedControls({ item, userId, onChange }: { item: Catch; userId: string; onChange: (item: Catch) => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/embed/catches/${item.id}`;
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="560" style="border:0;border-radius:8px;max-width:420px;" loading="lazy" title="TsuriLog catch"></iframe>`;

  async function togglePublic() {
    setBusy(true);
    setMessage(item.isPublic ? "公開を停止しています。" : "埋め込み公開を有効にしています。");
    try {
      const nextPublic = !item.isPublic;
      await updateCatchPublicStatus(item.id, userId, nextPublic);
      onChange({
        ...item,
        isPublic: nextPublic,
        publicShareEnabledAt: nextPublic ? new Date().toISOString() : null
      });
      setMessage(nextPublic ? "埋め込みコードを使えるようになりました。" : "埋め込み公開を停止しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "公開設定を変更できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function copyEmbedCode() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setMessage("埋め込みコードをコピーしました。");
    } catch {
      setMessage("コピーできませんでした。下のコードを手動でコピーしてください。");
    }
  }

  return (
    <>
      <button
        type="button"
        title="共有・埋め込み"
        aria-label="共有・埋め込み"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`tap-target absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border shadow-soft ${
          item.isPublic ? "border-sky-200 bg-sky-600 text-white" : "border-white/80 bg-white/95 text-water"
        }`}
      >
        <ShareIcon />
        {item.isPublic ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-lime-300 ring-2 ring-white" /> : null}
      </button>
      {open ? (
        <section className="absolute left-3 right-3 top-16 z-20 rounded border border-teal-100 bg-white p-3 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-ink">共有</p>
            <span className={`rounded-full px-2 py-1 text-xs font-black ${item.isPublic ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>
              {item.isPublic ? "公開中" : "非公開"}
            </span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={togglePublic}
            className="tap-target mt-3 w-full rounded border border-water bg-white px-4 py-2 text-sm font-black text-water disabled:opacity-60"
          >
            {item.isPublic ? "公開を停止" : "埋め込みを有効化"}
          </button>
          {item.isPublic ? (
            <div className="mt-3 space-y-2">
              <button type="button" onClick={copyEmbedCode} className="tap-target w-full rounded bg-water px-4 py-2 text-sm font-black text-white">
                コードをコピー
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="tap-target block rounded border border-slate-300 px-4 py-2 text-center text-sm font-black text-ink">
                表示を確認
              </a>
              <textarea readOnly value={embedCode} className="h-20 w-full rounded border border-slate-300 bg-foam p-2 text-xs text-slate-700" />
            </div>
          ) : null}
          {message ? <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p> : null}
        </section>
      ) : null}
    </>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M8.7 10.7 15.3 7M8.7 13.3l6.6 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="5.5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="18.5" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

type Digest = {
  total: number;
  thisMonth: number;
  recent30: number;
  streak: number;
  best: Catch | null;
  latest: Catch | null;
  topFish: string;
  topTide: string;
  topArea: string;
  activeDays: number;
  averagePerActiveDay: string;
  digestYear: number;
  averageCatchPace: string;
  latestText: string;
};

function CatchDigest({ digest }: { digest: Digest }) {
  return (
    <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-water">RECENT REPORT</p>
          <h2 className="mt-1 text-xl font-black">釣果ダイジェスト</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{digest.latestText}</p>
        </div>
        <div className="rounded bg-coral px-3 py-2 text-center text-white">
          <p className="text-xs font-bold">総投稿</p>
          <p className="text-2xl font-black">{digest.total}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DigestStat label="今月" value={`${digest.thisMonth}匹`} />
        <DigestStat label="直近30日" value={`${digest.recent30}匹`} />
        <DigestStat label="連続記録" value={`${digest.streak}日`} />
        <DigestStat label="最大" value={digest.best ? `${digest.best.sizeCm}cm` : "未取得"} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <DigestStat label="釣行日数" value={`${digest.activeDays}日`} />
        <DigestStat label="1日平均" value={`${digest.averagePerActiveDay}匹`} />
        <div className="rounded bg-foam p-3">
          <p className="text-xs font-bold text-slate-500">平均釣速({digest.digestYear})</p>
          <p className="mt-1 text-lg font-black text-ink">{digest.averageCatchPace}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">はじめと終わりの釣果からその日の釣果までの平均期間を算出しています。</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <DigestTag label="よく釣れる魚種" value={digest.topFish} />
        <DigestTag label="好調な潮" value={digest.topTide} />
        <DigestTag label="よく行くエリア" value={digest.topArea} />
      </div>
    </section>
  );
}

function DigestStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-foam p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function DigestTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-teal-100 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-water">{value}</p>
    </div>
  );
}

function buildDigest(items: Catch[]): Digest {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const thirtyDaysAgo = now.getTime() - 30 * 86400000;
  const best = [...items].sort((a, b) => b.sizeCm - a.sizeCm)[0] ?? null;
  const latest = items[0] ?? null;
  const activeDayGroups = groupByDay(items);
  const activeDays = activeDayGroups.size;
  const averagePerActiveDay = activeDays ? (items.length / activeDays).toFixed(1) : "0.0";
  const digestYear = now.getFullYear();
  const yearlyGroups = groupByDay(items.filter((item) => new Date(item.caughtAt).getFullYear() === digestYear));

  return {
    total: items.length,
    thisMonth: items.filter((item) => getMonthKey(item.caughtAt) === thisMonthKey).length,
    recent30: items.filter((item) => new Date(item.caughtAt).getTime() >= thirtyDaysAgo).length,
    streak: getStreakDays(items),
    best,
    latest,
    topFish: topLabel(items, (item) => item.fishType),
    topTide: topLabel(items, (item) => item.tidePhaseLabel),
    topArea: topLabel(items, (item) => item.areaName || item.officialCurrentStationName || "未取得"),
    activeDays,
    averagePerActiveDay,
    digestYear,
    averageCatchPace: formatAverageCatchPace(yearlyGroups),
    latestText: latest ? `最新は${formatShortDate(latest.caughtAt)}の${latest.fishType} ${latest.sizeCm}cm。次の一匹で記録を伸ばしましょう。` : "まだ釣果がありません。"
  };
}

function topLabel(items: Catch[], getKey: (item: Catch) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item) || "未取得";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "未取得";
}

function getMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function getStreakDays(items: Catch[]) {
  const days = new Set(items.map((item) => new Date(item.caughtAt).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function groupByDay(items: Catch[]) {
  const groups = new Map<string, Catch[]>();
  for (const item of items) {
    const key = new Date(item.caughtAt).toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function formatAverageCatchPace(groups: Map<string, Catch[]>) {
  const intervals: number[] = [];
  for (const dayItems of groups.values()) {
    if (dayItems.length < 2) continue;
    const times = dayItems.map((item) => new Date(item.caughtAt).getTime()).filter(Number.isFinite).sort((a, b) => a - b);
    if (times.length < 2) continue;
    intervals.push((times[times.length - 1] - times[0]) / (times.length - 1));
  }

  if (!intervals.length) return "単発記録";
  const averageMinutes = intervals.reduce((sum, value) => sum + value, 0) / intervals.length / 60000;
  if (averageMinutes < 60) return `${Math.round(averageMinutes)}分/匹`;
  const hours = Math.floor(averageMinutes / 60);
  const minutes = Math.round(averageMinutes % 60);
  return minutes ? `${hours}時間${minutes}分/匹` : `${hours}時間/匹`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
