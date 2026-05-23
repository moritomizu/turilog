"use client";

import type { Catch, Group, GroupMember, GroupRole } from "@/types";
import { getGroup, getGroupMembers } from "@/lib/groups";

export async function getGroupMemberRole(userId: string, groupId: string): Promise<GroupRole | null> {
  return (await getGroupMember(userId, groupId))?.role ?? null;
}

export async function canViewGroup(userId: string, groupId: string) {
  return Boolean(await getGroupMember(userId, groupId));
}

export async function canPostToGroup(userId: string, groupId: string) {
  return (await getGroupMember(userId, groupId))?.canPost === true;
}

export async function canProxyPostToGroup(userId: string, groupId: string) {
  const member = await getGroupMember(userId, groupId);
  return member?.role === "owner" || member?.role === "admin" || member?.canProxyPost === true;
}

export async function canEditGroupCatch(userId: string, groupId: string, item: Catch) {
  const member = await getGroupMember(userId, groupId);
  return canEditGroupCatchSync(member, item, userId);
}

export async function canDeleteGroupCatch(userId: string, groupId: string, item: Catch) {
  const member = await getGroupMember(userId, groupId);
  return canDeleteGroupCatchSync(member, item, userId);
}

export async function canViewGroupExactLocation(userId: string, groupId: string) {
  const [group, member] = await Promise.all([getGroup(groupId), getGroupMember(userId, groupId)]);
  return canViewGroupExactLocationSync(group, member);
}

export async function canManageGroupMembers(userId: string, groupId: string) {
  return canManageGroupMembersSync(await getGroupMember(userId, groupId));
}

export async function isGroupOwner(userId: string, groupId: string) {
  return (await getGroupMember(userId, groupId))?.role === "owner";
}

export async function isGroupAdmin(userId: string, groupId: string) {
  const role = (await getGroupMember(userId, groupId))?.role;
  return role === "owner" || role === "admin";
}

export function canManageGroupMembersSync(member: GroupMember | null | undefined) {
  return member?.role === "owner" || member?.role === "admin";
}

export function canViewGroupExactLocationSync(group: Group | null | undefined, member: GroupMember | null | undefined) {
  if (!member || member.role === "viewer") return false;
  if (member.role === "owner" || member.role === "admin") return true;
  if (member.canViewExactLocation) return true;
  return group?.locationVisibilityDefault === "exactForAllMembers";
}

export function canEditGroupCatchSync(member: GroupMember | null | undefined, item: Catch, userId: string) {
  if (!member) return false;
  if (member.role === "owner" || member.role === "admin" || member.canEditGroupCatches) return true;
  return item.actualAnglerUserId === userId || item.postedByUserId === userId;
}

export function canDeleteGroupCatchSync(member: GroupMember | null | undefined, item: Catch, userId: string) {
  if (!member) return false;
  if (member.role === "owner" || member.role === "admin" || member.canDeleteGroupCatches) return true;
  return item.postedByUserId === userId;
}

export function findGroupMember(members: GroupMember[], userId: string) {
  return members.find((item) => item.userId === userId) ?? null;
}

async function getGroupMember(userId: string, groupId: string) {
  const members = await getGroupMembers(groupId);
  return findGroupMember(members, userId);
}
