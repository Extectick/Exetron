"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStorefrontOrderTracking } from "../../../lib/api";

interface OrderTrackingPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState("");
  const [tracking, setTracking] = useState<Awaited<
    ReturnType<typeof getStorefrontOrderTracking>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trackingToken = searchParams.get("token") ?? "";

  useEffect(() => {
    void params.then((resolved) => setOrderId(resolved.orderId));
  }, [params]);

  useEffect(() => {
    if (!orderId || !trackingToken) {
      return;
    }

    void getStorefrontOrderTracking(orderId, trackingToken)
      .then((response) => {
        setTracking(response);
        setError(null);
      })
      .catch((caughtError) =>
        setError(caughtError instanceof Error ? caughtError.message : "Tracking load failed.")
      );
  }, [orderId, trackingToken]);

  if (!tracking) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Order Tracking</h1>
        <p>{error ?? "Loading tracking..."}</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff6f0 0%, #ffffff 100%)",
        color: "#1a1a1a",
        padding: 24
      }}
    >
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gap: 20
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 18px 50px rgba(0,0,0,0.06)"
          }}
        >
          <p style={{ margin: "0 0 8px", color: "#d94f30" }}>Storefront Tracking</p>
          <h1 style={{ margin: 0 }}>{tracking.order.number}</h1>
          <p style={{ marginBottom: 0, opacity: 0.72 }}>
            Status: {tracking.order.status} · Total: {tracking.order.total}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)"
          }}
        >
          <section
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 20,
              display: "grid",
              gap: 16
            }}
          >
            <div>
              <p style={{ margin: "0 0 6px", color: "#d94f30" }}>Timeline</p>
              <h2 style={{ margin: 0 }}>Order events</h2>
            </div>
            {tracking.events.map((event) => (
              <article
                key={event.id}
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 16,
                  padding: 14,
                  display: "grid",
                  gap: 6
                }}
              >
                <strong>{event.type}</strong>
                <span style={{ opacity: 0.68 }}>{event.createdAt}</span>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </article>
            ))}
          </section>

          <aside
            style={{
              display: "grid",
              gap: 20,
              alignSelf: "start"
            }}
          >
            <section
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: 20,
                display: "grid",
                gap: 12
              }}
            >
              <div>
                <p style={{ margin: "0 0 6px", color: "#d94f30" }}>Customer</p>
                <h2 style={{ margin: 0 }}>{tracking.order.customerName ?? "Guest order"}</h2>
              </div>
              <p style={{ margin: 0, opacity: 0.72 }}>
                Phone: {tracking.order.customerPhone ?? "Not provided"}
              </p>
              <p style={{ margin: 0, opacity: 0.72 }}>
                Channel: {tracking.order.channel}
              </p>
            </section>

            <section
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: 20,
                display: "grid",
                gap: 12
              }}
            >
              <div>
                <p style={{ margin: "0 0 6px", color: "#d94f30" }}>Notifications</p>
                <h2 style={{ margin: 0 }}>Queued customer updates</h2>
              </div>
              {tracking.notifications.length ? (
                tracking.notifications.map((notification) => (
                  <div
                    key={`${notification.type}-${notification.createdAt}`}
                    style={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 14,
                      padding: 12,
                      display: "grid",
                      gap: 4
                    }}
                  >
                    <strong>{notification.templateKey ?? notification.type}</strong>
                    <span style={{ opacity: 0.68 }}>{notification.createdAt}</span>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, opacity: 0.68 }}>
                  No customer notification events are queued yet.
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
