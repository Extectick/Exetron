"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import {
  createBrandingConfig,
  createCustomizationRule,
  evaluateCustomization,
  listBrandingConfigs,
  listCustomizationRules
} from "../../../lib/api";

const channels = [
  "ADMIN",
  "POS",
  "KIOSK",
  "DELIVERY",
  "KITCHEN",
  "BOARD",
  "BACKOFFICE"
] as const;

type CustomizationChannel = (typeof channels)[number];

export default function CustomizationPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const [tenantId, setTenantId] = useState(sessionTenantId);
  const [brandingConfigs, setBrandingConfigs] = useState<string>("[]");
  const [rules, setRules] = useState<string>("[]");
  const [evaluation, setEvaluation] = useState<string>("{}");
  const [error, setError] = useState<string | null>(null);
  const [brandingDraft, setBrandingDraft] = useState({
    storeId: "",
    channel: "KIOSK" as CustomizationChannel,
    pointKey: "",
    config: '{\n  "heroTitle": "Store Hero"\n}'
  });
  const [ruleDraft, setRuleDraft] = useState({
    storeId: "",
    channel: "KIOSK" as CustomizationChannel,
    pointKey: "",
    key: "kiosk-weekday-rule",
    description: "Sample kiosk rule",
    priority: "100",
    conditions: '{\n  "weekdayIn": [1, 2, 3, 4, 5]\n}',
    actions:
      '{\n  "patchSettings": {\n    "kiosk.rules": {\n      "requireCustomerName": true\n    }\n  }\n}'
  });
  const [evaluationDraft, setEvaluationDraft] = useState({
    storeId: "",
    channel: "KIOSK" as CustomizationChannel,
    pointKey: "",
    inputs: '{\n  "paymentMethod": "CARD"\n}'
  });

  const effectiveTenantId = sessionTenantId || tenantId.trim();

  const reloadWorkspace = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    const [brandingResponse, rulesResponse] = await Promise.all([
      listBrandingConfigs(session.accessToken, {
        tenantId: effectiveTenantId
      }),
      listCustomizationRules(session.accessToken, {
        tenantId: effectiveTenantId
      })
    ]);

    setBrandingConfigs(JSON.stringify(brandingResponse.items, null, 2));
    setRules(JSON.stringify(rulesResponse.items, null, 2));
    setError(null);
  }, [effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    if (!sessionTenantId || !session?.accessToken) {
      return;
    }

    void reloadWorkspace();
  }, [reloadWorkspace, sessionTenantId, session?.accessToken]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Customization Layer</span>
            <h2>Branding configs and rules</h2>
          </div>
          <button className="ghost-button" onClick={() => void reloadWorkspace()}>
            Refresh
          </button>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        {!sessionTenantId ? (
          <label className="field">
            <span>Tenant ID</span>
            <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
          </label>
        ) : null}
        <div className="split-grid">
          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.accessToken || !effectiveTenantId) {
                setError("Tenant ID is required.");
                return;
              }

              let config: Record<string, unknown>;

              try {
                config = JSON.parse(brandingDraft.config) as Record<string, unknown>;
              } catch {
                setError("Branding config JSON must be valid.");
                return;
              }

              void createBrandingConfig(session.accessToken, {
                tenantId: effectiveTenantId,
                storeId: brandingDraft.storeId || null,
                channel: brandingDraft.channel,
                pointKey: brandingDraft.pointKey || null,
                config
              })
                .then(() => reloadWorkspace())
                .catch((caughtError) =>
                  setError(
                    caughtError instanceof Error
                      ? caughtError.message
                      : "Branding config save failed."
                  )
                );
            }}
          >
            <h3 style={{ margin: 0 }}>Branding Config</h3>
            <label className="field">
              <span>Store ID</span>
              <input
                value={brandingDraft.storeId}
                onChange={(event) =>
                  setBrandingDraft((current) => ({ ...current, storeId: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Channel</span>
              <select
                value={brandingDraft.channel}
                onChange={(event) =>
                  setBrandingDraft((current) => ({
                    ...current,
                    channel: event.target.value as (typeof channels)[number]
                  }))
                }
              >
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Point Key</span>
              <input
                value={brandingDraft.pointKey}
                onChange={(event) =>
                  setBrandingDraft((current) => ({ ...current, pointKey: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Config JSON</span>
              <textarea
                rows={8}
                value={brandingDraft.config}
                onChange={(event) =>
                  setBrandingDraft((current) => ({ ...current, config: event.target.value }))
                }
              />
            </label>
            <button className="primary-button" type="submit">
              Create Branding Config
            </button>
          </form>

          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.accessToken || !effectiveTenantId) {
                setError("Tenant ID is required.");
                return;
              }

              let conditions: Record<string, unknown>;
              let actions: Record<string, unknown>;

              try {
                conditions = JSON.parse(ruleDraft.conditions) as Record<string, unknown>;
                actions = JSON.parse(ruleDraft.actions) as Record<string, unknown>;
              } catch {
                setError("Rule JSON must be valid.");
                return;
              }

              void createCustomizationRule(session.accessToken, {
                tenantId: effectiveTenantId,
                storeId: ruleDraft.storeId || null,
                channel: ruleDraft.channel,
                pointKey: ruleDraft.pointKey || null,
                key: ruleDraft.key,
                description: ruleDraft.description || null,
                priority: Number(ruleDraft.priority) || 100,
                conditions,
                actions
              })
                .then(() => reloadWorkspace())
                .catch((caughtError) =>
                  setError(
                    caughtError instanceof Error ? caughtError.message : "Rule save failed."
                  )
                );
            }}
          >
            <h3 style={{ margin: 0 }}>Rule</h3>
            <label className="field">
              <span>Store ID</span>
              <input
                value={ruleDraft.storeId}
                onChange={(event) =>
                  setRuleDraft((current) => ({ ...current, storeId: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Channel</span>
              <select
                value={ruleDraft.channel}
                onChange={(event) =>
                  setRuleDraft((current) => ({
                    ...current,
                    channel: event.target.value as (typeof channels)[number]
                  }))
                }
              >
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Point Key</span>
              <input
                value={ruleDraft.pointKey}
                onChange={(event) =>
                  setRuleDraft((current) => ({ ...current, pointKey: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Rule Key</span>
              <input
                value={ruleDraft.key}
                onChange={(event) =>
                  setRuleDraft((current) => ({ ...current, key: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Description</span>
              <input
                value={ruleDraft.description}
                onChange={(event) =>
                  setRuleDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Priority</span>
              <input
                type="number"
                value={ruleDraft.priority}
                onChange={(event) =>
                  setRuleDraft((current) => ({ ...current, priority: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Conditions JSON</span>
              <textarea
                rows={6}
                value={ruleDraft.conditions}
                onChange={(event) =>
                  setRuleDraft((current) => ({ ...current, conditions: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Actions JSON</span>
              <textarea
                rows={8}
                value={ruleDraft.actions}
                onChange={(event) =>
                  setRuleDraft((current) => ({ ...current, actions: event.target.value }))
                }
              />
            </label>
            <button className="primary-button" type="submit">
              Create Rule
            </button>
          </form>
        </div>
        <pre>{brandingConfigs}</pre>
        <pre>{rules}</pre>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Preview</span>
            <h2>Evaluate effective customization</h2>
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

            let inputs: Record<string, unknown>;

            try {
              inputs = JSON.parse(evaluationDraft.inputs) as Record<string, unknown>;
            } catch {
              setError("Evaluation inputs JSON must be valid.");
              return;
            }

            void evaluateCustomization(session.accessToken, {
              tenantId: effectiveTenantId,
              storeId: evaluationDraft.storeId || null,
              channel: evaluationDraft.channel,
              pointKey: evaluationDraft.pointKey || null,
              inputs
            })
              .then((response) => {
                setError(null);
                setEvaluation(JSON.stringify(response, null, 2));
              })
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : "Customization evaluation failed."
                )
              );
          }}
        >
          <label className="field">
            <span>Store ID</span>
            <input
              value={evaluationDraft.storeId}
              onChange={(event) =>
                setEvaluationDraft((current) => ({ ...current, storeId: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Channel</span>
            <select
              value={evaluationDraft.channel}
              onChange={(event) =>
                setEvaluationDraft((current) => ({
                  ...current,
                  channel: event.target.value as (typeof channels)[number]
                }))
              }
            >
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Point Key</span>
            <input
              value={evaluationDraft.pointKey}
              onChange={(event) =>
                setEvaluationDraft((current) => ({ ...current, pointKey: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Inputs JSON</span>
            <textarea
              rows={8}
              value={evaluationDraft.inputs}
              onChange={(event) =>
                setEvaluationDraft((current) => ({ ...current, inputs: event.target.value }))
              }
            />
          </label>
          <button className="primary-button" type="submit">
            Evaluate
          </button>
        </form>
        <pre>{evaluation}</pre>
      </section>
    </div>
  );
}
