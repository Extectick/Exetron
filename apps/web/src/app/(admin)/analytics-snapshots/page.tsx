"use client";

import type { AnalyticsSnapshotDto } from "@exetron/contracts";
import { Alert, Card, Descriptions, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { listAnalyticsSnapshots, precomputeAnalyticsSnapshot } from "../../../lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
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

function jsonText(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value, null, 0);
  }

  return JSON.stringify({}, null, 0);
}

const snapshotColumns: ColumnsType<AnalyticsSnapshotDto> = [
  {
    title: "Created",
    dataIndex: "createdAt",
    render: (value: unknown) => (typeof value === "string" ? formatDate(value) : "n/a")
  },
  { title: "Kind", dataIndex: "kind" },
  {
    title: "Period",
    render: (_: unknown, record: AnalyticsSnapshotDto) => `${record.periodStart} → ${record.periodEnd}`
  },
  { title: "Source", dataIndex: "source", render: (value: unknown) => <Tag>{textValue(value)}</Tag> },
  { title: "Store", dataIndex: "storeId", render: (value: unknown) => textValue(value, "tenant-wide") },
  { title: "Metadata", dataIndex: "metadata", render: (value: unknown) => jsonText(value) }
];

export default function AnalyticsSnapshotsPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [periodStart, setPeriodStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<AnalyticsSnapshotDto[]>([]);
  const [selected, setSelected] = useState<AnalyticsSnapshotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const loadSnapshots = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    setLoading(true);
    try {
      const response = await listAnalyticsSnapshots(session.accessToken, {
        tenantId: effectiveTenantId,
        storeId: effectiveStoreId,
        periodStart: `${periodStart}T00:00:00.000Z`,
        periodEnd: `${periodEnd}T23:59:59.999Z`
      });
      setItems(response.items);
      setSelected((current) => current ?? response.items[0] ?? null);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Snapshot load failed.");
    } finally {
      setLoading(false);
    }
  }, [effectiveStoreId, effectiveTenantId, periodEnd, periodStart, session?.accessToken]);

  useEffect(() => {
    if (!effectiveTenantId || !session?.accessToken) {
      return;
    }

    void loadSnapshots();
  }, [effectiveTenantId, loadSnapshots, session?.accessToken]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Intelligence</span>
            <h2>Analytics snapshots</h2>
            <p>Run precompute jobs and inspect the stored payloads used by owner cabinet mode switches.</p>
          </div>
          <Space>
            <button className="ghost-button" onClick={() => void loadSnapshots()} disabled={loading}>
              Refresh
            </button>
            <button
              className="primary-button"
              onClick={() => {
                if (!session?.accessToken || !effectiveTenantId) {
                  setError("Tenant scope is required.");
                  return;
                }

                void precomputeAnalyticsSnapshot(session.accessToken, {
                  tenantId: effectiveTenantId,
                  storeId: effectiveStoreId ?? null,
                  periodStart: `${periodStart}T00:00:00.000Z`,
                  periodEnd: `${periodEnd}T23:59:59.999Z`
                })
                  .then((snapshot) => {
                    setSelected(snapshot);
                    return loadSnapshots();
                  })
                  .catch((caughtError) =>
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Snapshot precompute failed."
                    )
                  );
              }}
            >
              Precompute
            </button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}

        <div className="editor-form" style={{ marginTop: 16 }}>
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
            <span>Period start</span>
            <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </label>
          <label className="field">
            <span>Period end</span>
            <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </label>
        </div>
      </Card>

      <div className="split-grid">
        <Card className="ex-panel-card">
          <Table
            rowKey="id"
            loading={loading}
            columns={snapshotColumns}
            dataSource={items}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            onRow={(record) => ({
              onClick: () => setSelected(record)
            })}
            scroll={{ x: 980 }}
          />
        </Card>

        <Card className="ex-panel-card">
          {selected ? (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Descriptions bordered column={1}>
                <Descriptions.Item label="Snapshot ID">{selected.id}</Descriptions.Item>
                <Descriptions.Item label="Kind">{selected.kind}</Descriptions.Item>
                <Descriptions.Item label="Source">
                  <Tag>{textValue(selected.source)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Period">
                  {selected.periodStart} → {selected.periodEnd}
                </Descriptions.Item>
                <Descriptions.Item label="Created">{formatDate(selected.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Metadata">
                  {jsonText(selected.metadata)}
                </Descriptions.Item>
              </Descriptions>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Payload
              </Typography.Title>
              <pre>{JSON.stringify(selected.payload, null, 2)}</pre>
            </Space>
          ) : (
            <Typography.Paragraph type="secondary">
              Select a snapshot to inspect its materialized payload.
            </Typography.Paragraph>
          )}
        </Card>
      </div>
    </Space>
  );
}
