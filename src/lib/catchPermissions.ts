"use client";

export function canEditCatchLog(userId: string) {
  return isListedUser(userId, process.env.NEXT_PUBLIC_CATCH_EDITOR_UIDS) || isListedUser(userId, process.env.NEXT_PUBLIC_PREMIUM_USER_UIDS);
}

function isListedUser(userId: string, list: string | undefined) {
  return (list ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(userId);
}
