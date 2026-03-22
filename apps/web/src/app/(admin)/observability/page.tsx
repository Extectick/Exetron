"use client";

import type { ObservabilityStatusResponse } from "@exetron/contracts";
import { Alert, Card, Descriptions, Space, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { getObservabilityStatus } from "../../../lib/api";

export default function ObservabilityPage() {
  const { session } = useAuth();
  const [status, setStatus] = useState<ObservabilityStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    try {
      const response = await getObservabilityStatus(session.accessToken);
      setStatus(response);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Observability status load failed."
      );
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Control</span>
            <h2>Observability boundary</h2>
            <p>External metrics, tracing and alerts wiring visibility without a collector rollout.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadStatus()} disabled={loading}>
            Refresh
          </button>
        </div>
        {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}
      </Card>

      <Card className="ex-panel-card">
        {status ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Overall">
                <Tag color={status.status === "configured" ? "green" : "gold"}>{status.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Metrics">
                <pre>{JSON.stringify(status.metrics, null, 2)}</pre>
              </Descriptions.Item>
              <Descriptions.Item label="Tracing">
                <pre>{JSON.stringify(status.tracing, null, 2)}</pre>
              </Descriptions.Item>
              <Descriptions.Item label="Alerts">
                <pre>{JSON.stringify(status.alerts, null, 2)}</pre>
              </Descriptions.Item>
              <Descriptions.Item label="Checked at">{new Date(status.timestamp).toLocaleString()}</Descriptions.Item>
            </Descriptions>
            <Alert
              type={status.status === "configured" ? "success" : "warning"}
              showIcon
              message={
                status.status === "configured"
                  ? "Operational export channels are wired and visible to the admin shell."
                  : "One or more export channels are still partial. Review env wiring before rollout."
              }
            />
          </Space>
        ) : (
          <Alert type="info" showIcon message="No observability status loaded yet." />
        )}
      </Card>
    </Space>
  );
}
