"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Tackle, TackleInfo } from "@/types";

export type TackleInput = {
  name: string;
  fishingGenre?: string;
  rod?: string;
  reel?: string;
  line?: string;
  leader?: string;
  lure?: string;
  memo?: string;
  isDefault?: boolean;
};

export async function getUserTackles(userId: string): Promise<Tackle[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "tackles"), where("userId", "==", userId)));
  return snapshot.docs.map((item) => normalizeTackleDoc(item.id, item.data())).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createTackle(userId: string, input: TackleInput) {
  await addDoc(collection(getFirebaseDb(), "tackles"), {
    userId,
    ...sanitizeTackleInput(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateTackle(tackleId: string, input: TackleInput) {
  await updateDoc(doc(getFirebaseDb(), "tackles", tackleId), {
    ...sanitizeTackleInput(input),
    updatedAt: serverTimestamp()
  });
}

export async function deleteTackle(tackleId: string) {
  await deleteDoc(doc(getFirebaseDb(), "tackles", tackleId));
}

export function tackleToTackleInfo(tackle: Tackle): TackleInfo {
  return {
    lureName: tackle.lure ?? "",
    lureColor: "",
    rodName: tackle.rod ?? "",
    reelName: tackle.reel ?? "",
    lineName: tackle.line ?? "",
    leaderName: tackle.leader ?? ""
  };
}

function sanitizeTackleInput(input: TackleInput) {
  return {
    name: input.name.trim(),
    fishingGenre: input.fishingGenre?.trim() ?? "",
    rod: input.rod?.trim() ?? "",
    reel: input.reel?.trim() ?? "",
    line: input.line?.trim() ?? "",
    leader: input.leader?.trim() ?? "",
    lure: input.lure?.trim() ?? "",
    memo: input.memo?.trim() ?? "",
    isDefault: input.isDefault === true
  };
}

function normalizeTackleDoc(id: string, data: Record<string, unknown>): Tackle {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "",
    name: typeof data.name === "string" ? data.name : "",
    fishingGenre: typeof data.fishingGenre === "string" ? data.fishingGenre : "",
    rod: typeof data.rod === "string" ? data.rod : "",
    reel: typeof data.reel === "string" ? data.reel : "",
    line: typeof data.line === "string" ? data.line : "",
    leader: typeof data.leader === "string" ? data.leader : "",
    lure: typeof data.lure === "string" ? data.lure : "",
    memo: typeof data.memo === "string" ? data.memo : "",
    isDefault: data.isDefault === true,
    createdAt: normalizeDateString(data.createdAt),
    updatedAt: normalizeDateString(data.updatedAt)
  };
}

function normalizeDateString(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  }
  return new Date().toISOString();
}
