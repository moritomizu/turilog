"use client";

import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { getRoleDefaults, getTournament, getTournamentParticipants } from "@/lib/tournaments";
import type { TournamentParticipant, TournamentRole } from "@/types";

export async function getTournamentRole(userId: string, tournamentId: string): Promise<TournamentRole | null> {
  const participant = await getParticipant(userId, tournamentId);
  if (participant) return participant.role;
  const tournament = await getTournament(tournamentId);
  return tournament?.ownerId === userId ? "owner" : null;
}

export async function canViewExactLocation(userId: string, tournamentId: string) {
  const participant = await getParticipant(userId, tournamentId);
  if (participant?.canViewExactLocation) return true;
  const tournament = await getTournament(tournamentId);
  return tournament?.ownerId === userId;
}

export async function canViewPrivateCatchDetails(userId: string, tournamentId: string) {
  const participant = await getParticipant(userId, tournamentId);
  if (participant?.canViewPrivateCatchDetails) return true;
  const tournament = await getTournament(tournamentId);
  return tournament?.ownerId === userId;
}

export async function canApproveTournamentEntries(userId: string, tournamentId: string) {
  const participant = await getParticipant(userId, tournamentId);
  if (participant?.canApproveEntries) return true;
  const tournament = await getTournament(tournamentId);
  return tournament?.ownerId === userId;
}

export async function isTournamentOwner(userId: string, tournamentId: string) {
  const role = await getTournamentRole(userId, tournamentId);
  return role === "owner";
}

export async function isTournamentAdmin(userId: string, tournamentId: string) {
  const role = await getTournamentRole(userId, tournamentId);
  return role === "owner" || role === "admin";
}

export function canManageMembers(participant: TournamentParticipant | null | undefined) {
  return participant?.role === "owner" || participant?.role === "admin";
}

export function canManageApprovals(participant: TournamentParticipant | null | undefined) {
  return participant?.canApproveEntries === true || participant?.role === "owner" || participant?.role === "admin" || participant?.role === "subAdmin";
}

export function canSeeExactLocation(participant: TournamentParticipant | null | undefined) {
  return participant?.canViewExactLocation === true || participant?.role === "owner" || participant?.role === "admin" || participant?.role === "subAdmin";
}

export function canSeePrivateCatchDetails(participant: TournamentParticipant | null | undefined) {
  return participant?.canViewPrivateCatchDetails === true || participant?.role === "owner" || participant?.role === "admin" || participant?.role === "subAdmin";
}

export async function updateTournamentParticipantPermissions(
  requester: TournamentParticipant,
  participant: TournamentParticipant,
  input: {
    role: TournamentRole;
    canViewExactLocation: boolean;
    canViewPrivateCatchDetails: boolean;
    canApproveEntries: boolean;
  }
) {
  if (!canManageMembers(requester)) throw new Error("参加者権限を変更できません。");
  if (participant.role === "owner") throw new Error("ownerの権限は変更できません。");
  if (input.role === "owner") throw new Error("ownerへの変更はできません。");
  const defaults = getRoleDefaults(input.role);
  await updateDoc(doc(getFirebaseDb(), "tournamentParticipants", participant.id), {
    role: input.role,
    canViewExactLocation: input.canViewExactLocation || defaults.canViewExactLocation,
    canViewPrivateCatchDetails: input.canViewPrivateCatchDetails || defaults.canViewPrivateCatchDetails,
    canApproveEntries: input.canApproveEntries || defaults.canApproveEntries,
    updatedAt: serverTimestamp()
  });
}

export function findParticipant(participants: TournamentParticipant[], userId: string, ownerId?: string) {
  return participants.find((item) => item.userId === userId) ?? (ownerId === userId ? makeOwnerFallback(userId) : null);
}

async function getParticipant(userId: string, tournamentId: string) {
  const snapshot = await getDoc(doc(getFirebaseDb(), "tournamentParticipants", `${tournamentId}_${userId}`));
  if (!snapshot.exists()) return null;
  const participants = await getTournamentParticipants(tournamentId);
  return participants.find((item) => item.id === snapshot.id) ?? null;
}

function makeOwnerFallback(userId: string): TournamentParticipant {
  return {
    id: "",
    tournamentId: "",
    userId,
    userName: "主催者",
    email: null,
    avatarUrl: null,
    role: "owner",
    canViewExactLocation: true,
    canViewPrivateCatchDetails: true,
    canApproveEntries: true,
    joinedAt: new Date().toISOString(),
    updatedAt: null,
    status: "active"
  };
}
