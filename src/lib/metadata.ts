import type { Metadata } from "next";
import { APP_NAME, APP_NAME_WITH_JA } from "@/lib/brand";

type MetadataDoc = Record<string, unknown>;

const appName = APP_NAME_WITH_JA;
const defaultDescription = "TSURILOGUE（釣りローグ）は、釣果写真、潮位、水温、天候、タックル、ポイントを記録して振り返れる釣果記録・釣りログアプリです。";
const productionSiteUrl = "https://www.tsurilogue.com";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return normalizeCanonicalHost(configured.replace(/\/$/, ""));
  return productionSiteUrl;
}

function normalizeCanonicalHost(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "tsurilogue.com") {
      parsed.hostname = "www.tsurilogue.com";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    return url;
  }
  return url;
}

export function createPageMetadata({
  title,
  description = defaultDescription,
  path = "/",
  image,
  keywords
}: {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  keywords?: string[];
}): Metadata {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const imageUrl = image ? (image.startsWith("http") ? image : `${siteUrl}${image.startsWith("/") ? image : `/${image}`}`) : `${siteUrl}/opengraph-image`;
  return {
    title,
    description,
    keywords: keywords ?? ["TSURILOGUE", "釣りローグ", "釣果記録", "釣りログ", "釣果ログ", "釣りアプリ", "釣果分析"],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: appName,
      title,
      description,
      url,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export async function getPublicCatchMetadata(catchId: string) {
  const data = await getDocData("publicCatches", catchId);
  if (!data || data.isPublic !== true) return null;
  const fishType = text(data.fishType, "釣果");
  const sizeCm = typeof data.sizeCm === "number" ? `${data.sizeCm}cm` : "";
  const tide = text(data.tidePhaseLabel, "潮情報も記録");
  const area = text(data.areaName, "釣果エリア");
  return {
    title: `${fishType}${sizeCm ? ` ${sizeCm}` : ""} | ${APP_NAME}釣果`,
    description: `${area}で記録された${fishType}${sizeCm ? ` ${sizeCm}` : ""}の釣果。${tide}、天候、水温、タックルも一緒に振り返れる釣りログです。`,
    image: typeof data.imageUrl === "string" ? data.imageUrl : null
  };
}

export async function getGroupMetadata(groupId: string) {
  const data = await getDocData("groups", groupId);
  if (!data) return null;
  const name = text(data.name, "釣り仲間グループ");
  const description = text(data.description, `仲間同士で釣果・ランキング・釣果マップ・分析を共有できる${APP_NAME_WITH_JA}グループです。`);
  return {
    title: `${name} | ${APP_NAME}グループ`,
    description: `${description} 釣り仲間の投稿を見ながら、日々の釣果をもっと楽しく振り返れます。`
  };
}

export async function getGroupOgSummary(groupId: string) {
  const group = await getDocData("groups", groupId);
  if (!group) return null;
  const catches = await queryCatchesByGroup(groupId).catch(() => []);
  const now = new Date();
  const monthItems = catches.filter((item) => {
    const caughtAt = typeof item.caughtAt === "string" ? new Date(item.caughtAt) : null;
    return caughtAt && caughtAt.getFullYear() === now.getFullYear() && caughtAt.getMonth() === now.getMonth();
  });
  const biggest = catches.reduce<{ fishType: string; sizeCm: number } | null>((best, item) => {
    const sizeCm = typeof item.sizeCm === "number" ? item.sizeCm : 0;
    if (!best || sizeCm > best.sizeCm) return { fishType: text(item.fishType, "釣果"), sizeCm };
    return best;
  }, null);
  return {
    name: text(group.name, "釣り仲間グループ"),
    description: text(group.description, "釣り仲間で釣果を共有中"),
    memberCount: typeof group.memberCount === "number" ? group.memberCount : null,
    catchCount: catches.length,
    monthCount: monthItems.length,
    monthMax: monthItems.length ? Math.max(...monthItems.map((item) => (typeof item.sizeCm === "number" ? item.sizeCm : 0))) : 0,
    topFish: topValue(monthItems.map((item) => text(item.fishType, ""))),
    biggest
  };
}

export async function getTournamentMetadata(tournamentId: string) {
  const data = await getDocData("tournaments", tournamentId);
  if (!data) return null;
  const name = text(data.name, "釣り大会");
  const description = text(data.description, `期間中の釣果でランキングを競える${APP_NAME_WITH_JA}の釣り大会です。`);
  const target = Array.isArray(data.targetFishTypes) ? data.targetFishTypes.filter((item): item is string => typeof item === "string").join("、") : "";
  return {
    title: `${name} | ${APP_NAME}釣り大会`,
    description: `${description}${target ? ` 対象魚種: ${target}。` : ""}写真投稿からランキングまで、仲間と釣果を競えます。`
  };
}

async function getDocData(collectionName: string, id: string): Promise<MetadataDoc | null> {
  if (!isFirebaseMetadataConfigured()) return null;
  const projectId = firebaseConfig.projectId;
  const apiKey = firebaseConfig.apiKey;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${id}?key=${apiKey}`;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return null;
  const body = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  return body.fields ? decodeFields(body.fields) : null;
}

async function queryCatchesByGroup(groupId: string): Promise<MetadataDoc[]> {
  if (!isFirebaseMetadataConfigured()) return [];
  const projectId = firebaseConfig.projectId;
  const apiKey = firebaseConfig.apiKey;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "catches" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "groupIds" },
            op: "ARRAY_CONTAINS",
            value: { stringValue: groupId }
          }
        },
        limit: 200
      }
    }),
    next: { revalidate: 300 }
  });
  if (!response.ok) return [];
  const body = (await response.json()) as { document?: { fields?: Record<string, FirestoreValue> } }[];
  return body.map((item) => (item.document?.fields ? decodeFields(item.document.fields) : null)).filter((item): item is MetadataDoc => Boolean(item));
}

function isFirebaseMetadataConfigured() {
  return Object.values(firebaseConfig).every(Boolean);
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function topValue(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
};

function decodeFields(fields: Record<string, FirestoreValue>): MetadataDoc {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function decodeValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("arrayValue" in value) return value.arrayValue?.values?.map(decodeValue) ?? [];
  if ("mapValue" in value) return value.mapValue?.fields ? decodeFields(value.mapValue.fields) : {};
  return null;
}
