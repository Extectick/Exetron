"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import {
  assignFulfillmentCourier,
  getFulfillmentConfig,
  getFulfillmentOrder,
  listFulfillmentDispatchBoard,
  updateFulfillmentEta,
  updateFulfillmentStatus,
  upsertStoreFulfillmentConfig
} from "../../../lib/api";

const fulfillmentStatuses = [
  "PENDING",
  "SCHEDULED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "PICKED_UP",
  "TABLE_ASSIGNED",
  "SERVED"
] as const;

export default function FulfillmentPage() {
  const { session } = useAuth();
  const [storeId, setStoreId] = useState("");
  const [configDraft, setConfigDraft] = useState(
    '{\n  "storeId": "",\n  "enabledModes": ["DELIVERY", "PICKUP", "DINE_IN"],\n  "defaultMode": "DELIVERY",\n  "deliveryZones": [\n    {\n      "code": "central",\n      "name": "Central Zone",\n      "postalCodes": ["630001", "630004"],\n      "fee": "4.50",\n      "etaMinMinutes": 20,\n      "etaMaxMinutes": 40,\n      "slaMinutes": 55,\n      "isActive": true\n    }\n  ],\n  "pickup": {\n    "enabled": true,\n    "leadTimeMinutes": 15,\n    "promisedWindowMinutes": 10,\n    "instructions": "Collect from the pickup counter."\n  },\n  "dineIn": {\n    "enabled": true,\n    "leadTimeMinutes": 12,\n    "tables": [\n      {\n        "code": "T1",\n        "label": "Window T1",\n        "capacity": 4,\n        "isActive": true\n      }\n    ]\n  },\n  "providers": [\n    {\n      "providerKey": "manual-dispatch",\n      "providerType": "MANUAL",\n      "enabled": true\n    }\n  ]\n}'
  );
  const [configJson, setConfigJson] = useState("{}");
  const [dispatchJson, setDispatchJson] = useState("[]");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderProjectionJson, setOrderProjectionJson] = useState("{}");
  const [courierDraft, setCourierDraft] = useState({
    courierName: "Courier One",
    courierPhone: "+79000000001",
    courierExternalId: "courier-1"
  });
  const [etaDraft, setEtaDraft] = useState({
    etaAt: "",
    promisedAt: ""
  });
  const [statusDraft, setStatusDraft] = useState<(typeof fulfillmentStatuses)[number]>(
    "OUT_FOR_DELIVERY"
  );
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!session?.accessToken || !storeId.trim()) {
      return;
    }

    const [config, dispatch] = await Promise.all([
      getFulfillmentConfig(session.accessToken, storeId.trim()),
      listFulfillmentDispatchBoard(session.accessToken, storeId.trim())
    ]);

    setConfigJson(JSON.stringify(config, null, 2));
    setDispatchJson(JSON.stringify(dispatch.items, null, 2));
    setError(null);
  }, [session?.accessToken, storeId]);

  useEffect(() => {
    if (!session?.accessToken || !storeId.trim()) {
      return;
    }

    void loadWorkspace();
  }, [loadWorkspace, session?.accessToken, storeId]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PHASE 14</span>
            <h2>Fulfillment config and dispatch</h2>
            <p>Delivery zones, pickup windows, dine-in tables, courier assignment and ETA/SLA updates.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadWorkspace()}>
            Refresh
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <label className="field">
          <span>Store ID</span>
          <input value={storeId} onChange={(event) => setStoreId(event.target.value)} />
        </label>

        <div className="split-grid">
          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.accessToken || !storeId.trim()) {
                setError("Store ID is required.");
                return;
              }

              try {
                const payload = JSON.parse(configDraft) as Record<string, unknown>;
                void upsertStoreFulfillmentConfig(session.accessToken, {
                  ...(payload as {
                    storeId: string;
                    enabledModes?: Array<"DELIVERY" | "PICKUP" | "DINE_IN">;
                    defaultMode?: "DELIVERY" | "PICKUP" | "DINE_IN";
                    deliveryZones?: Array<{
                      code: string;
                      name: string;
                      postalCodes: string[];
                      fee: string;
                      etaMinMinutes: number;
                      etaMaxMinutes: number;
                      slaMinutes: number;
                      isActive?: boolean;
                    }>;
                    pickup?: {
                      enabled?: boolean;
                      leadTimeMinutes?: number;
                      promisedWindowMinutes?: number;
                      instructions?: string | null;
                    };
                    dineIn?: {
                      enabled?: boolean;
                      leadTimeMinutes?: number;
                      tables?: Array<{
                        code: string;
                        label: string;
                        capacity: number;
                        isActive?: boolean;
                      }>;
                    };
                    providers?: Array<{
                      providerKey: string;
                      providerType?: "MANUAL" | "EXTERNAL_PLACEHOLDER";
                      enabled?: boolean;
                    }>;
                  }),
                  storeId: storeId.trim()
                })
                  .then(() => loadWorkspace())
                  .catch((caughtError) =>
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Fulfillment config save failed."
                    )
                  );
              } catch {
                setError("Fulfillment config JSON must be valid.");
              }
            }}
          >
            <h3 style={{ margin: 0 }}>Store Config Draft</h3>
            <textarea
              rows={22}
              value={configDraft}
              onChange={(event) => setConfigDraft(event.target.value)}
            />
            <button className="primary-button" type="submit">
              Save Fulfillment Config
            </button>
          </form>

          <div className="editor-form">
            <h3 style={{ margin: 0 }}>Current Config</h3>
            <pre>{configJson}</pre>
          </div>
        </div>

        <div className="editor-form">
          <h3 style={{ margin: 0 }}>Dispatch Board</h3>
          <pre>{dispatchJson}</pre>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Operator Actions</span>
            <h2>Selected order</h2>
          </div>
        </div>

        <label className="field">
          <span>Order ID</span>
          <input value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} />
        </label>
        <button
          className="ghost-button"
          onClick={() => {
            if (!session?.accessToken || !selectedOrderId.trim()) {
              setError("Order ID is required.");
              return;
            }

            void getFulfillmentOrder(session.accessToken, selectedOrderId.trim())
              .then((response) => {
                setOrderProjectionJson(JSON.stringify(response, null, 2));
                setError(null);
              })
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error ? caughtError.message : "Order projection load failed."
                )
              );
          }}
        >
          Load Order Projection
        </button>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !selectedOrderId.trim()) {
              setError("Order ID is required.");
              return;
            }

            void assignFulfillmentCourier(session.accessToken, selectedOrderId.trim(), courierDraft)
              .then((response) => {
                setOrderProjectionJson(JSON.stringify(response, null, 2));
                return loadWorkspace();
              })
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error ? caughtError.message : "Courier assignment failed."
                )
              );
          }}
        >
          <h3 style={{ margin: 0 }}>Assign Courier</h3>
          <label className="field">
            <span>Courier Name</span>
            <input
              value={courierDraft.courierName}
              onChange={(event) =>
                setCourierDraft((current) => ({ ...current, courierName: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Courier Phone</span>
            <input
              value={courierDraft.courierPhone}
              onChange={(event) =>
                setCourierDraft((current) => ({ ...current, courierPhone: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Courier External ID</span>
            <input
              value={courierDraft.courierExternalId}
              onChange={(event) =>
                setCourierDraft((current) => ({
                  ...current,
                  courierExternalId: event.target.value
                }))
              }
            />
          </label>
          <button className="primary-button" type="submit">
            Save Courier Assignment
          </button>
        </form>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !selectedOrderId.trim()) {
              setError("Order ID is required.");
              return;
            }

            void updateFulfillmentEta(session.accessToken, selectedOrderId.trim(), etaDraft)
              .then((response) => {
                setOrderProjectionJson(JSON.stringify(response, null, 2));
                return loadWorkspace();
              })
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error ? caughtError.message : "ETA update failed."
                )
              );
          }}
        >
          <h3 style={{ margin: 0 }}>ETA / Promised Time</h3>
          <label className="field">
            <span>ETA ISO timestamp</span>
            <input value={etaDraft.etaAt} onChange={(event) => setEtaDraft((current) => ({ ...current, etaAt: event.target.value }))} />
          </label>
          <label className="field">
            <span>Promised ISO timestamp</span>
            <input
              value={etaDraft.promisedAt}
              onChange={(event) =>
                setEtaDraft((current) => ({ ...current, promisedAt: event.target.value }))
              }
            />
          </label>
          <button className="primary-button" type="submit">
            Update ETA
          </button>
        </form>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !selectedOrderId.trim()) {
              setError("Order ID is required.");
              return;
            }

            void updateFulfillmentStatus(session.accessToken, selectedOrderId.trim(), {
              status: statusDraft
            })
              .then((response) => {
                setOrderProjectionJson(JSON.stringify(response, null, 2));
                return loadWorkspace();
              })
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error ? caughtError.message : "Fulfillment status update failed."
                )
              );
          }}
        >
          <h3 style={{ margin: 0 }}>Fulfillment Status</h3>
          <label className="field">
            <span>Status</span>
            <select
              value={statusDraft}
              onChange={(event) =>
                setStatusDraft(event.target.value as (typeof fulfillmentStatuses)[number])
              }
            >
              {fulfillmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            Update Fulfillment Status
          </button>
        </form>

        <div className="editor-form">
          <h3 style={{ margin: 0 }}>Order Projection</h3>
          <pre>{orderProjectionJson}</pre>
        </div>
      </section>
    </div>
  );
}
