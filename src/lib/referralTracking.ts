"use client";

const STORAGE_KEY = "tsurilogue:acquisition";

export type AcquisitionSource = {
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  firstLandingPath?: string;
  capturedAt?: string;
};

export function captureAcquisitionFromUrl(url: string) {
  if (typeof window === "undefined") return null;
  const parsed = new URL(url, window.location.origin);
  const next: AcquisitionSource = {
    ref: parsed.searchParams.get("ref") || undefined,
    utmSource: parsed.searchParams.get("utm_source") || undefined,
    utmMedium: parsed.searchParams.get("utm_medium") || undefined,
    utmCampaign: parsed.searchParams.get("utm_campaign") || undefined,
    firstLandingPath: `${parsed.pathname}${parsed.search}`,
    capturedAt: new Date().toISOString()
  };
  if (!next.ref && !next.utmSource && !next.utmMedium && !next.utmCampaign) return readAcquisition();
  const existing = readAcquisition();
  const merged = { ...existing, ...next };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function readAcquisition(): AcquisitionSource | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const data = JSON.parse(raw) as AcquisitionSource;
    return data && typeof data === "object" ? data : undefined;
  } catch {
    return undefined;
  }
}
