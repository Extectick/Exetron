"use client";

import type {
  BrandingConfigDto,
  CustomizationEvaluationDto,
  CustomizationRuleDto
} from "@exetron/contracts";
import { Alert, Card, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { CrudPage, JsonTag } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import {
  createBrandingConfig,
  createCustomizationRule,
  evaluateCustomization,
  listBrandingConfigs,
  listCustomizationRules,
  patchBrandingConfig,
  patchCustomizationRule
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
type BrandingConfigRow = BrandingConfigDto & Record<string, unknown>;
type CustomizationRuleRow = CustomizationRuleDto & Record<string, unknown>;

function textValue(value: unknown, fallback = "n/a") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function parseJsonInput(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? (JSON.parse(text) as Record<string, unknown>) : null;
}

function recordValue(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function jsonToString(value: unknown) {
  return JSON.stringify(recordValue(value), null, 2);
}

function isCustomizationChannel(value: unknown): value is CustomizationChannel {
  return channels.includes(value as CustomizationChannel);
}

function channelValue(value: unknown, fallback: CustomizationChannel = "KIOSK") {
  return isCustomizationChannel(value) ? value : fallback;
}

function optionalChannelValue(value: unknown) {
  return isCustomizationChannel(value) ? value : null;
}

function timestampValue(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleString() : "n/a";
}

const brandingColumns: ColumnsType<BrandingConfigRow> = [
  { title: "Scope", dataIndex: "scopeKey", render: (value: unknown) => textValue(value) },
  { title: "Channel", dataIndex: "channel", render: (value: unknown) => textValue(value) },
  { title: "Point Key", dataIndex: "pointKey", render: (value: unknown) => textValue(value) },
  { title: "Config", dataIndex: "config", render: (value: unknown) => <JsonTag value={value} /> },
  { title: "Updated", dataIndex: "updatedAt", render: (value: unknown) => timestampValue(value) }
];

const ruleColumns: ColumnsType<CustomizationRuleRow> = [
  { title: "Key", dataIndex: "key", render: (value: unknown) => textValue(value) },
  { title: "Channel", dataIndex: "channel", render: (value: unknown) => textValue(value) },
  { title: "Priority", dataIndex: "priority", render: (value: unknown) => textValue(value) },
  { title: "Conditions", dataIndex: "conditions", render: (value: unknown) => <JsonTag value={value} /> },
  { title: "Actions", dataIndex: "actions", render: (value: unknown) => <JsonTag value={value} /> },
  { title: "Status", dataIndex: "status", render: (value: unknown) => textValue(value) },
  { title: "Updated", dataIndex: "updatedAt", render: (value: unknown) => timestampValue(value) }
];

export default function CustomizationPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const [tenantId, setTenantId] = useState(sessionTenantId);
  const [evaluation, setEvaluation] = useState<CustomizationEvaluationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState({
    storeId: "",
    channel: "KIOSK" as CustomizationChannel,
    pointKey: "",
    inputs: '{\n  "paymentMethod": "CARD"\n}'
  });

  const effectiveTenantId = sessionTenantId || tenantId.trim();

  const previewPayload = useMemo(
    () => ({
      storeId: previewDraft.storeId,
      channel: previewDraft.channel,
      pointKey: previewDraft.pointKey
    }),
    [previewDraft.channel, previewDraft.pointKey, previewDraft.storeId]
  );

  return (
    <Tabs
      defaultActiveKey="branding"
      items={[
        {
          key: "branding",
          label: "Branding",
          children: (
            <Card className="ex-panel-card">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Control</span>
                  <h2>Branding configs</h2>
                  <p>Per-channel config overlays for admin, kiosk and operational surfaces.</p>
                </div>
              </div>
              {!sessionTenantId ? (
                <Alert
                  type="info"
                  showIcon
                  message="Enter a tenant ID to browse customization resources."
                  className="mb-4"
                />
              ) : null}
              {!sessionTenantId ? (
                <label className="field">
                  <span>Tenant ID</span>
                  <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
                </label>
              ) : null}
              <CrudPage<BrandingConfigRow>
                key={`branding-${effectiveTenantId}`}
                eyebrow="Branding"
                title="Branding configs"
                description="Create and update branded UI payloads for a tenant or store scope."
                columns={brandingColumns}
                fields={[
                  { name: "storeId", label: "Store ID" },
                  {
                    name: "channel",
                    label: "Channel",
                    type: "select",
                    options: channels.map((channel) => ({ label: channel, value: channel }))
                  },
                  { name: "pointKey", label: "Point Key" },
                  { name: "config", label: "Config JSON", type: "json", required: true }
                ]}
                listItems={async () => {
                  if (!session?.accessToken || !effectiveTenantId) {
                    return [];
                  }

                  return (await listBrandingConfigs(session.accessToken, {
                    tenantId: effectiveTenantId
                  })).items as unknown as BrandingConfigRow[];
                }}
                createItem={async (payload) => {
                  if (!session?.accessToken || !effectiveTenantId) {
                    throw new Error("Tenant scope is required.");
                  }

                  return createBrandingConfig(session.accessToken, {
                    tenantId: effectiveTenantId,
                    storeId: textValue(payload.storeId, "").trim() || null,
                    channel: channelValue(payload.channel),
                    pointKey: textValue(payload.pointKey, "").trim() || null,
                    config: parseJsonInput(payload.config) ?? {}
                  });
                }}
                updateItem={async (id, payload) => {
                  if (!session?.accessToken || !effectiveTenantId) {
                    throw new Error("Tenant scope is required.");
                  }

                  return patchBrandingConfig(session.accessToken, id, {
                    tenantId: effectiveTenantId,
                    storeId: textValue(payload.storeId, "").trim() || null,
                    channel: channelValue(payload.channel),
                    pointKey: textValue(payload.pointKey, "").trim() || null,
                    config: parseJsonInput(payload.config) ?? {}
                  });
                }}
                getItemId={(item) => textValue(item.id, "")}
                mapItemToFormValues={(item) => ({
                  storeId: textValue(item.storeId, ""),
                  channel: channelValue(item.channel),
                  pointKey: textValue(item.pointKey, ""),
                  config: jsonToString(item.config)
                })}
                normalizeValues={(values) => ({
                  storeId: textValue(values.storeId, "").trim(),
                  channel: channelValue(values.channel),
                  pointKey: textValue(values.pointKey, "").trim(),
                  config: parseJsonInput(values.config) ?? {}
                })}
              />
            </Card>
          )
        },
        {
          key: "rules",
          label: "Rules",
          children: (
            <Card className="ex-panel-card">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Control</span>
                  <h2>Customization rules</h2>
                  <p>Priority-based orchestration for tenant, store and channel specific behaviors.</p>
                </div>
              </div>
              <CrudPage<CustomizationRuleRow>
                key={`rules-${effectiveTenantId}`}
                eyebrow="Rules"
                title="Customization rules"
                description="Update rule payloads without losing channel or priority context."
                columns={ruleColumns}
                fields={[
                  { name: "storeId", label: "Store ID" },
                  {
                    name: "channel",
                    label: "Channel",
                    type: "select",
                    options: channels.map((channel) => ({ label: channel, value: channel }))
                  },
                  { name: "pointKey", label: "Point Key" },
                  { name: "key", label: "Rule Key", required: true },
                  { name: "description", label: "Description" },
                  { name: "priority", label: "Priority", type: "number" },
                  { name: "conditions", label: "Conditions JSON", type: "json" },
                  { name: "actions", label: "Actions JSON", type: "json", required: true }
                ]}
                listItems={async () => {
                  if (!session?.accessToken || !effectiveTenantId) {
                    return [];
                  }

                  return (await listCustomizationRules(session.accessToken, {
                    tenantId: effectiveTenantId
                  })).items as unknown as CustomizationRuleRow[];
                }}
                createItem={async (payload) => {
                  if (!session?.accessToken || !effectiveTenantId) {
                    throw new Error("Tenant scope is required.");
                  }

                  return createCustomizationRule(session.accessToken, {
                    tenantId: effectiveTenantId,
                    storeId: textValue(payload.storeId, "").trim() || null,
                    channel: optionalChannelValue(payload.channel),
                    pointKey: textValue(payload.pointKey, "").trim() || null,
                    key: textValue(payload.key, "").trim(),
                    description: textValue(payload.description, "").trim() || null,
                    priority: Number(payload.priority ?? 100),
                    conditions: parseJsonInput(payload.conditions),
                    actions: parseJsonInput(payload.actions) ?? {}
                  });
                }}
                updateItem={async (id, payload) => {
                  if (!session?.accessToken || !effectiveTenantId) {
                    throw new Error("Tenant scope is required.");
                  }

                  return patchCustomizationRule(session.accessToken, id, {
                    tenantId: effectiveTenantId,
                    storeId: textValue(payload.storeId, "").trim() || null,
                    channel: optionalChannelValue(payload.channel),
                    pointKey: textValue(payload.pointKey, "").trim() || null,
                    key: textValue(payload.key, "").trim(),
                    description: textValue(payload.description, "").trim() || null,
                    priority: Number(payload.priority ?? 100),
                    conditions: parseJsonInput(payload.conditions),
                    actions: parseJsonInput(payload.actions) ?? {}
                  });
                }}
                getItemId={(item) => textValue(item.id, "")}
                mapItemToFormValues={(item) => ({
                  storeId: textValue(item.storeId, ""),
                  channel: channelValue(item.channel),
                  pointKey: textValue(item.pointKey, ""),
                  key: textValue(item.key, ""),
                  description: textValue(item.description, ""),
                  priority: item.priority,
                  conditions: jsonToString(item.conditions),
                  actions: jsonToString(item.actions)
                })}
                normalizeValues={(values) => ({
                  storeId: textValue(values.storeId, "").trim(),
                  channel: channelValue(values.channel),
                  pointKey: textValue(values.pointKey, "").trim(),
                  key: textValue(values.key, "").trim(),
                  description: textValue(values.description, "").trim(),
                  priority: Number(values.priority ?? 100),
                  conditions: parseJsonInput(values.conditions),
                  actions: parseJsonInput(values.actions) ?? {}
                })}
              />
            </Card>
          )
        },
        {
          key: "preview",
          label: "Preview",
          children: (
            <Card className="ex-panel-card">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Intelligence</span>
                  <h2>Evaluate effective customization</h2>
                  <p>Run the merge logic against live tenant and store scopes before publishing.</p>
                </div>
              </div>
              <div className="editor-form">
                <label className="field">
                  <span>Store ID</span>
                  <input
                    value={previewDraft.storeId}
                    onChange={(event) =>
                      setPreviewDraft((current) => ({ ...current, storeId: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Channel</span>
                  <select
                    value={previewDraft.channel}
                    onChange={(event) =>
                      setPreviewDraft((current) => ({
                        ...current,
                        channel: channelValue(event.target.value)
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
                    value={previewDraft.pointKey}
                    onChange={(event) =>
                      setPreviewDraft((current) => ({ ...current, pointKey: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Inputs JSON</span>
                  <textarea
                    rows={8}
                    value={previewDraft.inputs}
                    onChange={(event) =>
                      setPreviewDraft((current) => ({ ...current, inputs: event.target.value }))
                    }
                  />
                </label>
              </div>
              {!sessionTenantId ? (
                <label className="field">
                  <span>Tenant ID</span>
                  <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
                </label>
              ) : null}
              <div className="workspace-grid" style={{ marginBottom: 16 }}>
                {[
                  { label: "Tenant scope", value: effectiveTenantId || "Select a tenant" },
                  { label: "Channel", value: previewDraft.channel },
                  { label: "Point key", value: previewPayload.pointKey || "n/a" }
                ].map((entry) => (
                  <article className="stat-card" key={entry.label}>
                    <span className="eyebrow">{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </article>
                ))}
              </div>
              <Alert
                type="info"
                showIcon
                message="Preview results show the merged settings, feature flags, branding and applied rules."
                className="mb-4"
              />
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  if (!session?.accessToken || !effectiveTenantId) {
                    setError("Tenant ID is required.");
                    return;
                  }

                  let inputs: Record<string, unknown>;
                  try {
                    inputs = JSON.parse(previewDraft.inputs) as Record<string, unknown>;
                  } catch {
                    setError("Evaluation inputs JSON must be valid.");
                    return;
                  }

                  void evaluateCustomization(session.accessToken, {
                    tenantId: effectiveTenantId,
                    storeId: previewDraft.storeId || null,
                    channel: previewDraft.channel,
                    pointKey: previewDraft.pointKey || null,
                    inputs
                  })
                    .then((response) => {
                      setError(null);
                      setEvaluation(response);
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
                Evaluate
              </button>
              {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}
              <pre style={{ marginTop: 16 }}>{JSON.stringify(evaluation, null, 2)}</pre>
            </Card>
          )
        }
      ]}
    />
  );
}
