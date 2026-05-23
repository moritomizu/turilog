"use client";

const PARTICIPANT_NAME_KEY = "tsurilogPreferredParticipantName";

export function getPreferredParticipantName(fallback: string) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(PARTICIPANT_NAME_KEY) || fallback;
}

export function rememberParticipantName(name: string) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) window.localStorage.setItem(PARTICIPANT_NAME_KEY, trimmed);
}
