"use client";

import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import type { Group, GroupJoinRequest, GroupJoinRequestStatus, GroupLocationVisibility, GroupMember, GroupRole, GroupVisibility } from "@/types";

export type GroupInput = {
  ownerId: string;
  ownerUserName: string;
  ownerEmail: string | null;
  name: string;
  description: string;
  iconUrl?: string | null;
  visibility: GroupVisibility;
  locationVisibilityDefault: GroupLocationVisibility;
};

export async function uploadGroupIcon(ownerId: string, file: File) {
  const storageRef = ref(getFirebaseStorage(), `groups/${ownerId}/icons/${crypto.randomUUID()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createGroup(input: GroupInput) {
  const db = getFirebaseDb();
  const groupRef = doc(collection(db, "groups"));
  const memberRef = doc(db, "groupMembers", `${groupRef.id}_${input.ownerId}`);
  const inviteCode = createInviteCode();
  const batch = writeBatch(db);
  batch.set(groupRef, {
    ownerId: input.ownerId,
    name: input.name,
    description: input.description,
    iconUrl: input.iconUrl ?? null,
    visibility: input.visibility,
    locationVisibilityDefault: input.locationVisibilityDefault,
    inviteCode,
    memberCount: 1,
    catchCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(memberRef, {
    groupId: groupRef.id,
    userId: input.ownerId,
    userName: input.ownerUserName,
    email: input.ownerEmail,
    ...getGroupRoleDefaults("owner"),
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "active"
  });
  await batch.commit();
  return groupRef.id;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "groups", groupId));
  return snapshot.exists() ? normalizeGroup(snapshot.id, snapshot.data()) : null;
}

export async function updateGroup(groupId: string, requesterUserId: string, input: Pick<Group, "name" | "description" | "visibility" | "locationVisibilityDefault">) {
  const db = getFirebaseDb();
  const [group, members] = await Promise.all([getGroup(groupId), getGroupMembers(groupId)]);
  const requester = members.find((member) => member.userId === requesterUserId && member.status === "active");
  if (!group) throw new Error("グループが見つかりません。");
  if (requester?.role !== "owner" && requester?.role !== "admin") throw new Error("グループ管理者のみ編集できます。");
  await updateDoc(doc(db, "groups", groupId), {
    name: input.name,
    description: input.description,
    visibility: input.visibility,
    locationVisibilityDefault: input.locationVisibilityDefault,
    updatedAt: serverTimestamp()
  });
}

export async function getGroupsForUser(userId: string): Promise<Group[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "groupMembers"), where("userId", "==", userId), where("status", "==", "active")));
  const ids = snapshot.docs.map((item) => item.data().groupId).filter((value): value is string => typeof value === "string");
  const groups = await Promise.all(ids.map((id) => getGroup(id)));
  return groups.filter((item): item is Group => Boolean(item)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getDiscoverableGroups(): Promise<Group[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "groups"), where("visibility", "in", ["public", "inviteOnly"])));
  return snapshot.docs.map((item) => normalizeGroup(item.id, item.data())).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPostableGroupsForUser(userId: string): Promise<Group[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "groupMembers"), where("userId", "==", userId), where("status", "==", "active")));
  const ids = snapshot.docs
    .filter((item) => item.data().canPost !== false)
    .map((item) => item.data().groupId)
    .filter((value): value is string => typeof value === "string");
  const groups = await Promise.all(ids.map((id) => getGroup(id)));
  return groups.filter((item): item is Group => Boolean(item)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "groupMembers"), where("groupId", "==", groupId), where("status", "==", "active")));
  return snapshot.docs.map((item) => normalizeGroupMember(item.id, item.data()));
}

export async function getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "groups"), where("inviteCode", "==", inviteCode.trim())));
  const first = snapshot.docs[0];
  return first ? normalizeGroup(first.id, first.data()) : null;
}

export async function joinGroupByInviteCode(inviteCode: string, userId: string, userName: string, email: string | null) {
  const group = await getGroupByInviteCode(inviteCode);
  if (!group) throw new Error("招待コードに一致するグループが見つかりません。");
  await joinGroup(group, userId, userName, email);
  return group.id;
}

export async function joinGroup(group: Group, userId: string, userName: string, email: string | null) {
  const db = getFirebaseDb();
  const ref = doc(db, "groupMembers", `${group.id}_${userId}`);
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().status === "active") return;
  await setDoc(ref, {
    groupId: group.id,
    userId,
    userName,
    email,
    ...getGroupRoleDefaults("member", group.locationVisibilityDefault),
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "active"
  });
  await updateDoc(doc(db, "groups", group.id), {
    memberCount: (await getGroupMembers(group.id)).length + (existing.exists() ? 0 : 1),
    updatedAt: serverTimestamp()
  });
}

export async function requestJoinGroup(group: Group, userId: string, userName: string, email: string | null, message: string) {
  if (group.visibility !== "inviteOnly") throw new Error("参加申請が必要なグループではありません。");
  const db = getFirebaseDb();
  const memberRef = doc(db, "groupMembers", `${group.id}_${userId}`);
  const member = await getDoc(memberRef);
  if (member.exists() && member.data().status === "active") throw new Error("すでに参加しています。");
  const requestRef = doc(db, "groupJoinRequests", `${group.id}_${userId}`);
  const existing = await getDoc(requestRef);
  if (existing.exists() && existing.data().status === "pending") throw new Error("すでに参加申請中です。");
  await setDoc(requestRef, {
    groupId: group.id,
    userId,
    userName,
    email,
    message: message.trim(),
    status: "pending",
    requestedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null
  });
}

export async function getGroupJoinRequests(groupId: string): Promise<GroupJoinRequest[]> {
  const snapshot = await getDocs(query(collection(getFirebaseDb(), "groupJoinRequests"), where("groupId", "==", groupId)));
  return snapshot.docs.map((item) => normalizeGroupJoinRequest(item.id, item.data())).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

export async function reviewGroupJoinRequest(request: GroupJoinRequest, status: Exclude<GroupJoinRequestStatus, "pending">, reviewedBy: string) {
  const db = getFirebaseDb();
  const requestRef = doc(db, "groupJoinRequests", request.id);
  await updateDoc(requestRef, {
    status,
    reviewedAt: serverTimestamp(),
    reviewedBy
  });
  if (status !== "approved") return;
  const group = await getGroup(request.groupId);
  if (!group) throw new Error("グループが見つかりません。");
  await joinGroup(group, request.userId, request.userName, request.email);
}

export async function updateGroupMemberPermissions(member: GroupMember, input: Pick<GroupMember, "role" | "canViewExactLocation" | "canPost" | "canProxyPost" | "canEditGroupCatches" | "canDeleteGroupCatches">) {
  await updateDoc(doc(getFirebaseDb(), "groupMembers", member.id), {
    ...input,
    updatedAt: serverTimestamp()
  });
}

export async function deleteGroup(groupId: string) {
  const db = getFirebaseDb();
  const members = await getDocs(query(collection(db, "groupMembers"), where("groupId", "==", groupId)));
  const batch = writeBatch(db);
  members.docs.forEach((member) => batch.delete(doc(db, "groupMembers", member.id)));
  await batch.commit();
  await deleteDoc(doc(db, "groups", groupId));
}

export function getGroupRoleDefaults(role: GroupRole, locationDefault: GroupLocationVisibility = "exactForAdminsOnly") {
  if (role === "owner" || role === "admin") {
    return { role, canViewExactLocation: true, canPost: true, canProxyPost: true, canEditGroupCatches: true, canDeleteGroupCatches: true };
  }
  if (role === "moderator") {
    return { role, canViewExactLocation: locationDefault === "exactForAllMembers", canPost: true, canProxyPost: true, canEditGroupCatches: true, canDeleteGroupCatches: false };
  }
  if (role === "viewer") {
    return { role, canViewExactLocation: false, canPost: false, canProxyPost: false, canEditGroupCatches: false, canDeleteGroupCatches: false };
  }
  return { role, canViewExactLocation: locationDefault === "exactForAllMembers", canPost: true, canProxyPost: false, canEditGroupCatches: false, canDeleteGroupCatches: false };
}

function normalizeGroup(id: string, data: Record<string, unknown>): Group {
  return {
    id,
    ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
    name: typeof data.name === "string" ? data.name : "",
    description: typeof data.description === "string" ? data.description : "",
    iconUrl: typeof data.iconUrl === "string" ? data.iconUrl : null,
    visibility: data.visibility === "public" || data.visibility === "inviteOnly" ? data.visibility : "private",
    locationVisibilityDefault:
      data.locationVisibilityDefault === "exactForAllMembers" || data.locationVisibilityDefault === "blurredForMembers" || data.locationVisibilityDefault === "hidden"
        ? data.locationVisibilityDefault
        : "exactForAdminsOnly",
    inviteCode: typeof data.inviteCode === "string" ? data.inviteCode : "",
    createdAt: normalizeDate(data.createdAt),
    updatedAt: data.updatedAt == null ? null : normalizeDate(data.updatedAt),
    memberCount: typeof data.memberCount === "number" ? data.memberCount : 0,
    catchCount: typeof data.catchCount === "number" ? data.catchCount : 0
  };
}

function normalizeGroupMember(id: string, data: Record<string, unknown>): GroupMember {
  const role = normalizeRole(data.role);
  const defaults = getGroupRoleDefaults(role);
  return {
    id,
    groupId: typeof data.groupId === "string" ? data.groupId : "",
    userId: typeof data.userId === "string" ? data.userId : "",
    userName: typeof data.userName === "string" ? data.userName : "メンバー",
    email: typeof data.email === "string" ? data.email : null,
    role,
    canViewExactLocation: typeof data.canViewExactLocation === "boolean" ? data.canViewExactLocation : defaults.canViewExactLocation,
    canPost: typeof data.canPost === "boolean" ? data.canPost : defaults.canPost,
    canProxyPost: typeof data.canProxyPost === "boolean" ? data.canProxyPost : defaults.canProxyPost,
    canEditGroupCatches: typeof data.canEditGroupCatches === "boolean" ? data.canEditGroupCatches : defaults.canEditGroupCatches,
    canDeleteGroupCatches: typeof data.canDeleteGroupCatches === "boolean" ? data.canDeleteGroupCatches : defaults.canDeleteGroupCatches,
    joinedAt: normalizeDate(data.joinedAt),
    updatedAt: data.updatedAt == null ? null : normalizeDate(data.updatedAt),
    status: data.status === "invited" || data.status === "removed" ? data.status : "active"
  };
}

function normalizeGroupJoinRequest(id: string, data: Record<string, unknown>): GroupJoinRequest {
  return {
    id,
    groupId: typeof data.groupId === "string" ? data.groupId : "",
    userId: typeof data.userId === "string" ? data.userId : "",
    userName: typeof data.userName === "string" ? data.userName : "参加希望者",
    email: typeof data.email === "string" ? data.email : null,
    message: typeof data.message === "string" ? data.message : "",
    status: data.status === "approved" || data.status === "rejected" ? data.status : "pending",
    requestedAt: normalizeDate(data.requestedAt),
    reviewedAt: data.reviewedAt == null ? null : normalizeDate(data.reviewedAt),
    reviewedBy: typeof data.reviewedBy === "string" ? data.reviewedBy : null
  };
}

function normalizeRole(value: unknown): GroupRole {
  if (value === "owner" || value === "admin" || value === "moderator" || value === "viewer") return value;
  return "member";
}

function normalizeDate(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  }
  return new Date().toISOString();
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
