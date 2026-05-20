import type { LocationPoint, OfficialCurrentReference } from "@/types";

type CurrentStation = LocationPoint & {
  name: string;
  url: string;
  note: string;
};

const SOURCE_NAME = "第五管区海上保安本部 海洋情報部 潮流情報";

const currentStations: CurrentStation[] = [
  {
    name: "明石海峡（2号灯浮標付近）",
    latitude: 34.617,
    longitude: 135.015,
    url: "https://www1.kaiho.mlit.go.jp/KAN5/tyouryuu/stream_akashi.html",
    note: "神戸・本州側からの投稿で優先"
  },
  {
    name: "明石海峡（3号灯浮標付近）",
    latitude: 34.598,
    longitude: 134.995,
    url: "https://www1.kaiho.mlit.go.jp/KAN5/tyouryuu/stream_akashi3.html",
    note: "淡路島側からの投稿で優先"
  },
  {
    name: "鳴門海峡",
    latitude: 34.239,
    longitude: 134.651,
    url: "https://www1.kaiho.mlit.go.jp/KAN5/tyouryuu/stream_naruto.html",
    note: "鳴門海峡周辺"
  },
  {
    name: "友ヶ島水道",
    latitude: 34.282,
    longitude: 135.001,
    url: "https://www1.kaiho.mlit.go.jp/KAN5/tyouryuu/stream_tomogashima.html",
    note: "和歌山・大阪湾南部周辺"
  }
];

export function getOfficialCurrentReference(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  caughtAt: string
): OfficialCurrentReference {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return emptyOfficialCurrentReference();
  }

  const station = pickCurrentStation(latitude, longitude);
  const distance = getDistanceKm(latitude, longitude, station.latitude, station.longitude);

  return {
    officialCurrentStationName: station.name,
    officialCurrentStationDistance: Number(distance.toFixed(1)),
    officialCurrentCurveUrl: station.url,
    officialCurrentSourceName: SOURCE_NAME,
    officialCurrentDate: toDateLabel(caughtAt),
    officialCurrentNote: station.note
  };
}

export function emptyOfficialCurrentReference(): OfficialCurrentReference {
  return {
    officialCurrentStationName: null,
    officialCurrentStationDistance: null,
    officialCurrentCurveUrl: null,
    officialCurrentSourceName: null,
    officialCurrentDate: null,
    officialCurrentNote: null
  };
}

function pickCurrentStation(latitude: number, longitude: number) {
  const isAkashiArea = latitude >= 34.35 && latitude <= 34.85 && longitude >= 134.75 && longitude <= 135.35;
  if (isAkashiArea) {
    return latitude >= 34.6 ? currentStations[0] : currentStations[1];
  }

  const isWakayamaArea = latitude >= 33.85 && latitude <= 34.55 && longitude >= 134.85 && longitude <= 135.55;
  if (isWakayamaArea) return currentStations[3];

  return currentStations
    .map((station) => ({
      station,
      distance: getDistanceKm(latitude, longitude, station.latitude, station.longitude)
    }))
    .sort((a, b) => a.distance - b.distance)[0].station;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function toDateLabel(value: string) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}
