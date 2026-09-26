"use client";

import { Loader } from "@googlemaps/js-api-loader";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AuthGate } from "@/components/AuthGate";
import { FeedbackPrompt } from "@/components/FeedbackPrompt";
import { PageHeader } from "@/components/PageHeader";
import { buildCatchProofPackage, calculateVerificationScore, checkRankingEligibility } from "@/lib/catchVerification";
import { createCatch, emptyTackleInfo, getUserCatches, updateCatchEnrichment, uploadCatchImage, uploadMeasurementPhoto } from "@/lib/catches";
import { markAfterCatchFeedbackShown, shouldShowAfterCatchCreatedFeedback } from "@/lib/feedback";
import { getFishingAreaById, getNearestFishingArea, groupedFishingAreas } from "@/lib/fishingAreas";
import { getLocaleFromPathname, localizePath, type AppLocale } from "@/lib/i18n";
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
import { getJoinedTournaments, getTournament, getTournamentParticipants, isTournamentEntryEligible } from "@/lib/tournaments";
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

type PostDraft = {
  fishType: string;
  sizeCm: string;
  caughtAt: string;
  comment: string;
  tackle: TackleInfo;
  selectedTackleId: string;
  location: LocationPoint | null;
  manualLatitude: string;
  manualLongitude: string;
  selectedAreaId: string;
  areaName: string;
  pointName: string;
  boatName: string;
  selectedTournamentId: string;
  selectedGroupId: string;
  showDetails: boolean;
  showMeasurementPhoto: boolean;
  savedAt: string;
  unsent: boolean;
};

export default function PostPage() {
  return (
    <AuthGate>
      {(user) => <PostForm userId={user.uid} />}
    </AuthGate>
  );
}

function PostForm({ userId }: { userId: string }) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = useTranslations("post");
  const en = locale === "en";
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
  const [boatName, setBoatName] = useState("");
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
  const [draftReady, setDraftReady] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [successSummary, setSuccessSummary] = useState("");
  const [showPostFeedback, setShowPostFeedback] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const selectedTournamentForUi = useMemo(
    () => tournamentOptions.find((item) => item.id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournamentOptions]
  );
  const canQuickPost = fishType.trim().length > 0 && Number(sizeCm) > 0;

  useEffect(() => {
    let mounted = true;
    async function restoreDraft() {
      const draft = readPostDraft(userId);
      if (draft) {
        setFishType(draft.fishType);
        setSizeCm(draft.sizeCm);
        setCaughtAt(shouldPreserveDraftCaughtAt(draft) ? draft.caughtAt : toLocalInputValue(new Date()));
        setComment(draft.comment);
        setTackle(draft.tackle ?? emptyTackleInfo());
        setSelectedTackleId(draft.selectedTackleId);
        setLocation(draft.location);
        setManualLatitude(draft.manualLatitude);
        setManualLongitude(draft.manualLongitude);
        setSelectedAreaId(draft.selectedAreaId);
        setAreaName(draft.areaName);
        setPointName(draft.pointName);
        setBoatName(draft.boatName);
        setSelectedTournamentId(draft.selectedTournamentId);
        setSelectedGroupId(draft.selectedGroupId);
        setShowDetails(draft.showDetails);
        setShowMeasurementPhoto(draft.showMeasurementPhoto);
        setDraftNotice(draft.unsent
          ? tr(locale, "Your unsent catch was restored. Try posting again when your connection is stable.", "未送信の釣果を復元しました。通信が安定したらもう一度投稿できます。")
          : tr(locale, "Your previous draft was restored.", "前回の入力途中の内容を復元しました。"));
      }
      const [draftFile, draftMeasurementFile] = await Promise.all([readDraftFile(userId, "catchPhoto"), readDraftFile(userId, "measurementPhoto")]);
      if (!mounted) return;
      if (draftFile) setFile(draftFile);
      if (draftMeasurementFile) setMeasurementFile(draftMeasurementFile);
      setDraftReady(true);
    }

    restoreDraft().catch(() => setDraftReady(true));
    return () => {
      mounted = false;
    };
  }, [userId, en, locale]);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      const draft = buildPostDraft({
        fishType,
        sizeCm,
        caughtAt,
        comment,
        tackle,
        selectedTackleId,
        location,
        manualLatitude,
        manualLongitude,
        selectedAreaId,
        areaName,
        pointName,
        boatName,
        selectedTournamentId,
        selectedGroupId,
        showDetails,
        showMeasurementPhoto,
        unsent: readPostDraft(userId)?.unsent ?? false
      });
      if (hasDraftContent(draft) || file || measurementFile) {
        savePostDraft(userId, draft);
      } else {
        clearPostDraft(userId);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    userId,
    draftReady,
    fishType,
    sizeCm,
    caughtAt,
    comment,
    tackle,
    selectedTackleId,
    location,
    manualLatitude,
    manualLongitude,
    selectedAreaId,
    areaName,
    pointName,
    boatName,
    selectedTournamentId,
    selectedGroupId,
    showDetails,
    showMeasurementPhoto,
    file,
    measurementFile
  ]);

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
        setLocationSuggestions(topLocations(items, 6, locale));
      })
      .catch(() => {
        setFishSuggestions(en ? ["Sea bass", "Horse mackerel", "Rockfish", "Black sea bream", "Red sea bream", "Flounder"] : ["シーバス", "アジ", "メバル", "クロダイ", "マダイ", "ヒラメ"]);
      });
  }, [en, locale, userId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get("tournamentId") ?? "";
    Promise.all([
      getJoinedTournaments(userId),
      tournamentId ? getTournament(tournamentId) : Promise.resolve(null),
      tournamentId ? getTournamentParticipants(tournamentId) : Promise.resolve([])
    ])
      .then(([joined, linked, linkedParticipants]) => {
        const linkedParticipant = linkedParticipants.find((item) => item.userId === userId);
        const linkedPaymentOk = linked && (!linked.entryFeeEnabled || linkedParticipant?.paymentStatus === "paid" || linkedParticipant?.paymentStatus === "waived" || linked.ownerId === userId);
        const options = linked && linkedPaymentOk && !joined.some((item) => item.id === linked.id) ? [linked, ...joined] : joined;
        setTournamentOptions(options);
        if (tournamentId && linkedPaymentOk) setSelectedTournamentId(tournamentId);
        if (tournamentId && linked && !linkedPaymentOk) setMessage(tr(locale, "You can submit to this tournament after your entry payment is confirmed. You can still save a regular catch.", "参加費の支払い確認後に大会投稿できます。通常投稿として保存できます。"));
      })
      .catch(() => setTournamentOptions([]));
  }, [locale, userId]);

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
      setMessage(en ? `${selected.name} was applied to your tackle.` : `${selected.name} をタックルに反映しました。`);
    }
  }

  async function handleCatchPhotoChange(nextFile: File | null) {
    setFile(nextFile);
    setDraftNotice("");
    if (nextFile) {
      const photoDate = await readPhotoTakenAt(nextFile).catch(() => null);
      setCaughtAt(toLocalInputValue(photoDate ?? new Date()));
      setMessage(photoDate
        ? tr(locale, "The photo date was used as the catch time.", "写真の撮影日時を釣った日時に反映しました。")
        : tr(locale, "The photo date could not be read, so the current time was used.", "写真の撮影日時を読み取れなかったため、現在時刻を設定しました。"));
    } else {
      setCaughtAt(toLocalInputValue(new Date()));
    }
    await saveDraftFile(userId, "catchPhoto", nextFile).catch(() => undefined);
  }

  async function handleMeasurementPhotoChange(nextFile: File | null) {
    setMeasurementFile(nextFile);
    setDraftNotice("");
    await saveDraftFile(userId, "measurementPhoto", nextFile).catch(() => undefined);
  }

  async function handleLocation() {
    setMessage(tr(locale, "Getting your location...", "位置情報を取得しています。"));
    try {
      const point = await getCurrentLocation();
      applyLocation(point, "", "", { inferArea: true, message: tr(locale, "Location saved.", "位置情報を取得しました。") });
      setPointName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr(locale, "Could not get your location.", "位置情報を取得できませんでした。"));
    }
  }

  function applyManualLocation() {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setMessage(tr(locale, "Enter numeric latitude and longitude values.", "緯度と経度を数字で入力してください。"));
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setMessage(tr(locale, "Latitude must be between -90 and 90, and longitude between -180 and 180.", "緯度は-90〜90、経度は-180〜180の範囲で入力してください。"));
      return;
    }
    applyLocation({ latitude, longitude }, "", "", { inferArea: true, message: tr(locale, "The entered location was saved.", "入力した位置を設定しました。") });
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
        setMessage(en
          ? `${options.message ?? "Location saved."} ${nearest.area.prefecture} / ${nearest.area.name} was selected as the nearest area.`
          : `${options.message ?? "位置を設定しました。"} 近くのエリアとして ${nearest.area.prefecture}・${nearest.area.name} を自動選択しました。`);
        return;
      }
    }
    setMessage(options.message ?? tr(locale, "A previous catch location was selected.", "過去の釣果地点を設定しました。"));
  }, [en, locale]);

  function handleAreaChange(areaId: string) {
    setSelectedAreaId(areaId);
    const area = getFishingAreaById(areaId);
    if (!area) return;
    applyLocation(area);
    setAreaName(`${area.prefecture}・${area.name}`);
    setPointName("");
    setMessage(en ? `A representative point for ${area.prefecture} / ${area.name} was selected. Adjust the pin if needed.` : `${area.prefecture}・${area.name} の代表地点を設定しました。必要なら地図でピンを微調整してください。`);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSuccessSummary("");
    setSubmitStage(file ? tr(locale, "Uploading photo...", "写真をアップロードしています。") : tr(locale, "Saving catch...", "釣果を保存しています。"));
    setMessage("");
    try {
      let imageUrl: string | null = null;
      if (file) imageUrl = await uploadCatchImage(userId, file);
      let measurementPhotoUrl: string | null = null;
      if (measurementFile) measurementPhotoUrl = await uploadMeasurementPhoto(userId, measurementFile);
      setSubmitStage(tr(locale, "Saving catch...", "釣果を保存しています。"));
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
        boatName: boatName.trim(),
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
      const nextCatchCount = previousCatches.length + 1;
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
      setSuccessSummary(en ? `${savedFishType} · ${savedSizeCm} cm saved.` : `${savedFishType} ${savedSizeCm}cm を投稿しました。`);
      setMessage(`${buildPostMessage(selectedTournament, tournamentCheck, selectedGroup, locale)} ${tr(locale, "Tide, weather, and water temperature are being added in the background.", "潮位・天候・水温は裏側で追記中です。")}`);
      if (await shouldShowAfterCatchCreatedFeedback(userId, nextCatchCount).catch(() => false)) {
        await markAfterCatchFeedbackShown(userId).catch(() => undefined);
        setShowPostFeedback(true);
      } else {
        setShowPostFeedback(false);
      }
      clearPostDraft(userId);
      await Promise.all([saveDraftFile(userId, "catchPhoto", null), saveDraftFile(userId, "measurementPhoto", null)]).catch(() => undefined);
      setDraftNotice("");
    } catch (error) {
      savePostDraft(
        userId,
        buildPostDraft({
          fishType,
          sizeCm,
          caughtAt,
          comment,
          tackle,
          selectedTackleId,
          location,
          manualLatitude,
          manualLongitude,
          selectedAreaId,
          areaName,
          pointName,
          boatName,
          selectedTournamentId,
          selectedGroupId,
          showDetails,
          showMeasurementPhoto,
          unsent: true
        })
      );
      setDraftNotice(tr(locale, "This unsent catch was saved on your device. Try again from this screen when your connection is stable.", "未送信の釣果として端末に保持しました。通信が安定したら、この画面から再度投稿してください。"));
      setMessage(error instanceof Error
        ? `${error.message} ${tr(locale, "Your entries remain saved on this device.", "入力内容は端末に保持しています。")}`
        : tr(locale, "Could not save the catch. Your entries remain saved on this device.", "投稿に失敗しました。入力内容は端末に保持しています。"));
    } finally {
      setSubmitStage("");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={t("title")} actionHref={localizePath("/catches", locale)} actionLabel={t("list")} />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {draftNotice ? (
            <section className="rounded border border-orange-200 bg-orange-50 p-4 text-sm font-bold leading-6 text-slate-700 shadow-soft">
              <p className="text-xs font-black text-coral">OFFLINE SAVE</p>
              <p className="mt-1">{draftNotice}</p>
              <button
                type="button"
                onClick={async () => {
                  clearPostDraft(userId);
                  await Promise.all([saveDraftFile(userId, "catchPhoto", null), saveDraftFile(userId, "measurementPhoto", null)]).catch(() => undefined);
                  setFishType("");
                  setSizeCm("");
                  setComment("");
                  setFile(null);
                  setMeasurementFile(null);
                  setCaughtAt(toLocalInputValue(new Date()));
                  setDraftNotice("");
                  setMessage(tr(locale, "Draft discarded.", "下書きを破棄しました。"));
                }}
                className="mt-3 rounded border border-orange-200 bg-white px-3 py-2 text-xs font-black text-coral"
              >
                {tr(locale, "Discard this draft", "この下書きを破棄")}
              </button>
            </section>
          ) : null}
          <label className="block rounded border border-teal-100 bg-white p-4 shadow-soft">
            <span className="text-sm font-black">{t("photo")}</span>
            <input className="mt-3 w-full rounded border border-slate-300 bg-white p-3 text-base" type="file" accept="image/*" onChange={(e) => handleCatchPhotoChange(e.target.files?.[0] ?? null)} />
            <p className="mt-2 text-xs font-bold text-slate-500">{t("photoHelp")}</p>
          </label>
          {preview ? <SizeEstimator imageUrl={preview} locale={locale} onApply={(value) => setSizeCm(value)} /> : null}

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <Field label={t("fishType")} value={fishType} onChange={setFishType} placeholder={t("fishPlaceholder")} required listId="fish-suggestions" autoFocus />
            <datalist id="fish-suggestions">
              {fishSuggestions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <SuggestionChips values={fishSuggestions} onPick={setFishType} />
          </section>

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <Field label={t("size")} type="number" inputMode="decimal" value={sizeCm} onChange={setSizeCm} placeholder={t("sizePlaceholder")} required />
            <SizeStepper value={sizeCm} onChange={setSizeCm} />
          </section>

          {tournamentOptions.length ? (
            <section className="rounded border border-coral/30 bg-orange-50 p-4 shadow-soft">
              <h2 className="text-sm font-black text-coral">{tr(locale, "Tournament entry", "大会エントリー")}</h2>
              <select
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
                className="mt-3 w-full rounded border border-orange-200 bg-white p-3 text-base font-bold"
              >
                <option value="">{tr(locale, "Regular catch only", "通常投稿のみ")}</option>
                {tournamentOptions.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{tr(locale, "Eligible catches within the event period are submitted for tournament approval.", "期間内・対象魚種・位置情報ありの場合、大会投稿として承認待ち保存します。")}</p>
              {selectedTournamentForUi ? (
                <div className="mt-3 rounded border border-orange-200 bg-white p-3">
                  <p className="text-xs font-black text-coral">{tr(locale, "Tournament measurement photo", "大会投稿の確認写真")}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{tr(locale, "A photo showing the fish with a measuring device helps reviewers verify its size.", "メジャー写真があると、サイズ確認や承認時の判断に役立ちます。")}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(true);
                      setShowMeasurementPhoto(true);
                    }}
                    className="tap-target mt-2 rounded border border-coral bg-white px-3 py-2 text-xs font-black text-coral"
                  >
                    {measurementFile ? tr(locale, "Change measurement photo", "メジャー写真を変更") : tr(locale, "Add measurement photo", "メジャー写真を追加")}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {groupOptions.length ? (
            <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
              <h2 className="text-sm font-black text-water">{tr(locale, "Share with a group", "共有先グループ")}</h2>
              <select
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                className="mt-3 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold"
              >
                <option value="">{tr(locale, "Private catch log", "自分だけの釣果ログ")}</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{tr(locale, "Your last group selection is remembered. Keep the catch private if you do not want to share it.", "前回選んだ共有先を次回も自動で選択します。秘密にしたい釣果は「自分だけ」を選んでください。")}</p>
            </section>
          ) : null}

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-water">{tr(locale, "Tackle setup", "使用タックルセット")}</h2>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{tr(locale, "Choose a saved setup to fill in your rod, reel, line, and lure.", "ジャンル別に登録したタックルセットから選ぶと、ロッド・リール・ラインを自動入力します。")}</p>
              </div>
              <Link href={localizePath("/profile/tackles", locale)} className="shrink-0 rounded border border-water bg-white px-3 py-2 text-xs font-black text-water">
                {tr(locale, "Manage", "管理")}
              </Link>
            </div>
            {tackleOptions.length ? (
              <select
                value={selectedTackleId}
                onChange={(event) => handleTackleSelect(event.target.value)}
                className="mt-3 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold"
              >
                <option value="">{tr(locale, "None / enter manually", "選択しない / 手入力")}</option>
                {groupTacklesByGenre(tackleOptions, locale).map((group) => (
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
                {tr(locale, "You have no saved tackle setups yet. Save a frequently used setup to log catches faster.", "登録済みタックルはまだありません。よく使うセットを登録すると、投稿がかなり楽になります。")}
              </p>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <button type="button" onClick={handleLocation} className="tap-target rounded border border-water bg-white px-4 py-3 text-sm font-black text-water shadow-soft">
              {location ? t("locationReady") : t("getLocation")}
            </button>
            <button type="button" onClick={() => setCaughtAt(toLocalInputValue(new Date()))} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 text-sm font-black text-ink shadow-soft">
              {t("setTimeNow")}
            </button>
          </section>

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <h2 className="text-sm font-black">{t("areaTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t("areaDescription")}
            </p>
            <div className="mt-3">
              <label className="block">
                <span className="text-sm font-bold">{t("area")}</span>
                <select
                  value={selectedAreaId}
                  onChange={(event) => handleAreaChange(event.target.value)}
                  className="mt-2 w-full rounded border border-slate-300 bg-white p-4 text-base font-bold"
                >
                  <option value="">{t("selectArea")}</option>
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
              {showMapPicker ? t("closeMap") : t("openMap")}
            </button>
            {showMapPicker ? <MapPicker locale={locale} location={location} onPick={(point) => applyLocation(point, "", "", { inferArea: true, message: tr(locale, "The pin location was saved.", "ピンの場所を投稿位置に設定しました。") })} /> : null}
            <p className="mt-3 text-sm text-slate-600">
              {t("currentLocation")}: {tr(locale, "Lat", "緯度")} {formatCoordinate(location?.latitude)} / {tr(locale, "Lng", "経度")} {formatCoordinate(location?.longitude)}
            </p>
            <label className="mt-3 block">
              <span className="text-sm font-bold">{t("pointName")}</span>
              <input
                className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold"
                value={pointName}
                onChange={(event) => setPointName(event.target.value)}
                placeholder={tr(locale, "e.g. North pier", "例: いつもの堤防先端")}
              />
            </label>
            <SuggestionLocationChips values={locationSuggestions} onPick={(value) => applyLocation(value, value.pointName, value.areaName)} />
          </section>

          <section className="rounded border border-teal-100 bg-white p-4 shadow-soft">
            <button type="button" onClick={() => setShowDetails((value) => !value)} className="tap-target flex w-full items-center justify-between rounded bg-foam px-4 py-3 text-left font-black">
              <span>{t("details")}</span>
              <span>{showDetails ? t("close") : t("open")}</span>
            </button>

            {showDetails ? (
              <div className="mt-4 space-y-4">
                <Field label={t("caughtAt")} type="datetime-local" value={caughtAt} onChange={setCaughtAt} required compact />

                <Field label={t("boatName")} value={boatName} onChange={setBoatName} placeholder={t("boatPlaceholder")} compact />

                <MeasurementPhotoInput
                  locale={locale}
                  file={measurementFile}
                  open={showMeasurementPhoto}
                  recommended={Boolean(selectedTournamentForUi)}
                  onToggle={() => setShowMeasurementPhoto((value) => !value)}
                  onChange={handleMeasurementPhotoChange}
                />

                <section className="rounded bg-foam p-3">
                  <h2 className="text-sm font-black">{tr(locale, "Location", "場所")}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {tr(locale, "Lat", "緯度")} {formatCoordinate(location?.latitude)} / {tr(locale, "Lng", "経度")} {formatCoordinate(location?.longitude)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Field label={tr(locale, "Latitude", "緯度")} type="number" inputMode="decimal" value={manualLatitude} onChange={setManualLatitude} placeholder="35.454" />
                    <Field label={tr(locale, "Longitude", "経度")} type="number" inputMode="decimal" value={manualLongitude} onChange={setManualLongitude} placeholder="139.644" />
                  </div>
                  <button type="button" onClick={applyManualLocation} className="tap-target mt-3 w-full rounded border border-water bg-white px-4 py-3 text-sm font-black text-water">
                    {tr(locale, "Use this location", "入力した場所を使う")}
                  </button>
                </section>

                <section className="rounded bg-foam p-3">
                  <h2 className="text-sm font-black">{tr(locale, "Tackle", "タックル")}</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <TackleField label={tr(locale, "Lure / bait", "ルアー")} field="lureName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.lureName} placeholder={tr(locale, "e.g. Minnow 100F", "例: カゲロウ100F")} />
                    <TackleField label={tr(locale, "Color", "カラー")} field="lureColor" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.lureColor} placeholder={tr(locale, "e.g. Chartreuse", "例: チャートバック")} />
                    <TackleField label={tr(locale, "Rod", "ロッド")} field="rodName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.rodName} placeholder="e.g. 9.6ft ML" />
                    <TackleField label={tr(locale, "Reel", "リール")} field="reelName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.reelName} placeholder="e.g. 4000XG" />
                    <TackleField label={tr(locale, "Line", "ライン")} field="lineName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.lineName} placeholder={tr(locale, "e.g. PE 1.0", "例: PE1.0号")} />
                    <TackleField label={tr(locale, "Leader", "リーダー")} field="leaderName" tackle={tackle} setTackle={setTackle} suggestions={tackleSuggestions.leaderName} placeholder={tr(locale, "e.g. Fluorocarbon 20 lb", "例: フロロ20lb")} />
                  </div>
                </section>

                <label className="block">
                  <span className="text-sm font-bold">{t("comment")}</span>
                  <textarea className="mt-2 min-h-24 w-full rounded border border-slate-300 bg-white p-3 text-base" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} />
                </label>
                <SuggestionChips values={commentSuggestions} onPick={setComment} />
              </div>
            ) : (
              <div className="mt-3 text-sm leading-6 text-slate-600">
                <p>{tr(locale, "Date", "日時")}: {formatLocalDateTime(caughtAt, locale)}</p>
                <p>
                  {tr(locale, "Location", "位置")}: {tr(locale, "Lat", "緯度")} {formatCoordinate(location?.latitude)} / {tr(locale, "Lng", "経度")} {formatCoordinate(location?.longitude)}
                </p>
              </div>
            )}
          </section>

          {location ? <p className="rounded bg-foam p-3 text-sm font-bold leading-6 text-slate-700">{tr(locale, "Tide, official tide references, weather, and wind are added from the catch location and time.", "釣った場所と日時をもとに、潮位、公式潮汐曲線リンク、当時の天候、当時の風速を自動保存します。")}</p> : null}
          <p className="rounded bg-white p-3 text-xs font-bold leading-5 text-slate-600 shadow-soft">
            {tr(locale, "Location is stored for your catch log, tide lookup, and map. Sharing follows each group or tournament's visibility settings. Exact GPS coordinates are not included in public share images.", "位置情報は釣果記録・潮位取得・マップ表示のために保存されます。グループや大会での表示範囲は、それぞれの設定に従います。")}
          </p>

          {message ? <p className="rounded bg-foam p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          {successSummary ? (
            <section className="rounded border border-water/20 bg-white p-4 shadow-soft" aria-live="polite">
              <p className="text-xs font-black text-water">{tr(locale, "CATCH SAVED", "投稿完了")}</p>
              <h2 className="mt-1 text-lg font-black text-ink">{successSummary}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                {tr(locale, "Your location, area, and sharing destination remain selected so you can quickly log another catch.", "場所・エリア・共有先はそのまま残しています。続けて釣れた魚だけ入力すれば、すぐ次の投稿ができます。")}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessSummary("");
                    setMessage("");
                    setShowPostFeedback(false);
                    setCaughtAt(toLocalInputValue(new Date()));
                  }}
                  className="tap-target rounded bg-water px-4 py-3 text-sm font-black text-white"
                >
                  {tr(locale, "Log another catch", "続けて投稿する")}
                </button>
                <Link href={localizePath("/catches", locale)} className="tap-target rounded border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-ink">
                  {tr(locale, "View catch log", "一覧で確認")}
                </Link>
              </div>
              {showPostFeedback ? (
                <div className="mt-4">
                  <FeedbackPrompt
                    userId={userId}
                    trigger="after_catch_created"
                    category="catch_log"
                    onClose={() => setShowPostFeedback(false)}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-teal-100 bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-xl">
              {busy && submitStage ? <SubmitProgress label={submitStage} locale={locale} /> : null}
              <button disabled={busy || !canQuickPost} className="tap-target flex w-full items-center justify-center gap-3 rounded bg-water px-5 py-4 text-lg font-black text-white shadow-soft disabled:opacity-60">
                {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
                {busy ? submitStage || t("saving") : t("submit")}
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}

function MapPicker({ locale, location, onPick }: { locale: AppLocale; location: LocationPoint | null; onPick: (point: LocationPoint) => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onPickRef = useRef(onPick);
  const initialLocationRef = useRef(location);
  const [message, setMessage] = useState(tr(locale, "Loading map...", "地図を読み込んでいます。"));

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMessage(tr(locale, "Google Maps is not configured.", "Google Maps APIキーが未設定です。"));
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
        setMessage(tr(locale, "The pin location was saved.", "ピンの場所を投稿位置に設定しました。"));
      }

      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (event.latLng) setPoint(event.latLng);
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition();
        if (position) setPoint(position);
      });

      setMessage(tr(locale, "Tap the map, drag the pin, or use the map center to choose a location.", "地図をタップ、ピンを動かす、または地図中心を指定して場所を決められます。"));
    }

    load().catch((error) => {
      setMessage(error instanceof Error ? error.message : tr(locale, "Could not display the map.", "地図を表示できませんでした。"));
    });

    return () => {
      mounted = false;
    };
  }, [locale]);

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
    setMessage(tr(locale, "The map center was saved as the catch location.", "地図中心の場所を投稿位置に設定しました。"));
  }

  return (
    <div className="mt-3">
      <div ref={mapRef} className="h-72 w-full rounded border border-teal-100 bg-white" />
      <button type="button" onClick={pickMapCenter} className="tap-target mt-2 w-full rounded border border-water bg-white px-4 py-3 text-sm font-black text-water">
        {tr(locale, "Use map center", "地図中心をピン位置にする")}
      </button>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p>
    </div>
  );
}

function SizeEstimator({ imageUrl, locale, onApply }: { imageUrl: string; locale: AppLocale; onApply: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [knownCm, setKnownCm] = useState("10");
  const [points, setPoints] = useState<MeasurePoint[]>([]);
  const estimatedSize = useMemo(() => estimateSizeCm(points, Number(knownCm)), [knownCm, points]);
  const stepLabels = locale === "en" ? ["ruler start", "ruler end", "fish head", "fish tail"] : ["メジャー始点", "メジャー終点", "魚の頭", "魚の尾"];
  const nextStepLabel = stepLabels[points.length] ?? tr(locale, "complete", "計算完了");

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
        <img src={imageUrl} alt={tr(locale, "Catch preview", "投稿プレビュー")} className="aspect-[4/3] w-full object-cover" />
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
        {open ? tr(locale, "Close size estimate", "サイズ推定を閉じる") : tr(locale, "Estimate size (test)", "サイズ推定(テスト)")}
      </button>

      {open ? (
        <div className="mt-2 space-y-2 rounded bg-foam p-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">{tr(locale, "Known ruler length (cm)", "メジャー基準 cm")}</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm font-bold"
              inputMode="decimal"
              value={knownCm}
              onChange={(event) => setKnownCm(event.target.value)}
              placeholder={tr(locale, "e.g. 10", "例: 10")}
            />
          </label>
          <p className="text-xs font-bold leading-5 text-slate-700">
            {points.length < 4 ? tr(locale, `Tap the ${nextStepLabel}.`, `${nextStepLabel}をタップしてください。`) : tr(locale, `Estimated size: ${roundSize(estimatedSize ?? 0)} cm`, `推定サイズ: ${roundSize(estimatedSize ?? 0)}cm`)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPoints([])} className="tap-target rounded border border-slate-300 bg-white px-3 py-2 text-xs font-black text-ink">
              {tr(locale, "Reset", "やり直す")}
            </button>
            <button
              type="button"
              disabled={estimatedSize == null}
              onClick={applyEstimate}
              className="tap-target rounded bg-water px-3 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              {tr(locale, "Use this size", "サイズに反映")}
            </button>
          </div>
          <p className="text-xs font-bold leading-5 text-slate-500">{tr(locale, "Test feature: mark both ends of the ruler, then the head and tail of the fish.", "テスト機能です。1、2でメジャー、3、4で魚の両端を指定します。")}</p>
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
  locale,
  onToggle,
  onChange
}: {
  file: File | null;
  open: boolean;
  recommended: boolean;
  locale: AppLocale;
  onToggle: () => void;
  onChange: (file: File | null) => void;
}) {
  return (
    <section className={`rounded p-3 ${recommended ? "border border-orange-200 bg-orange-50" : "bg-foam"}`}>
      <button type="button" onClick={onToggle} className="tap-target flex w-full items-center justify-between rounded bg-white px-3 py-3 text-left text-sm font-black text-ink">
        <span>{file ? tr(locale, "Measurement photo selected", "メジャー写真を選択済み") : tr(locale, "Add measurement photo", "メジャー写真を追加")}</span>
        <span className="text-xs text-slate-500">{open ? tr(locale, "Close", "閉じる") : tr(locale, "Optional", "任意")}</span>
      </button>
      {recommended ? <p className="mt-2 text-xs font-bold leading-5 text-coral">{tr(locale, "A measurement photo helps tournament reviewers verify your catch.", "大会投稿では、サイズ確認写真があると承認時の確認がスムーズです。")}</p> : null}
      {open ? (
        <div className="mt-3">
          <input className="w-full rounded border border-slate-300 bg-white p-3 text-base" type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{tr(locale, "Use a photo showing the whole fish and measuring device. It remains private unless the applicable sharing settings allow it.", "メジャーと魚体全体が写る写真を登録すると、今後のサイズ確認や大会承認で役立ちます。")}</p>
          {file ? (
            <button type="button" onClick={() => onChange(null)} className="mt-2 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600">
              {tr(locale, "Remove", "選択を外す")}
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
  const inputClass = type === "datetime-local"
    ? "mt-2 block w-full min-w-0 max-w-full appearance-none rounded border border-slate-300 bg-white p-3 text-left text-[16px] font-bold leading-tight"
    : `mt-2 w-full rounded border border-slate-300 bg-white font-bold ${compact ? "p-3 text-base" : "p-4 text-lg"}`;

  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        required={required}
        className={inputClass}
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

function topLocations(items: Catch[], limit: number, locale: AppLocale) {
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
      label: formatLocationSuggestionLabel(value, index, locale),
      pointName: topMapValue(value.pointNames),
      areaName: topMapValue(value.areaNames),
      latitude: value.latitude,
      longitude: value.longitude
    }));
}

function formatLocationSuggestionLabel(
  value: { latitude: number; longitude: number; pointNames: Map<string, number>; areaNames: Map<string, number> },
  index: number,
  locale: AppLocale
) {
  const pointName = topMapValue(value.pointNames);
  const areaName = topMapValue(value.areaNames);
  const coordinates = `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`;
  if (pointName) return `${pointName} (${coordinates})`;
  if (areaName) return `${areaName} (${coordinates})`;
  return locale === "en" ? `Previous location ${index + 1} (${coordinates})` : `過去地点${index + 1} (${coordinates})`;
}

function topMapValue(values: Map<string, number>) {
  return [...values.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))[0]?.[0] ?? "";
}

function groupTacklesByGenre(items: Tackle[], locale: AppLocale) {
  const groups = new Map<string, Tackle[]>();
  items.forEach((item) => {
    const label = item.fishingGenre?.trim() || tr(locale, "Uncategorized", "ジャンル未設定");
    groups.set(label, [...(groups.get(label) ?? []), item]);
  });
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ja"))
    .map(([label, groupItems]) => ({ label, items: groupItems }));
}

function getTournamentSkipMessage(check: ReturnType<typeof isTournamentEntryEligible> | null, locale: AppLocale) {
  if (!check) return tr(locale, "Saved as a regular catch because tournament eligibility could not be checked.", "通常の釣果として保存しました。大会エントリー条件を確認できませんでした。");
  const reasons = [
    !check.inPeriod ? tr(locale, "outside event period", "大会期間外") : "",
    !check.targetMatched ? tr(locale, "fish not eligible", "対象魚種外") : "",
    !check.hasLocation ? tr(locale, "location missing", "位置情報なし") : "",
    !check.validSize ? tr(locale, "size missing", "サイズ未入力") : ""
  ].filter(Boolean);
  return locale === "en" ? `Saved as a regular catch. Not eligible for the tournament: ${reasons.join(", ")}.` : `通常の釣果として保存しました。大会エントリー不可: ${reasons.join("、")}`;
}

function buildPostMessage(selectedTournament: Tournament | null, tournamentCheck: ReturnType<typeof isTournamentEntryEligible> | null, selectedGroup: Group | null, locale: AppLocale) {
  const groupText = selectedGroup ? (locale === "en" ? ` Shared with ${selectedGroup.name}.` : ` ${selectedGroup.name}にも共有しました。`) : "";
  if (!selectedTournament) return `${tr(locale, "Catch saved.", "投稿しました。")}${groupText}`.trim();
  const tournamentText = tournamentCheck?.ok
    ? tr(locale, " The tournament entry is awaiting approval.", "大会投稿は承認待ちです。")
    : `${getTournamentSkipMessage(tournamentCheck, locale)} ${tr(locale, "You can review it from the approval screen.", "承認画面で確認できます。")}`;
  return `${tr(locale, "Catch saved.", "投稿しました。")}${tournamentText}${groupText}`;
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

function SubmitProgress({ label, locale }: { label: string; locale: AppLocale }) {
  return (
    <div className="mb-2 overflow-hidden rounded border border-teal-100 bg-white p-3 shadow-soft" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-water">{label}</p>
        <p className="text-[11px] font-bold text-slate-500">{tr(locale, "Keep this screen open", "画面を閉じずに少しお待ちください")}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foam">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-water" />
      </div>
    </div>
  );
}

function buildPostDraft(value: Omit<PostDraft, "savedAt">): PostDraft {
  return { ...value, savedAt: new Date().toISOString() };
}

function hasDraftContent(draft: PostDraft) {
  return Boolean(
    draft.fishType.trim() ||
      draft.sizeCm.trim() ||
      draft.comment.trim() ||
      draft.pointName.trim() ||
      draft.boatName.trim() ||
      Object.values(draft.tackle).some((value) => String(value ?? "").trim())
  );
}

function postDraftKey(userId: string) {
  return `tsurilog:postDraft:${userId}`;
}

function readPostDraft(userId: string): PostDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(postDraftKey(userId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PostDraft>;
    return {
      fishType: data.fishType ?? "",
      sizeCm: data.sizeCm ?? "",
      caughtAt: data.caughtAt ?? toLocalInputValue(new Date()),
      comment: data.comment ?? "",
      tackle: data.tackle ?? emptyTackleInfo(),
      selectedTackleId: data.selectedTackleId ?? "",
      location: data.location ?? null,
      manualLatitude: data.manualLatitude ?? "",
      manualLongitude: data.manualLongitude ?? "",
      selectedAreaId: data.selectedAreaId ?? "",
      areaName: data.areaName ?? "",
      pointName: data.pointName ?? "",
      boatName: data.boatName ?? "",
      selectedTournamentId: data.selectedTournamentId ?? "",
      selectedGroupId: data.selectedGroupId ?? "",
      showDetails: Boolean(data.showDetails),
      showMeasurementPhoto: Boolean(data.showMeasurementPhoto),
      savedAt: data.savedAt ?? new Date().toISOString(),
      unsent: Boolean(data.unsent)
    };
  } catch {
    return null;
  }
}

function shouldPreserveDraftCaughtAt(draft: PostDraft) {
  return draft.unsent && Boolean(draft.caughtAt);
}

function savePostDraft(userId: string, draft: PostDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(postDraftKey(userId), JSON.stringify(draft));
}

function markDraftAsUnsent(userId: string) {
  const draft = readPostDraft(userId);
  if (!draft) return;
  savePostDraft(userId, { ...draft, unsent: true, savedAt: new Date().toISOString() });
}

function clearPostDraft(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(postDraftKey(userId));
}

type DraftFileKind = "catchPhoto" | "measurementPhoto";

function draftFileKey(userId: string, kind: DraftFileKind) {
  return `${userId}:${kind}`;
}

function openDraftDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("tsurilog-offline-drafts", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDraftFile(userId: string, kind: DraftFileKind, file: File | null) {
  const db = await openDraftDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    const store = transaction.objectStore("files");
    const request = file ? store.put(file, draftFileKey(userId, kind)) : store.delete(draftFileKey(userId, kind));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function readDraftFile(userId: string, kind: DraftFileKind): Promise<File | null> {
  const db = await openDraftDb();
  if (!db) return null;
  const file = await new Promise<File | null>((resolve, reject) => {
    const transaction = db.transaction("files", "readonly");
    const request = transaction.objectStore("files").get(draftFileKey(userId, kind));
    request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
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

function formatLocalDateTime(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    year: "numeric",
    month: locale === "en" ? "short" : "2-digit",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function tr(locale: AppLocale, english: string, japanese: string) {
  return locale === "en" ? english : japanese;
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

async function readPhotoTakenAt(file: File): Promise<Date | null> {
  if (!file.type.includes("jpeg") && !file.type.includes("jpg")) return null;
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;
    if ((marker & 0xff00) !== 0xff00) return null;
    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > view.byteLength) return null;
    if (marker === 0xffe1) {
      const exifDate = readExifDate(view, offset + 2, segmentLength - 2);
      if (exifDate) return exifDate;
    }
    offset += segmentLength;
  }
  return null;
}

function readExifDate(view: DataView, start: number, length: number): Date | null {
  if (length < 14 || readAscii(view, start, 6) !== "Exif\0\0") return null;
  const tiffStart = start + 6;
  const byteOrder = readAscii(view, tiffStart, 2);
  const littleEndian = byteOrder === "II";
  if (!littleEndian && byteOrder !== "MM") return null;
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null;
  const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const firstIfdStart = tiffStart + firstIfdOffset;
  const exifIfdOffset = readIfdValue(view, firstIfdStart, tiffStart, littleEndian, 0x8769);
  const dateTimeOriginal = exifIfdOffset ? readIfdAsciiValue(view, tiffStart + exifIfdOffset, tiffStart, littleEndian, 0x9003) : "";
  const dateTimeDigitized = exifIfdOffset ? readIfdAsciiValue(view, tiffStart + exifIfdOffset, tiffStart, littleEndian, 0x9004) : "";
  const dateTime = readIfdAsciiValue(view, firstIfdStart, tiffStart, littleEndian, 0x0132);
  return parseExifDate(dateTimeOriginal || dateTimeDigitized || dateTime);
}

function readIfdValue(view: DataView, ifdStart: number, tiffStart: number, littleEndian: boolean, tag: number) {
  if (ifdStart <= 0 || ifdStart + 2 > view.byteLength) return 0;
  const count = view.getUint16(ifdStart, littleEndian);
  for (let index = 0; index < count; index += 1) {
    const entry = ifdStart + 2 + index * 12;
    if (entry + 12 > view.byteLength) return 0;
    if (view.getUint16(entry, littleEndian) !== tag) continue;
    const componentCount = view.getUint32(entry + 4, littleEndian);
    const rawValue = view.getUint32(entry + 8, littleEndian);
    return componentCount <= 4 ? entry + 8 - tiffStart : rawValue;
  }
  return 0;
}

function readIfdAsciiValue(view: DataView, ifdStart: number, tiffStart: number, littleEndian: boolean, tag: number) {
  if (ifdStart <= 0 || ifdStart + 2 > view.byteLength) return "";
  const count = view.getUint16(ifdStart, littleEndian);
  for (let index = 0; index < count; index += 1) {
    const entry = ifdStart + 2 + index * 12;
    if (entry + 12 > view.byteLength) return "";
    if (view.getUint16(entry, littleEndian) !== tag) continue;
    const valueLength = view.getUint32(entry + 4, littleEndian);
    const valueOffset = valueLength <= 4 ? entry + 8 : tiffStart + view.getUint32(entry + 8, littleEndian);
    return readAscii(view, valueOffset, valueLength).replace(/\0+$/, "").trim();
  }
  return "";
}

function readAscii(view: DataView, start: number, length: number) {
  if (start < 0 || length <= 0 || start + length > view.byteLength) return "";
  let value = "";
  for (let index = 0; index < length; index += 1) value += String.fromCharCode(view.getUint8(start + index));
  return value;
}

function parseExifDate(value: string) {
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(date.getTime()) ? null : date;
}
