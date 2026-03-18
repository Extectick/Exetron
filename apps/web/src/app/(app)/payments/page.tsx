"use client";

import type { PaymentAttemptDto, PaymentIntentDto, PaymentIntentListItemDto } from "@exetron/contracts";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { getPaymentIntent, listPaymentAttempts, listPaymentIntents } from "../../../lib/api";

export default function PaymentsPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [intents, setIntents] = useState<PaymentIntentListItemDto[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<PaymentIntentDto | null>(null);
  const [attempts, setAttempts] = useState<PaymentAttemptDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const effectiveTenantId = session?.me?.claims.tenantId ?? tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const loadIntents = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    try {
      const response = await listPaymentIntents(session.accessToken, {
        tenantId: effectiveTenantId,
        storeId: effectiveStoreId,
        status:
          (status || undefined) as
            | "PENDING"
            | "PARTIALLY_PAID"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED"
            | undefined,
        channel:
          (channel || undefined) as "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | undefined
      });
      setIntents(response.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Payments load failed.");
    }
  }, [channel, effectiveStoreId, effectiveTenantId, session?.accessToken, status]);

  async function inspectIntent(intentId: string) {
    if (!session?.accessToken) {
      return;
    }

    try {
      const [intent, attemptsResponse] = await Promise.all([
        getPaymentIntent(session.accessToken, intentId),
        listPaymentAttempts(session.accessToken, intentId)
      ]);
      setSelectedIntent(intent);
      setAttempts(attemptsResponse.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Payment inspection failed.");
    }
  }

  useEffect(() => {
    if (!effectiveTenantId || !session?.accessToken) {
      return;
    }

    void loadIntents();
  }, [channel, effectiveTenantId, effectiveStoreId, loadIntents, session?.accessToken, status]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Payments Runtime</span>
            <h2>Payment intents</h2>
            <p>Channel-agnostic intent list with current collection state.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadIntents()}>
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
            <span>Store ID</span>
            <input value={storeId} onChange={(event) => setStoreId(event.target.value)} />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
          <label className="field">
            <span>Channel</span>
            <select value={channel} onChange={(event) => setChannel(event.target.value)}>
              <option value="">All</option>
              <option value="POS">POS</option>
              <option value="KIOSK">KIOSK</option>
              <option value="ADMIN">ADMIN</option>
              <option value="DELIVERY">DELIVERY</option>
            </select>
          </label>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        <div className="workspace-grid">
          {intents.map((intent) => (
            <article className="panel" key={intent.id}>
              <div className="panel-header">
                <div>
                  <span className="eyebrow">{intent.channel}</span>
                  <h2>{intent.orderNumber}</h2>
                  <p>
                    {intent.status} · {intent.paidAmount}/{intent.totalAmount}
                  </p>
                </div>
              </div>
              <p>{intent.customerName ?? "Walk-in / unknown customer"}</p>
              <p>Allocations: {intent.allocationStatuses.join(", ")}</p>
              <button className="mini-button" onClick={() => void inspectIntent(intent.id)}>
                Inspect
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Intent Details</span>
            <h2>{selectedIntent?.id ?? "Select a payment intent"}</h2>
          </div>
        </div>
        {selectedIntent ? (
          <>
            <pre>{JSON.stringify(selectedIntent, null, 2)}</pre>
            <h3>Attempts</h3>
            <pre>{JSON.stringify(attempts, null, 2)}</pre>
          </>
        ) : (
          <p>Pick an intent from the list to inspect allocations and attempts.</p>
        )}
      </section>
    </div>
  );
}
