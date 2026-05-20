import type { LocationPoint } from "@/types";

export type FishingArea = LocationPoint & {
  id: string;
  prefecture: string;
  name: string;
};

export const fishingAreas: FishingArea[] = [
  { id: "hyogo-akashi-ura", prefecture: "兵庫", name: "明石・明石浦", latitude: 34.645, longitude: 134.997 },
  { id: "hyogo-akashi-port", prefecture: "兵庫", name: "明石港", latitude: 34.646, longitude: 134.993 },
  { id: "hyogo-higashi-futami", prefecture: "兵庫", name: "明石・東二見", latitude: 34.696, longitude: 134.891 },
  { id: "hyogo-kobe-suma", prefecture: "兵庫", name: "神戸・須磨", latitude: 34.643, longitude: 135.118 },
  { id: "hyogo-kobe-maiko", prefecture: "兵庫", name: "神戸・舞子漁港", latitude: 34.633, longitude: 135.034 },
  { id: "hyogo-awaji-ikawadani", prefecture: "兵庫", name: "淡路島・育波", latitude: 34.548, longitude: 134.947 },
  { id: "hyogo-awaji-murotsu", prefecture: "兵庫", name: "淡路島・室津", latitude: 34.515, longitude: 134.899 },
  { id: "hyogo-awaji-sumoto", prefecture: "兵庫", name: "淡路島・洲本", latitude: 34.342, longitude: 134.897 },
  { id: "hyogo-awaji-yura", prefecture: "兵庫", name: "淡路島・由良", latitude: 34.282, longitude: 134.95 },
  { id: "hyogo-nishinomiya-imazu", prefecture: "兵庫", name: "西宮・今津", latitude: 34.709, longitude: 135.345 },
  { id: "hyogo-himeji-port", prefecture: "兵庫", name: "姫路港", latitude: 34.778, longitude: 134.665 },
  { id: "osaka-izumisano", prefecture: "大阪", name: "泉佐野", latitude: 34.421, longitude: 135.316 },
  { id: "osaka-sennan-okadaura", prefecture: "大阪", name: "泉南・岡田浦新港", latitude: 34.38, longitude: 135.274 },
  { id: "osaka-sennan-ozaki", prefecture: "大阪", name: "泉南・尾崎", latitude: 34.361, longitude: 135.242 },
  { id: "osaka-sennan-tannowa", prefecture: "大阪", name: "淡輪", latitude: 34.334, longitude: 135.176 },
  { id: "osaka-misaki-tanagawa", prefecture: "大阪", name: "岬町・谷川港", latitude: 34.316, longitude: 135.139 },
  { id: "wakayama-kada", prefecture: "和歌山", name: "加太港", latitude: 34.277, longitude: 135.073 },
  { id: "wakayama-wakayama-port", prefecture: "和歌山", name: "和歌山港", latitude: 34.216, longitude: 135.146 },
  { id: "wakayama-wakaura", prefecture: "和歌山", name: "和歌浦港", latitude: 34.187, longitude: 135.171 },
  { id: "wakayama-saikazaki", prefecture: "和歌山", name: "雑賀崎", latitude: 34.187, longitude: 135.149 },
  { id: "wakayama-yura", prefecture: "和歌山", name: "由良", latitude: 33.956, longitude: 135.117 },
  { id: "wakayama-tanabe", prefecture: "和歌山", name: "田辺・芳養港", latitude: 33.744, longitude: 135.362 },
  { id: "wakayama-shirahama", prefecture: "和歌山", name: "白浜町・椿", latitude: 33.61, longitude: 135.397 },
  { id: "wakayama-kushimoto", prefecture: "和歌山", name: "串本", latitude: 33.472, longitude: 135.783 },
  { id: "tokushima-naruto-kameura", prefecture: "徳島", name: "鳴門亀浦", latitude: 34.241, longitude: 134.638 },
  { id: "tokushima-naruto-dounoura", prefecture: "徳島", name: "鳴門堂ノ浦", latitude: 34.237, longitude: 134.619 },
  { id: "mie-toba", prefecture: "三重", name: "鳥羽・本浦", latitude: 34.477, longitude: 136.852 },
  { id: "mie-owase", prefecture: "三重", name: "尾鷲", latitude: 34.07, longitude: 136.196 },
  { id: "kyoto-miyazu", prefecture: "京都", name: "宮津・宮津港", latitude: 35.536, longitude: 135.196 },
  { id: "kyoto-maizuru", prefecture: "京都", name: "舞鶴湾", latitude: 35.475, longitude: 135.387 },
  { id: "fukui-tsuruga", prefecture: "福井", name: "敦賀", latitude: 35.657, longitude: 136.064 },
  { id: "fukui-obama", prefecture: "福井", name: "小浜湾", latitude: 35.493, longitude: 135.746 }
];

export function getFishingAreaById(id: string) {
  return fishingAreas.find((area) => area.id === id) ?? null;
}

export function groupedFishingAreas() {
  return fishingAreas.reduce<Record<string, FishingArea[]>>((groups, area) => {
    groups[area.prefecture] = [...(groups[area.prefecture] ?? []), area];
    return groups;
  }, {});
}
