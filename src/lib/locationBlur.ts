"use client";

import { getNearestFishingArea } from "@/lib/fishingAreas";
import type { Catch, DisplayLocation, Group, GroupMember, LocationPoint, Tournament, TournamentParticipant } from "@/types";

export function getDefaultBlurRadius() {
  return 1000;
}

export function generateBlurredLocation(latitude: number, longitude: number, radiusMeters = getDefaultBlurRadius()): LocationPoint {
  const seed = Math.abs(Math.sin(latitude * 12.9898 + longitude * 78.233) * 43758.5453);
  const angle = (seed % 1) * Math.PI * 2;
  const distanceMeters = radiusMeters * (0.55 + ((seed * 1.37) % 0.4));
  const dLat = (distanceMeters * Math.cos(angle)) / 111320;
  const dLng = (distanceMeters * Math.sin(angle)) / (111320 * Math.cos((latitude * Math.PI) / 180));
  return {
    latitude: roundCoordinate(latitude + dLat),
    longitude: roundCoordinate(longitude + dLng)
  };
}

export function getAreaFromLocation(latitude: number | null | undefined, longitude: number | null | undefined) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return { areaName: "", areaCode: "" };
  }
  const nearest = getNearestFishingArea({ latitude, longitude });
  if (!nearest) return { areaName: "未分類エリア", areaCode: "unknown" };
  return {
    areaName: `${nearest.area.prefecture}・${nearest.area.name}`,
    areaCode: nearest.area.id
  };
}

export function getDisplayLocation(
  currentUserId: string | null,
  item: Catch,
  context:
    | { type: "personal" | "admin" | "public" }
    | { type: "group"; group: Group | null | undefined; member: GroupMember | null | undefined }
    | { type: "tournament"; tournament: Tournament | null | undefined; participant: TournamentParticipant | null | undefined }
): DisplayLocation {
  if (currentUserId && (currentUserId === item.userId || currentUserId === item.actualAnglerUserId)) {
    return exactLocation(item, "本人には正確位置を表示しています。");
  }
  if (context.type === "admin") return exactLocation(item, "管理者には正確位置を表示しています。");
  if (context.type === "personal") return hiddenLocation(item, "位置情報は表示できません。");
  if (context.type === "public") return areaOnlyLocation(item, "公開表示ではエリアのみ表示します。");

  if (context.type === "group") {
    const member = context.member;
    if (!member) return hiddenLocation(item, "グループメンバーのみ位置情報を確認できます。");
    const setting = context.group?.locationVisibilityDefault ?? "exactForAdminsOnly";
    const privileged = member.role === "owner" || member.role === "admin" || member.role === "moderator" || member.canViewExactLocation;
    if (setting === "exactForAllMembers") return member.role === "viewer" ? blurredLocation(item) : exactLocation(item, "グループ設定により正確位置を表示しています。");
    if (setting === "blurredForMembers") return privileged ? exactLocation(item, "管理権限により正確位置を表示しています。") : member.role === "viewer" ? areaOnlyLocation(item, "閲覧専用メンバーにはエリアのみ表示します。") : blurredLocation(item);
    if (setting === "hidden") return privileged ? exactLocation(item, "管理権限により正確位置を表示しています。") : hiddenLocation(item, "このグループでは位置情報を非公開にしています。");
    return privileged ? exactLocation(item, "管理権限により正確位置を表示しています。") : member.role === "viewer" ? areaOnlyLocation(item, "閲覧専用メンバーにはエリアのみ表示します。") : blurredLocation(item);
  }

  if (context.type === "tournament") {
    const participant = context.participant;
    const setting = context.tournament?.locationVisibilityDefault ?? "exactForOrganizersOnly";
    const privileged = participant?.role === "owner" || participant?.role === "admin" || participant?.role === "subAdmin" || participant?.canViewExactLocation === true;
    if (privileged) return exactLocation(item, "大会管理権限により正確位置を表示しています。");
    if (setting === "blurredForParticipants") return blurredLocation(item);
    if (setting === "areaOnlyForParticipants") return areaOnlyLocation(item, "参加者にはエリアのみ表示します。");
    return hiddenLocation(item, "大会設定により位置情報を非公開にしています。");
  }

  return hiddenLocation(item, "位置情報は非公開です。");
}

function exactLocation(item: Catch, message: string): DisplayLocation {
  if (item.latitude == null || item.longitude == null) return areaOnlyLocation(item, "正確位置は未取得です。");
  return { type: "exact", latitude: item.latitude, longitude: item.longitude, areaName: item.areaName, areaCode: item.areaCode, message };
}

function blurredLocation(item: Catch): DisplayLocation {
  if (item.publicLatitude == null || item.publicLongitude == null) return areaOnlyLocation(item, "ぼかし位置は未取得です。");
  return {
    type: "blurred",
    latitude: item.publicLatitude,
    longitude: item.publicLongitude,
    areaName: item.areaName,
    areaCode: item.areaCode,
    message: "この位置は漁場保護のため、実際の釣果地点からぼかして表示されています。"
  };
}

function areaOnlyLocation(item: Catch, message: string): DisplayLocation {
  if (item.areaName) return { type: "areaOnly", areaName: item.areaName, areaCode: item.areaCode, message };
  return hiddenLocation(item, "位置情報は非公開です。");
}

function hiddenLocation(item: Catch, message: string): DisplayLocation {
  return { type: "hidden", areaName: item.areaName, areaCode: item.areaCode, message };
}

function roundCoordinate(value: number) {
  return Math.round(value * 1000000) / 1000000;
}
