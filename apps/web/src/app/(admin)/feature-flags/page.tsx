"use client";

import type { FeatureFlagDto } from "@exetron/contracts";
import { Alert, Card, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { CrudPage, JsonTag } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { getFeatureFlags, upsertFeatureFlag } from "../../../lib/api";

type FeatureFlagRow = FeatureFlagDto & Record<string, unknown>;

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

function normalizeKind(value: unknown) {
  return value === "PERCENTAGE" ? "PERCENTAGE" : "BOOLEAN";
}

function normalizeRollout(value: unknown) {
  return value === undefined || value === null || value === "" ? null : Number(value);
}

function timestampValue(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleString() : "n/a";
}

const flagKindOptions = [
  { label: "BOOLEAN", value: "BOOLEAN" },
  { label: "PERCENTAGE", value: "PERCENTAGE" }
];

const flagColumns: ColumnsType<FeatureFlagRow> = [
  { title: "Scope", dataIndex: "scopeKey", render: (value: unknown) => textValue(value) },
  { title: "Key", dataIndex: "key", render: (value: unknown) => textValue(value) },
  { title: "Enabled", dataIndex: "enabled", render: (value: unknown) => (value ? "true" : "false") },
  { title: "Kind", dataIndex: "kind", render: (value: unknown) => textValue(value) },
  { title: "Rollout %", dataIndex: "rolloutPercentage", render: (value: unknown) => textValue(value) },
  { title: "Rules", dataIndex: "rules", render: (value: unknown) => <JsonTag value={value} /> },
  { title: "Updated", dataIndex: "updatedAt", render: (value: unknown) => timestampValue(value) }
];

export default function FeatureFlagsPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim();

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Control</span>
            <h2>Feature flags</h2>
            <p>Boolean and percentage flags scoped to the active tenant or store.</p>
          </div>
        </div>
        <Alert
          type="info"
          showIcon
          message="Flags are upserted through the same endpoint. The table shows the current read model only."
          className="mb-4"
        />
        <div className="editor-form">
          {!sessionTenantId ? (
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
      </Card>

      <CrudPage<FeatureFlagRow>
        key={`feature-flags-${effectiveTenantId}-${effectiveStoreId || "all"}`}
        eyebrow="Registry"
        title="Feature flag registry"
        description="Create and update rollout controls without leaving the control plane."
        columns={flagColumns}
        fields={[
          { name: "key", label: "Flag Key", required: true },
          { name: "enabled", label: "Enabled", type: "boolean" },
          { name: "kind", label: "Kind", type: "select", options: flagKindOptions },
          { name: "rolloutPercentage", label: "Rollout %", type: "number" },
          { name: "rules", label: "Rules JSON", type: "json" },
          { name: "storeId", label: "Store ID", hidden: true }
        ]}
        listItems={async () => {
          if (!session?.accessToken || !effectiveTenantId) {
            return [];
          }

          return (await getFeatureFlags(
            session.accessToken,
            effectiveTenantId,
            effectiveStoreId || undefined
          )).items.map((item) => ({ ...item }));
        }}
        createItem={async (payload) => {
          if (!session?.accessToken || !effectiveTenantId) {
            throw new Error("Tenant scope is required.");
          }

          return upsertFeatureFlag(
            {
              tenantId: effectiveTenantId,
              storeId: effectiveStoreId || null,
              key: textValue(payload.key, "").trim(),
              enabled: Boolean(payload.enabled),
              kind: normalizeKind(payload.kind),
              rolloutPercentage: normalizeRollout(payload.rolloutPercentage),
              rules: parseJsonInput(payload.rules)
            },
            session.accessToken
          );
        }}
        updateItem={async (_id, payload) => {
          if (!session?.accessToken || !effectiveTenantId) {
            throw new Error("Tenant scope is required.");
          }

          return upsertFeatureFlag(
            {
              tenantId: effectiveTenantId,
              storeId: effectiveStoreId || null,
              key: textValue(payload.key, "").trim(),
              enabled: Boolean(payload.enabled),
              kind: normalizeKind(payload.kind),
              rolloutPercentage: normalizeRollout(payload.rolloutPercentage),
              rules: parseJsonInput(payload.rules)
            },
            session.accessToken
          );
        }}
        getItemId={(item) => textValue(item.id, "")}
        mapItemToFormValues={(item) => ({
          key: textValue(item.key, ""),
          enabled: Boolean(item.enabled),
          kind: textValue(item.kind, "BOOLEAN"),
          rolloutPercentage: item.rolloutPercentage ?? "",
          rules: JSON.stringify(item.rules ?? {}, null, 2)
        })}
        normalizeValues={(values) => ({
          key: textValue(values.key, "").trim(),
          enabled: Boolean(values.enabled),
          kind: normalizeKind(values.kind),
          rolloutPercentage: normalizeRollout(values.rolloutPercentage),
          rules: parseJsonInput(values.rules)
        })}
      />
    </Space>
  );
}
