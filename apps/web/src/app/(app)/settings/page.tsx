"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStoreSettings,
  getTenantSettings,
  upsertStoreSetting,
  upsertTenantSetting
} from "../../../lib/api";
import { useAuth } from "../../../components/auth-provider";

export default function SettingsPage() {
  const { session } = useAuth();
  const [tenantSettings, setTenantSettings] = useState<string>("[]");
  const [storeSettings, setStoreSettings] = useState<string>("[]");
  const [tenantDraft, setTenantDraft] = useState({ tenantId: "", key: "", value: "{}" });
  const [storeDraft, setStoreDraft] = useState({
    storeId: "",
    key: "",
    value: "{}"
  });
  const [error, setError] = useState<string | null>(null);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantDraft.tenantId.trim();

  const loadTenantSettings = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    if (!effectiveTenantId) {
      setTenantSettings("[]");
      return;
    }

    const response = await getTenantSettings(session.accessToken, effectiveTenantId);
    setError(null);
    setTenantSettings(JSON.stringify(response.items, null, 2));
  }, [effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    if (!sessionTenantId) {
      return;
    }

    void loadTenantSettings();
  }, [loadTenantSettings, sessionTenantId, session?.accessToken]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Tenant Settings</span>
            <h2>Tenant-level configuration</h2>
          </div>
          <button className="ghost-button" onClick={() => void loadTenantSettings()}>
            Refresh
          </button>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        <pre>{tenantSettings}</pre>
        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken) {
              return;
            }
            if (!effectiveTenantId) {
              setError("Tenant ID is required for platform admin settings access.");
              return;
            }

            let tenantValue: Record<string, unknown>;

            try {
              tenantValue = JSON.parse(tenantDraft.value) as Record<string, unknown>;
            } catch {
              setError("Tenant setting JSON must be valid.");
              return;
            }

            void upsertTenantSetting(
              {
                key: tenantDraft.key,
                value: tenantValue
              },
              session.accessToken,
              effectiveTenantId
            )
              .then(() => loadTenantSettings())
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error ? caughtError.message : "Tenant setting save failed."
                )
              );
          }}
        >
          {!sessionTenantId ? (
            <label className="field">
              <span>Tenant ID</span>
              <input
                value={tenantDraft.tenantId}
                onChange={(event) =>
                  setTenantDraft((current) => ({ ...current, tenantId: event.target.value }))
                }
              />
            </label>
          ) : null}
          <label className="field">
            <span>Key</span>
            <input
              value={tenantDraft.key}
              onChange={(event) =>
                setTenantDraft((current) => ({ ...current, key: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Value JSON</span>
            <textarea
              value={tenantDraft.value}
              onChange={(event) =>
                setTenantDraft((current) => ({ ...current, value: event.target.value }))
              }
              rows={6}
            />
          </label>
          <button className="primary-button" type="submit">
            Upsert Tenant Setting
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Store Settings</span>
            <h2>Store override workspace</h2>
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              if (!session?.accessToken || !storeDraft.storeId) {
                return;
              }
              void getStoreSettings(storeDraft.storeId, session.accessToken)
                .then((response) => setStoreSettings(JSON.stringify(response.items, null, 2)))
                .catch((caughtError) =>
                  setError(
                    caughtError instanceof Error ? caughtError.message : "Store settings load failed."
                  )
                );
            }}
          >
            Load Store
          </button>
        </div>
        <pre>{storeSettings}</pre>
        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken) {
              return;
            }

            let storeValue: Record<string, unknown>;

            try {
              storeValue = JSON.parse(storeDraft.value) as Record<string, unknown>;
            } catch {
              setError("Store setting JSON must be valid.");
              return;
            }

            void upsertStoreSetting(
              {
                storeId: storeDraft.storeId,
                key: storeDraft.key,
                value: storeValue
              },
              session.accessToken
            )
              .then(() => {
                setError(null);
                return getStoreSettings(storeDraft.storeId, session.accessToken);
              })
              .then((response) => setStoreSettings(JSON.stringify(response.items, null, 2)))
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error ? caughtError.message : "Store setting save failed."
                )
              );
          }}
        >
          <label className="field">
            <span>Store ID</span>
            <input
              value={storeDraft.storeId}
              onChange={(event) =>
                setStoreDraft((current) => ({ ...current, storeId: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Key</span>
            <input
              value={storeDraft.key}
              onChange={(event) =>
                setStoreDraft((current) => ({ ...current, key: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Value JSON</span>
            <textarea
              value={storeDraft.value}
              onChange={(event) =>
                setStoreDraft((current) => ({ ...current, value: event.target.value }))
              }
              rows={6}
            />
          </label>
          <button className="primary-button" type="submit">
            Upsert Store Setting
          </button>
        </form>
      </section>
    </div>
  );
}
