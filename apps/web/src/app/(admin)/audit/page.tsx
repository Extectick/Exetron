"use client";

import type { AuditLogDto } from "@exetron/contracts";
import { Alert, Card, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { request, withSearchParams } from "../../../lib/api";

const actorOptions = [
  { label: "All", value: "" },
  { label: "User", value: "USER" },
  { label: "System", value: "SYSTEM" },
  { label: "Device", value: "DEVICE" }
];

function textValue(value: unknown, fallback = "n/a") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function timestampValue(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleString() : "n/a";
}

function jsonText(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value, null, 0);
  }

  return JSON.stringify({}, null, 0);
}

const auditColumns: ColumnsType<AuditLogDto> = [
  { title: "Created", dataIndex: "createdAt", render: (value: unknown) => timestampValue(value) },
  {
    title: "Actor",
    dataIndex: "actorType",
    render: (value: unknown, record: AuditLogDto) => (
      <Tag>{`${textValue(value, "unknown")}:${textValue(record.actorId, "n/a")}`}</Tag>
    )
  },
  { title: "Action", dataIndex: "action" },
  {
    title: "Entity",
    render: (_: unknown, record: AuditLogDto) =>
      `${textValue(record.entityType, "unknown")}:${textValue(record.entityId, "n/a")}`
  },
  { title: "Tenant", dataIndex: "tenantId", render: (value: unknown) => textValue(value) },
  { title: "Store", dataIndex: "storeId", render: (value: unknown) => textValue(value) },
  {
    title: "Payload",
    dataIndex: "payload",
    render: (value: unknown) => <Tag color="blue">{jsonText(value)}</Tag>
  }
];

export default function AuditPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");
  const [items, setItems] = useState<AuditLogDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();

  const loadLogs = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    try {
      const response = await request<{ items: AuditLogDto[] }>(
        withSearchParams("/audit", {
          tenantId: effectiveTenantId || undefined,
          storeId: storeId.trim() || undefined,
          actorType: actorType || undefined,
          action: action || undefined
        }),
        {},
        session.accessToken
      );
      setItems(response.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Audit load failed.");
    } finally {
      setLoading(false);
    }
  }, [action, actorType, effectiveTenantId, session?.accessToken, storeId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Control</span>
            <h2>Audit trail</h2>
            <p>Action history for tenant, store and device operations.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadLogs()} disabled={loading}>
            Refresh
          </button>
        </div>
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
          <label className="field">
            <span>Actor Type</span>
            <Select value={actorType} onChange={setActorType} options={actorOptions} />
          </label>
          <label className="field">
            <span>Action</span>
            <input value={action} onChange={(event) => setAction(event.target.value)} />
          </label>
        </div>
        {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}
      </Card>

      <Card className="ex-panel-card">
        <Table
          rowKey="id"
          loading={loading}
          columns={auditColumns}
          dataSource={items}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </Space>
  );
}
