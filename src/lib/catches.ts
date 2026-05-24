"use client";

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { emptyLunarInfo } from "@/lib/lunar";
import { emptyOfficialCurrentReference } from "@/lib/officialCurrent";
import { emptySeaTemperatureInfo } from "@/lib/seaTemperature";
import { emptyWeatherInfo } from "@/lib/weather";
import type { Catch, LunarInfo, OfficialCurrentReference, OfficialTideReference, SeaTemperatureInfo, TackleInfo, TideInfo, WeatherInfo } from "@/types";

export async function uploadCatchImage(userId: string, file: File) {
  const storageRef = ref(getFirebaseStorage(), `catches/${userId}/${crypto.randomUUID()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createCatch(data: Omit<Catch, "id" | "createdAt">) {
  await addDoc(collection(getFirebaseDb(), "catches"), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function getUserCatches(userId: string): Promise<Catch[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "catches"), where("userId", "==", userId)));
  return snapshot.docs.map((item) => normalizeCatchDoc(item.id, item.data())).sort((a, b) => getSortableTime(b) - getSortableTime(a));
}

export async function getCatchById(catchId: string): Promise<Catch | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "catches", catchId));
  return snapshot.exists() ? normalizeCatchDoc(snapshot.id, snapshot.data()) : null;
}

export async function getTournamentCatches(tournamentId: string): Promise<Catch[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "catches"), where("tournamentId", "==", tournamentId)));
  return snapshot.docs.map((item) => normalizeCatchDoc(item.id, item.data())).sort((a, b) => getSortableTime(b) - getSortableTime(a));
}

export async function getGroupCatches(groupId: string): Promise<Catch[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "catches"), where("groupIds", "array-contains", groupId)));
  return snapshot.docs.map((item) => normalizeCatchDoc(item.id, item.data())).sort((a, b) => getSortableTime(b) - getSortableTime(a));
}

export async function updateCatch(
  catchId: string,
  data: Partial<
    Pick<
      Catch,
      | "fishType"
      | "sizeCm"
      | "comment"
      | "caughtAt"
      | "actualAnglerUserId"
      | "groupIds"
      | "primaryGroupId"
      | "latitude"
      | "longitude"
      | "publicLatitude"
      | "publicLongitude"
      | "locationVisibility"
      | "areaName"
      | "areaCode"
      | "pointName"
      | "blurRadiusMeters"
      | "locationUpdatedAt"
    >
  >
) {
  const db = getFirebaseDb();
  await updateDoc(doc(db, "catches", catchId), data);
  const publicRef = doc(db, "publicCatches", catchId);
  const publicSnapshot = await getDoc(publicRef);
  if (publicSnapshot.exists()) {
    await updateDoc(publicRef, data);
  }
}

export async function deleteCatch(catchId: string) {
  const db = getFirebaseDb();
  await Promise.all([deleteDoc(doc(db, "catches", catchId)), deleteDoc(doc(db, "publicCatches", catchId))]);
}

export async function updateTournamentEntryStatus(catchId: string, status: Catch["tournamentEntryStatus"]) {
  await updateDoc(doc(getFirebaseDb(), "catches", catchId), {
    tournamentEntryStatus: status
  });
}

export async function getPublicCatch(catchId: string): Promise<Catch | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "publicCatches", catchId));
  if (!snapshot.exists()) return null;
  const item = normalizeCatchDoc(snapshot.id, snapshot.data());
  return item.isPublic ? item : null;
}

export async function updateCatchPublicStatus(catchId: string, userId: string, isPublic: boolean) {
  const catchRef = doc(getFirebaseDb(), "catches", catchId);
  const snapshot = await getDoc(catchRef);
  if (!snapshot.exists()) throw new Error("釣果が見つかりませんでした。");
  if (snapshot.data().userId !== userId) throw new Error("この釣果を更新する権限がありません。");
  const publicRef = doc(getFirebaseDb(), "publicCatches", catchId);
  await updateDoc(catchRef, {
    isPublic,
    publicShareEnabledAt: isPublic ? new Date().toISOString() : null
  });
  if (isPublic) {
    await setDoc(publicRef, sanitizeCatchForEmbed(normalizeCatchDoc(snapshot.id, snapshot.data())));
  } else {
    await deleteDoc(publicRef);
  }
}

function normalizeCatchDoc(id: string, data: Record<string, unknown>): Catch {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "",
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
    fishType: typeof data.fishType === "string" ? data.fishType : "",
    sizeCm: Number(data.sizeCm ?? 0),
    caughtAt: normalizeDate(data.caughtAt),
    comment: typeof data.comment === "string" ? data.comment : "",
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    publicLatitude: typeof data.publicLatitude === "number" ? data.publicLatitude : null,
    publicLongitude: typeof data.publicLongitude === "number" ? data.publicLongitude : null,
    locationVisibility: data.locationVisibility === "public" || data.locationVisibility === "hidden" ? data.locationVisibility : "exact",
    areaName: typeof data.areaName === "string" ? data.areaName : "",
    areaCode: typeof data.areaCode === "string" ? data.areaCode : "",
    pointName: typeof data.pointName === "string" ? data.pointName : "",
    blurRadiusMeters: typeof data.blurRadiusMeters === "number" ? data.blurRadiusMeters : null,
    locationCreatedAt: typeof data.locationCreatedAt === "string" ? data.locationCreatedAt : null,
    locationUpdatedAt: typeof data.locationUpdatedAt === "string" ? data.locationUpdatedAt : null,
    isPublic: data.isPublic === true,
    publicShareEnabledAt: typeof data.publicShareEnabledAt === "string" ? data.publicShareEnabledAt : null,
    tournamentId: typeof data.tournamentId === "string" ? data.tournamentId : null,
    isTournamentEntry: data.isTournamentEntry === true,
    tournamentEntryStatus:
      data.tournamentEntryStatus === "pending" || data.tournamentEntryStatus === "approved" || data.tournamentEntryStatus === "rejected"
        ? data.tournamentEntryStatus
        : "none",
    tournamentSubmittedAt: typeof data.tournamentSubmittedAt === "string" ? data.tournamentSubmittedAt : null,
    groupIds: Array.isArray(data.groupIds) ? data.groupIds.filter((item): item is string => typeof item === "string") : [],
    primaryGroupId: typeof data.primaryGroupId === "string" ? data.primaryGroupId : null,
    postedByUserId: typeof data.postedByUserId === "string" ? data.postedByUserId : typeof data.userId === "string" ? data.userId : "",
    actualAnglerUserId: typeof data.actualAnglerUserId === "string" ? data.actualAnglerUserId : typeof data.userId === "string" ? data.userId : "",
    isProxyPost: data.isProxyPost === true,
    proxyPostReason: typeof data.proxyPostReason === "string" ? data.proxyPostReason : "",
    createdAt: normalizeDate(data.createdAt),
    weather: normalizeWeather(data.weather),
    seaTemperature: normalizeSeaTemperature(data.seaTemperature),
    lunar: normalizeLunar(data.lunar),
    tackle: normalizeTackle(data.tackle),
    ...normalizeTide(data),
    ...normalizeOfficialTideReference(data),
    ...normalizeOfficialCurrentReference(data)
  };
}

function sanitizeCatchForEmbed(item: Catch): Omit<Catch, "id"> {
  return {
    ...item,
    latitude: null,
    longitude: null,
    pointName: "",
    isPublic: true,
    publicShareEnabledAt: new Date().toISOString()
  };
}

function getSortableTime(item: Catch) {
  const caughtAt = new Date(item.caughtAt).getTime();
  if (Number.isFinite(caughtAt)) return caughtAt;
  const createdAt = new Date(item.createdAt).getTime();
  return Number.isFinite(createdAt) ? createdAt : 0;
}

function normalizeDate(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  }
  return new Date().toISOString();
}

function normalizeTide(data: Record<string, unknown>): TideInfo {
  return {
    tideHeight: typeof data.tideHeight === "number" ? data.tideHeight : null,
    tideDirection: data.tideDirection === "rising" || data.tideDirection === "falling" ? data.tideDirection : "unknown",
    tidePhase: typeof data.tidePhase === "number" ? (data.tidePhase as TideInfo["tidePhase"]) : null,
    tidePhaseLabel: typeof data.tidePhaseLabel === "string" ? data.tidePhaseLabel : "潮位未取得",
    previousTideTime: typeof data.previousTideTime === "string" ? data.previousTideTime : null,
    previousTideType: data.previousTideType === "high" || data.previousTideType === "low" ? data.previousTideType : "unknown",
    nextTideTime: typeof data.nextTideTime === "string" ? data.nextTideTime : null,
    nextTideType: data.nextTideType === "high" || data.nextTideType === "low" ? data.nextTideType : "unknown",
    minutesToNextTide: typeof data.minutesToNextTide === "number" ? data.minutesToNextTide : null,
    tideStationName: typeof data.tideStationName === "string" ? data.tideStationName : null,
    tideStationDistance: typeof data.tideStationDistance === "number" ? data.tideStationDistance : null,
    tideApiProvider: data.tideApiProvider === "stormglass" || data.tideApiProvider === "worldtides" ? data.tideApiProvider : "none"
  };
}

function normalizeOfficialTideReference(data: Record<string, unknown>): OfficialTideReference {
  return {
    officialTideStationName: typeof data.officialTideStationName === "string" ? data.officialTideStationName : null,
    officialTideStationDistance: typeof data.officialTideStationDistance === "number" ? data.officialTideStationDistance : null,
    officialTideCurveUrl: typeof data.officialTideCurveUrl === "string" ? data.officialTideCurveUrl : null,
    officialTideSourceName: typeof data.officialTideSourceName === "string" ? data.officialTideSourceName : null,
    officialTideDate: typeof data.officialTideDate === "string" ? data.officialTideDate : null
  };
}

function normalizeOfficialCurrentReference(data: Record<string, unknown>): OfficialCurrentReference {
  const empty = emptyOfficialCurrentReference();
  return {
    officialCurrentStationName: typeof data.officialCurrentStationName === "string" ? data.officialCurrentStationName : empty.officialCurrentStationName,
    officialCurrentStationDistance: typeof data.officialCurrentStationDistance === "number" ? data.officialCurrentStationDistance : empty.officialCurrentStationDistance,
    officialCurrentCurveUrl: typeof data.officialCurrentCurveUrl === "string" ? data.officialCurrentCurveUrl : empty.officialCurrentCurveUrl,
    officialCurrentSourceName: typeof data.officialCurrentSourceName === "string" ? data.officialCurrentSourceName : empty.officialCurrentSourceName,
    officialCurrentDate: typeof data.officialCurrentDate === "string" ? data.officialCurrentDate : empty.officialCurrentDate,
    officialCurrentNote: typeof data.officialCurrentNote === "string" ? data.officialCurrentNote : empty.officialCurrentNote
  };
}

function normalizeWeather(value: unknown): WeatherInfo {
  if (!value || typeof value !== "object") return emptyWeatherInfo();
  const data = value as Record<string, unknown>;
  return {
    weatherLabel: typeof data.weatherLabel === "string" ? data.weatherLabel : "天候未取得",
    weatherCode: typeof data.weatherCode === "number" ? data.weatherCode : null,
    temperatureC: typeof data.temperatureC === "number" ? data.temperatureC : null,
    precipitationMm: typeof data.precipitationMm === "number" ? data.precipitationMm : null,
    cloudCoverPercent: typeof data.cloudCoverPercent === "number" ? data.cloudCoverPercent : null,
    windSpeedMs: typeof data.windSpeedMs === "number" ? data.windSpeedMs : null,
    windDirectionDeg: typeof data.windDirectionDeg === "number" ? data.windDirectionDeg : null,
    windDirectionLabel: typeof data.windDirectionLabel === "string" ? data.windDirectionLabel : null,
    windGustMs: typeof data.windGustMs === "number" ? data.windGustMs : null,
    weatherSourceName: typeof data.weatherSourceName === "string" ? data.weatherSourceName : null,
    weatherSourceUrl: typeof data.weatherSourceUrl === "string" ? data.weatherSourceUrl : null,
    weatherFetchedAt: typeof data.weatherFetchedAt === "string" ? data.weatherFetchedAt : null
  };
}

function normalizeSeaTemperature(value: unknown): SeaTemperatureInfo {
  if (!value || typeof value !== "object") return emptySeaTemperatureInfo();
  const data = value as Record<string, unknown>;
  return {
    seaTemperatureC: typeof data.seaTemperatureC === "number" ? data.seaTemperatureC : null,
    seaTemperatureAreaName: typeof data.seaTemperatureAreaName === "string" ? data.seaTemperatureAreaName : null,
    seaTemperatureAreaCode: typeof data.seaTemperatureAreaCode === "string" ? data.seaTemperatureAreaCode : null,
    seaTemperatureDate: typeof data.seaTemperatureDate === "string" ? data.seaTemperatureDate : null,
    seaTemperatureSourceName: typeof data.seaTemperatureSourceName === "string" ? data.seaTemperatureSourceName : null,
    seaTemperatureSourceUrl: typeof data.seaTemperatureSourceUrl === "string" ? data.seaTemperatureSourceUrl : null,
    seaTemperatureFetchedAt: typeof data.seaTemperatureFetchedAt === "string" ? data.seaTemperatureFetchedAt : null
  };
}

function normalizeLunar(value: unknown): LunarInfo {
  if (!value || typeof value !== "object") return emptyLunarInfo();
  const data = value as Record<string, unknown>;
  return {
    lunarDateLabel: typeof data.lunarDateLabel === "string" ? data.lunarDateLabel : null,
    lunarYearName: typeof data.lunarYearName === "string" ? data.lunarYearName : null,
    lunarMonthLabel: typeof data.lunarMonthLabel === "string" ? data.lunarMonthLabel : null,
    lunarDay: typeof data.lunarDay === "number" ? data.lunarDay : null,
    moonAge: typeof data.moonAge === "number" ? data.moonAge : null,
    moonPhase: typeof data.moonPhase === "number" ? data.moonPhase : null,
    moonPhaseLabel: typeof data.moonPhaseLabel === "string" ? data.moonPhaseLabel : null
  };
}

function normalizeTackle(value: unknown): TackleInfo {
  if (!value || typeof value !== "object") return emptyTackleInfo();
  const data = value as Record<string, unknown>;
  return {
    lureName: typeof data.lureName === "string" ? data.lureName : "",
    lureColor: typeof data.lureColor === "string" ? data.lureColor : "",
    rodName: typeof data.rodName === "string" ? data.rodName : "",
    reelName: typeof data.reelName === "string" ? data.reelName : "",
    lineName: typeof data.lineName === "string" ? data.lineName : "",
    leaderName: typeof data.leaderName === "string" ? data.leaderName : ""
  };
}

export function emptyTackleInfo(): TackleInfo {
  return {
    lureName: "",
    lureColor: "",
    rodName: "",
    reelName: "",
    lineName: "",
    leaderName: ""
  };
}
