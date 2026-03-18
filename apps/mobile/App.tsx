import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type {
  CompiledCatalogProductDto,
  DeviceDto,
  PosBootstrapResponse,
  PosSessionDto,
  PosShiftDto,
  StoreDto
} from "@exetron/contracts";
import {
  ApiError,
  bootstrapPos,
  extractCatalog,
  heartbeatSession,
  listDevices,
  listStores,
  login,
  me,
  openShift,
  startSession,
  submitPosOrder,
  type MobileSession,
  type PendingPosOrder
} from "./src/lib/api";
import {
  loadBootstrapCache,
  loadMobileSession,
  loadPendingQueue,
  saveBootstrapCache,
  saveMobileSession,
  savePendingQueue
} from "./src/lib/storage";

interface CartLine {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  quantity: number;
  unitPrice: string;
  modifierOptionIds: string[];
}

interface PaymentDraft {
  method: "CASH" | "CARD" | "QR";
  amount: string;
}

export default function App() {
  const [session, setSession] = useState<MobileSession | null>(null);
  const [bootstrap, setBootstrap] = useState<PosBootstrapResponse | null>(null);
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [activeShift, setActiveShift] = useState<PosShiftDto | null>(null);
  const [activeSession, setActiveSession] = useState<PosSessionDto | null>(null);
  const [pendingQueue, setPendingQueue] = useState<PendingPosOrder[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentDrafts, setPaymentDrafts] = useState<PaymentDraft[]>([
    { method: "CASH", amount: "0.00" }
  ]);
  const [email, setEmail] = useState("orders.operator@exetron.local");
  const [password, setPassword] = useState("OrdersPass123!");
  const [customerName, setCustomerName] = useState("Walk-in Guest");
  const [note, setNote] = useState("");
  const [openingCashAmount, setOpeningCashAmount] = useState("0.00");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const catalog = bootstrap ? extractCatalog(bootstrap) : null;
  const products = useMemo(() => {
    if (!catalog) {
      return [] as Array<CompiledCatalogProductDto & { categoryName: string }>;
    }

    return [
      ...catalog.categories.flatMap((category) =>
        category.products.map((product) => ({
          ...product,
          categoryName: category.name
        }))
      ),
      ...catalog.uncategorizedProducts.map((product) => ({
        ...product,
        categoryName: "Uncategorized"
      }))
    ];
  }, [catalog]);

  const cartTotal = useMemo(() => {
    return cart
      .reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
      .toFixed(2);
  }, [cart]);

  useEffect(() => {
    void (async () => {
      const [storedSession, storedBootstrap, storedQueue] = await Promise.all([
        loadMobileSession(),
        loadBootstrapCache(),
        loadPendingQueue()
      ]);

      if (storedSession) {
        setSession(storedSession);
      }

      if (storedBootstrap) {
        setBootstrap(storedBootstrap);
        setActiveShift(storedBootstrap.activeShift);
        setActiveSession(storedBootstrap.activeSession);
        setSelectedStoreId(storedBootstrap.storeId);
        setSelectedDeviceId(storedBootstrap.deviceId);
      }

      setPendingQueue(storedQueue);
    })();
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void (async () => {
      const tenantId = session.me.claims.tenantId ?? undefined;
      const [storesResponse, devicesResponse] = await Promise.all([
        listStores(session.accessToken),
        listDevices(session.accessToken, tenantId)
      ]);

      setStores(storesResponse.items);
      setDevices(devicesResponse.items.filter((device) => device.type === "POS"));
    })().catch((caughtError: unknown) => {
      setError(caughtError instanceof Error ? caughtError.message : "POS bootstrap load failed.");
    });
  }, [session?.accessToken, session?.me.claims.tenantId]);

  useEffect(() => {
    if (!activeSession?.id || !session?.accessToken) {
      return;
    }

    const handle = setInterval(() => {
      void heartbeatSession(session.accessToken, activeSession.id).catch(() => {
        // Heartbeat is best-effort in the scaffold.
      });
    }, 30_000);

    return () => clearInterval(handle);
  }, [activeSession?.id, session?.accessToken]);

  useEffect(() => {
    if (!cart.length) {
      setPaymentDrafts([{ method: "CASH", amount: "0.00" }]);
      return;
    }

    setPaymentDrafts((current) => {
      if (!current.length) {
        return [{ method: "CASH", amount: cartTotal }];
      }

      const next = [...current];
      const otherTotal = next
        .slice(1)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      next[0] = {
        ...next[0],
        amount: Math.max(Number(cartTotal) - otherTotal, 0).toFixed(2)
      };
      return next;
    });
  }, [cart.length, cartTotal]);

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;

  async function handleLogin() {
    setError(null);
    setInfo(null);
    setIsBusy(true);

    try {
      const tokens = await login({ email, password });
      const meResponse = await me(tokens.accessToken);
      const nextSession: MobileSession = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        me: meResponse
      };

      setSession(nextSession);
      await saveMobileSession(nextSession);
      setInfo("Operator session established.");
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Login failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStartPos() {
    if (!session?.accessToken || !selectedStore || !selectedDevice) {
      setError("Select store and POS device first.");
      return;
    }

    setError(null);
    setInfo(null);
    setIsBusy(true);

    try {
      let nextBootstrap = await bootstrapPos(
        session.accessToken,
        selectedDevice.id,
        session.me.claims.tenantId ?? undefined
      );

      let nextShift = nextBootstrap.activeShift;
      if (!nextShift) {
        nextShift = await openShift(session.accessToken, {
          storeId: selectedStore.id,
          deviceId: selectedDevice.id,
          openingCashAmount
        });
      }

      let nextSession = nextBootstrap.activeSession;
      if (!nextSession) {
        nextSession = await startSession(session.accessToken, {
          storeId: selectedStore.id,
          deviceId: selectedDevice.id,
          shiftId: nextShift.id
        });
      }

      nextBootstrap = await bootstrapPos(
        session.accessToken,
        selectedDevice.id,
        session.me.claims.tenantId ?? undefined
      );

      setBootstrap(nextBootstrap);
      setActiveShift(nextBootstrap.activeShift ?? nextShift);
      setActiveSession(nextBootstrap.activeSession ?? nextSession);
      await saveBootstrapCache(nextBootstrap);
      setInfo("POS shift and session are ready.");

      if (pendingQueue.length) {
        await handleSyncPending(nextBootstrap, nextSession.id);
      }
    } catch (caughtError: unknown) {
      if (bootstrap) {
        setInfo("Network unavailable. Falling back to cached POS bootstrap.");
      }
      setError(caughtError instanceof Error ? caughtError.message : "POS start failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSyncPending(
    cachedBootstrap = bootstrap,
    sessionId = activeSession?.id
  ) {
    if (!session?.accessToken || !cachedBootstrap || !sessionId) {
      return;
    }

    if (!pendingQueue.length) {
      setInfo("No queued POS orders.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const remaining: PendingPosOrder[] = [];

      for (const queuedOrder of pendingQueue) {
        try {
          await submitPosOrder(session.accessToken, {
            ...queuedOrder,
            sessionId
          });
        } catch (caughtError: unknown) {
          remaining.push(queuedOrder);

          if (caughtError instanceof ApiError) {
            throw caughtError;
          }
        }
      }

      setPendingQueue(remaining);
      await savePendingQueue(remaining);
      setInfo(remaining.length ? "Some queued orders remain pending." : "Queued orders synced.");
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Sync failed.");
    } finally {
      setIsBusy(false);
    }
  }

  function addToCart(product: CompiledCatalogProductDto & { categoryName: string }) {
    const variant = product.variants[0] ?? null;
    const unitPrice = variant?.effectivePrice ?? product.effectivePrice ?? "0.00";
    const lineKey = `${product.id}:${variant?.id ?? "product"}`;

    setCart((current) => {
      const existing = current.find((item) => item.key === lineKey);
      if (existing) {
        return current.map((item) =>
          item.key === lineKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...current,
        {
          key: lineKey,
          productId: product.id,
          variantId: variant?.id ?? null,
          name: `${product.name}${variant ? ` · ${variant.name}` : ""}`,
          quantity: 1,
          unitPrice,
          modifierOptionIds: []
        }
      ];
    });
  }

  async function handleSubmitOrder() {
    if (!session?.accessToken || !bootstrap || !activeSession?.id || !cart.length) {
      setError("POS session and at least one cart line are required.");
      return;
    }

    const payload: PendingPosOrder = {
      id: `offline-${Date.now()}`,
      storeId: bootstrap.storeId,
      deviceId: bootstrap.deviceId,
      sessionId: activeSession.id,
      customerName,
      note: note || undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        modifierOptionIds: item.modifierOptionIds
      })),
      allocations: paymentDrafts.map((draft) => ({
        method: draft.method,
        amount: draft.amount
      }))
    };

    setIsBusy(true);
    setError(null);
    setInfo(null);

    try {
      await submitPosOrder(session.accessToken, payload);
      setCart([]);
      setNote("");
      setInfo("POS order submitted and payment completed.");
    } catch (caughtError: unknown) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        const nextQueue = [...pendingQueue, payload];
        setPendingQueue(nextQueue);
        await savePendingQueue(nextQueue);
        setCart([]);
        setInfo("Network unavailable. Order queued for sync.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  function updatePaymentDraft(index: number, patch: Partial<PaymentDraft>) {
    setPaymentDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, ...patch } : draft
      )
    );
  }

  function addSplitPaymentRow() {
    setPaymentDrafts((current) => [...current, { method: "CARD", amount: "0.00" }]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Exetron Mobile</Text>
          <Text style={styles.title}>PHASE 7 POS Payments</Text>
          <Text style={styles.copy}>
            Login, bind a POS device, start shift/session, browse cached catalog, run
            split cash or simulated card and QR payments, and queue orders locally when
            the network drops.
          </Text>
        </View>

        {!session ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Operator Login</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              placeholder="Email"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
            />
            <Pressable style={styles.button} onPress={() => void handleLogin()} disabled={isBusy}>
              <Text style={styles.buttonLabel}>{isBusy ? "Signing In..." : "Sign In"}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>POS Runtime</Text>
              <Text style={styles.meta}>
                {session.me.user.firstName} {session.me.user.lastName} ·{" "}
                {session.me.claims.tenantId ?? "Platform"}
              </Text>
              <Text style={styles.meta}>Queued offline orders: {pendingQueue.length}</Text>
              <Text style={styles.meta}>
                Active session: {activeSession ? activeSession.id.slice(0, 8) : "not started"}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Store And Device</Text>
              <Text style={styles.label}>Store</Text>
              <View style={styles.pillRow}>
                {stores.map((store) => (
                  <Pressable
                    key={store.id}
                    style={[
                      styles.pill,
                      selectedStoreId === store.id ? styles.pillActive : null
                    ]}
                    onPress={() => setSelectedStoreId(store.id)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selectedStoreId === store.id ? styles.pillTextActive : null
                      ]}
                    >
                      {store.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>POS Device</Text>
              <View style={styles.pillRow}>
                {devices
                  .filter((device) => !selectedStoreId || device.storeId === selectedStoreId)
                  .map((device) => (
                    <Pressable
                      key={device.id}
                      style={[
                        styles.pill,
                        selectedDeviceId === device.id ? styles.pillActive : null
                      ]}
                      onPress={() => setSelectedDeviceId(device.id)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          selectedDeviceId === device.id ? styles.pillTextActive : null
                        ]}
                      >
                        {device.name}
                      </Text>
                    </Pressable>
                  ))}
              </View>
              <Text style={styles.label}>Opening cash</Text>
              <TextInput
                style={styles.input}
                value={openingCashAmount}
                onChangeText={setOpeningCashAmount}
                keyboardType="decimal-pad"
              />
              <Pressable style={styles.button} onPress={() => void handleStartPos()} disabled={isBusy}>
                <Text style={styles.buttonLabel}>{isBusy ? "Starting..." : "Start POS"}</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => void handleSyncPending()}
                disabled={isBusy}
              >
                <Text style={styles.secondaryButtonLabel}>Sync Pending Queue</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Catalog Cache</Text>
              <Text style={styles.meta}>
                Store: {bootstrap?.storeId ?? selectedStore?.id ?? "not loaded"}
              </Text>
              <Text style={styles.meta}>
                Active shift: {activeShift ? activeShift.id.slice(0, 8) : "none"}
              </Text>
              <View style={styles.catalogGrid}>
                {products.map((product) => (
                  <Pressable
                    key={`${product.id}:${product.categoryName}`}
                    style={styles.catalogCard}
                    onPress={() => addToCart(product)}
                  >
                    <Text style={styles.catalogCategory}>{product.categoryName}</Text>
                    <Text style={styles.catalogName}>{product.name}</Text>
                    <Text style={styles.catalogPrice}>
                      {(product.variants[0]?.effectivePrice ?? product.effectivePrice ?? "0.00")}{" "}
                      RUB
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cart And Payment</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Customer"
              />
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder="Order note"
              />
              {cart.map((line) => (
                <View key={line.key} style={styles.lineRow}>
                  <Text style={styles.lineName}>
                    {line.name} × {line.quantity}
                  </Text>
                  <Text style={styles.linePrice}>
                    {(Number(line.unitPrice) * line.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
              <Text style={styles.total}>Cart total: {cartTotal}</Text>

              {paymentDrafts.map((draft, index) => (
                <View key={`${draft.method}-${index}`} style={styles.paymentRow}>
                  <View style={styles.pillRow}>
                    {(["CASH", "CARD", "QR"] as const).map((method) => (
                      <Pressable
                        key={method}
                        style={[
                          styles.pill,
                          draft.method === method ? styles.pillActive : null
                        ]}
                        onPress={() => updatePaymentDraft(index, { method })}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            draft.method === method ? styles.pillTextActive : null
                          ]}
                        >
                          {method}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={draft.amount}
                    onChangeText={(value) => updatePaymentDraft(index, { amount: value })}
                    keyboardType="decimal-pad"
                    placeholder="Amount"
                  />
                </View>
              ))}

              <Pressable style={styles.secondaryButton} onPress={addSplitPaymentRow}>
                <Text style={styles.secondaryButtonLabel}>Add Split Payment</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => void handleSubmitOrder()} disabled={isBusy}>
                <Text style={styles.buttonLabel}>{isBusy ? "Submitting..." : "Submit POS Order"}</Text>
              </Pressable>
            </View>
          </>
        )}

        {info ? <Text style={styles.info}>{info}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2eee5"
  },
  content: {
    padding: 20,
    gap: 16
  },
  hero: {
    paddingTop: 24,
    gap: 8
  },
  eyebrow: {
    color: "#8b5e3c",
    textTransform: "uppercase",
    letterSpacing: 2.5,
    fontSize: 12
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e2c25"
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4a5c53"
  },
  card: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "rgba(30, 44, 37, 0.08)",
    gap: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e2c25"
  },
  label: {
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: "#7c6a61"
  },
  meta: {
    color: "#4a5c53"
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(30, 44, 37, 0.12)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff"
  },
  button: {
    borderRadius: 999,
    paddingVertical: 14,
    backgroundColor: "#c46d38"
  },
  buttonLabel: {
    textAlign: "center",
    color: "#ffffff",
    fontWeight: "700"
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(30, 44, 37, 0.14)"
  },
  secondaryButtonLabel: {
    textAlign: "center",
    color: "#1e2c25",
    fontWeight: "600"
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(30, 44, 37, 0.06)"
  },
  pillActive: {
    backgroundColor: "#1e2c25"
  },
  pillText: {
    color: "#1e2c25",
    fontWeight: "600"
  },
  pillTextActive: {
    color: "#fffaf0"
  },
  catalogGrid: {
    gap: 10
  },
  catalogCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#f7f0e1",
    gap: 6
  },
  catalogCategory: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#8b5e3c"
  },
  catalogName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e2c25"
  },
  catalogPrice: {
    color: "#4a5c53"
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  lineName: {
    flex: 1,
    color: "#1e2c25"
  },
  linePrice: {
    fontWeight: "700",
    color: "#1e2c25"
  },
  total: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e2c25"
  },
  paymentRow: {
    gap: 10
  },
  info: {
    color: "#255d3b",
    paddingBottom: 8
  },
  error: {
    color: "#992f2f",
    paddingBottom: 16
  }
});
