"use client";

import type { KitchenBoardEntryDto } from "@exetron/contracts";
import { io } from "socket.io-client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl, listBoardOrders } from "../../../lib/api";

export default function OrderBoardPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState<KitchenBoardEntryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const sessionStoreId = session?.me?.user.storeIds[0] ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || sessionStoreId;

  const loadBoard = useCallback(async () => {
    if (!session?.accessToken || !effectiveStoreId) {
      return;
    }

    try {
      const response = await listBoardOrders(session.accessToken, {
        tenantId: effectiveTenantId || undefined,
        storeId: effectiveStoreId
      });
      setItems(response.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Board load failed.");
    }
  }, [effectiveStoreId, effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    if (!sessionStoreId) {
      return;
    }

    setStoreId((current) => current || sessionStoreId);
  }, [sessionStoreId]);

  useEffect(() => {
    if (!session?.accessToken || !effectiveStoreId || !(sessionTenantId || effectiveTenantId)) {
      return;
    }

    void loadBoard();
  }, [loadBoard, session?.accessToken, effectiveStoreId, effectiveTenantId, sessionTenantId]);

  useEffect(() => {
    if (!session?.accessToken || !effectiveStoreId || !(sessionTenantId || effectiveTenantId)) {
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
  }, [loadBoard, session?.accessToken, effectiveStoreId, effectiveTenantId, sessionTenantId]);

  return (
    <div className="stack-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Order Board</span>
            <h2>Realtime customer-facing board feed</h2>
            <p>Board state is derived from kitchen tickets and synced order statuses.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadBoard()}>
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
        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      <section className="workspace-grid">
        {items.map((entry) => (
          <article className="panel" key={entry.orderId}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">{entry.boardStatus}</span>
                <h2>{entry.number}</h2>
                <p>{entry.customerName ?? "Walk-in guest"}</p>
              </div>
            </div>
            <p>Order status: {entry.orderStatus}</p>
            <p>Channel: {entry.channel}</p>
            <p>Tickets: {entry.ticketStatuses.map((ticket) => `${ticket.stationKey}:${ticket.status}`).join(", ")}</p>
          </article>
        ))}
        {!items.length ? (
          <article className="panel">
            <p>No board entries yet.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
