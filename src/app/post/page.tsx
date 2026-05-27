"use client";

import { Loader } from "@googlemaps/js-api-loader";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { buildCatchProofPackage, calculateVerificationScore, checkRankingEligibility } from "@/lib/catchVerification";
import { createCatch, emptyTackleInfo, getUserCatches, updateCatchEnrichment, uploadCatchImage } from "@/lib/catches";
import { getFishingAreaById, getNearestFishingArea, groupedFishingAreas } from "@/lib/fishingAreas";
import { getPostableGroupsForUser } from "@/lib/groups";
import { getCurrentLocation, formatCoordinate } from "@/lib/location";
import { generateBlurredLocation, getAreaFromLocation, getDefaultBlurRadius } from "@/lib/locationBlur";
import { getLunarInfo } from "@/lib/lunar";
import { getOfficialCurrentReference } from "@/lib/officialCurrent";
import { getOfficialTideReference } from "@/lib/officialTide";
import { getLastPostGroupId, rememberLastPostGroupId } from "@/lib/postPreferences";
import { emptySeaTemperatureInfo, fetchSeaTemperatureInfo } from "@/lib/seaTemperature";
import { getUserTackles, tackleToTackleInfo } from "@/lib/tackles";
import { fetchTideInfo } from "@/lib/tide";
import { getJoinedTournaments, getTournament, isTournamentEntryEligible } from "@/lib/tournaments";
import { emptyWeatherInfo, fetchWeatherInfo } from "@/lib/weather";
import type { Catch, Group, LocationPoint, Tackle, TackleInfo, Tournament } from "@/types";

type LocationSuggestion = LocationPoint & {
  label: string;
  pointName: string;
  areaName: string;
};

type MeasurePoint = {
  x: number;
  y: number;
};

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
  const [tackleOptions, setTackleOptions] = useState<Tackle[]>([]);
  const [selectedTackleId, setSelectedTackleId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [measurementFile, setMeasurementFile] = useState<File | null>(null);
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [areaName, setAreaName] = useState("");
  const [pointName, setPointName] = useState("");
  const [tournamentOptions, setTournamentOptions] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [groupOptions, setGroupOptions] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
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
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showMeasurementPhoto, setShowMeasurementPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [successSummary, setSuccessSummary] = useState("");
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const selectedTournamentForUi = useMemo(
    () => tournamentOptions.find((item) => item.id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournamentOptions]
  );
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get("tournamentId") ?? "";
    Promise.all([getJoinedTournaments(userId), tournamentId ? getTournament(tournamentId) : Promise.resolve(null)])
      .then(([joined, linked]) => {
        const options = linked && !joined.some((item) => item.id === linked.id) ? [linked, ...joined] : joined;
        setTournamentOptions(options);
        if (tournamentId) setSelectedTournamentId(tournamentId);
      })
      .catch(() => setTournamentOptions([]));
  }, [userId]);

  useEffect(() => {
    getPostableGroupsForUser(userId)
      .then((groups) => {
        setGroupOptions(groups);
        const lastGroupId = getLastPostGroupId();
        if (lastGroupId && groups.some((group) => group.id === lastGroupId)) {
          setSelectedGroupId(lastGroupId);
        }
      })
      .catch(() => setGroupOptions([]));
  }, [userId]);

  useEffect(() => {
    getUserTackles(userId)
      .then((items) => {
        setTackleOptions(items);
        const defaultTackle = items.find((item) => item.isDefault);
        if (defaultTackle) {
          setSelectedTackleId(defaultTackle.id);
          setTackle(tackleToTackleInfo(defaultTackle));
        }
      })
      .catch(() => setTackleOptions([]));
  }, [userId]);

  function handleTackleSelect(tackleId: string) {
    setSelectedTackleId(tackleId);
    const selected = tackleOptions.find((item) => item.id === tackleId);
    if (selected) {
      setTackle(tackleToTackleInfo(selected));
      setMessage(`${selected.name} をタックルに反映しました。`);
    }
  }

  async function handleLocation() {
    setMessage("位置情報を取得しています。");
    try {
      const point = await getCurrentLocation();
      applyLocation(point, "", "", { inferArea: true, message: "位置情報を取得しました。" });
      setPointName("");
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
    applyLocation({ latitude, longitude }, "", "", { inferArea: true, message: "入力した位置を設定しました。" });
  }

  const applyLocation = useCallback((point: LocationPoint, nextPointName = "", nextAreaName = "", options: { inferArea?: boolean; message?: string } = {}) => {
    setLocation(point);
    setManualLatitude(String(point.latitude));
    setManualLongitude(String(point.longitude));
    if (nextPointName) setPointName(nextPointName);
    if (nextAreaName) {
      setAreaName(nextAreaName);
      const area = getNearestFishingArea(point);
      if (area && area.area.name === nextAreaName.replace(/^.+・/, "")) setSelectedAreaId(area.area.id);
    } else if (options.inferArea) {
      const nearest = getNearestFishingArea(point);
      if (nearest) {
        setSelectedAreaId(nearest.area.id);
        setAreaName(`${nearest.area.prefecture}・${nearest.area.name}`);
        setMessage(`${options.message ?? "位置を設定しました。"} 近くのエリアとして ${nearest.area.prefecture}・${nearest.area.name} を自動選択しました。`);
        return;
      }
    }
    setMessage(options.message ?? "過去の釣果地点を設定しました。");
  }, []);

  function handleAreaChange(areaId: string) {
    setSelectedAreaId(areaId);
    const area = getFishingAreaById(areaId);
    if (!area) return;
    applyLocation(area);
    setAreaName(`${area.prefecture}・${area.name}`);
    setPointName("");
    setMessage(`${area.prefecture}・${area.name} の代表地点を設定しました。必要なら地図でピンを微調整してください。`);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSuccessSummary("");
    setSubmitStage(file ? "写真をアップロードしています。" : "釣果を保存しています。");
    setMessage("");
    try {
      let imageUrl: string | null = null;
      if (file) imageUrl = await uploadCatchImage(userId, file);
      let measurementPhotoUrl: string | null = null;
      if (measurementFile) measurementPhotoUrl = await uploadCatchImage(userId, measurementFile);
      setSubmitStage("釣果を保存しています。");
      const caughtAtIso = new Date(caughtAt).toISOString();
      const emptyTideInfo = getEmptyTideInfo();
      const selectedTournament = tournamentOptions.find((item) => item.id === selectedTournamentId) ?? null;
      const tournamentCheck = selectedTournament
        ? isTournamentEntryEligible(selectedTournament, caughtAtIso, fishType, Number(sizeCm), location?.latitude != null && location?.longitude != null)
        : null;
      const hasTournamentSelection = Boolean(selectedTournament);
      const selectedGroup = groupOptions.find((item) => item.id === selectedGroupId) ?? null;
      const selectedGroupIds = selectedGroup ? [selectedGroup.id] : [];
      const selectedTackle = tackleOptions.find((item) => item.id === selectedTackleId) ?? null;
      const blurRadiusMeters = location ? getDefaultBlurRadius() : null;
      const blurredLocation = location && blurRadiusMeters ? generateBlurredLocation(location.latitude, location.longitude, blurRadiusMeters) : null;
      const inferredArea = location ? getAreaFromLocation(location.latitude, location.longitude) : { areaName: "", areaCode: "" };
      const savedAreaName = areaName || inferredArea.areaName;
      const savedFishType = fishType.trim();
      const savedSizeCm = Number(sizeCm);

      const baseCatchData: Omit<Catch, "id" | "createdAt"> = {
        userId,
        imageUrl,
        fishType: savedFishType,
        sizeCm: savedSizeCm,
        caughtAt: caughtAtIso,
        comment,
        tackle,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        publicLatitude: blurredLocation?.latitude ?? null,
        publicLongitude: blurredLocation?.longitude ?? null,
        locationVisibility: location?.latitude != null && location?.longitude != null ? "exact" : "hidden",
        areaName: savedAreaName,
        areaCode: inferredArea.areaCode,
        pointName: pointName.trim(),
        blurRadiusMeters,
        locationCreatedAt: location ? new Date().toISOString() : null,
        locationUpdatedAt: location ? new Date().toISOString() : null,
        isPublic: false,
        publicShareEnabledAt: null,
        tournamentId: hasTournamentSelection ? selectedTournamentId : null,
        isTournamentEntry: hasTournamentSelection,
        tournamentEntryStatus: hasTournamentSelection ? "pending" : "none",
        tournamentSubmittedAt: hasTournamentSelection ? new Date().toISOString() : null,
        groupIds: selectedGroupIds,
        primaryGroupId: selectedGroup?.id ?? null,
        postedByUserId: userId,
        actualAnglerUserId: userId,
        isProxyPost: false,
        proxyPostReason: "",
        tackleId: selectedTackle?.id ?? null,
        tackleName: selectedTackle?.name ?? "",
        measurementPhotoUrl,
        measurementMethod: measurementPhotoUrl ? "measurePhoto" : "manual",
        rod: tackle.rodName,
        reel: tackle.reelName,
        line: tackle.lineName,
        leader: tackle.leaderName,
        lure: [tackle.lureName, tackle.lureColor].filter(Boolean).join(" / "),
        weather: emptyWeatherInfo(),
        seaTemperature: emptySeaTemperatureInfo(),
        lunar: getLunarInfo(caughtAtIso),
        ...getOfficialCurrentReference(location?.latitude, location?.longitude, caughtAtIso),
        ...getOfficialTideReference(location?.latitude, location?.longitude, caughtAtIso),
        ...emptyTideInfo
      };
      const proofGeneratedAt = new Date().toISOString();
      const previousCatches = await getUserCatches(userId).catch(() => []);
      const catchProof = buildCatchProofPackage(
        { ...baseCatchData, createdAt: proofGeneratedAt },
        {
          generatedAt: proofGeneratedAt,
          tournamentStartAt: selectedTournament?.startAt ?? null,
          tournamentEndAt: selectedTournament?.endAt ?? null,
          tournamentTargetFishTypes: selectedTournament?.targetFishTypes ?? [],
          tournamentAllowedAreaCodes: selectedTournament?.allowedAreaCodes ?? [],
          tournamentAllowedAreas: selectedTournament?.allowedAreas ?? [],
          previousCatches
        }
      );
      const verificationScore = calculateVerificationScore(catchProof);
      const rankingEligibility = checkRankingEligibility(baseCatchData, verificationScore, { allowPendingTournamentEntry: true });
      const catchId = await createCatch({
        ...baseCatchData,
        catchProof,
        verificationScore,
        anomalyFindings: catchProof.anomalyFindings,
        rankingEligibility
      });

      rememberLastPostGroupId(selectedGroup?.id ?? "");
      enrichCatchAfterPost(catchId, location, caughtAtIso);

      setFishType("");
      setSizeCm("");
      setComment("");
      setFile(null);
      setMeasurementFile(null);
      setShowMeasurementPhoto(false);
      setCaughtAt(toLocalInputValue(new Date()));
      setSuccessSummary(`${savedFishType} ${savedSizeCm}cm を投稿しました。`);
      setMessage(`${buildPostMessage(selectedTournament, tournamentCheck, selectedGroup)} 潮位・天候・水温は裏側で追記中です。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "投稿に失敗しました。");
    } finally {
      setSubmitStage("");
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
          {preview ? <SizeEstimator imageUrl={preview} onApply={(value) => setSizeCm(value)} /> : null}

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

          {tournamentOptions.length ? (
            <section className="rounded border border-coral/30 bg-orange-50 p-4 shadow-soft">
              <h2 className="text-sm font-black text-coral">大会エントリー</h2>
              <select
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
                className="mt-3 w-full rounded border border-orange-200 bg-white p-3 text-base font-bold"
              >
                <option value="">通常投稿のみ</option>
                {tournamentOptions.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-600">期間内・対象魚種・位置情報ありの場合、大会投稿として承認待ち保存します。</p>
              {selectedTournamentForUi ? (
                <div className="mt-3 rounded border border-orange-200 bg-white p-3">
                  <p className="text-xs font-black text-coral">大会投稿の確認写真</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-600">メジャー写真があると、サイズ確認や承認時の判断に役立ちます。</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(true);
                      setShowMeasurementPhoto(true);
                    }}
                    className="tap-target mt-2 rounded border border-coral bg-white px-3 py-2 text-xs font-black text-coral"
                  >
                    {measurementFile ? "メジャー写真を変更" : "メジャー写真を追加"}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {groupOptions.length ? (
            <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
              <h2 className="text-sm font-black text-water">共有先グループ</h2>
              <select
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                className="mt-3 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold"
              >
                <option value="">自分だけの釣果ログ</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-600">前回選んだ共有先を次回も自動で選択します。秘密にしたい釣果は「自分だけ」を選んでください。</p>
            </section>
          ) : null}

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-water">使用タックルセット</h2>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-600">ジャンル別に登録したタックルセットから選ぶと、ロッド・リール・ラインを自動入力します。</p>
              </div>
              <Link href="/profile/tackles" className="shrink-0 rounded border border-water bg-white px-3 py-2 text-xs font-black text-water">
                管理
              </Link>
            </div>
            {tackleOptions.length ? (
              <select
                value={selectedTackleId}
                onChange={(event) => handleTackleSelect(event.target.value)}
                className="mt-3 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold"
              >
                <option value="">選択しない / 手入力</option>
                {groupTacklesByGenre(tackleOptions).map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}{item.lure ? ` / ${item.lure}` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <p className="mt-3 rounded bg-foam p-3 text-xs font-bold leading-5 text-slate-600">
                登録済みタックルはまだありません。よく使うセットを登録すると、投稿がかなり楽になります。
              </p>
            )}
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
            <h2 className="text-sm font-black">釣りエリアから場所指定</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              大まかな釣りエリアを選び、必要なら地図でピンを微調整できます。
            </p>
            <div className="mt-3">
              <label className="block">
                <span className="text-sm font-bold">エリア</span>
                <select
                  value={selectedAreaId}
                  onChange={(event) => handleAreaChange(event.target.value)}
                  className="mt-2 w-full rounded border border-slate-300 bg-white p-4 text-base font-bold"
                >
                  <option value="">選択してください</option>
                  {Object.entries(groupedFishingAreas()).map(([prefecture, areas]) => (
                    <optgroup key={prefecture} label={prefecture}>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" onClick={() => setShowMapPicker((value) => !value)} className="tap-target mt-3 w-full rounded bg-water px-4 py-3 text-sm font-black text-white">
              {showMapPicker ? "地図を閉じる" : "地図でピン指定"}
            </button>
            {showMapPicker ? <MapPicker location={location} onPick={(point) => applyLocation(point, "", "", { inferArea: true, message: "ピンの場所を投稿位置に設定しました。" })} /> : null}
            <p className="mt-3 text-sm text-slate-600">
              現在位置: 緯度 {formatCoordinate(location?.latitude)} / 経度 {formatCoordinate(location?.longitude)}
            </p>
            <label className="mt-3 block">
              <span className="text-sm font-bold">ポイント名（任意）</span>
              <input
                className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold"
                value={pointName}
                onChange={(event) => setPointName(event.target.value)}
                placeholder="例: いつもの堤防先端"
              />
            </label>
            <SuggestionLocationChips values={locationSuggestions} onPick={(value) => applyLocation(value, value.pointName, value.areaName)} />
          </section>

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <button type="button" onClick={() => setShowDetails((value) => !value)} className="tap-target flex w-full items-center justify-between rounded bg-foam px-4 py-3 text-left font-black">
              <span>詳細入力</span>
              <span>{showDetails ? "閉じる" : "開く"}</span>
            </button>

            {showDetails ? (
              <div className="mt-4 space-y-4">
                <Field label="釣った日時" type="datetime-local" value={caughtAt} onChange={setCaughtAt} required compact />

                <MeasurementPhotoInput
                  file={measurementFile}
                  open={showMeasurementPhoto}
                  recommended={Boolean(selectedTournamentForUi)}
                  onToggle={() => setShowMeasurementPhoto((value) => !value)}
                  onChange={setMeasurementFile}
                />

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
          <p className="rounded bg-white p-3 text-xs font-bold leading-5 text-slate-600 shadow-soft">
            位置情報は釣果記録・潮位取得・マップ表示のために保存されます。グループや大会での表示範囲は、それぞれの設定に従います。
          </p>

          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          {successSummary ? (
            <section className="rounded border border-water/20 bg-white p-4 shadow-soft" aria-live="polite">
              <p className="text-xs font-black text-water">投稿完了</p>
              <h2 className="mt-1 text-lg font-black text-ink">{successSummary}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                場所・エリア・共有先はそのまま残しています。続けて釣れた魚だけ入力すれば、すぐ次の投稿ができます。
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessSummary("");
                    setMessage("");
                    setCaughtAt(toLocalInputValue(new Date()));
                  }}
                  className="tap-target rounded bg-water px-4 py-3 text-sm font-black text-white"
                >
                  続けて投稿する
                </button>
                <Link href="/catches" className="tap-target rounded border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-ink">
                  一覧で確認
                </Link>
              </div>
            </section>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-teal-100 bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-xl">
              {busy && submitStage ? <SubmitProgress label={submitStage} /> : null}
              <button disabled={busy || !canQuickPost} className="tap-target flex w-full items-center justify-center gap-3 rounded bg-water px-5 py-4 text-lg font-black text-white shadow-soft disabled:opacity-60">
                {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
                {busy ? submitStage || "保存中..." : "すぐ投稿する"}
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
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "greedy"
      });
      mapInstanceRef.current = map;

      markerRef.current = new google.maps.Marker({
        position: center,
        map,
        draggable: true
      });

      function setPoint(latLng: google.maps.LatLng) {
        const point = { latitude: latLng.lat(), longitude: latLng.lng() };
        markerRef.current?.setPosition(latLng);
        onPickRef.current(point);
        setMessage("ピンの場所を投稿位置に設定しました。");
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

    load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "地図を表示できませんでした。");
    });

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
    setMessage("地図中心の場所を投稿位置に設定しました。");
  }

  return (
    <div className="mt-3">
      <div ref={mapRef} className="h-72 w-full rounded border border-teal-100 bg-white" />
      <button type="button" onClick={pickMapCenter} className="tap-target mt-2 w-full rounded border border-water bg-white px-4 py-3 text-sm font-black text-water">
        地図中心をピン位置にする
      </button>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p>
    </div>
  );
}

function SizeEstimator({ imageUrl, onApply }: { imageUrl: string; onApply: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [knownCm, setKnownCm] = useState("10");
  const [points, setPoints] = useState<MeasurePoint[]>([]);
  const estimatedSize = useMemo(() => estimateSizeCm(points, Number(knownCm)), [knownCm, points]);
  const stepLabels = ["メジャー始点", "メジャー終点", "魚の頭", "魚の尾"];
  const nextStepLabel = stepLabels[points.length] ?? "計算完了";

  function handlePick(event: PointerEvent<HTMLDivElement>) {
    if (points.length >= 4) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPoints((current) => [
      ...current,
      {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100
      }
    ]);
  }

  function applyEstimate() {
    if (estimatedSize == null) return;
    onApply(String(roundSize(estimatedSize)));
  }

  return (
    <section className="rounded border border-teal-100 bg-white p-3 shadow-soft">
      <div className="relative overflow-hidden rounded bg-teal-50">
        <img src={imageUrl} alt="投稿プレビュー" className="aspect-[4/3] w-full object-cover" />
        {open ? (
          <div className="absolute inset-0 cursor-crosshair" onPointerDown={handlePick}>
            {points.map((point, index) => (
              <span
                key={`${point.x}-${point.y}-${index}`}
                className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-coral text-xs font-black text-white ring-2 ring-white"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                {index + 1}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <button type="button" onClick={() => setOpen((value) => !value)} className="tap-target mt-2 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600">
        {open ? "サイズ推定を閉じる" : "サイズ推定(テスト)"}
      </button>

      {open ? (
        <div className="mt-2 space-y-2 rounded bg-foam p-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">メジャー基準 cm</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm font-bold"
              inputMode="decimal"
              value={knownCm}
              onChange={(event) => setKnownCm(event.target.value)}
              placeholder="例: 10"
            />
          </label>
          <p className="text-xs font-bold leading-5 text-slate-700">
            {points.length < 4 ? `${nextStepLabel}をタップしてください。` : `推定サイズ: ${roundSize(estimatedSize ?? 0)}cm`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPoints([])} className="tap-target rounded border border-slate-300 bg-white px-3 py-2 text-xs font-black text-ink">
              やり直す
            </button>
            <button
              type="button"
              disabled={estimatedSize == null}
              onClick={applyEstimate}
              className="tap-target rounded bg-water px-3 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              サイズに反映
            </button>
          </div>
          <p className="text-xs font-bold leading-5 text-slate-500">テスト機能です。1、2でメジャー、3、4で魚の両端を指定します。</p>
        </div>
      ) : null}
    </section>
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

function MeasurementPhotoInput({
  file,
  open,
  recommended,
  onToggle,
  onChange
}: {
  file: File | null;
  open: boolean;
  recommended: boolean;
  onToggle: () => void;
  onChange: (file: File | null) => void;
}) {
  return (
    <section className={`rounded p-3 ${recommended ? "border border-orange-200 bg-orange-50" : "bg-foam"}`}>
      <button type="button" onClick={onToggle} className="tap-target flex w-full items-center justify-between rounded bg-white px-3 py-3 text-left text-sm font-black text-ink">
        <span>{file ? "メジャー写真を選択済み" : "メジャー写真を追加"}</span>
        <span className="text-xs text-slate-500">{open ? "閉じる" : "任意"}</span>
      </button>
      {recommended ? <p className="mt-2 text-xs font-bold leading-5 text-coral">大会投稿では、サイズ確認写真があると承認時の確認がスムーズです。</p> : null}
      {open ? (
        <div className="mt-3">
          <input className="w-full rounded border border-slate-300 bg-white p-3 text-base" type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">メジャーと魚体全体が写る写真を登録すると、今後のサイズ確認や大会承認で役立ちます。</p>
          {file ? (
            <button type="button" onClick={() => onChange(null)} className="mt-2 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600">
              選択を外す
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
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
        className={`mt-2 w-full rounded border border-slate-300 bg-white font-bold ${compact || type === "datetime-local" ? "p-3 text-base" : "p-4 text-lg"}`}
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
  values: LocationSuggestion[];
  onPick: (value: LocationSuggestion) => void;
}) {
  if (!values.length) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {values.map((value) => (
        <button
          key={`${value.latitude}-${value.longitude}-${value.label}`}
          type="button"
          onClick={() => onPick(value)}
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
  const counts = new Map<
    string,
    { latitude: number; longitude: number; count: number; latestTime: number; pointNames: Map<string, number>; areaNames: Map<string, number> }
  >();
  items
    .filter((item) => item.latitude != null && item.longitude != null)
    .forEach((item) => {
      const latitude = item.latitude as number;
      const longitude = item.longitude as number;
      const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const caughtTime = new Date(item.caughtAt).getTime();
      const current = counts.get(key) ?? {
        latitude,
        longitude,
        count: 0,
        latestTime: 0,
        pointNames: new Map<string, number>(),
        areaNames: new Map<string, number>()
      };
      current.count += 1;
      current.latestTime = Math.max(current.latestTime, Number.isFinite(caughtTime) ? caughtTime : 0);
      if (item.pointName.trim()) current.pointNames.set(item.pointName.trim(), (current.pointNames.get(item.pointName.trim()) ?? 0) + 1);
      if (item.areaName.trim()) current.areaNames.set(item.areaName.trim(), (current.areaNames.get(item.areaName.trim()) ?? 0) + 1);
      counts.set(key, current);
    });

  return [...counts.values()]
    .sort((a, b) => b.latestTime - a.latestTime || b.count - a.count)
    .slice(0, limit)
    .map((value, index) => ({
      label: formatLocationSuggestionLabel(value, index),
      pointName: topMapValue(value.pointNames),
      areaName: topMapValue(value.areaNames),
      latitude: value.latitude,
      longitude: value.longitude
    }));
}

function formatLocationSuggestionLabel(
  value: { latitude: number; longitude: number; pointNames: Map<string, number>; areaNames: Map<string, number> },
  index: number
) {
  const pointName = topMapValue(value.pointNames);
  const areaName = topMapValue(value.areaNames);
  const coordinates = `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`;
  if (pointName) return `${pointName} (${coordinates})`;
  if (areaName) return `${areaName} (${coordinates})`;
  return `過去地点${index + 1} (${coordinates})`;
}

function topMapValue(values: Map<string, number>) {
  return [...values.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))[0]?.[0] ?? "";
}

function groupTacklesByGenre(items: Tackle[]) {
  const groups = new Map<string, Tackle[]>();
  items.forEach((item) => {
    const label = item.fishingGenre?.trim() || "ジャンル未設定";
    groups.set(label, [...(groups.get(label) ?? []), item]);
  });
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ja"))
    .map(([label, groupItems]) => ({ label, items: groupItems }));
}

function getTournamentSkipMessage(check: ReturnType<typeof isTournamentEntryEligible> | null) {
  if (!check) return "通常の釣果として保存しました。大会エントリー条件を確認できませんでした。";
  const reasons = [
    !check.inPeriod ? "大会期間外" : "",
    !check.targetMatched ? "対象魚種外" : "",
    !check.hasLocation ? "位置情報なし" : "",
    !check.validSize ? "サイズ未入力" : ""
  ].filter(Boolean);
  return `通常の釣果として保存しました。大会エントリー不可: ${reasons.join("、")}`;
}

function buildPostMessage(selectedTournament: Tournament | null, tournamentCheck: ReturnType<typeof isTournamentEntryEligible> | null, selectedGroup: Group | null) {
  const groupText = selectedGroup ? ` ${selectedGroup.name}にも共有しました。` : "";
  if (!selectedTournament) return `投稿しました。${groupText}`.trim();
  const tournamentText = tournamentCheck?.ok ? "大会投稿は承認待ちです。" : `${getTournamentSkipMessage(tournamentCheck)} 承認画面で確認できます。`;
  return `投稿しました。${tournamentText}${groupText}`;
}

function getEmptyTideInfo() {
  return {
    tideHeight: null,
    tideDirection: "unknown" as const,
    tidePhase: null,
    tidePhaseLabel: "潮位取得中",
    previousTideTime: null,
    previousTideType: "unknown" as const,
    nextTideTime: null,
    nextTideType: "unknown" as const,
    minutesToNextTide: null,
    tideStationName: null,
    tideStationDistance: null,
    tideApiProvider: "none" as const
  };
}

function enrichCatchAfterPost(catchId: string, location: LocationPoint | null, caughtAtIso: string) {
  void Promise.all([
    fetchTideInfo(location?.latitude ?? null, location?.longitude ?? null, caughtAtIso).catch(() => null),
    fetchWeatherInfo(location?.latitude ?? null, location?.longitude ?? null, caughtAtIso).catch(() => null),
    fetchSeaTemperatureInfo(location?.latitude ?? null, location?.longitude ?? null, caughtAtIso).catch(() => null)
  ]).then(([tideInfo, weather, seaTemperature]) => {
    updateCatchEnrichment(catchId, {
      ...(tideInfo ?? { ...getEmptyTideInfo(), tidePhaseLabel: "潮位未取得" }),
      weather: weather ?? emptyWeatherInfo(),
      seaTemperature: seaTemperature ?? emptySeaTemperatureInfo()
    }).catch(() => undefined);
  });
}

function SubmitProgress({ label }: { label: string }) {
  return (
    <div className="mb-2 overflow-hidden rounded border border-teal-100 bg-white p-3 shadow-soft" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-water">{label}</p>
        <p className="text-[11px] font-bold text-slate-500">画面を閉じずに少しお待ちください</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foam">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-water" />
      </div>
    </div>
  );
}

function estimateSizeCm(points: MeasurePoint[], knownCm: number) {
  if (points.length < 4 || !Number.isFinite(knownCm) || knownCm <= 0) return null;
  const rulerPixels = distance(points[0], points[1]);
  const fishPixels = distance(points[2], points[3]);
  if (!rulerPixels || !fishPixels) return null;
  return (fishPixels / rulerPixels) * knownCm;
}

function distance(a: MeasurePoint, b: MeasurePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function roundSize(value: number) {
  return Math.round(value * 10) / 10;
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
