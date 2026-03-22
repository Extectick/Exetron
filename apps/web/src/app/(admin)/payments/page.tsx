"use client";

import type { PaymentAttemptDto, PaymentIntentDto, PaymentIntentListItemDto } from "@exetron/contracts";
import { Alert, Button, Card, Descriptions, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import {
  cancelPaymentIntent,
  getPaymentIntent,
  listPaymentAttempts,
  listPaymentIntents
} from "../../../lib/api";

const statusColor: Record<string, string> = {
  PENDING: "gold",
  PARTIALLY_PAID: "blue",
  COMPLETED: "green",
  FAILED: "red",
  CANCELLED: "default"
};

function isPaymentStatus(value: unknown): value is
  | "PENDING"
  | "PARTIALLY_PAID"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED" {
  return (
    value === "PENDING" ||
    value === "PARTIALLY_PAID" ||
    value === "COMPLETED" ||
    value === "FAILED" ||
    value === "CANCELLED"
  );
}

function isPaymentChannel(value: unknown): value is "ADMIN" | "POS" | "KIOSK" | "DELIVERY" {
  return value === "ADMIN" || value === "POS" || value === "KIOSK" || value === "DELIVERY";
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

function timestampValue(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleString() : "n/a";
}

const paymentColumns: ColumnsType<PaymentIntentListItemDto> = [
  { title: "Order", dataIndex: "orderNumber" },
  { title: "Channel", dataIndex: "channel" },
  {
    title: "Status",
    dataIndex: "status",
    render: (value: unknown) => {
      const status = textValue(value, "PENDING");
      return <Tag color={statusColor[status] ?? "default"}>{status}</Tag>;
    }
  },
  { title: "Total", dataIndex: "totalAmount" },
  { title: "Paid", dataIndex: "paidAmount" },
  { title: "Customer", dataIndex: "customerName", render: (value: unknown) => textValue(value, "walk-in") },
  {
    title: "Allocations",
    dataIndex: "allocationStatuses",
    render: (value: unknown) => (Array.isArray(value) ? value.map((item) => textValue(item)).join(", ") : "n/a")
  },
  { title: "Updated", dataIndex: "updatedAt", render: (value: unknown) => timestampValue(value) }
];

const attemptColumns: ColumnsType<PaymentAttemptDto> = [
  { title: "Started", dataIndex: "startedAt", render: (value: unknown) => timestampValue(value) },
  { title: "Provider", dataIndex: "providerKey" },
  { title: "Method", dataIndex: "method" },
  { title: "Status", dataIndex: "status" },
  { title: "External Ref", dataIndex: "externalReference", render: (value: unknown) => textValue(value) },
  { title: "Error", dataIndex: "errorMessage", render: (value: unknown) => textValue(value) }
];

export default function PaymentsPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [intents, setIntents] = useState<PaymentIntentListItemDto[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<PaymentIntentDto | null>(null);
  const [attempts, setAttempts] = useState<PaymentAttemptDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyIntentId, setBusyIntentId] = useState<string | null>(null);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const loadIntents = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    setLoading(true);
    try {
      const response = await listPaymentIntents(session.accessToken, {
        tenantId: effectiveTenantId,
        storeId: effectiveStoreId,
        status: isPaymentStatus(status) ? status : undefined,
        channel: isPaymentChannel(channel) ? channel : undefined
      });
      setIntents(response.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Payments load failed.");
    } finally {
      setLoading(false);
    }
  }, [channel, effectiveStoreId, effectiveTenantId, session?.accessToken, status]);

  const inspectIntent = useCallback(
    async (intentId: string) => {
      if (!session?.accessToken) {
        return;
      }

      try {
        const [intent, attemptsResponse] = await Promise.all([
          getPaymentIntent(session.accessToken, intentId),
          listPaymentAttempts(session.accessToken, intentId)
        ]);
        setSelectedIntent(intent);
        setAttempts(attemptsResponse.items);
        setError(null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Payment inspection failed.");
      }
    },
    [session?.accessToken]
  );

  useEffect(() => {
    void loadIntents();
  }, [loadIntents]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Operations</span>
            <h2>Payments</h2>
            <p>Inspect intent state, allocations and attempts without leaving the control plane.</p>
          </div>
          <Button onClick={() => void loadIntents()} loading={loading}>
            Refresh
          </Button>
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
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
          <label className="field">
            <span>Channel</span>
            <select value={channel} onChange={(event) => setChannel(event.target.value)}>
              <option value="">All</option>
              <option value="ADMIN">ADMIN</option>
              <option value="POS">POS</option>
              <option value="KIOSK">KIOSK</option>
              <option value="DELIVERY">DELIVERY</option>
            </select>
          </label>
        </div>
        {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}
      </Card>

      <div className="split-grid">
        <Card className="ex-panel-card">
          <Table
            rowKey="id"
            columns={paymentColumns}
            dataSource={intents}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            onRow={(record: PaymentIntentListItemDto) => ({
              onClick: () => void inspectIntent(record.id)
            })}
            scroll={{ x: 1100 }}
          />
        </Card>

        <Card className="ex-panel-card">
          {selectedIntent ? (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Descriptions bordered column={1}>
                <Descriptions.Item label="Intent ID">{selectedIntent.id}</Descriptions.Item>
                <Descriptions.Item label="Order ID">{selectedIntent.orderId}</Descriptions.Item>
                <Descriptions.Item label="Channel">{selectedIntent.channel}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusColor[selectedIntent.status] ?? "default"}>{selectedIntent.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Amounts">
                  {selectedIntent.paidAmount} / {selectedIntent.totalAmount}
                </Descriptions.Item>
                <Descriptions.Item label="Device">{textValue(selectedIntent.deviceId)}</Descriptions.Item>
                <Descriptions.Item label="POS session">{textValue(selectedIntent.posSessionId)}</Descriptions.Item>
                <Descriptions.Item label="Shift">{textValue(selectedIntent.shiftId)}</Descriptions.Item>
              </Descriptions>
              <Space>
                {selectedIntent.status !== "CANCELLED" && selectedIntent.status !== "COMPLETED" ? (
                  <Button
                    danger
                    onClick={() => {
                      if (!session?.accessToken) {
                        return;
                      }

                      setBusyIntentId(selectedIntent.id);
                      void cancelPaymentIntent(session.accessToken, selectedIntent.id, { reason: "Admin action" })
                        .then((updated) => {
                          setSelectedIntent(updated);
                          return loadIntents();
                        })
                        .catch((caughtError) =>
                          setError(
                            caughtError instanceof Error
                              ? caughtError.message
                              : "Payment cancellation failed."
                          )
                        )
                        .finally(() => setBusyIntentId(null));
                    }}
                    loading={busyIntentId === selectedIntent.id}
                  >
                    Cancel intent
                  </Button>
                ) : null}
              </Space>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Allocations
              </Typography.Title>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={selectedIntent.allocations}
                columns={[
                  { title: "Method", dataIndex: "method" },
                  { title: "Amount", dataIndex: "amount" },
                  { title: "Status", dataIndex: "status" },
                  { title: "Provider", dataIndex: "providerKey", render: (value: unknown) => textValue(value) },
                  { title: "External Ref", dataIndex: "externalReference", render: (value: unknown) => textValue(value) }
                ]}
              />
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Attempts
              </Typography.Title>
              <Table rowKey="id" pagination={false} dataSource={attempts} columns={attemptColumns} />
            </Space>
          ) : (
            <Typography.Paragraph type="secondary">
              Select a payment intent to inspect allocations and provider attempts.
            </Typography.Paragraph>
          )}
        </Card>
      </div>
    </Space>
  );
}
