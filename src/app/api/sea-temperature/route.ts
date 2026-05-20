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
    const parsed = parseTemperature(text, date);

    const result: SeaTemperatureInfo = {
      seaTemperatureC: parsed?.temp ?? null,
      seaTemperatureAreaName: area.name,
      seaTemperatureAreaCode: area.code,
      seaTemperatureDate: parsed?.date ?? date,
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
  let latestBeforeTarget: { time: number; temp: number; date: string } | null = null;
  const targetTime = Date.UTC(target[0], target[1] - 1, target[2]);

  for (const line of text.split(/\r?\n/)) {
    const parsed = parseTemperatureLine(line);
    if (!parsed) continue;

    const time = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
    if (time <= targetTime && (!latestBeforeTarget || time > latestBeforeTarget.time)) {
      latestBeforeTarget = {
        time,
        temp: parsed.temp,
        date: `${parsed.year}-${pad(parsed.month)}-${pad(parsed.day)}`
      };
    }
  }

  return latestBeforeTarget;
}

function parseTemperatureLine(line: string) {
  const normalized = line.trim();
  if (!normalized || normalized.startsWith("#")) return null;

  const isoDate = normalized.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoDate) {
    const tail = normalized.slice(isoDate.index! + isoDate[0].length);
    const temp = findTemperature(tail);
    if (temp == null) return null;
    return {
      year: Number(isoDate[1]),
      month: Number(isoDate[2]),
      day: Number(isoDate[3]),
      temp
    };
  }

  const values = normalized.split(/[,\s]+/).map((value) => value.trim()).filter(Boolean);
  if (values.length < 4) return null;

  const year = Number(values[0]);
  const month = Number(values[1]);
  const day = Number(values[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const temp = findTemperature(values.slice(3).join(" "));
  if (temp == null) return null;

  return { year, month, day, temp };
}

function findTemperature(text: string) {
  const numbers = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const plausible = numbers.filter((value) => value > -2 && value < 40);
  return plausible.at(-1) ?? null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
