import { NextResponse } from "next/server";
import {
  getBearerToken,
  getErrorStatus,
  getFirestoreDocument,
  getServiceAccountAccessToken,
  patchFirestoreDocument,
  runFirestoreQuery,
  verifyFirebaseIdToken
} from "@/lib/server/firebaseRest";
import type { SubscriptionPlan } from "@/types";

export const runtime = "nodejs";

const GRANTABLE_PLANS: SubscriptionPlan[] = ["premium"];

export async function GET(request: Request) {
  try {
    const { requesterUid, accessToken } = await requireAdmin(request);
    const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const users = await findUsers(query, accessToken);
    return NextResponse.json({ users, requesterUid });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ユーザーを取得できませんでした。" },
      { status: getErrorStatus(error) }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { requesterUid, accessToken } = await requireAdmin(request);
    const body = (await request.json()) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const plan = typeof body.plan === "string" ? (body.plan as SubscriptionPlan) : "premium";
    const enabled = body.enabled === true;

    if (!userId) return NextResponse.json({ error: "対象ユーザーを指定してください。" }, { status: 400 });
    if (!GRANTABLE_PLANS.includes(plan)) return NextResponse.json({ error: "付与できないプランです。" }, { status: 400 });

    const current = await getFirestoreDocument(`users/${userId}`, accessToken);
    if (!current) return NextResponse.json({ error: "対象ユーザーが見つかりません。" }, { status: 404 });

    const existing = normalizeGrantedPlans(current.adminGrantedPlans);
    const next = enabled ? [...new Set([...existing, plan])] : existing.filter((item) => item !== plan);
    await patchFirestoreDocument(
      `users/${userId}`,
      {
        adminGrantedPlans: next,
        adminGrantUpdatedAt: new Date(),
        adminGrantUpdatedBy: requesterUid
      },
      accessToken
    );

    return NextResponse.json({
      user: toAdminUser(userId, { ...current, adminGrantedPlans: next }),
      message: enabled ? "Premium機能を付与しました。" : "Premium機能の付与を解除しました。"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "機能付与を更新できませんでした。" },
      { status: getErrorStatus(error) }
    );
  }
}

async function requireAdmin(request: Request) {
  const requester = await verifyFirebaseIdToken(getBearerToken(request));
  const accessToken = await getServiceAccountAccessToken();
  const profile = await getFirestoreDocument(`users/${requester.uid}`, accessToken);
  const adminUids = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (profile?.subscriptionPlan !== "tester" && !adminUids.includes(requester.uid)) {
    const error = new Error("管理者のみ利用できます。") as Error & { status?: number };
    error.status = 403;
    throw error;
  }
  return { requesterUid: requester.uid, accessToken };
}

async function findUsers(query: string, accessToken: string) {
  if (query) {
    const direct = await getFirestoreDocument(`users/${query}`, accessToken).catch(() => null);
    if (direct) return [toAdminUser(query, direct)];
  }

  const rows = await runFirestoreQuery(
    {
      from: [{ collectionId: "users" }],
      limit: 200
    },
    accessToken
  );
  return rows
    .map((row) => toAdminUser(row.id, row.data))
    .filter((user) => {
      if (!query) return true;
      return [user.uid, user.email, user.displayName].some((value) => value.toLowerCase().includes(query));
    })
    .slice(0, 50);
}

function toAdminUser(uid: string, data: Record<string, unknown>) {
  return {
    uid,
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    email: typeof data.email === "string" ? data.email : "",
    avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : "",
    subscriptionPlan: typeof data.subscriptionPlan === "string" ? data.subscriptionPlan : "free",
    subscriptionStatus: typeof data.subscriptionStatus === "string" ? data.subscriptionStatus : "none",
    adminGrantedPlans: normalizeGrantedPlans(data.adminGrantedPlans)
  };
}

function normalizeGrantedPlans(value: unknown): SubscriptionPlan[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SubscriptionPlan => item === "free" || item === "premium" || item === "organizer" || item === "groupPro" || item === "tester");
}
