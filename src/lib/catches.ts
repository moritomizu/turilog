"use client";

import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { emptyLunarInfo } from "@/lib/lunar";
import { emptyOfficialCurrentReference } from "@/lib/officialCurrent";
import { emptyWeatherInfo } from "@/lib/weather";
import type { Catch, LunarInfo, OfficialCurrentReference, OfficialTideReference, TackleInfo, TideInfo, WeatherInfo } from "@/types";

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
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      imageUrl: data.imageUrl ?? null,
      fishType: data.fishType ?? "",
      sizeCm: Number(data.sizeCm ?? 0),
      caughtAt: normalizeDate(data.caughtAt),
      comment: data.comment ?? "",
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
      createdAt: normalizeDate(data.createdAt),
      weather: normalizeWeather(data.weather),
      lunar: normalizeLunar(data.lunar),
      tackle: normalizeTackle(data.tackle),
      ...normalizeTide(data),
      ...normalizeOfficialTideReference(data),
      ...normalizeOfficialCurrentReference(data)
    };
  }).sort((a, b) => getSortableTime(b) - getSortableTime(a));
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
