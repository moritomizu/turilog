import { detectCatchAnomalies } from "@/lib/catchAnomalyDetection";
import type { Catch, CatchProofPackage, ProofFlag, VerificationLevel, VerificationScore } from "@/types";

type MeasurementMethod = "manual" | "measurePhoto" | "aiAssisted" | "unknown";

type CatchLike = Partial<Catch> & {
  id?: string;
  userId: string;
  sizeCm?: number;
  caughtAt?: string | Date | null;
  createdAt?: string | Date | null;
  postedAt?: string | Date | null;
  exif?: { capturedAt?: string | Date | null } | null;
  hasExif?: boolean;
  exifCapturedAt?: string | Date | null;
  accuracyMeters?: number | null;
  measurementMethod?: MeasurementMethod;
  measurementPhotoUrl?: string | null;
  imageHash?: string | null;
  photoUrl?: string | null;
};

type ProofContext = {
  generatedAt?: string | Date;
  now?: string | Date;
  locationSource?: "gps" | "map" | "manual" | "unknown";
  tournamentStartAt?: string | Date | null;
  tournamentEndAt?: string | Date | null;
  tournamentTargetFishTypes?: string[];
  tournamentAllowedAreaCodes?: string[];
  tournamentAllowedAreas?: string[];
  previousCatches?: CatchLike[];
};

type RankingEligibilityOptions = {
  minimumScore?: number;
  minimumLevel?: VerificationLevel;
  allowMissingLocation?: boolean;
  allowPendingTournamentEntry?: boolean;
};

const criticalFlags: ProofFlag[] = ["missing_photo", "missing_gps", "tournament_out_of_period", "tournament_target_fish_mismatch"];

export function buildCatchProofPackage(catchData: CatchLike, context: ProofContext = {}): CatchProofPackage {
  const caughtAt = toIsoString(catchData.caughtAt);
  const createdAt = toIsoString(catchData.postedAt ?? catchData.createdAt);
  const exifCapturedAt = toIsoString(catchData.exifCapturedAt ?? catchData.exif?.capturedAt);
  const flags = buildFlags(catchData, caughtAt, createdAt, context);
  const anomalyFindings = detectCatchAnomalies(catchData, {
    previousCatches: context.previousCatches ?? [],
    tournamentAllowedAreaCodes: context.tournamentAllowedAreaCodes ?? [],
    tournamentAllowedAreas: context.tournamentAllowedAreas ?? []
  });
  anomalyFindings.forEach((finding) => flags.push(finding.flag));

  return {
    proofVersion: "v1",
    catchId: catchData.id ?? null,
    userId: catchData.userId,
    image: {
      hasImage: Boolean(catchData.imageUrl),
      imageUrl: catchData.imageUrl ?? null,
      hasExif: catchData.hasExif === true || Boolean(catchData.exif),
      hasExifDateTime: Boolean(exifCapturedAt)
    },
    size: {
      fishType: catchData.fishType ?? "",
      sizeCm: Number(catchData.sizeCm ?? 0),
      hasValidSize: Number(catchData.sizeCm ?? 0) > 0,
      measurementMethod: catchData.measurementMethod ?? "manual",
      measurementPhotoUrl: catchData.measurementPhotoUrl ?? null
    },
    measurement: {
      measurementMethod: catchData.measurementMethod ?? "manual",
      hasMeasurementPhoto: Boolean(catchData.measurementPhotoUrl),
      measurementPhotoUrl: catchData.measurementPhotoUrl ?? null,
      sizeCm: Number(catchData.sizeCm ?? 0)
    },
    time: {
      caughtAt,
      createdAt,
      minutesFromCaughtToCreated: getMinutesBetween(caughtAt, createdAt)
    },
    location: {
      hasExactLocation: hasGps(catchData),
      hasBlurredLocation: isNumber(catchData.publicLatitude) && isNumber(catchData.publicLongitude),
      latitude: catchData.latitude ?? null,
      longitude: catchData.longitude ?? null,
      publicLatitude: catchData.publicLatitude ?? null,
      publicLongitude: catchData.publicLongitude ?? null,
      areaName: catchData.areaName ?? "",
      areaCode: catchData.areaCode ?? "",
      pointName: catchData.pointName ?? "",
      blurRadiusMeters: catchData.blurRadiusMeters ?? null,
      accuracyMeters: catchData.accuracyMeters ?? null
    },
    environment: {
      hasTideData: hasTideData(catchData),
      hasWeatherData: Boolean(catchData.weather?.weatherSourceName),
      hasSeaTemperatureData: catchData.seaTemperature?.seaTemperatureC != null,
      hasLunarData: catchData.lunar?.moonAge != null,
      tidePhaseLabel: catchData.tidePhaseLabel,
      weatherLabel: catchData.weather?.weatherLabel,
      seaTemperatureC: catchData.seaTemperature?.seaTemperatureC ?? null,
      moonAge: catchData.lunar?.moonAge ?? null
    },
    context: {
      tournamentId: catchData.tournamentId ?? null,
      isTournamentEntry: catchData.isTournamentEntry === true,
      tournamentEntryStatus: catchData.tournamentEntryStatus ?? "none",
      groupIds: catchData.groupIds ?? [],
      primaryGroupId: catchData.primaryGroupId ?? null,
      postedByUserId: catchData.postedByUserId ?? null,
      actualAnglerUserId: catchData.actualAnglerUserId ?? null,
      isProxyPost: catchData.isProxyPost === true,
      tournamentStartAt: toIsoString(context.tournamentStartAt) ?? null,
      tournamentEndAt: toIsoString(context.tournamentEndAt) ?? null,
      tournamentTargetFishTypes: context.tournamentTargetFishTypes ?? [],
      tournamentAllowedAreaCodes: context.tournamentAllowedAreaCodes ?? [],
      tournamentAllowedAreas: context.tournamentAllowedAreas ?? []
    },
    flags: [...new Set(flags)],
    anomalyFindings,
    generatedAt: toIsoString(context.generatedAt) ?? new Date().toISOString()
  };
}

export function calculateVerificationScore(proofPackage: CatchProofPackage): VerificationScore {
  const flags = new Set<ProofFlag>(proofPackage.flags);
  const messages: string[] = [];

  const mediaScore = scoreMedia(proofPackage, flags, messages);
  const gpsScore = scoreGps(proofPackage, flags, messages);
  const timeScore = scoreTime(proofPackage, flags, messages);
  const tideScore = scoreTide(proofPackage, flags, messages);
  const fishScore = scoreFish(proofPackage, flags, messages);
  const measurementScore = scoreMeasurement(proofPackage, flags, messages);
  const tournamentScore = scoreTournament(proofPackage, flags, messages);
  const anomalyFindings = proofPackage.anomalyFindings ?? [];
  anomalyFindings.forEach((finding) => {
    flags.add(finding.flag);
    if (!messages.includes(finding.message)) messages.push(finding.message);
  });

  const total = clampScore(mediaScore + gpsScore + timeScore + tideScore + fishScore + measurementScore + tournamentScore);
  const normalizedFlags = [...flags];
  const majorFlags = normalizedFlags.filter((flag) => criticalFlags.includes(flag));
  const level = getVerificationLevel(total, normalizedFlags);
  const breakdown = [
    scoreItem("mediaScore", "メディア証明", mediaScore),
    scoreItem("gpsScore", "GPS証明", gpsScore),
    scoreItem("timeScore", "時刻証明", timeScore),
    scoreItem("tideScore", "潮位証明", tideScore),
    scoreItem("fishScore", "魚種・サイズ", fishScore),
    scoreItem("measurementScore", "計測証明", measurementScore),
    scoreItem("tournamentScore", "大会条件", tournamentScore)
  ];

  const result: VerificationScore = {
    total,
    totalScore: total,
    level,
    flags: normalizedFlags,
    criticalFlags: majorFlags,
    messages,
    mediaScore,
    gpsScore,
    timeScore,
    tideScore,
    fishScore,
    measurementScore,
    tournamentScore,
    anomalyFindings,
    positiveScore: total,
    penaltyScore: 0,
    breakdown,
    calculatedAt: new Date().toISOString()
  };

  debugVerification("verificationScore", { breakdown, flags: normalizedFlags, level });
  return result;
}

export function getVerificationLevel(totalScore: number, flags: ProofFlag[]): VerificationLevel {
  if (hasCriticalFlag(flags) || totalScore <= 39) return "needs_review";
  if (totalScore >= 80) return "high";
  if (totalScore >= 60) return "medium";
  return "low";
}

export function checkRankingEligibility(catchData: CatchLike, verificationScore: VerificationScore, options: RankingEligibilityOptions = {}) {
  const minimumScore = options.minimumScore ?? 60;
  const checkedAt = new Date();
  const flags = verificationScore.flags ?? [];
  const total = verificationScore.total ?? verificationScore.totalScore;
  let result: { eligible: boolean; reason?: string; checkedAt: Date };

  if (total < minimumScore) {
    result = { eligible: false, reason: "信頼度スコア不足", checkedAt };
  } else if (flags.includes("missing_photo")) {
    result = { eligible: false, reason: "釣果写真不足", checkedAt };
  } else if (flags.includes("missing_gps")) {
    result = { eligible: false, reason: "GPS情報不足", checkedAt };
  } else if (flags.includes("tournament_out_of_period")) {
    result = { eligible: false, reason: "大会期間外", checkedAt };
  } else if (flags.includes("tournament_target_fish_mismatch")) {
    result = { eligible: false, reason: "対象魚種不一致", checkedAt };
  } else if (flags.includes("tournament_area_mismatch")) {
    result = { eligible: false, reason: "大会対象エリア外の可能性", checkedAt };
  } else if (hasCriticalFlag(flags)) {
    result = { eligible: false, reason: "重大な確認項目があります", checkedAt };
  } else {
    result = { eligible: true, checkedAt };
  }

  debugVerification("rankingEligibility", { catchId: catchData.id, flags, finalLevel: verificationScore.level, result });
  return result;
}

export function getVerificationScoreLabel(score: VerificationScore | VerificationLevel | number) {
  const level = typeof score === "number" ? getVerificationLevel(score, []) : typeof score === "string" ? score : score.level;
  if (level === "high" || level === "highTrust") return "高信頼";
  if (level === "medium" || level === "strong" || level === "standard") return "標準";
  if (level === "low" || level === "basic") return "低め";
  return "要確認";
}

export function getVerificationFlagLabel(flag: ProofFlag) {
  const labels: Record<ProofFlag, string> = {
    photo_present: "釣果写真あり",
    exif_present: "EXIFあり",
    exif_datetime_present: "EXIF撮影日時あり",
    gps_present: "GPS情報あり",
    gps_accuracy_good: "GPS精度100m以内",
    caught_at_present: "釣った日時あり",
    posted_at_present: "投稿日時あり",
    posted_at_close_to_caught_at: "投稿時刻と釣果時刻が近い",
    tide_present: "潮位情報あり",
    tide_direction_present: "潮向きあり",
    tide_phase_present: "潮の何分目あり",
    fish_type_present: "魚種あり",
    size_present: "サイズあり",
    measure_photo_method: "メジャー画像計測",
    measurement_photo_present: "サイズ確認用写真あり",
    not_tournament_entry: "通常釣果",
    tournament_in_period: "大会期間内",
    tournament_target_fish_match: "大会対象魚種と一致",
    tournament_entry_submitted: "大会エントリー済み",
    missing_photo: "釣果写真なし",
    missing_gps: "GPS情報なし",
    low_location_accuracy: "GPS精度が低い",
    posted_at_far_from_caught_at: "投稿時刻と釣果時刻の差が大きい",
    missing_tide: "潮位情報なし",
    missing_fish_type: "魚種なし",
    missing_size: "サイズなし",
    manual_measurement_only: "手入力サイズのみ",
    measurement_photo_missing: "サイズ確認用写真なし",
    tournament_out_of_period: "大会期間外",
    tournament_target_fish_mismatch: "大会対象魚種と不一致",
    duplicate_image_suspected: "同一画像の重複疑い",
    impossible_travel_suspected: "短時間の遠距離移動疑い",
    abnormal_size_suspected: "異常サイズ疑い",
    tournament_area_mismatch: "大会対象エリア外の疑い",
    hasPhoto: "釣果写真あり",
    hasExactLocation: "正確位置あり",
    hasBlurredLocation: "ぼかし位置あり",
    hasCaughtAt: "釣った日時あり",
    hasCreatedAt: "投稿日時あり",
    hasTideData: "潮位データあり",
    hasWeatherData: "気象データあり",
    hasSeaTemperatureData: "水温データあり",
    hasLunarData: "月齢データあり",
    hasTackleData: "タックル情報あり",
    hasTournamentEntry: "大会釣果",
    hasGroupContext: "グループ釣果",
    hasPointName: "ポイント名あり",
    missingPhoto: "釣果写真なし",
    missingLocation: "位置情報なし",
    missingCaughtAt: "釣った日時なし",
    missingSize: "サイズ未入力",
    suspiciousFutureCaughtAt: "未来日時の可能性",
    suspiciousCreatedBeforeCaught: "投稿日時が釣った日時より前",
    suspiciousHugeSize: "サイズが極端に大きい可能性",
    manualLocationOnly: "手入力位置の可能性",
    lowExternalData: "外部データが少ない"
  };
  return labels[flag];
}

function scoreMedia(proof: CatchProofPackage, flags: Set<ProofFlag>, messages: string[]) {
  let score = 0;
  if (proof.image.hasImage) {
    score += 10;
    flags.add("photo_present");
    messages.push("釣果写真を確認済み");
  } else {
    flags.add("missing_photo");
    messages.push("釣果写真なし");
  }
  if (proof.image.hasExif) {
    score += 3;
    flags.add("exif_present");
    messages.push("EXIF情報あり");
  }
  if (proof.image.hasExifDateTime) {
    score += 2;
    flags.add("exif_datetime_present");
    messages.push("EXIF撮影日時あり");
  }
  return Math.min(15, score);
}

function scoreGps(proof: CatchProofPackage, flags: Set<ProofFlag>, messages: string[]) {
  let score = 0;
  if (proof.location.hasExactLocation) {
    score += 15;
    flags.add("gps_present");
    messages.push("GPS情報を確認済み");
  } else {
    flags.add("missing_gps");
    messages.push("GPS情報不足");
  }
  if (isNumber(proof.location.accuracyMeters)) {
    if (proof.location.accuracyMeters <= 100) {
      score += 5;
      flags.add("gps_accuracy_good");
      messages.push("GPS精度100m以内");
    }
    if (proof.location.accuracyMeters >= 500) {
      flags.add("low_location_accuracy");
      messages.push("GPS精度が低い可能性");
    }
  }
  return Math.min(20, score);
}

function scoreTime(proof: CatchProofPackage, flags: Set<ProofFlag>, messages: string[]) {
  let score = 0;
  if (proof.time.caughtAt) {
    score += 8;
    flags.add("caught_at_present");
    messages.push("釣果時刻を確認済み");
  }
  if (proof.time.createdAt) {
    score += 4;
    flags.add("posted_at_present");
    messages.push("投稿時刻を確認済み");
  }
  const minutes = proof.time.minutesFromCaughtToCreated;
  if (minutes != null && Math.abs(minutes) <= 12 * 60) {
    score += 3;
    flags.add("posted_at_close_to_caught_at");
    messages.push("投稿時刻と釣果時刻の差が12時間以内");
  }
  if (minutes != null && Math.abs(minutes) >= 24 * 60) {
    flags.add("posted_at_far_from_caught_at");
    messages.push("投稿時刻と釣果時刻の差が大きい");
  }
  return Math.min(15, score);
}

function scoreTide(proof: CatchProofPackage, flags: Set<ProofFlag>, messages: string[]) {
  let score = 0;
  if (proof.environment.hasTideData) {
    score += 8;
    flags.add("tide_present");
    messages.push("潮位データを取得済み");
  } else {
    flags.add("missing_tide");
    messages.push("潮位情報なし");
  }
  if (proof.environment.hasTideData && proof.environment.tidePhaseLabel && !proof.environment.tidePhaseLabel.includes("未取得")) {
    score += 4;
    flags.add("tide_direction_present");
    messages.push("潮向きを確認済み");
    score += 3;
    flags.add("tide_phase_present");
    messages.push("潮の何分目を確認済み");
  }
  return Math.min(15, score);
}

function scoreFish(proof: CatchProofPackage, flags: Set<ProofFlag>, messages: string[]) {
  let score = 0;
  if (proof.size.fishType) {
    score += 5;
    flags.add("fish_type_present");
    messages.push("魚種入力あり");
  } else {
    flags.add("missing_fish_type");
    messages.push("魚種未入力");
  }
  if (proof.size.hasValidSize) {
    score += 5;
    flags.add("size_present");
    messages.push("サイズ入力あり");
  } else {
    flags.add("missing_size");
    messages.push("サイズ未入力");
  }
  return Math.min(10, score);
}

function scoreMeasurement(proof: CatchProofPackage, flags: Set<ProofFlag>, messages: string[]) {
  let score = 0;
  if (proof.size.hasValidSize) score += 4;
  const measurement = proof.measurement ?? {
    measurementMethod: proof.size.measurementMethod ?? "manual",
    hasMeasurementPhoto: Boolean(proof.size.measurementPhotoUrl),
    measurementPhotoUrl: proof.size.measurementPhotoUrl ?? null,
    sizeCm: proof.size.sizeCm
  };
  if (measurement.measurementMethod === "measurePhoto") {
    score += 4;
    flags.add("measure_photo_method");
    messages.push("メジャー画像による計測");
  } else {
    flags.add("manual_measurement_only");
    messages.push("手入力サイズのみ");
  }
  if (measurement.measurementPhotoUrl) {
    score += 2;
    flags.add("measurement_photo_present");
    messages.push("サイズ確認用写真あり");
  } else if (proof.context.isTournamentEntry) {
    flags.add("measurement_photo_missing");
    messages.push("大会投稿ですがサイズ確認用写真なし");
  }
  return Math.min(10, score);
}

function scoreTournament(proof: CatchProofPackage, flags: Set<ProofFlag>, messages: string[]) {
  if (!proof.context.isTournamentEntry) {
    flags.add("not_tournament_entry");
    messages.push("通常釣果のため大会条件チェック対象外");
    return 15;
  }

  let score = 0;
  if (isTournamentInPeriod(proof)) {
    score += 6;
    flags.add("tournament_in_period");
    messages.push("大会期間内");
  } else {
    flags.add("tournament_out_of_period");
    messages.push("大会期間外");
  }
  if (isTournamentTargetFishMatch(proof)) {
    score += 5;
    flags.add("tournament_target_fish_match");
    messages.push("大会対象魚種と一致");
  } else {
    flags.add("tournament_target_fish_mismatch");
    messages.push("大会対象魚種と不一致");
  }
  if (proof.context.tournamentEntryStatus === "pending" || proof.context.tournamentEntryStatus === "approved") {
    score += 4;
    flags.add("tournament_entry_submitted");
    messages.push("大会エントリー状態を確認済み");
  }
  return Math.min(15, score);
}

function buildFlags(catchData: CatchLike, caughtAt: string | null, createdAt: string | null, context: ProofContext) {
  const flags = new Set<ProofFlag>();
  if (!catchData.imageUrl) flags.add("missing_photo");
  if (!hasGps(catchData)) flags.add("missing_gps");
  if (isNumber(catchData.accuracyMeters) && catchData.accuracyMeters >= 500) flags.add("low_location_accuracy");
  if (!caughtAt) flags.add("missingCaughtAt");
  if (!catchData.fishType) flags.add("missing_fish_type");
  if (Number(catchData.sizeCm ?? 0) <= 0) flags.add("missing_size");
  if (!hasTideData(catchData)) flags.add("missing_tide");
  if (catchData.measurementMethod !== "measurePhoto") flags.add("manual_measurement_only");
  if (catchData.isTournamentEntry && !catchData.measurementPhotoUrl) flags.add("measurement_photo_missing");
  const minutes = getMinutesBetween(caughtAt, createdAt);
  if (minutes != null && Math.abs(minutes) >= 24 * 60) flags.add("posted_at_far_from_caught_at");
  if (catchData.isTournamentEntry) {
    const proofContext = {
      caughtAt,
      startAt: toIsoString(context.tournamentStartAt),
      endAt: toIsoString(context.tournamentEndAt),
      fishType: catchData.fishType,
      targetFishTypes: context.tournamentTargetFishTypes ?? []
    };
    if (!isTournamentInPeriodContext(proofContext)) flags.add("tournament_out_of_period");
    if (!isTournamentTargetFishMatchContext(proofContext)) flags.add("tournament_target_fish_mismatch");
  }
  if (context.locationSource === "manual") flags.add("manualLocationOnly");
  return [...flags];
}

function isTournamentInPeriod(proof: CatchProofPackage) {
  return isTournamentInPeriodContext({
    caughtAt: proof.time.caughtAt ?? null,
    startAt: proof.context.tournamentStartAt ?? null,
    endAt: proof.context.tournamentEndAt ?? null,
    fishType: "",
    targetFishTypes: []
  });
}

function isTournamentInPeriodContext(context: { caughtAt: string | null; startAt: string | null; endAt: string | null; fishType: string | undefined; targetFishTypes: string[] }) {
  if (!context.caughtAt || !context.startAt || !context.endAt) return false;
  const caught = new Date(context.caughtAt).getTime();
  return caught >= new Date(context.startAt).getTime() && caught <= new Date(context.endAt).getTime();
}

function isTournamentTargetFishMatch(proof: CatchProofPackage) {
  return isTournamentTargetFishMatchContext({
    caughtAt: proof.time.caughtAt ?? null,
    startAt: proof.context.tournamentStartAt ?? null,
    endAt: proof.context.tournamentEndAt ?? null,
    fishType: proof.size.fishType,
    targetFishTypes: proof.context.tournamentTargetFishTypes ?? []
  });
}

function isTournamentTargetFishMatchContext(context: { caughtAt: string | null; startAt: string | null; endAt: string | null; fishType: string | undefined; targetFishTypes: string[] }) {
  if (!context.targetFishTypes.length) return true;
  if (!context.fishType) return false;
  return context.targetFishTypes.includes(context.fishType);
}

function hasCriticalFlag(flags: ProofFlag[]) {
  return flags.some((flag) => criticalFlags.includes(flag));
}

function scoreItem(key: string, label: string, score: number) {
  return { key, label, score };
}

function hasGps(catchData: Pick<CatchLike, "latitude" | "longitude">) {
  return isNumber(catchData.latitude) && isNumber(catchData.longitude);
}

function hasTideData(catchData: Pick<CatchLike, "tideApiProvider" | "tideHeight">) {
  return catchData.tideApiProvider === "stormglass" || catchData.tideApiProvider === "worldtides" || isNumber(catchData.tideHeight);
}

function getMinutesBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(diff) ? Math.round(diff / 60000) : null;
}

function toIsoString(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function debugVerification(label: string, value: unknown) {
  if (process.env.NODE_ENV !== "production") console.debug(`[catchVerification] ${label}`, value);
}
