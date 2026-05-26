"use client";

import { useEffect, useState } from "react";
import { FeatureLock } from "@/components/FeatureLock";
import { getFeatureAccess } from "@/lib/features";
import type { FeatureKey } from "@/types";

export function FeatureGate({ userId, featureKey, children }: { userId: string; featureKey: FeatureKey; children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    getFeatureAccess(userId, featureKey)
      .then((access) => {
        if (active) setAllowed(access.allowed);
      })
      .catch(() => {
        if (active) setAllowed(false);
      });
    return () => {
      active = false;
    };
  }, [featureKey, userId]);

  if (allowed == null) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8">
        <p className="rounded bg-white p-4 text-sm font-bold text-slate-700 shadow-soft">機能の利用可否を確認しています。</p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <FeatureLock userId={userId} featureKey={featureKey} />
      </main>
    );
  }

  return <>{children}</>;
}
