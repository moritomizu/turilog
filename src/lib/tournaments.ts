"use client";

import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Tournament, TournamentParticipant, TournamentRankingType, TournamentStatus, TournamentVisibility } from "@/types";

export type TournamentInput = {
  ownerId: string;
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  targetFishTypes: string[];
  rankingType: TournamentRankingType;
  rules: string;
  visibility: TournamentVisibility;
  maxParticipants: number | null;
};

export async function createTournament(input: TournamentInput) {
  const ref = doc(collection(getFirebaseDb(), "tournaments"));
  await setDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function getTournaments(): Promise<Tournament[]> {
  const snapshot = await getDocs(collection(getFirebaseDb(), "tournaments"));
  return snapshot.docs.map((item) => normalizeTournament(item.id, item.data())).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "tournaments", id));
  return snapshot.exists() ? normalizeTournament(snapshot.id, snapshot.data()) : null;
}

export async function getTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "tournamentParticipants"), where("tournamentId", "==", tournamentId)));
  return snapshot.docs.map((item) => normalizeParticipant(item.id, item.data()));
}

export async function joinTournament(tournament: Tournament, userId: string, userName: string) {
  const participantRef = doc(getFirebaseDb(), "tournamentParticipants", `${tournament.id}_${userId}`);
  const existing = await getDoc(participantRef);
  if (existing.exists()) return;

  const participants = await getTournamentParticipants(tournament.id);
  if (tournament.maxParticipants != null && participants.length >= tournament.maxParticipants) {
    throw new Error("参加上限に達しています。");
  }

  await setDoc(participantRef, {
    tournamentId: tournament.id,
    userId,
    userName,
    joinedAt: serverTimestamp(),
    status: "active"
  });
}

export async function getJoinedTournaments(userId: string): Promise<Tournament[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "tournamentParticipants"), where("userId", "==", userId)));
  const ids = snapshot.docs.map((item) => item.data().tournamentId).filter((value): value is string => typeof value === "string");
  const tournaments = await Promise.all(ids.map((id) => getTournament(id)));
  return tournaments.filter((item): item is Tournament => Boolean(item));
}

export function getTournamentStatus(tournament: Tournament, now = new Date()): TournamentStatus {
  const start = new Date(tournament.startAt).getTime();
  const end = new Date(tournament.endAt).getTime();
  const current = now.getTime();
  if (current < start) return "upcoming";
  if (current > end) return "ended";
  return "active";
}

export function getRankingTypeLabel(value: TournamentRankingType) {
  if (value === "totalSize") return "合計サイズ";
  if (value === "count") return "匹数勝負";
  return "最大サイズ1匹勝負";
}

export function isTournamentEntryEligible(tournament: Tournament, caughtAt: string, fishType: string, sizeCm: number, hasLocation: boolean) {
  const caughtTime = new Date(caughtAt).getTime();
  const inPeriod = caughtTime >= new Date(tournament.startAt).getTime() && caughtTime <= new Date(tournament.endAt).getTime();
  const targetMatched = tournament.targetFishTypes.length === 0 || tournament.targetFishTypes.some((target) => target.trim() === fishType.trim());
  return {
    ok: inPeriod && targetMatched && sizeCm > 0 && hasLocation,
    inPeriod,
    targetMatched,
    hasLocation,
    validSize: sizeCm > 0
  };
}

function normalizeTournament(id: string, data: Record<string, unknown>): Tournament {
  return {
    id,
    ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
    name: typeof data.name === "string" ? data.name : "",
    description: typeof data.description === "string" ? data.description : "",
    startAt: normalizeDate(data.startAt),
    endAt: normalizeDate(data.endAt),
    targetFishTypes: Array.isArray(data.targetFishTypes) ? data.targetFishTypes.filter((item): item is string => typeof item === "string") : [],
    rankingType: data.rankingType === "totalSize" || data.rankingType === "count" ? data.rankingType : "biggest",
    rules: typeof data.rules === "string" ? data.rules : "",
    visibility: data.visibility === "private" ? "private" : "public",
    maxParticipants: typeof data.maxParticipants === "number" ? data.maxParticipants : null,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt)
  };
}

function normalizeParticipant(id: string, data: Record<string, unknown>): TournamentParticipant {
  return {
    id,
    tournamentId: typeof data.tournamentId === "string" ? data.tournamentId : "",
    userId: typeof data.userId === "string" ? data.userId : "",
    userName: typeof data.userName === "string" ? data.userName : "参加者",
    joinedAt: normalizeDate(data.joinedAt),
    status: "active"
  };
}

function normalizeDate(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  }
  return new Date().toISOString();
}
