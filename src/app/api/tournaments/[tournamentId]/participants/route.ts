import { NextResponse } from "next/server";
import {
  getBearerToken,
  getErrorStatus,
  getFirestoreDocument,
  getServiceAccountAccessToken,
  runFirestoreQuery,
  verifyFirebaseIdToken
} from "@/lib/server/firebaseRest";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { tournamentId: string } }) {
  try {
    const requester = await verifyFirebaseIdToken(getBearerToken(request));
    const accessToken = await getServiceAccountAccessToken();
    const tournament = await getFirestoreDocument(`tournaments/${params.tournamentId}`, accessToken);
    if (!tournament) return NextResponse.json({ error: "大会が見つかりません。" }, { status: 404 });

    const rows = await runFirestoreQuery(
      {
        from: [{ collectionId: "tournamentParticipants" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "tournamentId" },
            op: "EQUAL",
            value: { stringValue: params.tournamentId }
          }
        }
      },
      accessToken
    );
    const participants: Record<string, unknown>[] = rows.map((row) => ({ id: row.id, ...row.data }));
    const requesterParticipant = participants.find((participant) => participant.userId === requester.uid) ?? null;
    const admin = await isAdminRequester(requester.uid, accessToken);
    const owner = tournament.ownerId === requester.uid;
    const publicTournament = tournament.visibility === "public";
    const activeParticipant = requesterParticipant?.status === "active";

    if (!publicTournament && !owner && !activeParticipant && !admin) {
      return NextResponse.json({ error: "この大会の参加者を閲覧できません。" }, { status: 403 });
    }

    const canViewSensitive =
      admin ||
      owner ||
      requesterParticipant?.role === "owner" ||
      requesterParticipant?.role === "admin" ||
      requesterParticipant?.role === "subAdmin" ||
      requesterParticipant?.canViewPrivateCatchDetails === true ||
      requesterParticipant?.canApproveEntries === true;

    return NextResponse.json({
      participants: participants.map((participant) => sanitizeParticipant(participant, {
        requesterUid: requester.uid,
        canViewSensitive
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "大会参加者を取得できませんでした。" },
      { status: getErrorStatus(error) }
    );
  }
}

async function isAdminRequester(uid: string, accessToken: string) {
  const adminUids = (process.env.NEXT_PUBLIC_ADMIN_UIDS || process.env.ADMIN_UIDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (adminUids.includes(uid)) return true;
  const profile = await getFirestoreDocument(`users/${uid}`, accessToken).catch(() => null);
  return profile?.subscriptionPlan === "tester";
}

function sanitizeParticipant(participant: Record<string, unknown>, context: { requesterUid: string; canViewSensitive: boolean }) {
  const isSelf = participant.userId === context.requesterUid;
  const canViewOwnOperationalFields = context.canViewSensitive || isSelf;
  return {
    id: text(participant.id),
    tournamentId: text(participant.tournamentId),
    userId: text(participant.userId),
    userName: text(participant.userName) || "参加者",
    email: context.canViewSensitive || isSelf ? nullableText(participant.email) : null,
    avatarUrl: nullableText(participant.avatarUrl),
    safetyInfo: context.canViewSensitive || isSelf ? participant.safetyInfo ?? null : null,
    safetyInfoSubmittedAt: context.canViewSensitive || isSelf ? participant.safetyInfoSubmittedAt ?? null : null,
    paymentStatus: canViewOwnOperationalFields ? text(participant.paymentStatus) || "notRequired" : "notRequired",
    paymentConfirmedAt: canViewOwnOperationalFields ? participant.paymentConfirmedAt ?? null : null,
    role: canViewOwnOperationalFields ? text(participant.role) || "participant" : "participant",
    canViewExactLocation: canViewOwnOperationalFields && participant.canViewExactLocation === true,
    canViewPrivateCatchDetails: canViewOwnOperationalFields && participant.canViewPrivateCatchDetails === true,
    canApproveEntries: canViewOwnOperationalFields && participant.canApproveEntries === true,
    joinedAt: participant.joinedAt ?? new Date().toISOString(),
    updatedAt: participant.updatedAt ?? null,
    status: text(participant.status) || "active"
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}
