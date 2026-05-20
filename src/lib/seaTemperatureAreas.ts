import type { LocationPoint } from "@/types";

export type SeaTemperatureArea = LocationPoint & {
  code: string;
  name: string;
};

const JMA_BASE_URL = "https://www.data.jma.go.jp/kaiyou/data/db/kaikyo/series/engan";

const areas: SeaTemperatureArea[] = [
  { code: "520", name: "大阪湾", latitude: 34.45, longitude: 135.22 },
  { code: "510", name: "播磨灘・備讃瀬戸", latitude: 34.48, longitude: 134.55 },
  { code: "511", name: "紀伊水道", latitude: 34.0, longitude: 134.95 },
  { code: "512", name: "紀伊水道沖", latitude: 33.65, longitude: 134.95 },
  { code: "513", name: "和歌山県南部沿岸（紀伊水道側）", latitude: 33.75, longitude: 135.25 },
  { code: "514", name: "和歌山県南部沿岸（熊野灘側）", latitude: 33.65, longitude: 135.75 },
  { code: "313", name: "熊野灘", latitude: 34.0, longitude: 136.4 },
  { code: "501", name: "京都府沿岸", latitude: 35.6, longitude: 135.25 },
  { code: "502", name: "兵庫県北部沿岸", latitude: 35.65, longitude: 134.75 },
  { code: "321", name: "福井県沿岸", latitude: 35.8, longitude: 135.9 },
  { code: "515", name: "高知県東部沿岸", latitude: 33.35, longitude: 134.05 }
];

export function getSeaTemperatureArea(latitude: number, longitude: number) {
  if (latitude >= 34.2 && latitude <= 34.8 && longitude >= 134.75 && longitude <= 135.55) return areas[0];
  if (latitude >= 34.1 && latitude <= 34.8 && longitude >= 133.8 && longitude < 134.75) return areas[1];
  if (latitude >= 33.85 && latitude < 34.2 && longitude >= 134.65 && longitude <= 135.3) return areas[2];
  if (latitude >= 33.2 && latitude < 33.85 && longitude >= 134.55 && longitude <= 135.25) return areas[3];
  if (latitude >= 33.5 && latitude < 34.05 && longitude > 135.25 && longitude <= 135.65) return areas[4];
  if (latitude >= 33.35 && latitude < 34.05 && longitude > 135.65 && longitude <= 136.05) return areas[5];

  return areas
    .map((area) => ({
      area,
      distance: getDistanceKm(latitude, longitude, area.latitude, area.longitude)
    }))
    .sort((a, b) => a.distance - b.distance)[0].area;
}

export function getSeaTemperatureSourceUrl(code: string) {
  return `${JMA_BASE_URL}/engan${code}.html`;
}

export function getSeaTemperatureTextUrl(code: string) {
  return `${JMA_BASE_URL}/txt/area${code}.txt`;
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
