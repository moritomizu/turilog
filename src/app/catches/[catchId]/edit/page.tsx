"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getCatchById, updateCatch } from "@/lib/catches";
import { getFishingAreaById, getNearestFishingArea, groupedFishingAreas } from "@/lib/fishingAreas";
import { formatCoordinate } from "@/lib/location";
import { generateBlurredLocation, getAreaFromLocation, getDefaultBlurRadius } from "@/lib/locationBlur";
import type { Catch, LocationPoint } from "@/types";

export default function CatchEditPage({ params }: { params: { catchId: string } }) {
  return <AuthGate>{(user) => <CatchEdit catchId={params.catchId} userId={user.uid} />}</AuthGate>;
}

function CatchEdit({ catchId, userId }: { catchId: string; userId: string }) {
  const [item, setItem] = useState<Catch | null>(null);
  const [fishType, setFishType] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [caughtAt, setCaughtAt] = useState("");
  const [comment, setComment] = useState("");
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [areaName, setAreaName] = useState("");
  const [pointName, setPointName] = useState("");
  const [message, setMessage] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCatchById(catchId)
      .then((result) => {
        if (!result) {
          setMessage("釣果が見つかりません。");
          return;
        }
        if (result.userId !== userId) {
          setMessage("この釣果を編集する権限がありません。");
          return;
        }
        setItem(result);
        setFishType(result.fishType);
        setSizeCm(String(result.sizeCm));
        setCaughtAt(toLocalInputValue(new Date(result.caughtAt)));
        setComment(result.comment);
        setAreaName(result.areaName);
        setPointName(result.pointName);
        if (result.latitude != null && result.longitude != null) {
          const point = { latitude: result.latitude, longitude: result.longitude };
          setLocation(point);
          setManualLatitude(String(point.latitude));
          setManualLongitude(String(point.longitude));
          const nearest = getNearestFishingArea(point);
          if (nearest) setSelectedAreaId(nearest.area.id);
        }
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "釣果を読み込めませんでした。"));
  }, [catchId, userId]);

  const applyLocation = useCallback((point: LocationPoint, nextAreaName = "", nextPointName = "", options: { inferArea?: boolean; message?: string } = {}) => {
    setLocation(point);
    setManualLatitude(String(point.latitude));
    setManualLongitude(String(point.longitude));
    if (nextPointName) setPointName(nextPointName);
    if (nextAreaName) {
      setAreaName(nextAreaName);
    } else if (options.inferArea) {
      const nearest = getNearestFishingArea(point);
      if (nearest) {
        setSelectedAreaId(nearest.area.id);
        setAreaName(`${nearest.area.prefecture}・${nearest.area.name}`);
      }
    }
    setMessage(options.message ?? "位置を設定しました。");
  }, []);

  function handleAreaChange(areaId: string) {
    setSelectedAreaId(areaId);
    const area = getFishingAreaById(areaId);
    if (!area) return;
    applyLocation(area, `${area.prefecture}・${area.name}`, "", { message: `${area.prefecture}・${area.name} の代表地点を設定しました。地図でピンを微調整できます。` });
  }

  function applyManualLocation() {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setMessage("緯度と経度を数字で入力してください。");
      return;
    }
    applyLocation({ latitude, longitude }, "", "", { inferArea: true, message: "入力した位置を設定しました。" });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    const nextSize = Number(sizeCm);
    const nextCaughtAt = new Date(caughtAt);
    if (!fishType.trim() || !Number.isFinite(nextSize) || nextSize <= 0 || !Number.isFinite(nextCaughtAt.getTime())) {
      setMessage("魚種・サイズ・日時を正しく入力してください。");
      return;
    }
    setBusy(true);
    setMessage("保存しています。");
    try {
      const blurRadiusMeters = location ? item.blurRadiusMeters ?? getDefaultBlurRadius() : null;
      const blurredLocation = location && blurRadiusMeters ? generateBlurredLocation(location.latitude, location.longitude, blurRadiusMeters) : null;
      const inferredArea = location ? getAreaFromLocation(location.latitude, location.longitude) : { areaName: "", areaCode: "" };
      const savedAreaName = areaName || inferredArea.areaName;
      await updateCatch(item.id, {
        fishType: fishType.trim(),
        sizeCm: nextSize,
        caughtAt: nextCaughtAt.toISOString(),
        comment,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        publicLatitude: blurredLocation?.latitude ?? null,
        publicLongitude: blurredLocation?.longitude ?? null,
        locationVisibility: location ? "exact" : "hidden",
        areaName: savedAreaName,
        areaCode: inferredArea.areaCode,
        pointName: pointName.trim(),
        blurRadiusMeters,
        locationUpdatedAt: location ? new Date().toISOString() : null
      });
      window.location.href = "/catches";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
      setBusy(false);
    }
  }

  const canEdit = Boolean(item && item.userId === userId);

  return (
    <>
      <PageHeader title="釣果編集" actionHref="/catches" actionLabel="一覧" />
      <main className="mx-auto max-w-xl px-4 pb-10 pt-5">
        {message ? <p className="mb-4 rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {canEdit ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
              <Field label="魚種" value={fishType} onChange={setFishType} required />
              <div className="mt-4">
                <Field label="サイズ cm" type="number" value={sizeCm} onChange={setSizeCm} required />
              </div>
              <div className="mt-4">
                <Field label="釣った日時" type="datetime-local" value={caughtAt} onChange={setCaughtAt} required />
              </div>
              <label className="mt-4 block">
                <span className="text-sm font-bold">コメント</span>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 min-h-24 w-full rounded border border-slate-300 bg-white p-3 text-base" />
              </label>
            </section>

            <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
              <h2 className="text-sm font-black">釣果ポイント</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">エリアを選んでから、地図のピンで細かい位置を調整できます。</p>
              <label className="mt-3 block">
                <span className="text-sm font-bold">エリア</span>
                <select value={selectedAreaId} onChange={(event) => handleAreaChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-4 text-base font-bold">
                  <option value="">選択してください</option>
                  {Object.entries(groupedFishingAreas()).map(([prefecture, areas]) => (
                    <optgroup key={prefecture} label={prefecture}>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <MapPicker location={location} onPick={(point) => applyLocation(point, "", "", { inferArea: true, message: "ピンの場所を釣果ポイントに設定しました。" })} />
              <p className="mt-3 text-sm text-slate-600">現在位置: 緯度 {formatCoordinate(location?.latitude)} / 経度 {formatCoordinate(location?.longitude)}</p>
              <label className="mt-3 block">
                <span className="text-sm font-bold">ポイント名（任意）</span>
                <input value={pointName} onChange={(event) => setPointName(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" placeholder="例: いつもの堤防先端" />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field label="緯度" type="number" value={manualLatitude} onChange={setManualLatitude} />
                <Field label="経度" type="number" value={manualLongitude} onChange={setManualLongitude} />
              </div>
              <button type="button" onClick={applyManualLocation} className="tap-target mt-3 w-full rounded border border-water bg-white px-4 py-3 text-sm font-black text-water">入力した場所を使う</button>
            </section>

            <button disabled={busy} className="tap-target w-full rounded bg-water px-5 py-4 text-lg font-black text-white shadow-soft disabled:opacity-60">
              {busy ? "保存中..." : "編集内容を保存"}
            </button>
          </form>
        ) : null}
      </main>
    </>
  );
}

function MapPicker({ location, onPick }: { location: LocationPoint | null; onPick: (point: LocationPoint) => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onPickRef = useRef(onPick);
  const initialLocationRef = useRef(location);
  const [message, setMessage] = useState("地図を読み込んでいます。");

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMessage("Google Maps APIキーが未設定です。");
        return;
      }
      const google = await new Loader({ apiKey, version: "weekly" }).load();
      if (!mounted || !mapRef.current) return;
      const initialLocation = initialLocationRef.current;
      const center = initialLocation ? { lat: initialLocation.latitude, lng: initialLocation.longitude } : { lat: 34.617, lng: 135.015 };
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: initialLocation ? 14 : 9,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "greedy"
      });
      mapInstanceRef.current = map;
      markerRef.current = new google.maps.Marker({ position: center, map, draggable: true });
      function setPoint(latLng: google.maps.LatLng) {
        const point = { latitude: latLng.lat(), longitude: latLng.lng() };
        markerRef.current?.setPosition(latLng);
        onPickRef.current(point);
        setMessage("ピンの場所を釣果ポイントに設定しました。");
      }
      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (event.latLng) setPoint(event.latLng);
      });
      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition();
        if (position) setPoint(position);
      });
      setMessage("地図をタップ、ピンを動かす、または地図中心を指定して場所を決められます。");
    }
    load().catch((error) => setMessage(error instanceof Error ? error.message : "地図を表示できませんでした。"));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!location || !mapInstanceRef.current || !markerRef.current) return;
    const nextPosition = { lat: location.latitude, lng: location.longitude };
    markerRef.current.setPosition(nextPosition);
    mapInstanceRef.current.panTo(nextPosition);
  }, [location]);

  function pickMapCenter() {
    const center = mapInstanceRef.current?.getCenter();
    if (!center) return;
    const point = { latitude: center.lat(), longitude: center.lng() };
    markerRef.current?.setPosition(center);
    onPickRef.current(point);
    setMessage("地図中心の場所を釣果ポイントに設定しました。");
  }

  return (
    <div className="mt-3">
      <div ref={mapRef} className="h-80 w-full rounded border border-teal-100 bg-white" />
      <button type="button" onClick={pickMapCenter} className="tap-target mt-2 w-full rounded border border-water bg-white px-4 py-3 text-sm font-black text-water">
        地図中心をピン位置にする
      </button>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" />
    </label>
  );
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
