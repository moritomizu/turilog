import type { LocationPoint } from "@/types";

export function getCurrentLocation(): Promise<LocationPoint> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("このブラウザでは位置情報を取得できません。"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => reject(new Error("位置情報を取得できませんでした。端末の許可設定を確認してください。")),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000
      }
    );
  });
}

export function formatCoordinate(value: number | null | undefined) {
  if (typeof value !== "number") return "未取得";
  return value.toFixed(5);
}
