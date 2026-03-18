"use client";

import type { CompiledCatalogProductDto, KioskBootstrapResponse } from "@exetron/contracts";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getKioskBootstrap, kioskCheckout } from "../../../lib/api";

interface KioskPageProps {
  params: Promise<{
    deviceId: string;
  }>;
}

interface CartLine {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  quantity: number;
  unitPrice: string;
}

export default function KioskDevicePage({ params }: KioskPageProps) {
  const searchParams = useSearchParams();
  const [deviceId, setDeviceId] = useState("");
  const [bootstrap, setBootstrap] = useState<KioskBootstrapResponse | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "QR">("CARD");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const kioskAccessToken = searchParams.get("token") ?? "";

  useEffect(() => {
    void params.then((resolved) => setDeviceId(resolved.deviceId));
  }, [params]);

  useEffect(() => {
    if (!deviceId) {
      return;
    }

    if (!kioskAccessToken) {
      setBootstrap(null);
      setError("Missing kiosk access token in URL.");
      return;
    }

    setBusy(true);
    void getKioskBootstrap(deviceId, kioskAccessToken)
      .then((response) => {
        setBootstrap(response);
        const firstMethod = response.rules.allowedPaymentMethods[0] ?? "CARD";
        setPaymentMethod(firstMethod);
        setError(null);
      })
      .catch((caughtError) =>
        setError(caughtError instanceof Error ? caughtError.message : "Kiosk bootstrap failed.")
      )
      .finally(() => setBusy(false));
  }, [deviceId, kioskAccessToken]);

  const products = useMemo(() => {
    if (!bootstrap) {
      return [] as Array<CompiledCatalogProductDto & { categoryName: string }>;
    }

    return [
      ...bootstrap.catalog.categories.flatMap((category) =>
        category.products.map((product) => ({
          ...product,
          categoryName: category.name
        }))
      ),
      ...bootstrap.catalog.uncategorizedProducts.map((product) => ({
        ...product,
        categoryName: "More"
      }))
    ];
  }, [bootstrap]);

  const cartTotal = useMemo(() => {
    return cart
      .reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
      .toFixed(2);
  }, [cart]);

  function addProduct(product: CompiledCatalogProductDto & { categoryName: string }) {
    const variant = product.variants[0] ?? null;
    const key = `${product.id}:${variant?.id ?? "product"}`;
    const unitPrice = variant?.effectivePrice ?? product.effectivePrice ?? "0.00";

    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }

      return [
        ...current,
        {
          key,
          productId: product.id,
          variantId: variant?.id ?? null,
          name: `${product.name}${variant ? ` · ${variant.name}` : ""}`,
          quantity: 1,
          unitPrice
        }
      ];
    });
  }

  async function submitOrder() {
    if (!bootstrap || !cart.length) {
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const response = await kioskCheckout({
        deviceId: bootstrap.deviceId,
        accessToken: kioskAccessToken,
        customerName: customerName || null,
        note: note || null,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          modifierOptionIds: []
        }))
      });

      if (response.paymentHandoff.status === "COMPLETED") {
        setStatus(
          `Order ${response.order.number} accepted. Payment ${response.paymentHandoff.method} captured.`
        );
        setCart([]);
        setCustomerName("");
        setNote("");
      } else {
        setError(
          `Order ${response.order.number} created, but payment ${response.paymentHandoff.method} is ${response.paymentHandoff.status.toLowerCase()}.`
        );
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kiosk checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  const branding = bootstrap?.branding;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          branding
            ? `radial-gradient(circle at top left, ${branding.accentColor}22, transparent 34%), ${branding.surfaceColor}`
            : "#f4efe6",
        color: "#1e2c25",
        padding: "32px 20px 56px"
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gap: 24
        }}
      >
        <section
          style={{
            display: "grid",
            gap: 10,
            padding: 28,
            borderRadius: 28,
            background: "#fffaf0",
            border: "1px solid rgba(30,44,37,0.08)"
          }}
        >
          <span
            style={{
              textTransform: "uppercase",
              letterSpacing: 2.4,
              fontSize: 12,
              color: branding?.accentColor ?? "#c46d38"
            }}
          >
            {branding?.logoText ?? "Exetron"}
          </span>
          <h1 style={{ margin: 0, fontSize: 42 }}>{branding?.heroTitle ?? "Kiosk"}</h1>
          <p style={{ margin: 0, maxWidth: 720, fontSize: 18, lineHeight: 1.5 }}>
            {branding?.heroSubtitle ?? "Self-service ordering"}
          </p>
          {bootstrap ? (
            <p style={{ margin: 0, opacity: 0.72 }}>
              {bootstrap.storeName} · {bootstrap.deviceName}
            </p>
          ) : null}
        </section>

        {error ? (
          <section style={{ color: "#992f2f", fontWeight: 600 }}>{error}</section>
        ) : null}
        {status ? (
          <section style={{ color: "#255d3b", fontWeight: 600 }}>{status}</section>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.8fr) minmax(320px, 0.9fr)",
            gap: 24
          }}
        >
          <section
            style={{
              display: "grid",
              gap: 14
            }}
          >
            {products.map((product) => (
              <button
                key={`${product.id}:${product.categoryName}`}
                onClick={() => addProduct(product)}
                disabled={busy}
                style={{
                  display: "grid",
                  gap: 6,
                  textAlign: "left",
                  padding: 22,
                  borderRadius: 24,
                  border: "1px solid rgba(30,44,37,0.08)",
                  background: "#fffaf0",
                  cursor: "pointer"
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 1.8,
                    color: branding?.accentColor ?? "#c46d38"
                  }}
                >
                  {product.categoryName}
                </span>
                <strong style={{ fontSize: 24 }}>{product.name}</strong>
                <span style={{ opacity: 0.76 }}>
                  {product.description ?? "Tap to add this item to your cart."}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {product.variants[0]?.effectivePrice ?? product.effectivePrice ?? "0.00"} RUB
                </span>
              </button>
            ))}
          </section>

          <aside
            style={{
              display: "grid",
              alignSelf: "start",
              gap: 14,
              padding: 22,
              borderRadius: 24,
              background: "#fffaf0",
              border: "1px solid rgba(30,44,37,0.08)",
              position: "sticky",
              top: 20
            }}
          >
            <h2 style={{ margin: 0 }}>Your order</h2>
            {cart.map((line) => (
              <div
                key={line.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12
                }}
              >
                <span>
                  {line.name} × {line.quantity}
                </span>
                <strong>{(Number(line.unitPrice) * line.quantity).toFixed(2)}</strong>
              </div>
            ))}
            {!cart.length ? <p style={{ margin: 0, opacity: 0.68 }}>Cart is empty.</p> : null}
            <strong style={{ fontSize: 22 }}>Total: {cartTotal} RUB</strong>

            <label style={{ display: "grid", gap: 8 }}>
              <span>Name</span>
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder={
                  bootstrap?.rules.requireCustomerName ? "Required for this kiosk" : "Optional"
                }
                style={{
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(30,44,37,0.12)"
                }}
              />
            </label>

            {bootstrap?.rules.allowNotes ? (
              <label style={{ display: "grid", gap: 8 }}>
                <span>Note</span>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: "1px solid rgba(30,44,37,0.12)"
                  }}
                />
              </label>
            ) : null}

            <label style={{ display: "grid", gap: 8 }}>
              <span>Payment</span>
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as "CASH" | "CARD" | "QR")
                }
                style={{
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(30,44,37,0.12)"
                }}
              >
                {bootstrap?.rules.allowedPaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => void submitOrder()}
              disabled={busy || !bootstrap || !cart.length}
              style={{
                padding: "16px 18px",
                borderRadius: 999,
                border: "none",
                background: branding?.accentColor ?? "#c46d38",
                color: "#fffaf0",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {busy ? "Processing..." : "Pay and place order"}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
