import type { AppLocale } from "@/lib/i18n";

export const fishSpeciesDictionary = {
  red_sea_bream: { ja: "マダイ", en: "Red sea bream" },
  yellowtail: { ja: "ブリ", en: "Yellowtail" },
  spanish_mackerel: { ja: "サワラ", en: "Spanish mackerel" },
  sea_bass: { ja: "シーバス", en: "Sea bass" },
  horse_mackerel: { ja: "アジ", en: "Horse mackerel" },
  filefish: { ja: "カワハギ", en: "Filefish" },
  bigfin_reef_squid: { ja: "アオリイカ", en: "Bigfin reef squid" },
  cutlassfish: { ja: "タチウオ", en: "Cutlassfish" }
} as const;

export const fishingGenreDictionary = {
  tairaba: { ja: "タイラバ", en: "Tairaba" },
  jigging: { ja: "ジギング", en: "Jigging" },
  sawara_casting: { ja: "サワラキャスティング", en: "Spanish mackerel casting" },
  tip_run: { ja: "ティップラン", en: "Tip-run squid fishing" },
  kawahagi: { ja: "カワハギ", en: "Filefish" },
  ikametal: { ja: "イカメタル", en: "Ika-metal" },
  seabass: { ja: "シーバス", en: "Sea bass" },
  eging: { ja: "エギング", en: "Eging" }
} as const;

const fishSpeciesAliases: Record<string, keyof typeof fishSpeciesDictionary> = {
  真鯛: "red_sea_bream",
  マダイ: "red_sea_bream",
  まだい: "red_sea_bream",
  red_sea_bream: "red_sea_bream",
  "red sea bream": "red_sea_bream",
  ブリ: "yellowtail",
  ぶり: "yellowtail",
  yellowtail: "yellowtail",
  サワラ: "spanish_mackerel",
  さわら: "spanish_mackerel",
  spanish_mackerel: "spanish_mackerel",
  "spanish mackerel": "spanish_mackerel",
  シーバス: "sea_bass",
  すずき: "sea_bass",
  スズキ: "sea_bass",
  sea_bass: "sea_bass",
  "sea bass": "sea_bass",
  アジ: "horse_mackerel",
  あじ: "horse_mackerel",
  horse_mackerel: "horse_mackerel",
  "horse mackerel": "horse_mackerel",
  カワハギ: "filefish",
  かわはぎ: "filefish",
  filefish: "filefish",
  アオリイカ: "bigfin_reef_squid",
  bigfin_reef_squid: "bigfin_reef_squid",
  "bigfin reef squid": "bigfin_reef_squid",
  タチウオ: "cutlassfish",
  太刀魚: "cutlassfish",
  cutlassfish: "cutlassfish"
};

export function getDictionaryLabel<T extends Record<string, Record<AppLocale, string>>>(dictionary: T, code: keyof T | string, locale: AppLocale) {
  return dictionary[code as keyof T]?.[locale] ?? String(code);
}

export function getFishSpeciesLabel(value: string | undefined, locale: AppLocale) {
  if (!value?.trim()) return locale === "en" ? "Catch" : "釣果";
  const normalized = value.trim().toLowerCase();
  const key = fishSpeciesAliases[value.trim()] ?? fishSpeciesAliases[normalized];
  if (key) return fishSpeciesDictionary[key][locale];
  return value.trim();
}
