import type { SeaTemperatureInfo } from "@/types";

export function emptySeaTemperatureInfo(): SeaTemperatureInfo {
  return {
    seaTemperatureC: null,
    seaTemperatureAreaName: null,
    seaTemperatureAreaCode: null,
    seaTemperatureDate: null,
    seaTemperatureSourceName: null,
    seaTemperatureSourceUrl: null,
    seaTemperatureFetchedAt: null
  };
}

export async function fetchSeaTemperatureInfo(
  latitude: number | null,
  longitude: number | null,
  caughtAt: string
): Promise<SeaTemperatureInfo> {
  if (latitude == null || longitude == null || !caughtAt) return emptySeaTemperatureInfo();

  const response = await fetch("/api/sea-temperature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ latitude, longitude, caughtAt })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `水温データの取得に失敗しました。HTTP ${response.status}`);
  }

  return response.json();
}
