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

    const [participantRows, catchRows] = await Promise.all([
      runFirestoreQuery(
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
      ),
      runFirestoreQuery(
        {
          from: [{ collectionId: "catches" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "tournamentId" },
              op: "EQUAL",
              value: { stringValue: params.tournamentId }
            }
          }
        },
        accessToken
      )
    ]);

    const participants: Record<string, unknown>[] = participantRows.map((row) => ({ id: row.id, ...row.data }));
    const requesterParticipant = participants.find((participant) => participant.userId === requester.uid) ?? null;
    const admin = await isAdminRequester(requester.uid, accessToken);
    const owner = tournament.ownerId === requester.uid;
    const publicTournament = tournament.visibility === "public";
    const activeParticipant = requesterParticipant?.status === "active";

    if (!publicTournament && !owner && !activeParticipant && !admin) {
      return NextResponse.json({ error: "この大会の釣果を閲覧できません。" }, { status: 403 });
    }

    const canViewSensitive =
      admin ||
      owner ||
      requesterParticipant?.role === "owner" ||
      requesterParticipant?.role === "admin" ||
      requesterParticipant?.role === "subAdmin" ||
      requesterParticipant?.canViewPrivateCatchDetails === true ||
      requesterParticipant?.canApproveEntries === true;

    const tournamentCatches: Record<string, unknown>[] = catchRows.map((row) => ({ id: row.id, ...row.data }));
    const catches = tournamentCatches
      .filter((item) => canViewSensitive || item.userId === requester.uid || item.tournamentEntryStatus === "approved")
      .map((item) => sanitizeCatch(item, { requesterUid: requester.uid, canViewSensitive }));

    return NextResponse.json({ catches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "大会釣果を取得できませんでした。" },
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

function sanitizeCatch(item: Record<string, unknown>, context: { requesterUid: string; canViewSensitive: boolean }) {
  const isSelf = item.userId === context.requesterUid || item.postedByUserId === context.requesterUid || item.actualAnglerUserId === context.requesterUid;
  if (context.canViewSensitive || isSelf) return item;
  return {
    ...item,
    latitude: null,
    longitude: null,
    pointName: "",
    catchProof: null,
    verificationScore: null,
    anomalyFindings: [],
    rankingEligibility: null
  };
}
