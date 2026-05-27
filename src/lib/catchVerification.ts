import type { Catch, CatchProofPackage, ProofFlag, VerificationLevel, VerificationScore } from "@/types";

type CatchLike = Partial<Catch> & {
  id?: string;
  userId: string;
  sizeCm?: number;
  caughtAt?: string | Date | null;
  createdAt?: string | Date | null;
};

type ProofContext = {
  generatedAt?: string | Date;
  now?: string | Date;
  locationSource?: "gps" | "map" | "manual" | "unknown";
};

type RankingEligibilityOptions = {
  minimumLevel?: VerificationLevel;
  minimumScore?: number;
  allowMissingLocation?: boolean;
  allowPendingTournamentEntry?: boolean;
};

const levelOrder: VerificationLevel[] = ["unverified", "basic", "standard", "strong", "highTrust"];

export function buildCatchProofPackage(catchData: CatchLike, context: ProofContext = {}): CatchProofPackage {
  const caughtAt = toIsoString(catchData.caughtAt);
  const createdAt = toIsoString(catchData.createdAt);
  const flags = buildFlags(catchData, caughtAt, createdAt, context);

  return {
    catchId: catchData.id,
    userId: catchData.userId,
    image: {
      hasImage: Boolean(catchData.imageUrl),
      imageUrl: catchData.imageUrl ?? null
    },
    size: {
      sizeCm: Number(catchData.sizeCm ?? 0),
      hasValidSize: Number(catchData.sizeCm ?? 0) > 0
    },
    time: {
      caughtAt,
      createdAt,
      minutesFromCaughtToCreated: getMinutesBetween(caughtAt, createdAt)
    },
    location: {
      hasExactLocation: isNumber(catchData.latitude) && isNumber(catchData.longitude),
      hasBlurredLocation: isNumber(catchData.publicLatitude) && isNumber(catchData.publicLongitude),
      latitude: catchData.latitude ?? null,
      longitude: catchData.longitude ?? null,
      publicLatitude: catchData.publicLatitude ?? null,
      publicLongitude: catchData.publicLongitude ?? null,
      areaName: catchData.areaName ?? "",
      areaCode: catchData.areaCode ?? "",
      pointName: catchData.pointName ?? "",
      blurRadiusMeters: catchData.blurRadiusMeters ?? null
    },
    environment: {
      hasTideData: catchData.tideApiProvider === "stormglass" || catchData.tideApiProvider === "worldtides",
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
      tournamentEntryStatus: catchData.tournamentEntryStatus,
      groupIds: catchData.groupIds ?? [],
      primaryGroupId: catchData.primaryGroupId ?? null,
      postedByUserId: catchData.postedByUserId,
      actualAnglerUserId: catchData.actualAnglerUserId,
      isProxyPost: catchData.isProxyPost === true
    },
    flags,
    generatedAt: toIsoString(context.generatedAt) ?? new Date().toISOString()
  };
}

export function calculateVerificationScore(proofPackage: CatchProofPackage): VerificationScore {
  const breakdown = [
    scoreItem("image", "釣果写真あり", proofPackage.image.hasImage ? 18 : 0),
    scoreItem("size", "サイズ入力あり", proofPackage.size.hasValidSize ? 10 : 0),
    scoreItem("caughtAt", "釣った日時あり", proofPackage.time.caughtAt ? 12 : 0),
    scoreItem("createdAt", "投稿日時あり", proofPackage.time.createdAt ? 6 : 0),
    scoreItem("exactLocation", "正確位置あり", proofPackage.location.hasExactLocation ? 18 : 0),
    scoreItem("area", "エリア情報あり", proofPackage.location.areaName ? 6 : 0),
    scoreItem("tide", "潮位データあり", proofPackage.environment.hasTideData ? 8 : 0),
    scoreItem("weather", "気象データあり", proofPackage.environment.hasWeatherData ? 5 : 0),
    scoreItem("seaTemperature", "水温データあり", proofPackage.environment.hasSeaTemperatureData ? 4 : 0),
    scoreItem("lunar", "月齢データあり", proofPackage.environment.hasLunarData ? 3 : 0),
    scoreItem("context", "大会/グループ文脈あり", proofPackage.context.isTournamentEntry || proofPackage.context.groupIds.length > 0 ? 5 : 0),
    scoreItem("pointName", "ポイント名あり", proofPackage.location.pointName ? 3 : 0)
  ];
  const positiveScore = clampScore(breakdown.reduce((sum, item) => sum + Math.max(0, item.score), 0));
  const penaltyScore = getPenaltyScore(proofPackage.flags);
  const totalScore = clampScore(positiveScore - penaltyScore);
  const level = getVerificationLevel(totalScore, proofPackage.flags);

  return {
    totalScore,
    level,
    flags: proofPackage.flags,
    positiveScore,
    penaltyScore,
    breakdown,
    calculatedAt: new Date().toISOString()
  };
}

export function getVerificationLevel(totalScore: number, flags: ProofFlag[]): VerificationLevel {
  if (flags.includes("missingPhoto") || flags.includes("missingSize")) return totalScore >= 45 ? "basic" : "unverified";
  if (flags.includes("suspiciousFutureCaughtAt") || flags.includes("suspiciousCreatedBeforeCaught")) return totalScore >= 60 ? "standard" : "basic";
  if (totalScore >= 85) return "highTrust";
  if (totalScore >= 70) return "strong";
  if (totalScore >= 50) return "standard";
  if (totalScore >= 30) return "basic";
  return "unverified";
}

export function checkRankingEligibility(
  catchData: CatchLike,
  verificationScore: VerificationScore,
  options: RankingEligibilityOptions = {}
) {
  const minimumLevel = options.minimumLevel ?? "standard";
  const minimumScore = options.minimumScore ?? 50;
  const checkedAt = new Date();

  if (Number(catchData.sizeCm ?? 0) <= 0) return { eligible: false, reason: "サイズが未入力です。", checkedAt };
  if (!catchData.imageUrl) return { eligible: false, reason: "釣果写真がありません。", checkedAt };
  if (!options.allowMissingLocation && (!isNumber(catchData.latitude) || !isNumber(catchData.longitude))) {
    return { eligible: false, reason: "正確な位置情報がありません。", checkedAt };
  }
  if (catchData.isTournamentEntry && !options.allowPendingTournamentEntry && catchData.tournamentEntryStatus !== "approved") {
    return { eligible: false, reason: "大会釣果が承認済みではありません。", checkedAt };
  }
  if (verificationScore.totalScore < minimumScore) {
    return { eligible: false, reason: `信頼度スコアが不足しています（${verificationScore.totalScore}点）。`, checkedAt };
  }
  if (levelOrder.indexOf(verificationScore.level) < levelOrder.indexOf(minimumLevel)) {
    return { eligible: false, reason: `信頼度レベルが不足しています（${getVerificationScoreLabel(verificationScore)}）。`, checkedAt };
  }
  return { eligible: true, checkedAt };
}

export function getVerificationScoreLabel(score: VerificationScore | VerificationLevel | number) {
  const level = typeof score === "number" ? getVerificationLevel(score, []) : typeof score === "string" ? score : score.level;
  if (level === "highTrust") return "高信頼";
  if (level === "strong") return "強い証明";
  if (level === "standard") return "標準";
  if (level === "basic") return "簡易";
  return "未証明";
}

export function getVerificationFlagLabel(flag: ProofFlag) {
  const labels: Record<ProofFlag, string> = {
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

function buildFlags(catchData: CatchLike, caughtAt: string | null, createdAt: string | null, context: ProofContext) {
  const flags = new Set<ProofFlag>();
  const hasExactLocation = isNumber(catchData.latitude) && isNumber(catchData.longitude);
  const hasBlurredLocation = isNumber(catchData.publicLatitude) && isNumber(catchData.publicLongitude);
  const externalCount = [
    catchData.tideApiProvider === "stormglass" || catchData.tideApiProvider === "worldtides",
    Boolean(catchData.weather?.weatherSourceName),
    catchData.seaTemperature?.seaTemperatureC != null,
    catchData.lunar?.moonAge != null
  ].filter(Boolean).length;

  addFlag(flags, Boolean(catchData.imageUrl), "hasPhoto", "missingPhoto");
  addFlag(flags, hasExactLocation, "hasExactLocation", "missingLocation");
  if (hasBlurredLocation) flags.add("hasBlurredLocation");
  addFlag(flags, Boolean(caughtAt), "hasCaughtAt", "missingCaughtAt");
  if (createdAt) flags.add("hasCreatedAt");
  if (Number(catchData.sizeCm ?? 0) <= 0) flags.add("missingSize");
  if (Number(catchData.sizeCm ?? 0) >= 300) flags.add("suspiciousHugeSize");
  if (catchData.tideApiProvider === "stormglass" || catchData.tideApiProvider === "worldtides") flags.add("hasTideData");
  if (catchData.weather?.weatherSourceName) flags.add("hasWeatherData");
  if (catchData.seaTemperature?.seaTemperatureC != null) flags.add("hasSeaTemperatureData");
  if (catchData.lunar?.moonAge != null) flags.add("hasLunarData");
  if (catchData.tackleName || catchData.rod || catchData.reel || catchData.lure || catchData.tackleId) flags.add("hasTackleData");
  if (catchData.isTournamentEntry) flags.add("hasTournamentEntry");
  if ((catchData.groupIds ?? []).length > 0) flags.add("hasGroupContext");
  if (catchData.pointName) flags.add("hasPointName");
  if (context.locationSource === "manual") flags.add("manualLocationOnly");
  if (externalCount <= 1) flags.add("lowExternalData");
  if (caughtAt && new Date(caughtAt).getTime() > getNowMs(context) + 10 * 60 * 1000) flags.add("suspiciousFutureCaughtAt");
  if (caughtAt && createdAt && new Date(createdAt).getTime() + 60 * 1000 < new Date(caughtAt).getTime()) flags.add("suspiciousCreatedBeforeCaught");

  return [...flags];
}

function getPenaltyScore(flags: ProofFlag[]) {
  const penalties: Partial<Record<ProofFlag, number>> = {
    missingPhoto: 25,
    missingLocation: 18,
    missingCaughtAt: 15,
    missingSize: 30,
    suspiciousFutureCaughtAt: 35,
    suspiciousCreatedBeforeCaught: 25,
    suspiciousHugeSize: 20,
    manualLocationOnly: 5,
    lowExternalData: 5
  };
  return flags.reduce((sum, flag) => sum + (penalties[flag] ?? 0), 0);
}

function scoreItem(key: string, label: string, score: number) {
  return { key, label, score };
}

function addFlag(flags: Set<ProofFlag>, condition: boolean, positive: ProofFlag, negative: ProofFlag) {
  flags.add(condition ? positive : negative);
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

function getNowMs(context: ProofContext) {
  const value = toIsoString(context.now);
  return value ? new Date(value).getTime() : Date.now();
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
