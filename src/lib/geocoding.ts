"use client";

import { Loader } from "@googlemaps/js-api-loader";
import type { LocationPoint } from "@/types";

export async function geocodePlaceName(placeName: string): Promise<LocationPoint> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps APIキーが未設定です。NEXT_PUBLIC_GOOGLE_MAPS_API_KEYを確認してください。");
  }

  const query = placeName.trim();
  if (!query) throw new Error("地名を入力してください。");

  const loader = new Loader({ apiKey, version: "weekly" });
  const google = await loader.load();
  const geocoder = new google.maps.Geocoder();
  const result = await geocoder.geocode({
    address: query,
    region: "JP"
  });

  const first = result.results[0];
  if (!first) throw new Error("地名から場所を見つけられませんでした。別の地名で試してください。");

  const location = first.geometry.location;
  return {
    latitude: location.lat(),
    longitude: location.lng()
  };
}
