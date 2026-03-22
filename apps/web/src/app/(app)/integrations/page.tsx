"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl } from "../../../lib/api";

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

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export default function IntegrationsPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [providerKey, setProviderKey] = useState("");
  const [snapshot, setSnapshot] = useState("{}");
  const [message, setMessage] = useState<string | null>(null);
  const [hardwareDraft, setHardwareDraft] = useState(
    JSON.stringify(
      {
        connectorKey: "printer-core",
        kind: "PRINT_RECEIPT",
        requestPayload: {
          copy: "merchant"
        }
      },
      null,
      2
    )
  );

  const effectiveTenantId = session?.me?.claims.tenantId ?? tenantId.trim();

  const loadSnapshot = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    const query = new URLSearchParams();
    query.set("tenantId", effectiveTenantId);
    if (storeId.trim()) {
      query.set("storeId", storeId.trim());
    }
    if (providerKey.trim()) {
      query.set("providerKey", providerKey.trim());
    }

    const [operations, settlements, webhooks, connectorExecutions, hardwareJobs, hardwareReceipts] =
      await Promise.all([
        requestJson(`/payments/operations?${query.toString()}`, session.accessToken),
        requestJson(`/payments/settlements?${query.toString()}`, session.accessToken),
        requestJson(`/payments/webhooks?${query.toString()}`, session.accessToken),
        requestJson(`/payments/connector-executions?${query.toString()}`, session.accessToken),
        requestJson(`/payments/hardware/jobs?${query.toString()}`, session.accessToken),
        requestJson(`/payments/hardware/receipts?${query.toString()}`, session.accessToken)
      ]);

    setSnapshot(
      JSON.stringify(
        {
          operations,
          settlements,
          webhooks,
          connectorExecutions,
          hardwareJobs,
          hardwareReceipts
        },
        null,
        2
      )
    );
    setMessage(null);
  }, [effectiveTenantId, providerKey, session?.accessToken, storeId]);

  useEffect(() => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    void loadSnapshot().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Integration snapshot load failed.")
    );
  }, [effectiveTenantId, loadSnapshot, session?.accessToken]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PHASE 16</span>
            <h2>Integrations and hardware</h2>
            <p>Webhook inbox, payment operations, connector executions, settlements, and hardware jobs.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadSnapshot()}>
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
            <span>Provider Key</span>
            <input value={providerKey} onChange={(event) => setProviderKey(event.target.value)} />
          </label>
        </div>

        {message ? <p className="error-banner">{message}</p> : null}

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !effectiveTenantId || !storeId.trim()) {
              setMessage("Tenant ID and Store ID are required.");
              return;
            }

            try {
              const payload = JSON.parse(hardwareDraft) as Record<string, unknown>;
              void requestJson(
                "/payments/hardware/jobs",
                session.accessToken,
                {
                  method: "POST",
                  body: JSON.stringify({
                    ...payload,
                    tenantId: effectiveTenantId,
                    storeId: storeId.trim()
                  })
                }
              )
                .then(() => loadSnapshot())
                .catch((error) =>
                  setMessage(error instanceof Error ? error.message : "Hardware job create failed.")
                );
            } catch {
              setMessage("Hardware job JSON is invalid.");
            }
          }}
        >
          <h3 style={{ margin: 0 }}>Hardware job</h3>
          <textarea
            rows={12}
            value={hardwareDraft}
            onChange={(event) => setHardwareDraft(event.target.value)}
          />
          <button className="primary-button" type="submit">
            Create Hardware Job
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Snapshot</span>
            <h2>Connector activity</h2>
          </div>
        </div>
        <pre>{snapshot}</pre>
      </section>
    </div>
  );
}
