"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getFirebaseAuth } from "@/lib/firebase";

type GrantablePlan = "premium" | "organizer" | "groupPro";

const grantablePlans: Array<{
  key: GrantablePlan;
  label: string;
  description: string;
  activeClassName: string;
}> = [
  {
    key: "premium",
    label: "Premium",
    description: "個人AI分析・詳細分析",
    activeClassName: "border-orange-200 bg-orange-50 text-orange-800"
  },
  {
    key: "organizer",
    label: "Organizer",
    description: "大会作成・大会管理",
    activeClassName: "border-blue-200 bg-blue-50 text-blue-800"
  },
  {
    key: "groupPro",
    label: "Group Pro",
    description: "グループ分析・代理投稿",
    activeClassName: "border-teal-200 bg-teal-50 text-teal-800"
  }
];

type AdminUser = {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  adminGrantedPlans: string[];
};

export default function AdminUsersPage() {
  return <AuthGate skipOnboardingCheck>{() => <AdminUsers />}</AuthGate>;
}

function AdminUsers() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState("");
  const [message, setMessage] = useState("");

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getFirebaseAuth().currentUser?.getIdToken();
    if (!token) throw new Error("ログイン情報を確認できませんでした。");
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "処理に失敗しました。");
    return data;
  }, []);

  const loadUsers = useCallback(async (search: string) => {
    setLoading(true);
    setMessage("");
    try {
      const data = await request(`/api/admin/users?q=${encodeURIComponent(search)}`);
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ユーザーを取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadUsers("");
  }, [loadUsers]);

  async function togglePlan(user: AdminUser, plan: GrantablePlan) {
    const enabled = !user.adminGrantedPlans.includes(plan);
    setUpdatingKey(`${user.uid}:${plan}`);
    setMessage("");
    try {
      const data = await request("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: user.uid, plan, enabled })
      });
      setUsers((current) => current.map((item) => (item.uid === user.uid ? data.user : item)));
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "機能付与を更新できませんでした。");
    } finally {
      setUpdatingKey("");
    }
  }

  return (
    <>
      <PageHeader title="ユーザー機能付与" actionHref="/admin" actionLabel="管理TOP" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <section className="rounded border border-teal-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black text-water">ADMIN ACCESS</p>
          <h1 className="mt-1 text-2xl font-black text-ink">プラン機能の個別付与</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            テスターへPremium・Organizer・Group Pro相当の機能を個別に開放します。Stripe契約や請求状態は変更されません。
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void loadUsers(query.trim());
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="UID・メールアドレス・表示名で検索"
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-ink"
            />
            <button type="submit" className="tap-target rounded bg-water px-5 py-3 text-sm font-black text-white">
              検索
            </button>
          </form>
        </section>

        {message ? <p className="rounded border border-teal-100 bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">{message}</p> : null}
        {loading ? <p className="p-5 text-center text-sm font-bold text-slate-500">ユーザーを確認しています。</p> : null}
        {!loading && users.length === 0 ? <p className="p-5 text-center text-sm font-bold text-slate-500">該当するユーザーが見つかりません。</p> : null}

        <section className="grid gap-3">
          {users.map((user) => {
            return (
              <article key={user.uid} className="rounded border border-teal-100 bg-white p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" unoptimized />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foam text-lg font-black text-water">
                      {(user.displayName || user.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-black text-ink">{user.displayName || "表示名未設定"}</h2>
                    <p className="truncate text-xs font-bold text-slate-500">{user.email || "メール未登録"}</p>
                    <p className="mt-1 break-all text-[11px] text-slate-400">UID: {user.uid}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">契約: {user.subscriptionPlan}</span>
                  {user.subscriptionPlan !== "free" ? (
                    <span className="rounded bg-orange-100 px-2 py-1 text-orange-700">Stripe/契約プラン有効</span>
                  ) : null}
                  {user.adminGrantedPlans.map((plan) => (
                    <span key={plan} className="rounded bg-teal-100 px-2 py-1 text-water">
                      {getPlanLabel(plan)} 管理者付与中
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {grantablePlans.map((plan) => {
                    const granted = user.adminGrantedPlans.includes(plan.key);
                    const updating = updatingKey === `${user.uid}:${plan.key}`;
                    return (
                      <button
                        key={plan.key}
                        type="button"
                        disabled={Boolean(updatingKey)}
                        onClick={() => void togglePlan(user, plan.key)}
                        className={`tap-target rounded border px-3 py-3 text-left transition disabled:opacity-50 ${
                          granted ? plan.activeClassName : "border-slate-200 bg-white text-slate-700 hover:border-water"
                        }`}
                      >
                        <span className="block text-sm font-black">
                          {updating ? "更新中..." : `${plan.label} ${granted ? "解除" : "付与"}`}
                        </span>
                        <span className="mt-1 block text-[11px] font-bold opacity-75">{plan.description}</span>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </>
  );
}

function getPlanLabel(plan: string) {
  if (plan === "premium") return "Premium";
  if (plan === "organizer") return "Organizer";
  if (plan === "groupPro") return "Group Pro";
  if (plan === "tester") return "Tester";
  return plan;
}
