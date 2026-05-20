"use client";

import { Loader } from "@googlemaps/js-api-loader";
import type { LocationPoint } from "@/types";

export type GeocodingResult = LocationPoint & {
  formattedAddress: string;
};

export async function geocodePlaceName(placeName: string): Promise<GeocodingResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps APIキーが未設定です。NEXT_PUBLIC_GOOGLE_MAPS_API_KEYを確認してください。");
  }

  const query = placeName.trim();
  if (!query) throw new Error("地名を入力してください。");

  const loader = new Loader({ apiKey, version: "weekly" });
  const google = await loader.load();
  const geocoder = new google.maps.Geocoder();
  const attempts = unique([query, `${query} 日本`, `${query} 海釣り`, `${query} 釣り場`]);
  let first: google.maps.GeocoderResult | undefined;

  for (const address of attempts) {
    const result = await geocoder.geocode({
      address,
      componentRestrictions: { country: "JP" },
      region: "JP"
    });
    first = result.results.find((item) => item.geometry?.location);
    if (first) break;
  }

  if (!first) throw new Error("地名から場所を見つけられませんでした。別の地名で試してください。");

  const location = first.geometry.location;
  return {
    latitude: location.lat(),
    longitude: location.lng(),
    formattedAddress: first.formatted_address
  };
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
