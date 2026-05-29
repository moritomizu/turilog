import type { AppLocale } from "@/lib/i18n";

export const fishSpeciesDictionary = {
  red_sea_bream: { ja: "真鯛", en: "Red sea bream" },
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

export function getDictionaryLabel<T extends Record<string, Record<AppLocale, string>>>(dictionary: T, code: keyof T | string, locale: AppLocale) {
  return dictionary[code as keyof T]?.[locale] ?? String(code);
}
