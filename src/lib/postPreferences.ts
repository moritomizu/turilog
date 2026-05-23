"use client";

const LAST_POST_GROUP_KEY = "tsurilogLastPostGroupId";

export function getLastPostGroupId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LAST_POST_GROUP_KEY) ?? "";
}

export function rememberLastPostGroupId(groupId: string) {
  if (typeof window === "undefined") return;
  if (groupId) {
    window.localStorage.setItem(LAST_POST_GROUP_KEY, groupId);
  } else {
    window.localStorage.removeItem(LAST_POST_GROUP_KEY);
  }
}
