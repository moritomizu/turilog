"use client";

import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import type {
  Tournament,
  TournamentLocationVisibility,
  TournamentParticipant,
  TournamentParticipantGender,
  TournamentPaymentStatus,
  TournamentParticipantSafetyInfo,
  TournamentRankingType,
  TournamentRole,
  TournamentStatus,
  TournamentVisibility
} from "@/types";

export type TournamentInput = {
  ownerId: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  startAt: string;
  endAt: string;
  targetFishTypes: string[];
  rankingType: TournamentRankingType;
  rules: string;
  visibility: TournamentVisibility;
  maxParticipants: number | null;
  requiresParticipantInfo?: boolean;
  entryFeeEnabled?: boolean;
  entryFeeAmount?: number | null;
  entryFeeCurrency?: "JPY";
  paymentInstructions?: string;
  locationVisibilityDefault?: TournamentLocationVisibility;
  ownerUserName?: string;
  ownerEmail?: string | null;
};

export type JoinTournamentOptions = {
  avatarUrl?: string | null;
  email?: string | null;
  safetyInfo?: TournamentParticipantSafetyInfo | null;
};

export async function createTournament(input: TournamentInput) {
  const db = getFirebaseDb();
  const ref = doc(collection(db, "tournaments"));
  const participantRef = doc(db, "tournamentParticipants", `${ref.id}_${input.ownerId}`);
  const { ownerUserName, ownerEmail, ...tournamentInput } = input;
  const batch = writeBatch(db);
  batch.set(ref, {
    ...tournamentInput,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(participantRef, {
    tournamentId: ref.id,
    userId: input.ownerId,
    userName: ownerUserName || "主催者",
    email: ownerEmail ?? null,
    avatarUrl: null,
    safetyInfo: null,
    safetyInfoSubmittedAt: null,
    paymentStatus: "notRequired",
    paymentConfirmedAt: null,
    ...getRoleDefaults("owner"),
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "active"
  });
  await batch.commit();
  return ref.id;
}

export async function updateTournament(tournamentId: string, ownerId: string, input: Omit<TournamentInput, "ownerId">) {
  const ref = doc(getFirebaseDb(), "tournaments", tournamentId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error("大会が見つかりません。");
  if (snapshot.data().ownerId !== ownerId) throw new Error("大会作成者のみ編集できます。");
  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTournament(tournamentId: string, ownerId: string) {
  const db = getFirebaseDb();
  const tournamentRef = doc(db, "tournaments", tournamentId);
  const snapshot = await getDoc(tournamentRef);
  if (!snapshot.exists()) throw new Error("大会が見つかりません。");
  if (snapshot.data().ownerId !== ownerId) throw new Error("大会作成者のみ削除できます。");

  const [participantsSnapshot, catchesSnapshot] = await Promise.all([
    getDocs(query(collection(db, "tournamentParticipants"), where("tournamentId", "==", tournamentId))),
    getDocs(query(collection(db, "catches"), where("tournamentId", "==", tournamentId)))
  ]);

  const batch = writeBatch(db);
  batch.delete(tournamentRef);
  participantsSnapshot.docs.forEach((item) => batch.delete(item.ref));
  catchesSnapshot.docs.forEach((item) => {
    batch.update(item.ref, {
      tournamentId: null,
      isTournamentEntry: false,
      tournamentEntryStatus: "none",
      tournamentSubmittedAt: null
    });
  });
  await batch.commit();
}

export async function uploadTournamentImage(ownerId: string, file: File) {
  const storageRef = ref(getFirebaseStorage(), `tournaments/${ownerId}/covers/${crypto.randomUUID()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
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

export async function uploadTournamentParticipantIcon(userId: string, file: File) {
  const storageRef = ref(getFirebaseStorage(), `tournamentParticipants/${userId}/${crypto.randomUUID()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function joinTournament(tournament: Tournament, userId: string, userName: string, options: JoinTournamentOptions = {}) {
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
    email: options.email ?? null,
    avatarUrl: options.avatarUrl ?? null,
    safetyInfo: options.safetyInfo ?? null,
    safetyInfoSubmittedAt: options.safetyInfo ? new Date().toISOString() : null,
    paymentStatus: tournament.entryFeeEnabled ? "unpaid" : "notRequired",
    paymentConfirmedAt: null,
    ...getRoleDefaults("participant"),
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "active"
  });
}

export async function updateTournamentParticipantPaymentStatus(participantId: string, status: TournamentPaymentStatus) {
  await updateDoc(doc(getFirebaseDb(), "tournamentParticipants", participantId), {
    paymentStatus: status,
    paymentConfirmedAt: status === "paid" || status === "waived" ? new Date().toISOString() : null,
    updatedAt: serverTimestamp()
  });
}

export async function leaveTournament(tournamentId: string, userId: string) {
  await deleteDoc(doc(getFirebaseDb(), "tournamentParticipants", `${tournamentId}_${userId}`));
}

export async function getJoinedTournaments(userId: string): Promise<Tournament[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "tournamentParticipants"), where("userId", "==", userId)));
  const participants = snapshot.docs
    .map((item) => item.data())
    .filter((item) => item.role !== "viewer" && typeof item.tournamentId === "string");
  const tournaments = await Promise.all(participants.map((item) => getTournament(item.tournamentId)));
  return tournaments.filter((item, index): item is Tournament => {
    if (!item) return false;
    if (!item.entryFeeEnabled) return true;
    const paymentStatus = participants[index].paymentStatus;
    return paymentStatus === "paid" || paymentStatus === "waived";
  });
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

export function parseTargetFishTypes(value: string) {
  return value.split(/[,、]/).map((item) => item.trim()).filter(Boolean);
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
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
    startAt: normalizeDate(data.startAt),
    endAt: normalizeDate(data.endAt),
    targetFishTypes: Array.isArray(data.targetFishTypes) ? data.targetFishTypes.filter((item): item is string => typeof item === "string") : [],
    rankingType: data.rankingType === "totalSize" || data.rankingType === "count" ? data.rankingType : "biggest",
    rules: typeof data.rules === "string" ? data.rules : "",
    visibility: data.visibility === "private" ? "private" : "public",
    maxParticipants: typeof data.maxParticipants === "number" ? data.maxParticipants : null,
    requiresParticipantInfo: data.requiresParticipantInfo === true,
    entryFeeEnabled: data.entryFeeEnabled === true,
    entryFeeAmount: typeof data.entryFeeAmount === "number" ? data.entryFeeAmount : null,
    entryFeeCurrency: "JPY",
    paymentInstructions: typeof data.paymentInstructions === "string" ? data.paymentInstructions : "",
    locationVisibilityDefault:
      data.locationVisibilityDefault === "blurredForParticipants" || data.locationVisibilityDefault === "areaOnlyForParticipants" || data.locationVisibilityDefault === "hiddenForParticipants"
        ? data.locationVisibilityDefault
        : "exactForOrganizersOnly",
    allowedAreaCodes: Array.isArray(data.allowedAreaCodes) ? data.allowedAreaCodes.filter((item): item is string => typeof item === "string") : [],
    allowedAreas: Array.isArray(data.allowedAreas) ? data.allowedAreas.filter((item): item is string => typeof item === "string") : [],
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt)
  };
}

function normalizeParticipant(id: string, data: Record<string, unknown>): TournamentParticipant {
  const role = normalizeRole(data.role);
  const defaults = getRoleDefaults(role);
  return {
    id,
    tournamentId: typeof data.tournamentId === "string" ? data.tournamentId : "",
    userId: typeof data.userId === "string" ? data.userId : "",
    userName: typeof data.userName === "string" ? data.userName : "参加者",
    email: typeof data.email === "string" ? data.email : null,
    avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : null,
    safetyInfo: normalizeSafetyInfo(data.safetyInfo),
    safetyInfoSubmittedAt: data.safetyInfoSubmittedAt == null ? null : normalizeDate(data.safetyInfoSubmittedAt),
    paymentStatus: normalizePaymentStatus(data.paymentStatus),
    paymentConfirmedAt: data.paymentConfirmedAt == null ? null : normalizeDate(data.paymentConfirmedAt),
    role,
    canViewExactLocation: typeof data.canViewExactLocation === "boolean" ? data.canViewExactLocation : defaults.canViewExactLocation,
    canViewPrivateCatchDetails: typeof data.canViewPrivateCatchDetails === "boolean" ? data.canViewPrivateCatchDetails : defaults.canViewPrivateCatchDetails,
    canApproveEntries: typeof data.canApproveEntries === "boolean" ? data.canApproveEntries : defaults.canApproveEntries,
    joinedAt: normalizeDate(data.joinedAt),
    updatedAt: data.updatedAt == null ? null : normalizeDate(data.updatedAt),
    status: "active"
  };
}

function normalizePaymentStatus(value: unknown): TournamentPaymentStatus {
  if (value === "unpaid" || value === "paid" || value === "waived") return value;
  return "notRequired";
}

function normalizeSafetyInfo(value: unknown): TournamentParticipantSafetyInfo | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const age = Number(data.age ?? NaN);
  return {
    fullName: typeof data.fullName === "string" ? data.fullName : "",
    address: typeof data.address === "string" ? data.address : "",
    age: Number.isFinite(age) ? age : null,
    gender: normalizeGender(data.gender),
    phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : "",
    emergencyContact: typeof data.emergencyContact === "string" ? data.emergencyContact : ""
  };
}

function normalizeGender(value: unknown): TournamentParticipantGender {
  if (value === "male" || value === "female" || value === "other" || value === "preferNotToSay") return value;
  return "preferNotToSay";
}

export function getRoleDefaults(role: TournamentRole) {
  if (role === "owner") {
    return { role, canViewExactLocation: true, canViewPrivateCatchDetails: true, canApproveEntries: true };
  }
  if (role === "admin") {
    return { role, canViewExactLocation: true, canViewPrivateCatchDetails: true, canApproveEntries: true };
  }
  if (role === "subAdmin") {
    return { role, canViewExactLocation: true, canViewPrivateCatchDetails: true, canApproveEntries: true };
  }
  return { role, canViewExactLocation: false, canViewPrivateCatchDetails: false, canApproveEntries: false };
}

function normalizeRole(value: unknown): TournamentRole {
  if (value === "owner" || value === "admin" || value === "subAdmin" || value === "viewer") return value;
  return "participant";
}

function normalizeDate(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  }
  return new Date().toISOString();
}
