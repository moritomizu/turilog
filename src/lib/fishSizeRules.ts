export type FishSizeRule = {
  aliases: string[];
  maxSizeCm: number;
};

export const fishSizeRules: FishSizeRule[] = [
  { aliases: ["真鯛", "マダイ", "たい", "タイ"], maxSizeCm: 100 },
  { aliases: ["ブリ", "鰤", "ワラサ", "メジロ", "ハマチ"], maxSizeCm: 120 },
  { aliases: ["サワラ", "鰆", "サゴシ"], maxSizeCm: 120 },
  { aliases: ["シーバス", "スズキ", "鱸"], maxSizeCm: 110 },
  { aliases: ["アジ", "鯵", "マアジ"], maxSizeCm: 60 },
  { aliases: ["カワハギ", "皮剥"], maxSizeCm: 45 },
  { aliases: ["アオリイカ", "あおりいか"], maxSizeCm: 50 },
  { aliases: ["タチウオ", "太刀魚"], maxSizeCm: 150 }
];

export function getFishSizeRule(fishType: string | undefined | null) {
  const normalized = normalizeFishName(fishType);
  if (!normalized) return null;
  return (
    fishSizeRules.find((rule) =>
      rule.aliases.some((alias) => {
        const normalizedAlias = normalizeFishName(alias);
        return normalized === normalizedAlias || normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
      })
    ) ?? null
  );
}

function normalizeFishName(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s/g, "");
}
