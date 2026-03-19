"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addStorefrontCartItem,
  applyStorefrontPromotion,
  createStorefrontCart,
  createStorefrontCustomerSession,
  deleteStorefrontCartItem,
  getStorefrontBootstrap,
  listStorefrontCustomerOrders,
  repeatStorefrontCustomerOrder,
  storefrontCheckout,
  updateStorefrontCartFulfillment
} from "../../../lib/api";

type CustomerOrderList = Awaited<ReturnType<typeof listStorefrontCustomerOrders>>;

export default function StorefrontPage({
  params
}: {
  params: Promise<{ storeCode: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storeCode, setStoreCode] = useState("");
  const [bootstrap, setBootstrap] = useState<Awaited<ReturnType<typeof getStorefrontBootstrap>> | null>(
    null
  );
  const [cartSession, setCartSession] = useState<Awaited<ReturnType<typeof createStorefrontCart>> | null>(
    null
  );
  const [customerSession, setCustomerSession] = useState<Awaited<
    ReturnType<typeof createStorefrontCustomerSession>
  > | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderList["items"]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "QR">("CARD");
  const [promotionCode, setPromotionCode] = useState("");
  const [fulfillmentMode, setFulfillmentMode] = useState<"DELIVERY" | "PICKUP" | "DINE_IN">("DELIVERY");
  const [zoneCode, setZoneCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [pickupSlotLabel, setPickupSlotLabel] = useState("");
  const [tableCode, setTableCode] = useState("");
  const [guestCount, setGuestCount] = useState("2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const qrAccessToken = searchParams.get("qr") ?? "";
  const customerSessionTokenFromQuery = searchParams.get("customerToken") ?? "";

  useEffect(() => {
    void params.then((resolved) => setStoreCode(resolved.storeCode));
  }, [params]);

  useEffect(() => {
    if (!storeCode) {
      return;
    }

    setBusy(true);
    void getStorefrontBootstrap({
      storeCode,
      qrAccessToken: qrAccessToken || undefined,
      customerSessionToken: customerSessionTokenFromQuery || undefined
    })
      .then((response) => {
        setBootstrap(response);
        setFulfillmentMode(response.fulfillment.defaultMode);
        setPromotionCode(response.availablePromotions[0]?.code ?? "");
        setZoneCode(response.fulfillment.deliveryZones[0]?.code ?? "");
        setTableCode(response.fulfillment.dineIn.tables[0]?.code ?? "");
        if (response.customerSession) {
          setCustomerName(response.customerSession.customerName ?? "");
          setCustomerPhone(response.customerSession.customerPhone);
        }
        setError(null);
      })
      .catch((caughtError) =>
        setError(caughtError instanceof Error ? caughtError.message : "Storefront load failed.")
      )
      .finally(() => setBusy(false));
  }, [customerSessionTokenFromQuery, qrAccessToken, storeCode]);

  useEffect(() => {
    if (!customerSessionTokenFromQuery) {
      return;
    }

    void listStorefrontCustomerOrders(customerSessionTokenFromQuery)
      .then((response) => {
        setCustomerOrders(response.items);
      })
      .catch(() => {
        setCustomerOrders([]);
      });
  }, [customerSessionTokenFromQuery]);

  async function ensureCart() {
    if (cartSession || !bootstrap) {
      return cartSession;
    }

    const created = await createStorefrontCart({
      storeId: bootstrap.storeId,
      qrAccessToken: qrAccessToken || null,
      customerSessionToken: customerSessionTokenFromQuery || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      note: note || null
    });
    setCartSession(created);
    return created;
  }

  if (!bootstrap) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Storefront</h1>
        <p>{busy ? "Loading storefront..." : error ?? "Storefront is unavailable."}</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${bootstrap.branding.surfaceColor} 0%, #fff 100%)`,
        color: "#1a1a1a",
        padding: 24
      }}
    >
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gap: 24
        }}
      >
        <div
          style={{
            borderRadius: 24,
            padding: 24,
            background: "#fff",
            border: `1px solid ${bootstrap.branding.accentColor}22`,
            boxShadow: "0 18px 50px rgba(0,0,0,0.06)"
          }}
        >
          <p style={{ margin: "0 0 8px", color: bootstrap.branding.accentColor }}>
            {bootstrap.branding.logoText}
          </p>
          <h1 style={{ margin: 0 }}>{bootstrap.branding.heroTitle}</h1>
          <p style={{ marginBottom: 0, opacity: 0.72 }}>{bootstrap.branding.heroSubtitle}</p>
          <p style={{ marginBottom: 0, opacity: 0.68 }}>
            {bootstrap.storeName} · {bootstrap.catalog.localization.currency} · locale{" "}
            {bootstrap.catalog.localization.locale}
          </p>
        </div>

        {error ? (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: "#fff1ef",
              color: "#8c2d19"
            }}
          >
            {error}
          </div>
        ) : null}
        {message ? (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: "#eef8f1",
              color: "#0f5a28"
            }}
          >
            {message}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 0.9fr)"
          }}
        >
          <section style={{ display: "grid", gap: 16 }}>
            {bootstrap.catalog.categories.map((category) => (
              <div
                key={category.id}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: 20,
                  display: "grid",
                  gap: 16
                }}
              >
                <div>
                  <p style={{ margin: "0 0 6px", color: bootstrap.branding.accentColor }}>
                    Catalog
                  </p>
                  <h2 style={{ margin: 0 }}>{category.name}</h2>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {category.products.map((product) => (
                    <article
                      key={product.id}
                      style={{
                        display: "grid",
                        gap: 10,
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 18,
                        padding: 16
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <h3 style={{ margin: "0 0 4px" }}>{product.name}</h3>
                          <p style={{ margin: 0, opacity: 0.72 }}>
                            {product.description ?? "Available in the live storefront menu."}
                          </p>
                        </div>
                        <strong>
                          {product.effectivePrice ?? "0.00"} {bootstrap.catalog.localization.currency}
                        </strong>
                      </div>
                      {product.variants.length ? (
                        <p style={{ margin: 0, fontSize: 14, opacity: 0.68 }}>
                          Variants: {product.variants.map((variant) => variant.name).join(", ")}
                        </p>
                      ) : null}
                      <button
                        className="primary-button"
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          void ensureCart()
                            .then((session) => {
                              if (!session) {
                                throw new Error("Cart session was not created.");
                              }
                              return addStorefrontCartItem(session.cart.id, {
                                accessToken: session.access.accessToken,
                                productId: product.id,
                                quantity: 1
                              });
                            })
                            .then((updated) => {
                              setCartSession(updated);
                              setMessage(`Added ${product.name} to cart.`);
                              setError(null);
                            })
                            .catch((caughtError) =>
                              setError(
                                caughtError instanceof Error
                                  ? caughtError.message
                                  : "Adding storefront item failed."
                              )
                            )
                            .finally(() => setBusy(false));
                        }}
                      >
                        Add To Cart
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <aside
            style={{
              display: "grid",
              gap: 16,
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
                <p style={{ margin: "0 0 6px", color: bootstrap.branding.accentColor }}>
                  Customer
                </p>
                <h2 style={{ margin: 0 }}>
                  {bootstrap.customerSession ? "Customer session" : "Guest checkout"}
                </h2>
              </div>
              <label className="field">
                <span>Name</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
              </label>
              <label className="field">
                <span>Phone</span>
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
              </label>
              <button
                className="ghost-button"
                disabled={busy || !bootstrap.rules.allowCustomerSessions || !customerPhone.trim()}
                onClick={() => {
                  setBusy(true);
                  void createStorefrontCustomerSession({
                    storeCode,
                    customerName: customerName || null,
                    customerPhone
                  })
                    .then((session) => {
                      setCustomerSession(session);
                      router.replace(session.storefrontPath);
                    })
                    .catch((caughtError) =>
                      setError(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "Customer session creation failed."
                      )
                    )
                    .finally(() => setBusy(false));
                }}
              >
                Continue As Customer
              </button>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.66 }}>
                Guest checkout stays anonymous. Customer mode signs a public session for this store
                and lets the storefront show recent orders.
              </p>
              {bootstrap.customerProfile ? (
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 16,
                    padding: 12,
                    display: "grid",
                    gap: 6
                  }}
                >
                  <strong>Loyalty profile</strong>
                  <span>
                    Points: {bootstrap.customerProfile.loyalty?.pointsBalance ?? 0} · spent{" "}
                    {bootstrap.customerProfile.totalSpent}
                  </span>
                  <span>
                    Segments: {bootstrap.customerProfile.segments.join(", ") || "none"}
                  </span>
                  <span>
                    Retention: {bootstrap.customerProfile.retention?.templateKey ?? "n/a"}
                  </span>
                </div>
              ) : null}
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
                <p style={{ margin: "0 0 6px", color: bootstrap.branding.accentColor }}>Cart</p>
                <h2 style={{ margin: 0 }}>
                  {cartSession?.cart.items.length ? `${cartSession.cart.items.length} item(s)` : "Empty cart"}
                </h2>
              </div>
              {cartSession?.cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 16,
                    padding: 12,
                    display: "grid",
                    gap: 8
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{String((item.snapshot.product as { name?: string })?.name ?? item.productId)}</strong>
                    <span>
                      {item.lineTotal} {bootstrap.catalog.localization.currency}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, opacity: 0.68 }}>Qty: {item.quantity}</p>
                  <button
                    className="ghost-button"
                    disabled={busy || !cartSession}
                    onClick={() => {
                      if (!cartSession) {
                        return;
                      }
                      setBusy(true);
                      void deleteStorefrontCartItem(
                        cartSession.cart.id,
                        item.id,
                        cartSession.access.accessToken
                      )
                        .then((updated) => {
                          setCartSession(updated);
                          setError(null);
                        })
                        .catch((caughtError) =>
                          setError(
                            caughtError instanceof Error
                              ? caughtError.message
                              : "Removing storefront item failed."
                          )
                        )
                        .finally(() => setBusy(false));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {!cartSession?.cart.items.length ? (
                <p style={{ margin: 0, opacity: 0.68 }}>Add products from the live menu to start checkout.</p>
              ) : null}
              <label className="field">
                <span>Note</span>
                <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
              <label className="field">
                <span>Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as "CASH" | "CARD" | "QR")}
                >
                  {bootstrap.rules.allowedPaymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Promotion Code</span>
                <input
                  value={promotionCode}
                  onChange={(event) => setPromotionCode(event.target.value)}
                  placeholder="WELCOME10"
                />
              </label>
              <button
                className="ghost-button"
                disabled={busy || !promotionCode.trim()}
                onClick={() => {
                  setBusy(true);
                  void ensureCart()
                    .then((session) => {
                      if (!session) {
                        throw new Error("Cart session was not created.");
                      }

                      return applyStorefrontPromotion(session.cart.id, {
                        accessToken: session.access.accessToken,
                        code: promotionCode.trim(),
                        customerSessionToken:
                          customerSession?.accessToken ?? customerSessionTokenFromQuery ?? null,
                        customerName: customerName || null,
                        customerPhone: customerPhone || null
                      });
                    })
                    .then((updated) => {
                      setCartSession(updated);
                      setMessage(
                        `Promotion applied: ${updated.cart.promotion?.code ?? promotionCode.trim()}.`
                      );
                      setError(null);
                    })
                    .catch((caughtError) =>
                      setError(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "Promotion apply failed."
                      )
                    )
                    .finally(() => setBusy(false));
                }}
              >
                Apply Promotion
              </button>
              {bootstrap.availablePromotions.length ? (
                <p style={{ margin: 0, fontSize: 14, opacity: 0.68 }}>
                  Active promos: {bootstrap.availablePromotions.map((item) => item.code).join(", ")}
                </p>
              ) : null}
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 16,
                  padding: 12,
                  display: "grid",
                  gap: 10
                }}
              >
                <div>
                  <p style={{ margin: "0 0 4px", color: bootstrap.branding.accentColor }}>
                    Fulfillment
                  </p>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Delivery / pickup / dine-in</h3>
                </div>
                <label className="field">
                  <span>Mode</span>
                  <select
                    value={fulfillmentMode}
                    onChange={(event) =>
                      setFulfillmentMode(event.target.value as "DELIVERY" | "PICKUP" | "DINE_IN")
                    }
                  >
                    {bootstrap.fulfillment.enabledModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </label>
                {fulfillmentMode === "DELIVERY" ? (
                  <>
                    <label className="field">
                      <span>Delivery Zone</span>
                      <select value={zoneCode} onChange={(event) => setZoneCode(event.target.value)}>
                        {bootstrap.fulfillment.deliveryZones
                          .filter((zone) => zone.isActive)
                          .map((zone) => (
                            <option key={zone.code} value={zone.code}>
                              {zone.name} · fee {zone.fee}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Address</span>
                      <input
                        value={addressLine1}
                        onChange={(event) => setAddressLine1(event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Postal Code</span>
                      <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
                    </label>
                  </>
                ) : null}
                {fulfillmentMode === "PICKUP" ? (
                  <label className="field">
                    <span>Pickup Slot Label</span>
                    <input
                      value={pickupSlotLabel}
                      onChange={(event) => setPickupSlotLabel(event.target.value)}
                    />
                  </label>
                ) : null}
                {fulfillmentMode === "DINE_IN" ? (
                  <>
                    <label className="field">
                      <span>Table</span>
                      <select value={tableCode} onChange={(event) => setTableCode(event.target.value)}>
                        {bootstrap.fulfillment.dineIn.tables
                          .filter((table) => table.isActive)
                          .map((table) => (
                            <option key={table.code} value={table.code}>
                              {table.label} · cap {table.capacity}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Guest Count</span>
                      <input value={guestCount} onChange={(event) => setGuestCount(event.target.value)} />
                    </label>
                  </>
                ) : null}
                <button
                  className="ghost-button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void ensureCart()
                      .then((session) => {
                        if (!session) {
                          throw new Error("Cart session was not created.");
                        }

                        return updateStorefrontCartFulfillment(session.cart.id, {
                          accessToken: session.access.accessToken,
                          fulfillment: {
                            mode: fulfillmentMode,
                            zoneCode: fulfillmentMode === "DELIVERY" ? zoneCode || null : null,
                            addressLine1: fulfillmentMode === "DELIVERY" ? addressLine1 || null : null,
                            postalCode: fulfillmentMode === "DELIVERY" ? postalCode || null : null,
                            pickupSlotLabel:
                              fulfillmentMode === "PICKUP" ? pickupSlotLabel || null : null,
                            tableCode: fulfillmentMode === "DINE_IN" ? tableCode || null : null,
                            guestCount:
                              fulfillmentMode === "DINE_IN" && guestCount.trim()
                                ? Number(guestCount)
                                : null,
                            instructions: note || null
                          }
                        });
                      })
                      .then((updated) => {
                        setCartSession(updated);
                        setMessage(
                          `Fulfillment updated: ${updated.cart.fulfillment.mode ?? fulfillmentMode}.`
                        );
                        setError(null);
                      })
                      .catch((caughtError) =>
                        setError(
                          caughtError instanceof Error
                            ? caughtError.message
                            : "Fulfillment update failed."
                        )
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Apply Fulfillment
                </button>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.68 }}>
                  {cartSession?.cart.fulfillment.mode
                    ? `Current: ${cartSession.cart.fulfillment.mode} · fee ${cartSession.cart.fulfillment.fee} · promised ${cartSession.cart.fulfillment.promisedAt ?? "n/a"}`
                    : "Apply fulfillment before checkout to calculate fee and ETA/promise."}
                </p>
              </div>
              <strong>
                Total: {cartSession?.cart.total ?? "0.00"} {bootstrap.catalog.localization.currency}
              </strong>
              {cartSession?.cart.promotion ? (
                <p style={{ margin: 0, fontSize: 14, opacity: 0.68 }}>
                  Promo {cartSession.cart.promotion.code} applied, discount{" "}
                  {cartSession.cart.discountTotal} {bootstrap.catalog.localization.currency}
                </p>
              ) : null}
              <button
                className="primary-button"
                disabled={busy || !cartSession?.cart.items.length || !cartSession?.cart.fulfillment.mode}
                onClick={() => {
                  if (!cartSession) {
                    return;
                  }
                  setBusy(true);
                  void storefrontCheckout(cartSession.cart.id, {
                    accessToken: cartSession.access.accessToken,
                    customerSessionToken:
                      customerSession?.accessToken ??
                      customerSessionTokenFromQuery ??
                      null,
                    customerName: customerName || null,
                    customerPhone: customerPhone || null,
                    note: note || null,
                    paymentMethod
                  })
                    .then((response) => {
                      setError(null);
                      router.push(response.tracking.trackingPath);
                    })
                    .catch((caughtError) =>
                      setError(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "Storefront checkout failed."
                      )
                    )
                    .finally(() => setBusy(false));
                }}
              >
                Place Order
              </button>
            </section>

            {customerOrders.length ? (
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
                  <p style={{ margin: "0 0 6px", color: bootstrap.branding.accentColor }}>
                    Recent Orders
                  </p>
                  <h2 style={{ margin: 0 }}>Customer history</h2>
                </div>
                {customerOrders.map((order) => (
                  <div key={order.orderId} style={{ display: "grid", gap: 8 }}>
                    <button className="ghost-button" onClick={() => router.push(order.tracking.trackingPath)}>
                      {order.number} · {order.status} · {order.total}
                    </button>
                    {order.canRepeatOrder ? (
                      <button
                        className="mini-button"
                        onClick={() => {
                          if (!customerSessionTokenFromQuery) {
                            return;
                          }
                          setBusy(true);
                          void repeatStorefrontCustomerOrder(order.orderId, customerSessionTokenFromQuery)
                            .then((session) => {
                              setCartSession(session);
                              setMessage(`Repeat order started from ${order.number}.`);
                              setError(null);
                            })
                            .catch((caughtError) =>
                              setError(
                                caughtError instanceof Error
                                  ? caughtError.message
                                  : "Repeat order failed."
                              )
                            )
                            .finally(() => setBusy(false));
                        }}
                      >
                        Repeat Order
                      </button>
                    ) : null}
                  </div>
                ))}
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
