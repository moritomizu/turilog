import type { AgeRange, FishingFrequency, FishingMotivation } from "@/types";

export const ageRangeOptions: { value: AgeRange; label: string }[] = [
  { value: "10s", label: "10代" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60plus", label: "60代以上" },
  { value: "preferNotToSay", label: "回答しない" }
];

export const residenceAreaOptions = ["大阪", "兵庫", "和歌山", "京都", "奈良", "滋賀", "その他", "回答しない"];
export const fishingAreaOptions = ["大阪湾", "紀北", "加太", "友ヶ島周辺", "淡路島", "明石", "日本海", "瀬戸内", "その他"];
export const fishingGenreOptions = ["タイラバ", "ジギング", "サワラキャスティング", "ティップラン", "カワハギ", "イカメタル", "バチコン", "シーバス", "チニング", "ショアジギング", "エギング", "その他"];
export const fishingStyleOptions = ["遊漁船", "マイボート", "レンタルボート", "堤防", "磯", "サーフ", "河川", "その他"];
export const appPurposeOptions = ["自分の釣果を記録したい", "潮位や時間帯との関係を分析したい", "仲間と釣果を共有したい", "釣り大会に参加したい", "釣り大会を主催したい", "自分の年間ランキングを見たい", "タックル別の釣果を分析したい", "その他"];

export const fishingFrequencyOptions: { value: FishingFrequency; label: string }[] = [
  { value: "twiceOrMorePerWeek", label: "週2回以上" },
  { value: "oncePerWeek", label: "週1回" },
  { value: "twoThreeTimesPerMonth", label: "月2〜3回" },
  { value: "oncePerMonth", label: "月1回" },
  { value: "onceEveryFewMonths", label: "数ヶ月に1回" },
  { value: "fewTimesPerYear", label: "年数回" }
];

export const fishingMotivationOptions: { value: FishingMotivation; label: string }[] = [
  { value: "casual", label: "ライトに楽しみたい" },
  { value: "improve", label: "もっと上達したい" },
  { value: "serious", label: "かなり本気で釣果を伸ばしたい" },
  { value: "competitive", label: "大会やランキングで競いたい" },
  { value: "business", label: "釣りを仕事や事業にも活かしたい" }
];

export function getAgeRangeLabel(value?: string) {
  return ageRangeOptions.find((item) => item.value === value)?.label ?? "未設定";
}

export function getFishingFrequencyLabel(value?: string) {
  return fishingFrequencyOptions.find((item) => item.value === value)?.label ?? "未設定";
}

export function getFishingMotivationLabel(value?: string) {
  return fishingMotivationOptions.find((item) => item.value === value)?.label ?? "未設定";
}
