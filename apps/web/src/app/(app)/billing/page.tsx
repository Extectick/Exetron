"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl } from "../../../lib/api";

type BillingOverview = {
  tenantId: string;
  generatedAt: string;
  plans: Array<{ id: string; code: string; name: string; status: string; priceAmount: string }>;
  subscriptions: Array<{ id: string; planId: string; status: string; tenantId: string }>;
  invoices: Array<{ id: string; number: string; status: string; totalAmount: string }>;
  entitlements: Array<{ id: string; key: string; value: Record<string, unknown> }>;
  quotas: Array<{ id: string; key: string; limitValue: number; usedValue: number }>;
  trials: Array<{ id: string; status: string; endsAt: string }>;
  resellers: Array<{ id: string; code: string; name: string; status: string }>;
  activePlan: { id: string; code: string; name: string; status: string } | null;
  activeSubscription: { id: string; planId: string; status: string } | null;
  activeTrial: { id: string; status: string } | null;
  billingAccount: { id: string; tenantId: string; resellerAccountId: string | null } | null;
};

async function requestJson<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export default function BillingPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [planDraft, setPlanDraft] = useState({
    code: "starter",
    name: "Starter Plan",
    priceAmount: "0.00",
    currency: "RUB",
    intervalKey: "MONTHLY"
  });
  const [message, setMessage] = useState<string | null>(null);

  const effectiveTenantId = session?.me?.claims.tenantId ?? tenantId.trim();

  const loadOverview = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    const response = await requestJson<BillingOverview>(
      `/billing/overview?tenantId=${encodeURIComponent(effectiveTenantId)}`,
      session.accessToken
    );
    setOverview(response);
    setMessage(null);
  }, [effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    if (!effectiveTenantId || !session?.accessToken) {
      return;
    }

    void loadOverview().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Billing overview load failed.");
    });
  }, [effectiveTenantId, loadOverview, session?.accessToken]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PHASE 17</span>
            <h2>Billing foundation</h2>
            <p>Tenant billing state, thin CRUD surfaces, and bootstrap runtime overview.</p>
          </div>
          <button
            className="ghost-button"
            onClick={() =>
              void loadOverview().catch((error) =>
                setMessage(error instanceof Error ? error.message : "Billing refresh failed.")
              )
            }
          >
            Refresh
          </button>
        </div>

        <div className="editor-form">
          {!session?.me?.claims.tenantId ? (
            <label className="field">
              <span>Tenant ID</span>
              <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
            </label>
          ) : null}
          <label className="field">
            <span>Plan Code</span>
            <input
              value={planDraft.code}
              onChange={(event) => setPlanDraft((current) => ({ ...current, code: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Plan Name</span>
            <input
              value={planDraft.name}
              onChange={(event) => setPlanDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Price Amount</span>
            <input
              value={planDraft.priceAmount}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, priceAmount: event.target.value }))
              }
            />
          </label>
        </div>

        {message ? <p className="error-banner">{message}</p> : null}

        <div className="button-row">
          <button
            className="primary-button"
            onClick={() => {
              if (!session?.accessToken || !effectiveTenantId) {
                setMessage("Tenant ID is required.");
                return;
              }

              void requestJson(
                "/billing/bootstrap",
                session.accessToken,
                {
                  method: "POST",
                  body: JSON.stringify({
                    tenantId: effectiveTenantId,
                    planCode: planDraft.code,
                    planName: planDraft.name,
                    planPriceAmount: planDraft.priceAmount,
                    currency: planDraft.currency,
                    intervalKey: planDraft.intervalKey,
                    trialDays: 14
                  })
                }
              )
                .then((response) => {
                  setOverview(response as BillingOverview);
                  setMessage("Billing bootstrap completed.");
                })
                .catch((error) =>
                  setMessage(error instanceof Error ? error.message : "Billing bootstrap failed.")
                );
            }}
          >
            Bootstrap Billing
          </button>
          <button
            className="mini-button"
            onClick={() => {
              if (!session?.accessToken || !effectiveTenantId) {
                setMessage("Tenant ID is required.");
                return;
              }

              void requestJson(
                "/billing/plans",
                session.accessToken,
                {
                  method: "POST",
                  body: JSON.stringify({
                    tenantId: effectiveTenantId,
                    code: planDraft.code,
                    name: planDraft.name,
                    priceAmount: planDraft.priceAmount,
                    currency: planDraft.currency,
                    intervalKey: planDraft.intervalKey
                  })
                }
              )
                .then(() => loadOverview())
                .catch((error) =>
                  setMessage(error instanceof Error ? error.message : "Plan create failed.")
                );
            }}
          >
            Create Plan
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Runtime</span>
            <h2>Current billing overview</h2>
          </div>
        </div>
        {overview ? (
          <pre>{JSON.stringify(overview, null, 2)}</pre>
        ) : (
          <p>Load or bootstrap a tenant to inspect plans, subscriptions, invoices, quotas, and entitlements.</p>
        )}
      </section>
    </div>
  );
}
