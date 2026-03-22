"use client";

import type { PaymentProviderConfigDto } from "@exetron/contracts";
import { Alert, Button, Card, Modal, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import {
  createPaymentProviderConfig,
  listPaymentProviderConfigs,
  patchPaymentProviderConfig
} from "../../../lib/api";

const allChannels = ["ADMIN", "POS", "KIOSK", "DELIVERY"] as const;
const providerTypes = ["CASH_MANUAL", "CARD_SIMULATED", "QR_SIMULATED"] as const;
const methods = ["CASH", "CARD", "QR"] as const;

function formatJson(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value, null, 2);
  }

  return JSON.stringify({}, null, 2);
}

function parseJson(value: string) {
  const text = value.trim();
  return text ? (JSON.parse(text) as Record<string, unknown>) : null;
}

function textValue(value: unknown, fallback = "n/a") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function normalizeProviderType(value: unknown) {
  return providerTypes.includes(value as (typeof providerTypes)[number])
    ? (value as (typeof providerTypes)[number])
    : "CARD_SIMULATED";
}

function normalizeMethod(value: unknown) {
  return methods.includes(value as (typeof methods)[number]) ? (value as (typeof methods)[number]) : "CARD";
}

function normalizeChannels(value: unknown) {
  if (!Array.isArray(value)) {
    return [...allChannels];
  }

  return value.filter((item): item is (typeof allChannels)[number] =>
    allChannels.includes(item as (typeof allChannels)[number])
  );
}

function metadataLabel(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "not configured";
  }

  const metadata = value as {
    configured?: boolean;
    algorithm?: string | null;
    updatedAt?: string | null;
  };

  if (!metadata.configured) {
    return "not configured";
  }

  const algorithm = typeof metadata.algorithm === "string" ? metadata.algorithm : "encrypted";
  const updatedAt = typeof metadata.updatedAt === "string" ? new Date(metadata.updatedAt).toLocaleString() : "n/a";
  return `${algorithm} · ${updatedAt}`;
}

const configColumns: ColumnsType<PaymentProviderConfigDto> = [
  { title: "Provider", dataIndex: "providerKey" },
  { title: "Type", dataIndex: "providerType" },
  { title: "Method", dataIndex: "method" },
  { title: "Priority", dataIndex: "priority" },
  {
    title: "Enabled",
    dataIndex: "enabled",
    render: (value: unknown) => <Tag color={value ? "green" : "default"}>{value ? "enabled" : "disabled"}</Tag>
  },
  {
    title: "Channels",
    dataIndex: "allowedChannels",
    render: (value: unknown) => (Array.isArray(value) ? value.map((item) => textValue(item)).join(", ") : "n/a")
  },
  {
    title: "Settings",
    dataIndex: "settings",
    render: (value: unknown) => <Typography.Text code>{formatJson(value)}</Typography.Text>
  },
  { title: "Secrets", dataIndex: "secrets", render: (value: unknown) => metadataLabel(value) },
  { title: "Updated", dataIndex: "updatedAt", render: (value: unknown) => textValue(value) }
];

export default function PaymentProviderConfigsPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState<PaymentProviderConfigDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentProviderConfigDto | null>(null);
  const [formState, setFormState] = useState({
    providerKey: "pos-card-default",
    providerType: "CARD_SIMULATED" as (typeof providerTypes)[number],
    method: "CARD" as (typeof methods)[number],
    priority: "100",
    enabled: true,
    autoConfirmOrderOnSuccess: false,
    allowedChannels: [...allChannels] as (typeof allChannels)[number][],
    settings: "{\n  \"terminalProfile\": \"default\"\n}",
    secrets: ""
  });

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const loadConfigs = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  }, [effectiveStoreId, effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const scopeSummary = useMemo(
    () => [
      { label: "Tenant", value: effectiveTenantId || "Select a tenant" },
      { label: "Store", value: effectiveStoreId || "Tenant default" }
    ],
    [effectiveStoreId, effectiveTenantId]
  );

  function openCreateModal() {
    setEditing(null);
    setFormState({
      providerKey: "pos-card-default",
      providerType: "CARD_SIMULATED",
      method: "CARD",
      priority: "100",
      enabled: true,
      autoConfirmOrderOnSuccess: false,
      allowedChannels: [...allChannels],
      settings: "{\n  \"terminalProfile\": \"default\"\n}",
      secrets: ""
    });
    setModalOpen(true);
  }

  function openEditModal(config: PaymentProviderConfigDto) {
    setEditing(config);
    setFormState({
      providerKey: config.providerKey,
      providerType: normalizeProviderType(config.providerType),
      method: normalizeMethod(config.method),
      priority: textValue(config.priority, "100"),
      enabled: config.enabled,
      autoConfirmOrderOnSuccess: config.autoConfirmOrderOnSuccess,
      allowedChannels: [...config.allowedChannels],
      settings: formatJson(config.settings),
      secrets: ""
    });
    setModalOpen(true);
  }

  async function submitForm() {
    if (!session?.accessToken || !effectiveTenantId) {
      setError("Tenant scope is required.");
      return;
    }

    let settings: Record<string, unknown> | null = null;
    let secrets: Record<string, unknown> | null = null;
    try {
      settings = parseJson(formState.settings);
      secrets = formState.secrets.trim() ? parseJson(formState.secrets) : null;
    } catch {
      setError("Settings and secrets JSON must be valid.");
      return;
    }

    const payload = {
      tenantId: effectiveTenantId,
      storeId: effectiveStoreId ?? null,
      providerKey: formState.providerKey.trim(),
      providerType: formState.providerType,
      method: formState.method,
      enabled: formState.enabled,
      priority: Number(formState.priority),
      allowedChannels: formState.allowedChannels,
      autoConfirmOrderOnSuccess: formState.autoConfirmOrderOnSuccess,
      settings,
      ...(secrets ? { secrets } : {})
    };

    try {
      if (editing) {
        await patchPaymentProviderConfig(session.accessToken, editing.id, {
          storeId: payload.storeId,
          providerKey: payload.providerKey,
          providerType: payload.providerType,
          method: payload.method,
          enabled: payload.enabled,
          priority: payload.priority,
          allowedChannels: payload.allowedChannels,
          autoConfirmOrderOnSuccess: payload.autoConfirmOrderOnSuccess,
          settings: payload.settings,
          ...(payload.secrets ? { secrets: payload.secrets } : {})
        });
      } else {
        await createPaymentProviderConfig(session.accessToken, payload);
      }

      setModalOpen(false);
      setEditing(null);
      setError(null);
      await loadConfigs();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Payment provider config save failed."
      );
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Operations</span>
            <h2>Payment provider configs</h2>
            <p>Secrets are write-only. The grid only exposes encrypted metadata after save.</p>
          </div>
          <Space>
            <Button onClick={() => void loadConfigs()} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" onClick={openCreateModal}>
              Create config
            </Button>
          </Space>
        </div>

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

        <div className="workspace-grid" style={{ marginTop: 16 }}>
          {scopeSummary.map((entry) => (
            <article className="stat-card" key={entry.label}>
              <span className="eyebrow">{entry.label}</span>
              <strong>{entry.value}</strong>
            </article>
          ))}
        </div>

        {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}
      </Card>

      <Card className="ex-panel-card">
        <Table
          rowKey="id"
          columns={[
            ...configColumns,
            {
              title: "Action",
              key: "action",
              render: (_value, record) => <Button onClick={() => openEditModal(record)}>Edit</Button>
            }
          ]}
          dataSource={items}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={editing ? "Edit payment provider config" : "Create payment provider config"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void submitForm()}
        okText={editing ? "Save" : "Create"}
        destroyOnClose
        width={820}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message="Secrets are never read back from the API. Leave the field empty to preserve the existing secret envelope."
          />
          <div className="editor-form">
            <label className="field">
              <span>Provider key</span>
              <input
                value={formState.providerKey}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, providerKey: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Provider type</span>
              <select
                value={formState.providerType}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    providerType: normalizeProviderType(event.target.value)
                  }))
                }
              >
                {providerTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Method</span>
              <select
                value={formState.method}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    method: normalizeMethod(event.target.value)
                  }))
                }
              >
                {methods.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priority</span>
              <input
                type="number"
                value={formState.priority}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, priority: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Allowed channels</span>
              <Select
                mode="multiple"
                value={formState.allowedChannels}
                onChange={(next) =>
                  setFormState((current) => ({
                    ...current,
                    allowedChannels: normalizeChannels(next)
                  }))
                }
                options={allChannels.map((value) => ({ label: value, value }))}
              />
            </label>
            <label className="field">
              <span>Settings JSON</span>
              <textarea
                rows={7}
                value={formState.settings}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, settings: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Secrets JSON (write-only)</span>
              <textarea
                rows={7}
                value={formState.secrets}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, secrets: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={formState.enabled}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, enabled: event.target.checked }))
                }
              />
            </label>
            <label className="field">
              <span>Auto-confirm on success</span>
              <input
                type="checkbox"
                checked={formState.autoConfirmOrderOnSuccess}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    autoConfirmOrderOnSuccess: event.target.checked
                  }))
                }
              />
            </label>
          </div>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Secrets stay encrypted in the provider envelope and only metadata comes back in the list.
          </Typography.Paragraph>
        </Space>
      </Modal>
    </Space>
  );
}
