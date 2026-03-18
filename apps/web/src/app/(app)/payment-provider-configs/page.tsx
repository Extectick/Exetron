"use client";

import type { PaymentProviderConfigDto } from "@exetron/contracts";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import {
  createPaymentProviderConfig,
  listPaymentProviderConfigs,
  patchPaymentProviderConfig
} from "../../../lib/api";

const allChannels = ["ADMIN", "POS", "KIOSK", "DELIVERY"] as const;

export default function PaymentProviderConfigsPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState<PaymentProviderConfigDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    providerKey: "pos-card-default",
    providerType: "CARD_SIMULATED" as "CASH_MANUAL" | "CARD_SIMULATED" | "QR_SIMULATED",
    method: "CARD" as "CASH" | "CARD" | "QR",
    priority: "100",
    autoConfirmOrderOnSuccess: false,
    enabled: true,
    settings: "{}"
  });

  const effectiveTenantId = session?.me?.claims.tenantId ?? tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const loadConfigs = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    setBusy(true);
    try {
      const response = await listPaymentProviderConfigs(session.accessToken, {
        tenantId: effectiveTenantId,
        storeId: effectiveStoreId
      });
      setItems(response.items);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Payment provider configs load failed."
      );
    } finally {
      setBusy(false);
    }
  }, [effectiveStoreId, effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    if (!effectiveTenantId || !session?.accessToken) {
      return;
    }

    void loadConfigs();
  }, [effectiveTenantId, effectiveStoreId, loadConfigs, session?.accessToken]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PHASE 7</span>
            <h2>Payment provider configs</h2>
            <p>Tenant and store-scoped simulated payment providers with channel rules.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadConfigs()} disabled={busy}>
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

        <div className="workspace-grid">
          {items.map((config) => (
            <article className="panel" key={config.id}>
              <div className="panel-header">
                <div>
                  <span className="eyebrow">{config.method}</span>
                  <h2>{config.providerKey}</h2>
                  <p>
                    {config.providerType} · priority {config.priority} ·{" "}
                    {config.storeId ? "store override" : "tenant default"}
                  </p>
                </div>
              </div>
              <p>Channels: {config.allowedChannels.join(", ")}</p>
              <p>Auto-confirm: {config.autoConfirmOrderOnSuccess ? "true" : "false"}</p>
              <p>Enabled: {config.enabled ? "true" : "false"}</p>
              <p>
                Secrets:{" "}
                {config.secrets?.hasSecrets ? config.secrets.keys.join(", ") : "none"}
              </p>
              <pre>{JSON.stringify(config.settings ?? {}, null, 2)}</pre>
              <button
                className="mini-button"
                onClick={() => {
                  if (!session?.accessToken) {
                    return;
                  }

                  void patchPaymentProviderConfig(session.accessToken, config.id, {
                    enabled: !config.enabled
                  })
                    .then(() => loadConfigs())
                    .catch((caughtError) =>
                      setError(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "Payment provider config update failed."
                      )
                    );
                }}
              >
                {config.enabled ? "Disable" : "Enable"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Create Config</span>
            <h2>New provider config</h2>
          </div>
        </div>
        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !effectiveTenantId) {
              setError("Tenant ID is required.");
              return;
            }

            let settings: Record<string, unknown> | null = null;
            try {
              settings = draft.settings.trim()
                ? (JSON.parse(draft.settings) as Record<string, unknown>)
                : null;
            } catch {
              setError("Settings JSON must be valid.");
              return;
            }

            void createPaymentProviderConfig(session.accessToken, {
              tenantId: effectiveTenantId,
              storeId: effectiveStoreId ?? null,
              providerKey: draft.providerKey,
              providerType: draft.providerType,
              method: draft.method,
              enabled: draft.enabled,
              priority: Number(draft.priority),
              allowedChannels: [...allChannels],
              autoConfirmOrderOnSuccess: draft.autoConfirmOrderOnSuccess,
              settings
            })
              .then(() => {
                setError(null);
                return loadConfigs();
              })
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : "Payment provider config create failed."
                )
              );
          }}
        >
          <label className="field">
            <span>Provider key</span>
            <input
              value={draft.providerKey}
              onChange={(event) =>
                setDraft((current) => ({ ...current, providerKey: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Provider type</span>
            <select
              value={draft.providerType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  providerType: event.target.value as typeof draft.providerType
                }))
              }
            >
              <option value="CASH_MANUAL">CASH_MANUAL</option>
              <option value="CARD_SIMULATED">CARD_SIMULATED</option>
              <option value="QR_SIMULATED">QR_SIMULATED</option>
            </select>
          </label>
          <label className="field">
            <span>Method</span>
            <select
              value={draft.method}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  method: event.target.value as typeof draft.method
                }))
              }
            >
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
              <option value="QR">QR</option>
            </select>
          </label>
          <label className="field">
            <span>Priority</span>
            <input
              value={draft.priority}
              onChange={(event) =>
                setDraft((current) => ({ ...current, priority: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Settings JSON</span>
            <textarea
              rows={8}
              value={draft.settings}
              onChange={(event) =>
                setDraft((current) => ({ ...current, settings: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Auto-confirm on success</span>
            <input
              type="checkbox"
              checked={draft.autoConfirmOrderOnSuccess}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  autoConfirmOrderOnSuccess: event.target.checked
                }))
              }
            />
          </label>
          <label className="field">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) =>
                setDraft((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
          </label>
          <button className="primary-button" type="submit">
            Create Provider Config
          </button>
        </form>
      </section>
    </div>
  );
}
