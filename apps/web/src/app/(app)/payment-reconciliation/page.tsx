"use client";

import type { PaymentReconciliationSummaryDto } from "@exetron/contracts";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { getPaymentReconciliationSummary } from "../../../lib/api";

export default function PaymentReconciliationPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [summary, setSummary] = useState<PaymentReconciliationSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveTenantId = session?.me?.claims.tenantId ?? tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const loadSummary = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    try {
      const response = await getPaymentReconciliationSummary(session.accessToken, {
        tenantId: effectiveTenantId,
        storeId: effectiveStoreId
      });
      setSummary(response);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Payment reconciliation load failed."
      );
    }
  }, [effectiveStoreId, effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    if (!effectiveTenantId || !session?.accessToken) {
      return;
    }

    void loadSummary();
  }, [effectiveTenantId, effectiveStoreId, loadSummary, session?.accessToken]);

  return (
    <div className="stack-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Reconciliation</span>
            <h2>Internal payment summary</h2>
            <p>Intent and allocation totals grouped by status for the selected scope.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadSummary()}>
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
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Snapshot</span>
            <h2>{summary?.generatedAt ?? "Not loaded yet"}</h2>
          </div>
        </div>
        <pre>{JSON.stringify(summary, null, 2)}</pre>
      </section>
    </div>
  );
}
