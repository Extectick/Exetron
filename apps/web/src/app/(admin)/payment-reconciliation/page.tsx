"use client";

import type { PaymentReconciliationSummaryDto } from "@exetron/contracts";
import { Alert, Card, Descriptions, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { getPaymentReconciliationSummary } from "../../../lib/api";

export default function PaymentReconciliationPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [summary, setSummary] = useState<PaymentReconciliationSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const loadSummary = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    setLoading(true);
    try {
      const response = await getPaymentReconciliationSummary(session.accessToken, {
        tenantId: effectiveTenantId,
        storeId: effectiveStoreId
      });
      setSummary(response);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Payment reconciliation load failed."
      );
    } finally {
      setLoading(false);
    }
  }, [effectiveStoreId, effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

const statusColumns: ColumnsType<PaymentReconciliationSummaryDto["intentsByStatus"][number]> = [
    { title: "Status", dataIndex: "status", render: (value: unknown) => <Tag>{String(value)}</Tag> },
    { title: "Count", dataIndex: "count" },
    { title: "Total", dataIndex: "totalAmount" },
    { title: "Paid", dataIndex: "paidAmount" }
  ];

  const methodColumns: ColumnsType<PaymentReconciliationSummaryDto["allocationsByMethod"][number]> = [
    { title: "Method", dataIndex: "method" },
    { title: "Status", dataIndex: "status", render: (value: unknown) => <Tag>{String(value)}</Tag> },
    { title: "Count", dataIndex: "count" },
    { title: "Amount", dataIndex: "amount" }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Operations</span>
            <h2>Payment reconciliation</h2>
            <p>Summaries grouped by intent status and allocation method.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadSummary()} disabled={loading}>
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
        </div>
        {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}
      </Card>

      {summary ? (
        <>
          <div className="workspace-grid">
            {[
              { label: "Generated at", value: new Date(summary.generatedAt).toLocaleString() },
              { label: "Tenant", value: summary.tenantId ?? "n/a" },
              { label: "Store", value: summary.storeId ?? "tenant-wide" }
            ].map((entry) => (
              <article className="stat-card" key={entry.label}>
                <span className="eyebrow">{entry.label}</span>
                <strong>{entry.value}</strong>
              </article>
            ))}
          </div>

          <div className="split-grid">
            <Card className="ex-panel-card">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Intents by status
              </Typography.Title>
              <Table
                rowKey="status"
                pagination={false}
                columns={statusColumns}
                dataSource={summary.intentsByStatus}
              />
            </Card>

            <Card className="ex-panel-card">
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Allocations by method
              </Typography.Title>
              <Table
                rowKey={(record) => `${record.method}-${record.status}`}
                pagination={false}
                columns={methodColumns}
                dataSource={summary.allocationsByMethod}
              />
            </Card>
          </div>

          <Card className="ex-panel-card">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Intent total">{summary.intentsByStatus.length}</Descriptions.Item>
              <Descriptions.Item label="Allocation series">{summary.allocationsByMethod.length}</Descriptions.Item>
            </Descriptions>
            <pre style={{ marginTop: 16 }}>{JSON.stringify(summary, null, 2)}</pre>
          </Card>
        </>
      ) : (
        <Card className="ex-panel-card">
          <Typography.Paragraph type="secondary">
            No reconciliation summary loaded yet.
          </Typography.Paragraph>
        </Card>
      )}
    </Space>
  );
}
