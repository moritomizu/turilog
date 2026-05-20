import { NextResponse } from "next/server";
import type { SeaTemperatureInfo } from "@/types";
import { getSeaTemperatureArea, getSeaTemperatureSourceUrl, getSeaTemperatureTextUrl } from "@/lib/seaTemperatureAreas";

const SOURCE_NAME = "気象庁 沿岸域の海面水温情報";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const latitude = typeof body.latitude === "number" ? body.latitude : null;
    const longitude = typeof body.longitude === "number" ? body.longitude : null;
    const caughtAt = typeof body.caughtAt === "string" ? body.caughtAt : "";

    if (latitude == null || longitude == null || !caughtAt) {
      return NextResponse.json({ error: "緯度、経度、釣った日時が必要です。" }, { status: 400 });
    }

    const area = getSeaTemperatureArea(latitude, longitude);
    const date = caughtAt.slice(0, 10);
    const textUrl = getSeaTemperatureTextUrl(area.code);
    const response = await fetch(textUrl, { next: { revalidate: 21600 } });
    const text = response.ok ? await response.text() : "";
    const temperature = parseTemperature(text, date);

    const result: SeaTemperatureInfo = {
      seaTemperatureC: temperature,
      seaTemperatureAreaName: area.name,
      seaTemperatureAreaCode: area.code,
      seaTemperatureDate: temperature == null ? date : date,
      seaTemperatureSourceName: SOURCE_NAME,
      seaTemperatureSourceUrl: getSeaTemperatureSourceUrl(area.code),
      seaTemperatureFetchedAt: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "水温データを取得できませんでした。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseTemperature(text: string, date: string) {
  const target = date.split("-").map(Number);
  let latestBeforeTarget: { time: number; temp: number } | null = null;

  for (const line of text.split(/\r?\n/)) {
    const [year, month, day, , flag, temp] = line.split(",").map((value) => value.trim());
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const value = Number(temp);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || !Number.isFinite(value)) continue;
    if (flag && flag !== "0" && flag !== "1") continue;

    const time = Date.UTC(y, m - 1, d);
    const targetTime = Date.UTC(target[0], target[1] - 1, target[2]);
    if (time <= targetTime && (!latestBeforeTarget || time > latestBeforeTarget.time)) {
      latestBeforeTarget = { time, temp: value };
    }
  }

  return latestBeforeTarget?.temp ?? null;
}
