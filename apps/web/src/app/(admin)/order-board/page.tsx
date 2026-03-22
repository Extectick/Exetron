"use client";

import type { KitchenBoardEntryDto } from "@exetron/contracts";
import { Alert, Button, Card, Space, Tag, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl, listBoardOrders } from "../../../lib/api";
import { io } from "socket.io-client";

export default function OrderBoardPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState<KitchenBoardEntryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const sessionStoreId = session?.me?.user.storeIds[0] ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || sessionStoreId;

  const loadBoard = useCallback(async () => {
    if (!session?.accessToken || !effectiveStoreId) {
      return;
    }

    setLoading(true);
    try {
      const response = await listBoardOrders(session.accessToken, {
        tenantId: effectiveTenantId || undefined,
        storeId: effectiveStoreId
      });
      setItems(response.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Board load failed.");
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
    void loadBoard();
  }, [loadBoard]);

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
      void loadBoard();
    });

    return () => {
      socket.disconnect();
    };
  }, [effectiveStoreId, effectiveTenantId, loadBoard, session?.accessToken]);

  const groupedItems = useMemo(
    () =>
      items.reduce<Record<string, KitchenBoardEntryDto[]>>((accumulator, entry) => {
        accumulator[entry.boardStatus] = [...(accumulator[entry.boardStatus] ?? []), entry];
        return accumulator;
      }, {}),
    [items]
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Operations</span>
            <h2>Order board</h2>
            <p>Realtime board entries grouped by board status for public display and operators.</p>
          </div>
          <Button onClick={() => void loadBoard()} loading={loading}>
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

      {Object.keys(groupedItems).length ? (
        Object.entries(groupedItems).map(([boardStatus, entries]) => (
          <Card className="ex-panel-card" key={boardStatus}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Board status</span>
                <h2>{boardStatus}</h2>
              </div>
            </div>
            <div className="workspace-grid">
              {entries.map((entry) => (
                <article className="stat-card" key={entry.orderId}>
                  <span className="eyebrow">{entry.channel}</span>
                  <strong>{entry.number}</strong>
                  <p className="muted-copy">{entry.customerName ?? "Walk-in guest"}</p>
                  <p>Order status: {entry.orderStatus}</p>
                  <p>Tickets: {entry.ticketStatuses.map((ticket) => `${ticket.stationKey}:${ticket.status}`).join(", ")}</p>
                  <Tag>{entry.boardStatus}</Tag>
                </article>
              ))}
            </div>
          </Card>
        ))
      ) : (
        <Card className="ex-panel-card">
          <Typography.Paragraph type="secondary">
            No board entries yet for the selected scope.
          </Typography.Paragraph>
        </Card>
      )}
    </Space>
  );
}
