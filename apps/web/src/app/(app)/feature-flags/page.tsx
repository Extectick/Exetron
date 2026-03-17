"use client";

import { useEffect, useState } from "react";
import { getFeatureFlags, upsertFeatureFlag } from "../../../lib/api";
import { useAuth } from "../../../components/auth-provider";

export default function FeatureFlagsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<string>("[]");
  const [draft, setDraft] = useState({
    tenantId: "",
    storeId: "",
    key: "",
    enabled: "true",
    kind: "BOOLEAN",
    rolloutPercentage: "",
    rules: "{}"
  });
  const [error, setError] = useState<string | null>(null);

  async function loadFlags() {
    if (!session?.accessToken) {
      return;
    }
    const response = await getFeatureFlags(session.accessToken);
    setItems(JSON.stringify(response.items, null, 2));
  }

  useEffect(() => {
    void loadFlags();
  }, [session?.accessToken]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Read Model</span>
            <h2>Feature flag registry</h2>
          </div>
          <button className="ghost-button" onClick={() => void loadFlags()}>
            Refresh
          </button>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        <pre>{items}</pre>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Mutation</span>
            <h2>Upsert flag</h2>
          </div>
        </div>
        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken) {
              return;
            }
            const rules = JSON.parse(draft.rules) as Record<string, unknown>;

            void upsertFeatureFlag(
              {
                tenantId: draft.tenantId,
                storeId: draft.storeId || null,
                key: draft.key,
                enabled: draft.enabled === "true",
                kind: draft.kind as "BOOLEAN" | "PERCENTAGE",
                rolloutPercentage: draft.rolloutPercentage
                  ? Number(draft.rolloutPercentage)
                  : null,
                rules
              },
              session.accessToken
            )
              .then(() => loadFlags())
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error ? caughtError.message : "Feature flag upsert failed."
                )
              );
          }}
        >
          {[
            ["tenantId", "Tenant ID"],
            ["storeId", "Store ID (optional)"],
            ["key", "Flag Key"],
            ["rolloutPercentage", "Rollout %"],
            ["rules", "Rules JSON"]
          ].map(([name, label]) => (
            <label className="field" key={name}>
              <span>{label}</span>
              {name === "rules" ? (
                <textarea
                  rows={5}
                  value={draft[name as keyof typeof draft]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [name]: event.target.value
                    }))
                  }
                />
              ) : (
                <input
                  value={draft[name as keyof typeof draft]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [name]: event.target.value
                    }))
                  }
                />
              )}
            </label>
          ))}
          <label className="field">
            <span>Enabled</span>
            <select
              value={draft.enabled}
              onChange={(event) =>
                setDraft((current) => ({ ...current, enabled: event.target.value }))
              }
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <label className="field">
            <span>Kind</span>
            <select
              value={draft.kind}
              onChange={(event) =>
                setDraft((current) => ({ ...current, kind: event.target.value }))
              }
            >
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="PERCENTAGE">PERCENTAGE</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            Upsert Feature Flag
          </button>
        </form>
      </section>
    </div>
  );
}
