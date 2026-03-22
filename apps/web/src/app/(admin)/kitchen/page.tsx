"use client";

import type { KitchenTicketDto } from "@exetron/contracts";
import { Alert, Button, Card, Collapse, Space, Tag, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl, listKitchenTickets, transitionKitchenTicket } from "../../../lib/api";
import { io } from "socket.io-client";

const transitions: Record<string, Array<"IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED">> = {
  NEW: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: []
};

export default function KitchenPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [tickets, setTickets] = useState<KitchenTicketDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const sessionStoreId = session?.me?.user.storeIds[0] ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || sessionStoreId;

  const loadTickets = useCallback(async () => {
    if (!session?.accessToken || !effectiveStoreId) {
      return;
    }

    setLoading(true);
    try {
      const response = await listKitchenTickets(session.accessToken, {
        tenantId: effectiveTenantId || undefined,
        storeId: effectiveStoreId
      });
      setTickets(response.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kitchen load failed.");
    } finally {
      setLoading(false);
    }
  }, [effectiveStoreId, effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    if (sessionStoreId) {
      setStoreId((current) => current || sessionStoreId);
    }
  }, [sessionStoreId]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!session?.accessToken || !effectiveStoreId) {
      return;
    }

    const socket = io(apiBaseUrl, {
      transports: ["websocket"],
      auth: {
        accessToken: session.accessToken,
        tenantId: effectiveTenantId || undefined,
        storeId: effectiveStoreId
      }
    });

    socket.on("operations.event", () => {
      void loadTickets();
    });

    return () => {
      socket.disconnect();
    };
  }, [effectiveStoreId, effectiveTenantId, loadTickets, session?.accessToken]);

  const groupedTickets = useMemo(() => {
    return tickets.reduce<Record<string, KitchenTicketDto[]>>((accumulator, ticket) => {
      accumulator[ticket.stationKey] = [...(accumulator[ticket.stationKey] ?? []), ticket];
      return accumulator;
    }, {});
  }, [tickets]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Operations</span>
            <h2>Kitchen queue</h2>
            <p>Realtime tickets grouped by station with direct state transitions.</p>
          </div>
          <Button onClick={() => void loadTickets()} loading={loading}>
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
        </div>

        {error ? <Alert type="error" showIcon message={error} className="mt-4" /> : null}
      </Card>

      {Object.keys(groupedTickets).length ? (
        Object.entries(groupedTickets).map(([stationKey, stationTickets]) => (
          <Card className="ex-panel-card" key={stationKey}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Station</span>
                <h2>{stationKey}</h2>
              </div>
            </div>
            <Collapse
              items={stationTickets.map((ticket) => ({
                key: ticket.id,
                label: (
                  <Space>
                    <Tag color="blue">{ticket.status}</Tag>
                    <Typography.Text strong>{ticket.displayNumber}</Typography.Text>
                    <Typography.Text type="secondary">{ticket.itemCount} items</Typography.Text>
                  </Space>
                ),
                children: (
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <pre>{JSON.stringify(ticket.items.map((item) => item.snapshot), null, 2)}</pre>
                    <Space wrap>
                      {transitions[ticket.status].map((toStatus) => (
                        <Button
                          key={toStatus}
                          onClick={() => {
                            if (!session?.accessToken) {
                              return;
                            }

                            void transitionKitchenTicket(session.accessToken, ticket.id, { toStatus })
                              .then(() => loadTickets())
                              .catch((caughtError) =>
                                setError(
                                  caughtError instanceof Error
                                    ? caughtError.message
                                    : "Kitchen transition failed."
                                )
                              );
                          }}
                        >
                          {toStatus}
                        </Button>
                      ))}
                    </Space>
                  </Space>
                )
              }))}
            />
          </Card>
        ))
      ) : (
        <Card className="ex-panel-card">
          <Typography.Paragraph type="secondary">
            No kitchen tickets yet for the selected scope.
          </Typography.Paragraph>
        </Card>
      )}
    </Space>
  );
}
