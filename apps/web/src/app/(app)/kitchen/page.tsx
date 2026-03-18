"use client";

import type { KitchenTicketDto } from "@exetron/contracts";
import { io } from "socket.io-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl, listKitchenTickets, transitionKitchenTicket } from "../../../lib/api";

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
  const [busy, setBusy] = useState(false);

  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const sessionStoreId = session?.me?.user.storeIds[0] ?? "";
  const effectiveTenantId = sessionTenantId || tenantId.trim();
  const effectiveStoreId = storeId.trim() || sessionStoreId;

  const loadTickets = useCallback(async () => {
    if (!session?.accessToken || !effectiveStoreId) {
      return;
    }

    setBusy(true);
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
      setBusy(false);
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

    void loadTickets();
  }, [loadTickets, session?.accessToken, effectiveStoreId, effectiveTenantId, sessionTenantId]);

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
      void loadTickets();
    });

    return () => {
      socket.disconnect();
    };
  }, [loadTickets, session?.accessToken, effectiveStoreId, effectiveTenantId, sessionTenantId]);

  const groupedTickets = useMemo(() => {
    return tickets.reduce<Record<string, KitchenTicketDto[]>>((accumulator, ticket) => {
      accumulator[ticket.stationKey] = [...(accumulator[ticket.stationKey] ?? []), ticket];
      return accumulator;
    }, {});
  }, [tickets]);

  return (
    <div className="stack-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Kitchen Runtime</span>
            <h2>Station queue</h2>
            <p>Realtime kitchen tickets grouped by station for the selected store.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadTickets()} disabled={busy}>
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

      {Object.entries(groupedTickets).map(([stationKey, stationTickets]) => (
        <section className="panel" key={stationKey}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Station</span>
              <h2>{stationKey}</h2>
            </div>
          </div>
          <div className="workspace-grid">
            {stationTickets.map((ticket) => (
              <article className="panel" key={ticket.id}>
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">{ticket.status}</span>
                    <h2>{ticket.displayNumber}</h2>
                    <p>{ticket.itemCount} item(s)</p>
                  </div>
                </div>
                <pre>{JSON.stringify(ticket.items.map((item) => item.snapshot), null, 2)}</pre>
                <div className="pill-row">
                  {transitions[ticket.status].map((toStatus) => (
                    <button
                      className="mini-button"
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
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {!tickets.length ? (
        <section className="panel">
          <p>No kitchen tickets yet.</p>
        </section>
      ) : null}
    </div>
  );
}
