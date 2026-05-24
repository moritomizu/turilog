"use client";

import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { GroupCatchComment } from "@/types";

export async function getGroupCatchComments(groupId: string): Promise<GroupCatchComment[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "groupCatchComments"), where("groupId", "==", groupId)));
  return snapshot.docs.map((item) => normalizeGroupCatchComment(item.id, item.data())).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addGroupCatchComment(input: Pick<GroupCatchComment, "groupId" | "catchId" | "userId" | "userName" | "body">) {
  const body = input.body.trim();
  if (!body) throw new Error("コメントを入力してください。");
  await addDoc(collection(getFirebaseDb(), "groupCatchComments"), {
    ...input,
    body,
    createdAt: serverTimestamp()
  });
}

function normalizeGroupCatchComment(id: string, data: Record<string, unknown>): GroupCatchComment {
  return {
    id,
    groupId: typeof data.groupId === "string" ? data.groupId : "",
    catchId: typeof data.catchId === "string" ? data.catchId : "",
    userId: typeof data.userId === "string" ? data.userId : "",
    userName: typeof data.userName === "string" ? data.userName : "メンバー",
    body: typeof data.body === "string" ? data.body : "",
    createdAt: normalizeDate(data.createdAt)
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
