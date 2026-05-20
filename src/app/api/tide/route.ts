import { NextResponse } from "next/server";
import { fetchTideInfoFromProvider } from "@/lib/tide";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const latitude = typeof body.latitude === "number" ? body.latitude : null;
    const longitude = typeof body.longitude === "number" ? body.longitude : null;
    const caughtAt = typeof body.caughtAt === "string" ? body.caughtAt : "";

    if (latitude == null || longitude == null || !caughtAt) {
      return NextResponse.json({ error: "緯度、経度、釣った日時が必要です。" }, { status: 400 });
    }

    const tideInfo = await fetchTideInfoFromProvider(latitude, longitude, caughtAt);
    return NextResponse.json(tideInfo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "潮位情報を取得できませんでした。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
