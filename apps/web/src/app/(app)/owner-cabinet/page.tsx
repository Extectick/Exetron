"use client";

import type { AnalyticsSnapshotDto, OwnerCabinetDashboardDto } from "@exetron/contracts";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import {
  createAnalyticsSnapshot,
  getOwnerCabinetDashboard,
  listAnalyticsSnapshots
} from "../../../lib/api";

function defaultPeriodStart(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function endOfDay(value: string): string {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function startOfDay(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export default function OwnerCabinetPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [dashboard, setDashboard] = useState<OwnerCabinetDashboardDto | null>(null);
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshotDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveTenantId = session?.me?.claims.tenantId ?? tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const loadOwnerCabinet = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    setBusy(true);
    try {
      const [dashboardResponse, snapshotResponse] = await Promise.all([
        getOwnerCabinetDashboard(session.accessToken, {
          tenantId: effectiveTenantId,
          storeId: effectiveStoreId,
          periodStart: startOfDay(periodStart),
          periodEnd: endOfDay(periodEnd)
        }),
        listAnalyticsSnapshots(session.accessToken, {
          tenantId: effectiveTenantId,
          storeId: effectiveStoreId,
          periodStart: startOfDay(periodStart),
          periodEnd: endOfDay(periodEnd)
        })
      ]);

      setDashboard(dashboardResponse);
      setSnapshots(snapshotResponse.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Owner cabinet load failed.");
    } finally {
      setBusy(false);
    }
  }, [effectiveStoreId, effectiveTenantId, periodEnd, periodStart, session?.accessToken]);

  useEffect(() => {
    if (!effectiveTenantId || !session?.accessToken) {
      return;
    }

    void loadOwnerCabinet();
  }, [effectiveTenantId, effectiveStoreId, loadOwnerCabinet, periodStart, periodEnd, session?.accessToken]);

  return (
    <div className="stack-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PHASE 8</span>
            <h2>Owner cabinet</h2>
            <p>Revenue, store comparison, top products and cancellation pressure by period.</p>
          </div>
          <button className="ghost-button" onClick={() => void loadOwnerCabinet()} disabled={busy}>
            Refresh
          </button>
        </div>

        <div className="editor-form">
          {!session?.me?.claims.tenantId ? (
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
            <span>Period start</span>
            <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </label>
          <label className="field">
            <span>Period end</span>
            <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </label>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      {dashboard ? (
        <>
          <section className="dashboard-grid">
            <article className="stat-card">
              <span className="eyebrow">Revenue</span>
              <strong>
                {dashboard.revenue} {dashboard.currency}
              </strong>
              <p className="muted-copy">
                Paid orders: {dashboard.paidOrders} of {dashboard.totalOrders}
              </p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Average Order</span>
              <strong>
                {dashboard.averageOrderValue} {dashboard.currency}
              </strong>
              <p className="muted-copy">Calculated from paid orders in the selected period.</p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Cancelled</span>
              <strong>{dashboard.refundsAndCancellations.cancelledOrders}</strong>
              <p className="muted-copy">
                Pending manual refunds: {dashboard.refundsAndCancellations.pendingManualRefunds}
              </p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Refund Exposure</span>
              <strong>
                {dashboard.refundsAndCancellations.pendingManualRefundAmount} {dashboard.currency}
              </strong>
              <p className="muted-copy">Orders cancelled with `PENDING_MANUAL` refund status.</p>
            </article>
          </section>

          <div className="split-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Store Comparison</span>
                  <h2>Revenue by store</h2>
                </div>
              </div>
              <div className="table-frame">
                <table>
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Paid Orders</th>
                      <th>Revenue</th>
                      <th>Average Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.revenueByStore.map((store) => (
                      <tr key={store.storeId}>
                        <td>
                          {store.storeName}
                          <br />
                          <span className="muted-copy">{store.storeCode}</span>
                        </td>
                        <td>{store.paidOrders}</td>
                        <td>
                          {store.revenue} {dashboard.currency}
                        </td>
                        <td>
                          {store.averageOrderValue} {dashboard.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Top Products</span>
                  <h2>Best sellers</h2>
                </div>
              </div>
              <div className="table-frame">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.topProducts.map((product) => (
                      <tr key={product.productId}>
                        <td>
                          {product.productName}
                          <br />
                          <span className="muted-copy">{product.productCode ?? "n/a"}</span>
                        </td>
                        <td>{product.quantity}</td>
                        <td>
                          {product.revenue} {dashboard.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="split-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Channels</span>
                  <h2>Revenue by channel</h2>
                </div>
              </div>
              <div className="table-frame">
                <table>
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Paid Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.channelSummary.map((channel) => (
                      <tr key={channel.channel}>
                        <td>{channel.channel}</td>
                        <td>{channel.paidOrders}</td>
                        <td>
                          {channel.revenue} {dashboard.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Snapshots</span>
                  <h2>Report snapshots</h2>
                </div>
                <button
                  className="mini-button"
                  onClick={() => {
                    if (!session?.accessToken) {
                      return;
                    }

                    void createAnalyticsSnapshot(session.accessToken, {
                      tenantId: effectiveTenantId,
                      storeId: effectiveStoreId ?? null,
                      periodStart: startOfDay(periodStart),
                      periodEnd: endOfDay(periodEnd)
                    })
                      .then(() => loadOwnerCabinet())
                      .catch((caughtError) =>
                        setError(
                          caughtError instanceof Error
                            ? caughtError.message
                            : "Analytics snapshot creation failed."
                        )
                      );
                  }}
                >
                  Save Snapshot
                </button>
              </div>
              <pre>{JSON.stringify(snapshots, null, 2)}</pre>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
