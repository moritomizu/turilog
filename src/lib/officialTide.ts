import type { OfficialTideReference } from "@/types";

type OfficialTideStation = {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
};

const SOURCE_NAME = "海上保安庁 海洋情報部 リアルタイム験潮データ";
const GAUGE_BASE_URL = "https://www1.kaiho.mlit.go.jp/TIDE/gauge/gauge.php";

const stations: OfficialTideStation[] = [
  { code: "0001", name: "稚内", latitude: 45.416, longitude: 141.678 },
  { code: "0012", name: "網走", latitude: 44.021, longitude: 144.279 },
  { code: "0016", name: "函館", latitude: 41.768, longitude: 140.728 },
  { code: "0021", name: "釧路", latitude: 42.985, longitude: 144.374 },
  { code: "0031", name: "小樽", latitude: 43.197, longitude: 140.994 },
  { code: "0041", name: "宮古", latitude: 39.641, longitude: 141.968 },
  { code: "0042", name: "釜石", latitude: 39.275, longitude: 141.886 },
  { code: "0043", name: "大船渡", latitude: 39.063, longitude: 141.72 },
  { code: "0044", name: "鮎川", latitude: 38.303, longitude: 141.506 },
  { code: "0051", name: "小名浜", latitude: 36.946, longitude: 140.902 },
  { code: "0060", name: "東京", latitude: 35.654, longitude: 139.76 },
  { code: "0061", name: "千葉", latitude: 35.604, longitude: 140.107 },
  { code: "0062", name: "横浜", latitude: 35.454, longitude: 139.644 },
  { code: "0063", name: "横須賀", latitude: 35.284, longitude: 139.671 },
  { code: "0064", name: "小田原", latitude: 35.247, longitude: 139.155 },
  { code: "0070", name: "岡田", latitude: 34.789, longitude: 139.39 },
  { code: "0072", name: "三宅島（阿古）", latitude: 34.073, longitude: 139.48 },
  { code: "0074", name: "八丈島（神湊）", latitude: 33.114, longitude: 139.789 },
  { code: "0081", name: "石廊崎", latitude: 34.603, longitude: 138.846 },
  { code: "0083", name: "清水港", latitude: 35.017, longitude: 138.5 },
  { code: "0084", name: "御前崎", latitude: 34.612, longitude: 138.215 },
  { code: "0085", name: "舞阪", latitude: 34.684, longitude: 137.614 },
  { code: "0086", name: "名古屋", latitude: 35.09, longitude: 136.881 },
  { code: "0087", name: "鳥羽", latitude: 34.486, longitude: 136.844 },
  { code: "0088", name: "尾鷲", latitude: 34.07, longitude: 136.194 },
  { code: "0095", name: "富山", latitude: 36.752, longitude: 137.228 },
  { code: "0097", name: "能登", latitude: 37.5, longitude: 137.15 },
  { code: "0101", name: "和歌山", latitude: 34.228, longitude: 135.17 },
  { code: "0104", name: "串本", latitude: 33.472, longitude: 135.782 },
  { code: "0107", name: "大阪", latitude: 34.657, longitude: 135.432 },
  { code: "0109", name: "神戸", latitude: 34.684, longitude: 135.201 },
  { code: "0110", name: "洲本", latitude: 34.344, longitude: 134.895 },
  { code: "0113", name: "舞鶴", latitude: 35.476, longitude: 135.386 },
  { code: "0115", name: "宇野", latitude: 34.491, longitude: 133.952 },
  { code: "0117", name: "呉", latitude: 34.241, longitude: 132.557 },
  { code: "0118", name: "広島", latitude: 34.354, longitude: 132.455 },
  { code: "0120", name: "境", latitude: 35.544, longitude: 133.242 },
  { code: "0121", name: "浜田", latitude: 34.899, longitude: 132.079 },
  { code: "0123", name: "徳山", latitude: 34.05, longitude: 131.806 },
  { code: "0130", name: "高松", latitude: 34.352, longitude: 134.052 },
  { code: "0131", name: "小松島", latitude: 34.011, longitude: 134.591 },
  { code: "0133", name: "室戸岬", latitude: 33.253, longitude: 134.177 },
  { code: "0134", name: "高知", latitude: 33.502, longitude: 133.571 },
  { code: "0135", name: "土佐清水", latitude: 32.779, longitude: 132.955 },
  { code: "0136", name: "松山", latitude: 33.862, longitude: 132.704 },
  { code: "0137", name: "宇和島", latitude: 33.223, longitude: 132.56 },
  { code: "0141", name: "博多", latitude: 33.607, longitude: 130.399 },
  { code: "0143", name: "佐世保", latitude: 33.159, longitude: 129.719 },
  { code: "0144", name: "長崎", latitude: 32.744, longitude: 129.871 },
  { code: "0145", name: "口之津", latitude: 32.61, longitude: 130.196 },
  { code: "0146", name: "厳原", latitude: 34.201, longitude: 129.292 },
  { code: "0148", name: "福江", latitude: 32.695, longitude: 128.844 },
  { code: "0150", name: "大分", latitude: 33.239, longitude: 131.608 },
  { code: "0151", name: "佐伯", latitude: 32.959, longitude: 131.898 },
  { code: "0153", name: "油津", latitude: 31.58, longitude: 131.407 },
  { code: "0155", name: "鹿児島", latitude: 31.592, longitude: 130.564 },
  { code: "0156", name: "枕崎", latitude: 31.272, longitude: 130.297 },
  { code: "0160", name: "西之表", latitude: 30.733, longitude: 130.997 },
  { code: "0163", name: "名瀬", latitude: 28.384, longitude: 129.493 },
  { code: "0165", name: "那覇", latitude: 26.213, longitude: 127.667 },
  { code: "0167", name: "石垣", latitude: 24.337, longitude: 124.156 },
  { code: "0168", name: "与那国", latitude: 24.467, longitude: 122.998 },
  { code: "0170", name: "父島", latitude: 27.095, longitude: 142.191 }
];

export function getOfficialTideReference(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  caughtAt: string
): OfficialTideReference {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return emptyOfficialTideReference();
  }

  const nearest = stations
    .map((station) => ({
      station,
      distance: getDistanceKm(latitude, longitude, station.latitude, station.longitude)
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (!nearest) return emptyOfficialTideReference();

  const url = new URL(GAUGE_BASE_URL);
  url.searchParams.set("s", nearest.station.code);

  return {
    officialTideStationName: nearest.station.name,
    officialTideStationDistance: Number(nearest.distance.toFixed(1)),
    officialTideCurveUrl: url.toString(),
    officialTideSourceName: SOURCE_NAME,
    officialTideDate: toDateLabel(caughtAt)
  };
}

export function emptyOfficialTideReference(): OfficialTideReference {
  return {
    officialTideStationName: null,
    officialTideStationDistance: null,
    officialTideCurveUrl: null,
    officialTideSourceName: null,
    officialTideDate: null
  };
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
