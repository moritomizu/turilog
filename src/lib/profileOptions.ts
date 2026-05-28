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

export const residenceAreaOptions = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
  "その他",
  "回答しない"
];
export const fishingAreaGroups = [
  { label: "北海道・東北", areas: ["北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島"] },
  { label: "関東", areas: ["茨城", "千葉", "東京湾", "神奈川", "相模湾", "伊豆諸島"] },
  { label: "中部", areas: ["新潟", "富山湾", "石川", "福井", "静岡", "愛知", "三重"] },
  { label: "関西（近畿）", areas: ["大阪湾", "紀北", "加太", "友ヶ島周辺", "淡路島", "明石", "日本海（関西）"] },
  { label: "中国", areas: ["山陰", "瀬戸内（中国）", "岡山", "広島", "山口"] },
  { label: "四国", areas: ["徳島", "香川", "愛媛", "高知"] },
  { label: "九州・沖縄", areas: ["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"] },
  { label: "その他", areas: ["その他"] }
];
export const fishingAreaOptions = fishingAreaGroups.flatMap((group) => group.areas);
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
