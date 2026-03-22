"use client";

import type { StoreSettingDto, TenantSettingDto } from "@exetron/contracts";
import { Alert, Card, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { CrudPage, JsonTag } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import {
  getStoreSettings,
  getTenantSettings,
  upsertStoreSetting,
  upsertTenantSetting
} from "../../../lib/api";

type SettingRow = (TenantSettingDto | StoreSettingDto) & Record<string, unknown>;

function textValue(value: unknown, fallback = "n/a") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
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

function parseJsonInput(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

function timestampValue(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleString() : "n/a";
}

const tenantSettingColumns: ColumnsType<SettingRow> = [
  { title: "Key", dataIndex: "key", render: (value: unknown) => textValue(value) },
  { title: "Value", dataIndex: "value", render: (value: unknown) => <JsonTag value={value} /> },
  { title: "Updated", dataIndex: "updatedAt", render: (value: unknown) => timestampValue(value) }
];

const storeSettingColumns: ColumnsType<SettingRow> = [
  { title: "Store", dataIndex: "storeId", render: (value: unknown) => textValue(value) },
  { title: "Key", dataIndex: "key", render: (value: unknown) => textValue(value) },
  { title: "Value", dataIndex: "value", render: (value: unknown) => <JsonTag value={value} /> },
  { title: "Updated", dataIndex: "updatedAt", render: (value: unknown) => timestampValue(value) }
];

export default function SettingsPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim();

  const tenantSummary = useMemo(
    () => [
      { label: "Tenant scope", value: effectiveTenantId || "Select a tenant" },
      { label: "Store scope", value: effectiveStoreId || "Optional store workspace" }
    ],
    [effectiveStoreId, effectiveTenantId]
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Control</span>
            <h2>Settings workspaces</h2>
            <p>Separate tenant and store scopes with JSON value editing and no read-only detours.</p>
          </div>
        </div>

        {!sessionTenantId ? (
          <Alert
            type="info"
            showIcon
            message="Platform admins can inspect any tenant. Scoped users are locked to their current tenant."
            className="mb-4"
          />
        ) : null}

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

        <div className="workspace-grid" style={{ marginTop: 16 }}>
          {tenantSummary.map((entry) => (
            <article className="stat-card" key={entry.label}>
              <span className="eyebrow">{entry.label}</span>
              <strong>{entry.value}</strong>
            </article>
          ))}
        </div>
      </Card>

      <CrudPage<SettingRow>
        key={`tenant-settings-${effectiveTenantId || "none"}`}
        eyebrow="Tenant Workspace"
        title="Tenant settings"
        description="Edit tenant-level configuration as structured JSON."
        columns={tenantSettingColumns}
        fields={[
          { name: "key", label: "Key", required: true },
          { name: "value", label: "Value JSON", type: "json", required: true }
        ]}
        listItems={async () => {
          if (!session?.accessToken || !effectiveTenantId) {
            return [];
          }

          return (await getTenantSettings(session.accessToken, effectiveTenantId)).items.map((item) => ({
            ...item
          }));
        }}
        createItem={async (payload) => {
          if (!session?.accessToken || !effectiveTenantId) {
            throw new Error("Tenant scope is required.");
          }

          return upsertTenantSetting(
            {
              key: textValue(payload.key, "").trim(),
              value: parseJsonInput(payload.value)
            },
            session.accessToken,
            effectiveTenantId
          );
        }}
        updateItem={async (_id, payload) => {
          if (!session?.accessToken || !effectiveTenantId) {
            throw new Error("Tenant scope is required.");
          }

          return upsertTenantSetting(
            {
              key: textValue(payload.key, "").trim(),
              value: parseJsonInput(payload.value)
            },
            session.accessToken,
            effectiveTenantId
          );
        }}
        getItemId={(item) => textValue(item.id, "")}
        mapItemToFormValues={(item) => ({
          key: textValue(item.key, ""),
          value: jsonToString(item.value)
        })}
        normalizeValues={(values) => ({
          key: textValue(values.key, "").trim(),
          value: parseJsonInput(values.value)
        })}
      />

      {effectiveStoreId ? (
        <CrudPage<SettingRow>
          key={`store-settings-${effectiveStoreId}`}
          eyebrow="Store Workspace"
          title="Store settings"
          description="Edit store overrides without leaking the tenant-level base values."
          columns={storeSettingColumns}
          fields={[
            { name: "key", label: "Key", required: true },
            { name: "value", label: "Value JSON", type: "json", required: true }
          ]}
          listItems={async () => {
            if (!session?.accessToken) {
              return [];
            }

            return (await getStoreSettings(effectiveStoreId, session.accessToken)).items.map((item) => ({
              ...item
            }));
          }}
          createItem={async (payload) => {
            if (!session?.accessToken) {
              throw new Error("Authentication is required.");
            }

            return upsertStoreSetting(
              {
                storeId: effectiveStoreId,
                key: textValue(payload.key, "").trim(),
                value: parseJsonInput(payload.value)
              },
              session.accessToken
            );
          }}
          updateItem={async (_id, payload) => {
            if (!session?.accessToken) {
              throw new Error("Authentication is required.");
            }

            return upsertStoreSetting(
              {
                storeId: effectiveStoreId,
                key: textValue(payload.key, "").trim(),
                value: parseJsonInput(payload.value)
              },
              session.accessToken
            );
          }}
          getItemId={(item) => textValue(item.id, "")}
          mapItemToFormValues={(item) => ({
            key: textValue(item.key, ""),
            value: jsonToString(item.value)
          })}
          normalizeValues={(values) => ({
            key: textValue(values.key, "").trim(),
            value: parseJsonInput(values.value)
          })}
        />
      ) : (
        <Card className="ex-panel-card">
          <Typography.Title level={4}>Store workspace unavailable</Typography.Title>
          <Typography.Paragraph type="secondary">
            Enter a store ID to open the store-level override editor.
          </Typography.Paragraph>
        </Card>
      )}
    </Space>
  );
}
