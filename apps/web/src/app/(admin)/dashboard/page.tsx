"use client";

import { Button, Card, Col, Row, Space, Statistic, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth-provider";
import {
  getHealthStatus,
  getObservabilityStatus,
  getReadinessStatus,
  type HealthCheckResponse,
  type ReadinessResponse
} from "../../../lib/api";
import type { ObservabilityStatusResponse } from "@exetron/contracts";

type RemoteStatus = "loading" | "ok" | "degraded" | "offline";

function statusColor(status: RemoteStatus) {
  switch (status) {
    case "ok":
      return "green";
    case "degraded":
      return "gold";
    case "offline":
      return "red";
    default:
      return "blue";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [observability, setObservability] = useState<ObservabilityStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [nextHealth, nextReadiness] = await Promise.all([getHealthStatus(), getReadinessStatus()]);

        if (!active) {
          return;
        }

        setHealth(nextHealth);
        setReadiness(nextReadiness);
        setError(null);

        if (session?.accessToken) {
          try {
            const nextObservability = await getObservabilityStatus(session.accessToken);
            if (active) {
              setObservability(nextObservability);
            }
          } catch {
            if (active) {
              setObservability(null);
            }
          }
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Dashboard load failed.");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  const scope = session?.me?.claims.scope ?? "guest";
  const tenantId = session?.me?.claims.tenantId ?? "cross-tenant";
  const storeCount = session?.me?.claims.storeIds.length ?? 0;
  const permissionCount = session?.me?.permissions.length ?? 0;

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card
        variant="borderless"
        style={{
          background:
            "linear-gradient(135deg, rgba(214, 171, 112, 0.16), rgba(255, 255, 255, 0.94))",
          borderRadius: 24
        }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Tag color={statusColor(scope === "platform_admin" ? "ok" : "degraded")}>Control Plane</Tag>
              <Typography.Title level={2} style={{ margin: 0 }}>
                Exetron platform cockpit
              </Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, maxWidth: 760 }}>
                This shell is the operator entry point for the admin plane. Use it to manage
                tenants, stores, staff, devices and platform actions before the public surfaces
                are exposed.
              </Typography.Paragraph>
              <Space wrap>
                <Button type="primary" onClick={() => router.push("/onboarding")}>
                  Open onboarding
                </Button>
                <Button onClick={() => router.push("/tenants")}>Manage tenants</Button>
                <Button onClick={() => router.push("/devices")}>Manage devices</Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Card variant="borderless">
                  <Statistic title="Scope" value={scope} />
                </Card>
              </Col>
              <Col span={12}>
                <Card variant="borderless">
                  <Statistic title="Tenant" value={tenantId} />
                </Card>
              </Col>
              <Col span={12}>
                <Card variant="borderless">
                  <Statistic title="Stores" value={storeCount} />
                </Card>
              </Col>
              <Col span={12}>
                <Card variant="borderless">
                  <Statistic title="Permissions" value={permissionCount} />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {error ? (
        <Card variant="borderless">
          <Typography.Text type="danger">{error}</Typography.Text>
        </Card>
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card title="Service health" variant="borderless">
            <Space direction="vertical" size={8}>
              <Tag color={statusColor(health?.status === "ok" ? "ok" : "offline")}>
                {health?.status ?? "loading"}
              </Tag>
              <Typography.Text>{health?.service ?? "API"}</Typography.Text>
              <Typography.Text type="secondary">
                Uptime: {health?.uptimeSeconds ?? 0}s
              </Typography.Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Readiness" variant="borderless">
            <Space direction="vertical" size={8}>
              <Tag color={statusColor(readiness?.status === "ok" ? "ok" : "degraded")}>
                {readiness?.status ?? "loading"}
              </Tag>
              <Typography.Text type="secondary">
                Database: {readiness?.dependencies.database ?? "n/a"}
              </Typography.Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Observability boundary" variant="borderless">
            <Space direction="vertical" size={8}>
              <Tag color={statusColor(observability?.status === "configured" ? "ok" : "degraded")}>
                {observability?.status ?? "loading"}
              </Tag>
              <Typography.Text type="secondary">
                Metrics: {observability?.metrics.target ?? "unconfigured"}
              </Typography.Text>
              <Typography.Text type="secondary">
                Tracing: {observability?.tracing.target ?? "unconfigured"}
              </Typography.Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
