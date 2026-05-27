import { getFishSizeRule } from "@/lib/fishSizeRules";
import type { AnomalyFinding, Catch, ProofFlag } from "@/types";

export const IMPOSSIBLE_TRAVEL_HOURS = 2;
export const IMPOSSIBLE_TRAVEL_DISTANCE_KM = 50;
export const POSTED_AT_FAR_FROM_CAUGHT_AT_HOURS = 24;

type CatchForAnomaly = Partial<Catch> & {
  id?: string;
  userId: string;
  imageHash?: string | null;
  photoUrl?: string | null;
  postedAt?: string | Date | null;
  createdAt?: string | Date | null;
  caughtAt?: string | Date | null;
};

export type CatchAnomalyContext = {
  previousCatches?: CatchForAnomaly[];
  tournamentAllowedAreaCodes?: string[];
  tournamentAllowedAreas?: string[];
  detectedAt?: Date;
};

export function detectCatchAnomalies(catchData: CatchForAnomaly, context: CatchAnomalyContext = {}): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];
  const detectedAt = context.detectedAt ?? new Date();

  findings.push(...detectDuplicateImage(catchData, context.previousCatches ?? [], detectedAt));
  findings.push(...detectImpossibleTravel(catchData, context.previousCatches ?? [], detectedAt));
  findings.push(...detectAbnormalSize(catchData, detectedAt));
  findings.push(...detectTournamentAreaMismatch(catchData, context, detectedAt));
  findings.push(...detectPostedAtFarFromCaughtAt(catchData, detectedAt));

  return uniqueFindings(findings);
}

export function getAnomalyFlagMessage(flag: ProofFlag) {
  const labels: Partial<Record<ProofFlag, string>> = {
    duplicate_image_suspected: "同じ画像が過去の投稿にも使用されている可能性があります",
    impossible_travel_suspected: "短時間で大きく離れた場所の釣果が投稿されています",
    abnormal_size_suspected: "魚種や入力値に対してサイズ確認が必要です",
    tournament_area_mismatch: "大会対象エリア外の釣果である可能性があります",
    posted_at_far_from_caught_at: "釣った日時と投稿日時の差が大きいです"
  };
  return labels[flag] ?? "確認が必要な項目です";
}

function detectDuplicateImage(catchData: CatchForAnomaly, previousCatches: CatchForAnomaly[], detectedAt: Date): AnomalyFinding[] {
  const imageKey = catchData.imageHash || catchData.imageUrl || catchData.photoUrl;
  if (!imageKey) return [];
  const matched = previousCatches.find((item) => {
    if (item.id && catchData.id && item.id === catchData.id) return false;
    if (item.userId !== catchData.userId) return false;
    const previousKey = item.imageHash || item.imageUrl || item.photoUrl;
    return Boolean(previousKey && previousKey === imageKey);
  });
  if (!matched) return [];
  return [
    createFinding("duplicate_image_suspected", "warning", "同じ画像が過去の投稿にも使用されている可能性があります", detectedAt, {
      matchedCatchId: matched.id ?? null
    })
  ];
}

function detectImpossibleTravel(catchData: CatchForAnomaly, previousCatches: CatchForAnomaly[], detectedAt: Date): AnomalyFinding[] {
  if (!isNumber(catchData.latitude) || !isNumber(catchData.longitude)) return [];
  const currentTime = getComparableTime(catchData);
  if (!currentTime) return [];

  const matched = previousCatches.find((item) => {
    if (item.id && catchData.id && item.id === catchData.id) return false;
    if (item.userId !== catchData.userId) return false;
    if (!isNumber(item.latitude) || !isNumber(item.longitude)) return false;
    const previousTime = getComparableTime(item);
    if (!previousTime) return false;
    const hours = Math.abs(currentTime.getTime() - previousTime.getTime()) / 3600000;
    if (hours > IMPOSSIBLE_TRAVEL_HOURS) return false;
    const distanceKm = getDistanceKm(catchData.latitude!, catchData.longitude!, item.latitude, item.longitude);
    return distanceKm >= IMPOSSIBLE_TRAVEL_DISTANCE_KM;
  });

  if (!matched || !isNumber(matched.latitude) || !isNumber(matched.longitude)) return [];
  return [
    createFinding("impossible_travel_suspected", "critical", "短時間で大きく離れた場所の釣果が投稿されています", detectedAt, {
      matchedCatchId: matched.id ?? null,
      thresholdHours: IMPOSSIBLE_TRAVEL_HOURS,
      thresholdDistanceKm: IMPOSSIBLE_TRAVEL_DISTANCE_KM,
      distanceKm: Math.round(getDistanceKm(catchData.latitude, catchData.longitude, matched.latitude, matched.longitude) * 10) / 10
    })
  ];
}

function detectAbnormalSize(catchData: CatchForAnomaly, detectedAt: Date): AnomalyFinding[] {
  const sizeCm = Number(catchData.sizeCm ?? 0);
  if (!Number.isFinite(sizeCm) || sizeCm <= 0) {
    return [createFinding("abnormal_size_suspected", "critical", "サイズが不正な値の可能性があります", detectedAt, { sizeCm })];
  }
  const rule = getFishSizeRule(catchData.fishType);
  if (!rule || sizeCm <= rule.maxSizeCm) return [];
  return [
    createFinding("abnormal_size_suspected", "warning", "魚種に対してサイズが大きすぎる可能性があります", detectedAt, {
      fishType: catchData.fishType ?? "",
      sizeCm,
      maxSizeCm: rule.maxSizeCm
    })
  ];
}

function detectTournamentAreaMismatch(catchData: CatchForAnomaly, context: CatchAnomalyContext, detectedAt: Date): AnomalyFinding[] {
  if (!catchData.isTournamentEntry) return [];
  const allowedAreaCodes = context.tournamentAllowedAreaCodes ?? [];
  const allowedAreas = context.tournamentAllowedAreas ?? [];
  if (!allowedAreaCodes.length && !allowedAreas.length) return [];

  const areaCodeOk = Boolean(catchData.areaCode && allowedAreaCodes.includes(catchData.areaCode));
  const areaNameOk = Boolean(catchData.areaName && allowedAreas.includes(catchData.areaName));
  if (areaCodeOk || areaNameOk) return [];

  return [
    createFinding("tournament_area_mismatch", "critical", "大会対象エリア外の釣果である可能性があります", detectedAt, {
      areaCode: catchData.areaCode ?? "",
      areaName: catchData.areaName ?? "",
      allowedAreaCodes,
      allowedAreas
    })
  ];
}

function detectPostedAtFarFromCaughtAt(catchData: CatchForAnomaly, detectedAt: Date): AnomalyFinding[] {
  const caughtAt = toDate(catchData.caughtAt);
  const postedAt = toDate(catchData.postedAt ?? catchData.createdAt);
  if (!caughtAt || !postedAt) return [];
  const hours = Math.abs(postedAt.getTime() - caughtAt.getTime()) / 3600000;
  if (hours < POSTED_AT_FAR_FROM_CAUGHT_AT_HOURS) return [];
  return [
    createFinding("posted_at_far_from_caught_at", "warning", "釣った日時と投稿日時の差が大きいです", detectedAt, {
      differenceHours: Math.round(hours * 10) / 10
    })
  ];
}

function createFinding(flag: ProofFlag, severity: AnomalyFinding["severity"], message: string, detectedAt: Date, details?: Record<string, unknown>): AnomalyFinding {
  return { flag, severity, message, details, detectedAt };
}

function uniqueFindings(findings: AnomalyFinding[]) {
  const seen = new Set<ProofFlag>();
  return findings.filter((finding) => {
    if (seen.has(finding.flag)) return false;
    seen.add(finding.flag);
    return true;
  });
}

function getComparableTime(catchData: CatchForAnomaly) {
  return toDate(catchData.caughtAt) ?? toDate(catchData.postedAt) ?? toDate(catchData.createdAt);
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
