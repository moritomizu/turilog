"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { createCatch, emptyTackleInfo, getUserCatches, uploadCatchImage } from "@/lib/catches";
import { geocodePlaceName } from "@/lib/geocoding";
import { getCurrentLocation, formatCoordinate } from "@/lib/location";
import { getLunarInfo } from "@/lib/lunar";
import { getOfficialCurrentReference } from "@/lib/officialCurrent";
import { getOfficialTideReference } from "@/lib/officialTide";
import { fetchTideInfo } from "@/lib/tide";
import { emptyWeatherInfo, fetchWeatherInfo } from "@/lib/weather";
import type { Catch, LocationPoint, TackleInfo } from "@/types";

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
  const [tackle, setTackle] = useState<TackleInfo>(emptyTackleInfo());
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [resolvedPlaceName, setResolvedPlaceName] = useState("");
  const [fishSuggestions, setFishSuggestions] = useState<string[]>([]);
  const [commentSuggestions, setCommentSuggestions] = useState<string[]>([]);
  const [tackleSuggestions, setTackleSuggestions] = useState<Record<keyof TackleInfo, string[]>>({
    lureName: [],
    lureColor: [],
    rodName: [],
    reelName: [],
    lineName: [],
    leaderName: []
  });
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ label: string; latitude: number; longitude: number }>>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const canQuickPost = fishType.trim().length > 0 && Number(sizeCm) > 0;

  useEffect(() => {
    getUserCatches(userId)
      .then((items) => {
        setFishSuggestions(topValues(items.map((item) => item.fishType), 8));
        setCommentSuggestions(topValues(items.map((item) => item.comment).filter(Boolean), 6));
        setTackleSuggestions({
          lureName: topValues(items.map((item) => item.tackle.lureName), 8),
          lureColor: topValues(items.map((item) => item.tackle.lureColor), 8),
          rodName: topValues(items.map((item) => item.tackle.rodName), 6),
          reelName: topValues(items.map((item) => item.tackle.reelName), 6),
          lineName: topValues(items.map((item) => item.tackle.lineName), 6),
          leaderName: topValues(items.map((item) => item.tackle.leaderName), 6)
        });
        setLocationSuggestions(topLocations(items, 6));
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

  function applyManualLocation() {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setMessage("緯度と経度を数字で入力してください。");
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setMessage("緯度は-90〜90、経度は-180〜180の範囲で入力してください。");
      return;
    }
    setLocation({ latitude, longitude });
    setMessage("入力した位置を設定しました。");
  }

  const applyLocation = useCallback((point: LocationPoint) => {
    setLocation(point);
    setManualLatitude(String(point.latitude));
    setManualLongitude(String(point.longitude));
    setMessage("過去の釣果地点を設定しました。");
  }, []);

  async function handleGeocodePlace() {
    setMessage("地名から場所を検索しています。");
    try {
      const point = await geocodePlaceName(placeName);
      setLocation(point);
      setManualLatitude(String(Number(point.latitude.toFixed(6))));
      setManualLongitude(String(Number(point.longitude.toFixed(6))));
      setResolvedPlaceName(point.formattedAddress);
      setMessage(`地名から緯度経度を設定しました: ${point.formattedAddress}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "地名検索に失敗しました。");
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
        tackle,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        weather,
        lunar: getLunarInfo(caughtAtIso),
        ...getOfficialCurrentReference(location?.latitude, location?.longitude, caughtAtIso),
        ...getOfficialTideReference(location?.latitude, location?.longitude, caughtAtIso),
        ...tideInfo
      });

      setFishType("");
      setSizeCm("");
      setComment("");
      setTackle(emptyTackleInfo());
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
            <input className="mt-3 w-full rounded border border-slate-300 bg-white p-3 text-base" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="mt-2 text-xs font-bold text-slate-500">カメラ撮影または写真ライブラリから選択できます。</p>
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
            <h2 className="text-sm font-black">地名で場所指定</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              過去釣果やPC入力では、地名から大まかな緯度経度を入れられます。
            </p>
            <div className="mt-3">
              <Field label="地名で検索" value={placeName} onChange={setPlaceName} placeholder="例: 横浜 本牧海づり施設" />
              <button type="button" onClick={handleGeocodePlace} className="tap-target mt-3 w-full rounded border border-water bg-white px-4 py-3 text-sm font-black text-water">
                地名から緯度経度を入れる
              </button>
            </div>
            <button type="button" onClick={() => setShowMapPicker((value) => !value)} className="tap-target mt-3 w-full rounded bg-water px-4 py-3 text-sm font-black text-white">
              {showMapPicker ? "地図を閉じる" : "地図でピン指定"}
            </button>
            {showMapPicker ? <MapPicker location={location} onPick={applyLocation} /> : null}
            <p className="mt-3 text-sm text-slate-600">
              現在位置: 緯度 {formatCoordinate(location?.latitude)} / 経度 {formatCoordinate(location?.longitude)}
            </p>
            {resolvedPlaceName ? <p className="mt-2 rounded bg-foam p-2 text-xs font-bold text-slate-600">検索結果: {resolvedPlaceName}</p> : null}
          </section>

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <button type="button" onClick={() => setShowDetails((value) => !value)} className="tap-target flex w-full items-center justify-between rounded bg-foam px-4 py-3 text-left font-black">
              <span>詳細入力</span>
              <span>{showDetails ? "閉じる" : "開く"}</span>
            </button>

            {showDetails ? (
              <div className="mt-4 space-y-4">
                <Field label="釣った日時" type="datetime-local" value={caughtAt} onChange={setCaughtAt} required />

                <section className="rounded bg-foam p-3">
                  <h2 className="text-sm font-black">場所</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    緯度 {formatCoordinate(location?.latitude)} / 経度 {formatCoordinate(location?.longitude)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Field label="緯度" type="number" inputMode="decimal" value={manualLatitude} onChange={setManualLatitude} placeholder="35.454" />
                    <Field label="経度" type="number" inputMode="decimal" value={manualLongitude} onChange={setManualLongitude} placeholder="139.644" />
                  </div>
                  <button type="button" onClick={applyManualLocation} className="tap-target mt-3 w-full rounded border border-water bg-white px-4 py-3 text-sm font-black text-water">
                    入力した場所を使う
                  </button>
                  <SuggestionLocationChips values={locationSuggestions} onPick={applyLocation} />
                </section>

                <section className="rounded bg-foam p-3">
                  <h2 className="text-sm font-black">タックル</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <TackleField label="ルアー" field="lureName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.lureName} placeholder="例: カゲロウ100F" />
                    <TackleField label="カラー" field="lureColor" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.lureColor} placeholder="例: チャートバック" />
                    <TackleField label="ロッド" field="rodName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.rodName} placeholder="例: 9.6ft ML" />
                    <TackleField label="リール" field="reelName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.reelName} placeholder="例: 4000XG" />
                    <TackleField label="ライン" field="lineName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.lineName} placeholder="例: PE1.0号" />
                    <TackleField label="リーダー" field="leaderName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.leaderName} placeholder="例: フロロ20lb" />
                  </div>
                </section>

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

          {location ? <p className="rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">釣った場所と日時をもとに、潮位、公式潮汐曲線リンク、当時の天候、当時の風速を自動保存します。</p> : null}

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

function MapPicker({ location, onPick }: { location: LocationPoint | null; onPick: (point: LocationPoint) => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const initialLocationRef = useRef(location);
  const [message, setMessage] = useState("地図を読み込んでいます。");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMessage("Google Maps APIキーが未設定です。");
        return;
      }

      const loader = new Loader({ apiKey, version: "weekly" });
      const google = await loader.load();
      if (!mounted || !mapRef.current) return;

      const initialLocation = initialLocationRef.current;
      const center = initialLocation
        ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
        : { lat: 34.617, lng: 135.015 };
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: initialLocation ? 14 : 9,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
      });

      markerRef.current = new google.maps.Marker({
        position: center,
        map,
        draggable: true
      });

      function setPoint(latLng: google.maps.LatLng) {
        const point = { latitude: latLng.lat(), longitude: latLng.lng() };
        markerRef.current?.setPosition(latLng);
        onPick(point);
        setMessage("ピンの場所を投稿位置に設定しました。");
      }

      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (event.latLng) setPoint(event.latLng);
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition();
        if (position) setPoint(position);
      });

      setMessage("地図をタップ、またはピンを動かして場所を指定できます。");
    }

    load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "地図を表示できませんでした。");
    });

    return () => {
      mounted = false;
    };
  }, [onPick]);

  return (
    <div className="mt-3">
      <div ref={mapRef} className="h-72 w-full rounded border border-teal-100 bg-white" />
      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p>
    </div>
  );
}

function TackleField({
  label,
  field,
  tackle,
  setTackle,
  suggestions,
  placeholder
}: {
  label: string;
  field: keyof TackleInfo;
  tackle: TackleInfo;
  setTackle: (value: TackleInfo) => void;
  suggestions: string[];
  placeholder: string;
}) {
  return (
    <div>
      <Field label={label} value={tackle[field]} onChange={(value) => setTackle({ ...tackle, [field]: value })} placeholder={placeholder} listId={`tackle-${field}`} compact />
      <datalist id={`tackle-${field}`}>
        {suggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </div>
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
  autoFocus,
  compact
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
  compact?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        required={required}
        className={`mt-2 w-full rounded border border-slate-300 bg-white font-bold ${compact ? "p-2 text-sm" : "p-4 text-lg"}`}
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

function SuggestionLocationChips({
  values,
  onPick
}: {
  values: Array<{ label: string; latitude: number; longitude: number }>;
  onPick: (value: LocationPoint) => void;
}) {
  if (!values.length) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {values.map((value) => (
        <button
          key={value.label}
          type="button"
          onClick={() => onPick({ latitude: value.latitude, longitude: value.longitude })}
          className="tap-target shrink-0 rounded border border-teal-100 bg-white px-4 py-2 text-sm font-black text-ink"
        >
          {value.label}
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

function topLocations(items: Catch[], limit: number) {
  const counts = new Map<string, { latitude: number; longitude: number; count: number }>();
  items
    .filter((item) => item.latitude != null && item.longitude != null)
    .forEach((item) => {
      const latitude = item.latitude as number;
      const longitude = item.longitude as number;
      const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const current = counts.get(key);
      counts.set(key, {
        latitude,
        longitude,
        count: (current?.count ?? 0) + 1
      });
    });

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((value, index) => ({
      label: `過去地点${index + 1} (${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)})`,
      latitude: value.latitude,
      longitude: value.longitude
    }));
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
