"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { AuthGate } from "@/components/AuthGate";
import { CatchCard } from "@/components/CatchCard";
import { FeatureLock } from "@/components/FeatureLock";
import { PageHeader } from "@/components/PageHeader";
import { CatchDataOverlay } from "@/components/share/CatchDataOverlay";
import { deleteCatch, getUserCatches, updateCatchPublicStatus } from "@/lib/catches";
import { logShareEvent } from "@/lib/shareEvents";
import { formatLengthFromCm, getDefaultUnitSystem } from "@/lib/units";
import { getUserProfile } from "@/lib/userProfiles";
import { localizePath, type AppLocale } from "@/lib/i18n";
import type { Catch, UnitSystem } from "@/types";

export default function CatchesPage() {
  return (
    <AuthGate>
      {(user) => <CatchList userId={user.uid} />}
    </AuthGate>
  );
}

function CatchList({ userId }: { userId: string }) {
  const locale = useLocale() as AppLocale;
  const [items, setItems] = useState<Catch[]>([]);
  const [message, setMessage] = useState(locale === "en" ? "Loading your catch log..." : "読み込み中です。");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(getDefaultUnitSystem(locale));
  const digest = useMemo(() => buildDigest(items, locale, unitSystem), [items, locale, unitSystem]);

  useEffect(() => {
    getUserCatches(userId)
      .then((result) => {
        setItems(result);
        setMessage(result.length ? "" : locale === "en" ? "No catches yet. Log your first catch." : "まだ釣果がありません。最初の一匹を投稿しましょう。");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : locale === "en" ? "Could not load your catch log." : "釣果を読み込めませんでした。"));
    getUserProfile(userId)
      .then((profile) => setUnitSystem(profile?.unitSystem ?? getDefaultUnitSystem(locale)))
      .catch(() => setUnitSystem(getDefaultUnitSystem(locale)));
  }, [locale, userId]);

  return (
    <>
      <PageHeader title={locale === "en" ? "Catch Log" : "釣果一覧"} actionHref="/post" actionLabel={locale === "en" ? "Log catch" : "投稿"} />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {message ? <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {items.length ? <CatchDigest digest={digest} locale={locale} unitSystem={unitSystem} /> : null}
        {items.length ? <FeatureLock userId={userId} featureKey="csvExport" compact /> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <CatchCard item={item} unitSystem={unitSystem} />
              <CatchActionMenu
                item={item}
                userId={userId}
                locale={locale}
                onChange={(nextItem) => setItems((current) => current.map((value) => (value.id === nextItem.id ? nextItem : value)))}
                onDelete={(deletedId) => setItems((current) => current.filter((value) => value.id !== deletedId))}
              />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

function CatchActionMenu({ item, userId, locale, onChange, onDelete }: { item: Catch; userId: string; locale: AppLocale; onChange: (item: Catch) => void; onDelete: (catchId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}${localizePath(`/embed/catches/${item.id}`, locale)}`;
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="560" style="border:0;border-radius:8px;max-width:420px;" loading="lazy" title="TSURILOGUE catch"></iframe>`;

  async function togglePublic() {
    setBusy(true);
    setMessage(item.isPublic ? tr(locale, "Stopping public sharing...", "公開を停止しています。") : tr(locale, "Enabling public sharing...", "埋め込み公開を有効にしています。"));
    try {
      const nextPublic = !item.isPublic;
      await updateCatchPublicStatus(item.id, userId, nextPublic);
      onChange({
        ...item,
        isPublic: nextPublic,
        publicShareEnabledAt: nextPublic ? new Date().toISOString() : null
      });
      setMessage(nextPublic ? tr(locale, "Public sharing is now enabled.", "埋め込みコードを使えるようになりました。") : tr(locale, "Public sharing was stopped.", "埋め込み公開を停止しました。"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr(locale, "Could not change the sharing settings.", "公開設定を変更できませんでした。"));
    } finally {
      setBusy(false);
    }
  }

  async function copyEmbedCode() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setMessage(tr(locale, "Embed code copied.", "埋め込みコードをコピーしました。"));
    } catch {
      setMessage(tr(locale, "Could not copy the embed code.", "コピーできませんでした。"));
    }
  }

  async function handleDelete() {
    if (!window.confirm(tr(locale, "Delete this catch? This cannot be undone.", "この釣果を削除しますか？削除すると元に戻せません。"))) return;
    setBusy(true);
    setMessage(tr(locale, "Deleting catch...", "削除しています。"));
    try {
      await deleteCatch(item.id, userId);
      onDelete(item.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr(locale, "Could not delete the catch.", "釣果を削除できませんでした。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title={tr(locale, "Catch menu", "釣果メニュー")}
        aria-label={tr(locale, "Catch menu", "釣果メニュー")}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setShareOpen(false);
          setOverlayOpen(false);
        }}
        className="tap-target absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/95 text-ink shadow-soft"
      >
        <DotsIcon />
      </button>
      <button
        type="button"
        title={tr(locale, "Share and embed", "共有・埋め込み")}
        aria-label={tr(locale, "Share and embed", "共有・埋め込み")}
        aria-expanded={shareOpen}
        onClick={() => {
          setShareOpen((value) => !value);
          setOpen(false);
          setOverlayOpen(false);
          logShareEvent(userId, "share_open", {
            share_type: "public_embed",
            catch_proof: Boolean(item.verificationScore),
            locale
          });
        }}
        className={`tap-target absolute right-16 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border shadow-soft ${
          item.isPublic ? "border-sky-200 bg-sky-600 text-white" : "border-white/80 bg-white/95 text-water"
        }`}
      >
        <ShareIcon />
        {item.isPublic ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-lime-300 ring-2 ring-white" /> : null}
      </button>
      {open ? (
        <section className="absolute left-3 right-3 top-16 z-20 rounded border border-teal-100 bg-white p-3 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-ink">{tr(locale, "Menu", "メニュー")}</p>
            <span className={`rounded-full px-2 py-1 text-xs font-black ${item.isPublic ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>
              {item.isPublic ? tr(locale, "Public", "公開中") : tr(locale, "Private", "非公開")}
            </span>
          </div>
          <Link href={localizePath(`/catches/${item.id}/edit`, locale)} className="tap-target mt-3 flex w-full items-center justify-center rounded bg-water px-4 py-2 text-sm font-black text-white">
            {tr(locale, "Edit catch", "編集する")}
          </Link>
          <button type="button" disabled={busy} onClick={handleDelete} className="tap-target mt-3 w-full rounded border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700 disabled:opacity-60">
            {tr(locale, "Delete catch", "削除する")}
          </button>
          {message ? <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p> : null}
        </section>
      ) : null}
      {shareOpen ? (
        <section className="absolute left-3 right-3 top-16 z-20 rounded border border-teal-100 bg-white p-3 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-ink">{tr(locale, "Share and embed", "共有・埋め込み")}</p>
            <span className={`rounded-full px-2 py-1 text-xs font-black ${item.isPublic ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>
              {item.isPublic ? tr(locale, "Public", "公開中") : tr(locale, "Private", "非公開")}
            </span>
          </div>
          <button type="button" disabled={busy} onClick={togglePublic} className="tap-target mt-3 w-full rounded border border-water bg-white px-4 py-2 text-sm font-black text-water disabled:opacity-60">
            {item.isPublic ? tr(locale, "Stop public sharing", "公開を停止") : tr(locale, "Enable public sharing", "埋め込みを有効化")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOverlayOpen(true);
              setShareOpen(false);
            }}
            className="tap-target mt-3 w-full rounded bg-coral px-4 py-2 text-sm font-black text-white"
          >
            {tr(locale, "Create data overlay", "釣果データを重ねる")}
          </button>
          {item.isPublic ? (
            <div className="mt-3 space-y-2">
              <button type="button" onClick={copyEmbedCode} className="tap-target w-full rounded bg-water px-4 py-2 text-sm font-black text-white">
                {tr(locale, "Copy embed code", "コードをコピー")}
              </button>
              <a href={shareUrl} className="tap-target block rounded border border-slate-300 px-4 py-2 text-center text-sm font-black text-ink">
                {tr(locale, "View public catch", "表示を確認")}
              </a>
            </div>
          ) : null}
          {message ? <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p> : null}
        </section>
      ) : null}
      {overlayOpen ? <CatchDataOverlay item={item} userId={userId} shareUrl={shareUrl} onClose={() => setOverlayOpen(false)} /> : null}
    </>
  );
}

function DotsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
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

function CatchDigest({ digest, locale, unitSystem }: { digest: Digest; locale: AppLocale; unitSystem: UnitSystem }) {
  return (
    <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-water">RECENT REPORT</p>
          <h2 className="mt-1 text-xl font-black">{tr(locale, "Catch summary", "釣果ダイジェスト")}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{digest.latestText}</p>
        </div>
        <div className="rounded bg-coral px-3 py-2 text-center text-white">
          <p className="text-xs font-bold">{tr(locale, "Total", "総投稿")}</p>
          <p className="text-2xl font-black">{digest.total}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DigestStat label={tr(locale, "This month", "今月")} value={`${digest.thisMonth}${tr(locale, " catches", "匹")}`} />
        <DigestStat label={tr(locale, "Last 30 days", "直近30日")} value={`${digest.recent30}${tr(locale, " catches", "匹")}`} />
        <DigestStat label={tr(locale, "Current streak", "連続記録")} value={`${digest.streak}${tr(locale, " days", "日")}`} />
        <DigestStat label={tr(locale, "Largest", "最大")} value={digest.best ? formatLengthFromCm(digest.best.sizeCm, locale, unitSystem) : tr(locale, "Unknown", "未取得")} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <DigestStat label={tr(locale, "Active days", "釣行日数")} value={`${digest.activeDays}${tr(locale, " days", "日")}`} />
        <DigestStat label={tr(locale, "Daily average", "1日平均")} value={`${digest.averagePerActiveDay}${tr(locale, " catches", "匹")}`} />
        <div className="rounded bg-foam p-3">
          <p className="text-xs font-bold text-slate-500">{tr(locale, "Average catch pace", "平均釣速")} ({digest.digestYear})</p>
          <p className="mt-1 text-lg font-black text-ink">{digest.averageCatchPace}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{tr(locale, "Calculated from the time between the first and last catch on active days.", "はじめと終わりの釣果からその日の釣果までの平均期間を算出しています。")}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <DigestTag label={tr(locale, "Top fish", "よく釣れる魚種")} value={digest.topFish} />
        <DigestTag label={tr(locale, "Top tide", "好調な潮")} value={digest.topTide} />
        <DigestTag label={tr(locale, "Top area", "よく行くエリア")} value={digest.topArea} />
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

function buildDigest(items: Catch[], locale: AppLocale, unitSystem: UnitSystem): Digest {
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
    topFish: topLabel(items, (item) => item.fishType, locale),
    topTide: topLabel(items, (item) => item.tidePhaseLabel, locale),
    topArea: topLabel(items, (item) => item.areaName || item.officialCurrentStationName || tr(locale, "Unknown", "未取得"), locale),
    activeDays,
    averagePerActiveDay,
    digestYear,
    averageCatchPace: formatAverageCatchPace(yearlyGroups, locale),
    latestText: latest
      ? (locale === "en" ? `Latest: ${latest.fishType}, ${formatLengthFromCm(latest.sizeCm, locale, unitSystem)}, on ${formatShortDate(latest.caughtAt, locale)}. Keep building your catch log.` : `最新は${formatShortDate(latest.caughtAt, locale)}の${latest.fishType} ${latest.sizeCm}cm。次の一匹で記録を伸ばしましょう。`)
      : tr(locale, "No catches yet.", "まだ釣果がありません。")
  };
}

function topLabel(items: Catch[], getKey: (item: Catch) => string, locale: AppLocale) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item) || tr(locale, "Unknown", "未取得");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? tr(locale, "Unknown", "未取得");
}

function getMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}`;
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

function formatAverageCatchPace(groups: Map<string, Catch[]>, locale: AppLocale) {
  const intervals: number[] = [];
  for (const dayItems of groups.values()) {
    if (dayItems.length < 2) continue;
    const times = dayItems.map((item) => new Date(item.caughtAt).getTime()).filter(Number.isFinite).sort((a, b) => a - b);
    if (times.length < 2) continue;
    intervals.push((times[times.length - 1] - times[0]) / (times.length - 1));
  }

  if (!intervals.length) return tr(locale, "Single catches", "単発記録");
  const averageMinutes = intervals.reduce((sum, value) => sum + value, 0) / intervals.length / 60000;
  if (averageMinutes < 60) return locale === "en" ? `${Math.round(averageMinutes)} min/catch` : `${Math.round(averageMinutes)}分/匹`;
  const hours = Math.floor(averageMinutes / 60);
  const minutes = Math.round(averageMinutes % 60);
  return locale === "en" ? (minutes ? `${hours} hr ${minutes} min/catch` : `${hours} hr/catch`) : (minutes ? `${hours}時間${minutes}分/匹` : `${hours}時間/匹`);
}

function formatShortDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: locale === "en" ? "short" : "2-digit",
    day: "numeric"
  }).format(new Date(value));
}

function tr(locale: AppLocale, english: string, japanese: string) {
  return locale === "en" ? english : japanese;
}
