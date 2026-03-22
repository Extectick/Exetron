"use client";

import type { AnalyticsSnapshotDto, OwnerCabinetDashboardDto } from "@exetron/contracts";
import { Alert, Card, Descriptions, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import {
  getOwnerCabinetDashboardView,
  listAnalyticsSnapshots,
  precomputeAnalyticsSnapshot
} from "../../../lib/api";

function defaultPeriodStart(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function toRangeStart(value: string) {
  return `${value}T00:00:00.000Z`;
}

function toRangeEnd(value: string) {
  return `${value}T23:59:59.999Z`;
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

type DashboardReadMode = "LIVE" | "PREFER_SNAPSHOT" | "SNAPSHOT_ONLY";

function isDashboardMode(value: unknown): value is DashboardReadMode {
  return value === "LIVE" || value === "PREFER_SNAPSHOT" || value === "SNAPSHOT_ONLY";
}

const modeOptions = [
  { label: "Live", value: "LIVE" },
  { label: "Prefer snapshot", value: "PREFER_SNAPSHOT" },
  { label: "Snapshot only", value: "SNAPSHOT_ONLY" }
] as const;

export default function OwnerCabinetPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<DashboardReadMode>("LIVE");
  const [dashboard, setDashboard] = useState<OwnerCabinetDashboardDto | null>(null);
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshotDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const query = useMemo(
    () => ({
      tenantId: effectiveTenantId,
      storeId: effectiveStoreId,
      periodStart: toRangeStart(periodStart),
      periodEnd: toRangeEnd(periodEnd),
      mode
    }),
    [effectiveStoreId, effectiveTenantId, mode, periodEnd, periodStart]
  );

  const loadWorkspace = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    setLoading(true);
    try {
      const [dashboardResponse, snapshotsResponse] = await Promise.all([
        getOwnerCabinetDashboardView(session.accessToken, query),
        listAnalyticsSnapshots(session.accessToken, {
          tenantId: effectiveTenantId,
          storeId: effectiveStoreId,
          periodStart: toRangeStart(periodStart),
          periodEnd: toRangeEnd(periodEnd)
        })
      ]);

      setDashboard(dashboardResponse);
      setSnapshots(snapshotsResponse.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Owner cabinet load failed.");
    } finally {
      setLoading(false);
    }
  }, [effectiveStoreId, effectiveTenantId, periodEnd, periodStart, query, session?.accessToken]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const selectedDashboard = dashboard;

  const topProductColumns: ColumnsType<OwnerCabinetDashboardDto["topProducts"][number]> = [
    { title: "Product", dataIndex: "productName" },
    { title: "Code", dataIndex: "productCode", render: (value: unknown) => textValue(value) },
    { title: "Qty", dataIndex: "quantity" },
    { title: "Revenue", dataIndex: "revenue" }
  ];

  const revenueByStoreColumns: ColumnsType<OwnerCabinetDashboardDto["revenueByStore"][number]> = [
    { title: "Store", dataIndex: "storeName" },
    { title: "Code", dataIndex: "storeCode" },
    { title: "Paid Orders", dataIndex: "paidOrders" },
    { title: "Revenue", dataIndex: "revenue" },
    { title: "Average", dataIndex: "averageOrderValue" }
  ];

  const channelColumns: ColumnsType<OwnerCabinetDashboardDto["channelSummary"][number]> = [
    { title: "Channel", dataIndex: "channel" },
    { title: "Paid Orders", dataIndex: "paidOrders" },
    { title: "Revenue", dataIndex: "revenue" }
  ];

  const snapshotColumns: ColumnsType<AnalyticsSnapshotDto> = [
    { title: "Created", dataIndex: "createdAt", render: (value: unknown) => (typeof value === "string" ? new Date(value).toLocaleString() : "n/a") },
    { title: "Kind", dataIndex: "kind" },
    {
      title: "Period",
      render: (_: unknown, record: AnalyticsSnapshotDto) => `${record.periodStart} → ${record.periodEnd}`
    },
    {
      title: "Artifact",
      render: (_: unknown, record: AnalyticsSnapshotDto) => (
        <Tag>{textValue(record.artifactStatus)}</Tag>
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Intelligence</span>
            <h2>Owner cabinet</h2>
            <p>Switch between live and snapshot reads before publishing a precompute.</p>
          </div>
          <Space>
            <button className="ghost-button" onClick={() => void loadWorkspace()} disabled={loading}>
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
                  periodStart: toRangeStart(periodStart),
                  periodEnd: toRangeEnd(periodEnd)
                })
                  .then(() => loadWorkspace())
                  .catch((caughtError) =>
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Analytics precompute failed."
                    )
                  );
              }}
            >
              Precompute snapshot
            </button>
          </Space>
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
            <span>Read mode</span>
            <Select
              value={mode}
              onChange={(next) => {
                if (isDashboardMode(next)) {
                  setMode(next);
                }
              }}
              options={modeOptions.map((option) => ({ label: option.label, value: option.value }))}
            />
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

        {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}
      </Card>

      {selectedDashboard ? (
        <>
          <div className="workspace-grid">
            {[
              { label: "Revenue", value: `${selectedDashboard.revenue} ${selectedDashboard.currency}` },
              {
                label: "Average order",
                value: `${selectedDashboard.averageOrderValue} ${selectedDashboard.currency}`
              },
              { label: "Paid orders", value: `${selectedDashboard.paidOrders} / ${selectedDashboard.totalOrders}` },
              {
                label: "Mode",
                value: `${mode} · ${selectedDashboard.dataSource}`
              }
            ].map((entry) => (
              <article className="stat-card" key={entry.label}>
                <span className="eyebrow">{entry.label}</span>
                <strong>{entry.value}</strong>
              </article>
            ))}
          </div>

          <Card className="ex-panel-card">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Dashboard period">
                {selectedDashboard.periodStart} → {selectedDashboard.periodEnd}
              </Descriptions.Item>
              <Descriptions.Item label="Generated at">
                {new Date(selectedDashboard.generatedAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Snapshot ID">{textValue(selectedDashboard.snapshotId)}</Descriptions.Item>
              <Descriptions.Item label="Source">
                <Tag>{selectedDashboard.dataSource}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <div className="split-grid">
            <Card className="ex-panel-card">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Revenue by store
              </Typography.Title>
              <Table
                rowKey="storeId"
                pagination={false}
                columns={revenueByStoreColumns}
                dataSource={selectedDashboard.revenueByStore}
              />
            </Card>

            <Card className="ex-panel-card">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Top products
              </Typography.Title>
              <Table
                rowKey="productId"
                pagination={false}
                columns={topProductColumns}
                dataSource={selectedDashboard.topProducts}
              />
            </Card>
          </div>

          <div className="split-grid">
            <Card className="ex-panel-card">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Channel summary
              </Typography.Title>
              <Table
                rowKey="channel"
                pagination={false}
                columns={channelColumns}
                dataSource={selectedDashboard.channelSummary}
              />
            </Card>

            <Card className="ex-panel-card">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Refund pressure
              </Typography.Title>
              <Descriptions bordered column={1}>
                <Descriptions.Item label="Cancelled orders">
                  {selectedDashboard.refundsAndCancellations.cancelledOrders}
                </Descriptions.Item>
                <Descriptions.Item label="Cancelled revenue">
                  {selectedDashboard.refundsAndCancellations.cancelledRevenue} {selectedDashboard.currency}
                </Descriptions.Item>
                <Descriptions.Item label="Pending manual refunds">
                  {selectedDashboard.refundsAndCancellations.pendingManualRefunds}
                </Descriptions.Item>
                <Descriptions.Item label="Pending manual refund amount">
                  {selectedDashboard.refundsAndCancellations.pendingManualRefundAmount} {selectedDashboard.currency}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>

          <div className="split-grid">
            <Card className="ex-panel-card">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Snapshots
              </Typography.Title>
              <Table rowKey="id" pagination={false} columns={snapshotColumns} dataSource={snapshots} />
            </Card>

            <Card className="ex-panel-card">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Diagnostic payload
              </Typography.Title>
              <pre>{JSON.stringify(dashboard, null, 2)}</pre>
            </Card>
          </div>
        </>
      ) : null}
    </Space>
  );
}
