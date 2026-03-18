import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { loadApiEnv } from "@exetron/config";
import { prisma } from "@exetron/database";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { resetDatabase, seedPlatformAdmin } from "./db-test.utils";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

type HttpServer = Parameters<typeof request>[0];

describe("PHASE 8 analytics and owner cabinet", () => {
  const env = loadApiEnv(process.env);
  let app: INestApplication;
  let httpServer: HttpServer;

  beforeAll(async () => {
    await resetDatabase();
    await seedPlatformAdmin();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );

    await app.init();
    httpServer = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  });

  it("shows owner revenue by all stores and per store, top products, period filters, and report snapshots", async () => {
    const adminLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: env.PLATFORM_ADMIN_EMAIL,
        password: env.PLATFORM_ADMIN_PASSWORD
      })
      .expect(201);
    const adminTokens = adminLogin.body as AuthTokens;

    const tenantResponse = await request(httpServer)
      .post("/tenants")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        slug: "phase8-analytics",
        name: "Phase 8 Analytics Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    await request(httpServer)
      .put("/settings/tenant")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        key: "currency",
        value: { default: "RUB" }
      })
      .expect(200);

    const storeAResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "analytics-a",
        name: "Analytics Store A",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const storeA = storeAResponse.body as { id: string };

    const storeBResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "analytics-b",
        name: "Analytics Store B",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const storeB = storeBResponse.body as { id: string };

    const posDeviceResponse = await request(httpServer)
      .post("/devices")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        code: "ANA-POS-001",
        name: "Analytics POS",
        type: "POS"
      })
      .expect(201);
    const posDevice = posDeviceResponse.body as { id: string };

    const kioskDeviceResponse = await request(httpServer)
      .post("/devices")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeB.id,
        code: "ANA-KIOSK-001",
        name: "Analytics Kiosk",
        type: "KIOSK"
      })
      .expect(201);
    const kioskDevice = kioskDeviceResponse.body as { id: string };

    const kioskAccessResponse = await request(httpServer)
      .post(`/devices/${kioskDevice.id}/kiosk-access-token`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(201);
    const kioskAccess = kioskAccessResponse.body as { accessToken: string };

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: storeB.id,
        key: "kiosk.rules",
        value: {
          allowNotes: true,
          requireCustomerName: false,
          allowedPaymentMethods: ["CARD"],
          autoConfirmPaidOrders: true
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: storeA.id,
        key: "kitchen.routing",
        value: { defaultStationKey: "KITCHEN" }
      })
      .expect(200);

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: storeB.id,
        key: "kitchen.routing",
        value: { defaultStationKey: "KITCHEN" }
      })
      .expect(200);

    await request(httpServer)
      .post("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeB.id,
        providerKey: "analytics-kiosk-card",
        providerType: "CARD_SIMULATED",
        method: "CARD",
        allowedChannels: ["KIOSK"],
        autoConfirmOrderOnSuccess: true,
        settings: {
          simulateResult: "SUCCEEDED"
        }
      })
      .expect(201);

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "analytics",
        name: "Analytics Menu"
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const latteResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "latte",
        name: "Latte",
        basePrice: "5.50"
      })
      .expect(201);
    const latte = latteResponse.body as { id: string };

    const burgerResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "burger",
        name: "Burger",
        basePrice: "9.00"
      })
      .expect(201);
    const burger = burgerResponse.body as { id: string };

    const ownerRoleResponse = await request(httpServer)
      .post("/roles")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        key: "owner",
        name: "Owner",
        permissionKeys: ["analytics.read", "analytics.write"]
      })
      .expect(201);
    const ownerRole = ownerRoleResponse.body as { id: string };

    const ownerPassword = "OwnerPass123!";
    await request(httpServer)
      .post("/users")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        email: "owner.phase8@exetron.local",
        firstName: "Owner",
        lastName: "Phase8",
        password: ownerPassword,
        roleIds: [ownerRole.id]
      })
      .expect(201);

    const ownerLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: "owner.phase8@exetron.local",
        password: ownerPassword
      })
      .expect(201);
    const ownerTokens = ownerLogin.body as AuthTokens;

    const openShiftResponse = await request(httpServer)
      .post("/pos/shifts")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        deviceId: posDevice.id,
        openingCashAmount: "0.00"
      })
      .expect(201);
    const shift = openShiftResponse.body as { id: string };

    const startSessionResponse = await request(httpServer)
      .post("/pos/sessions")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        deviceId: posDevice.id,
        shiftId: shift.id
      })
      .expect(201);
    const session = startSessionResponse.body as { id: string };

    const posCartResponse = await request(httpServer)
      .post("/carts")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        deviceId: posDevice.id,
        channel: "POS"
      })
      .expect(201);
    const posCart = posCartResponse.body as { id: string };

    await request(httpServer)
      .post(`/carts/${posCart.id}/items`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        productId: latte.id,
        quantity: 2
      })
      .expect(201);

    const posOrderResponse = await request(httpServer)
      .post(`/carts/${posCart.id}/checkout`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({})
      .expect(201);
    const posOrder = posOrderResponse.body as { id: string; total: string };

    const posIntentResponse = await request(httpServer)
      .post("/pos/payment-intents")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        orderId: posOrder.id,
        posSessionId: session.id,
        allocations: [{ method: "CASH", amount: posOrder.total }]
      })
      .expect(201);
    const posIntent = posIntentResponse.body as { id: string; allocations: Array<{ id: string }> };

    await request(httpServer)
      .post(`/payments/intents/${posIntent.id}/allocations/${posIntent.allocations[0]?.id}/process`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({})
      .expect(201);

    const kioskCheckoutResponse = await request(httpServer)
      .post("/kiosk/checkout")
      .send({
        deviceId: kioskDevice.id,
        accessToken: kioskAccess.accessToken,
        paymentMethod: "CARD",
        items: [{ productId: burger.id, quantity: 1 }]
      })
      .expect(201);
    const kioskCheckout = kioskCheckoutResponse.body as { order: { id: string } };

    const cancelledCartResponse = await request(httpServer)
      .post("/carts")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeB.id,
        channel: "ADMIN"
      })
      .expect(201);
    const cancelledCart = cancelledCartResponse.body as { id: string };

    await request(httpServer)
      .post(`/carts/${cancelledCart.id}/items`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        productId: burger.id,
        quantity: 1
      })
      .expect(201);

    const cancelledOrderResponse = await request(httpServer)
      .post(`/carts/${cancelledCart.id}/checkout`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({})
      .expect(201);
    const cancelledOrder = cancelledOrderResponse.body as { id: string };

    await request(httpServer)
      .post(`/orders/${cancelledOrder.id}/transition`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        toStatus: "CANCELLED",
        hasExternalPayment: true,
        reason: "Phase 8 cancellation"
      })
      .expect(201);

    const dashboardResponse = await request(httpServer)
      .get("/analytics/owner-cabinet")
      .query({
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z"
      })
      .set("Authorization", `Bearer ${ownerTokens.accessToken}`)
      .expect(200);
    const dashboard = dashboardResponse.body as {
      revenue: string;
      paidOrders: number;
      topProducts: Array<{ productCode: string | null; quantity: number }>;
      revenueByStore: Array<{ storeId: string; revenue: string }>;
      refundsAndCancellations: {
        cancelledOrders: number;
        pendingManualRefunds: number;
      };
    };

    expect(dashboard.revenue).toBe("20.00");
    expect(dashboard.paidOrders).toBe(2);
    expect(dashboard.topProducts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productCode: "latte", quantity: 2 }),
        expect.objectContaining({ productCode: "burger", quantity: 1 })
      ])
    );
    expect(dashboard.revenueByStore).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storeId: storeA.id, revenue: "11.00" }),
        expect.objectContaining({ storeId: storeB.id, revenue: "9.00" })
      ])
    );
    expect(dashboard.refundsAndCancellations).toEqual(
      expect.objectContaining({
        cancelledOrders: 1,
        pendingManualRefunds: 1,
        cancelledRevenue: "9.00",
        pendingManualRefundAmount: "9.00"
      })
    );

    const storeDashboardResponse = await request(httpServer)
      .get("/analytics/owner-cabinet")
      .query({
        storeId: storeA.id,
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z"
      })
      .set("Authorization", `Bearer ${ownerTokens.accessToken}`)
      .expect(200);
    const storeDashboard = storeDashboardResponse.body as {
      storeId: string | null;
      revenue: string;
      revenueByStore: Array<{ storeId: string }>;
    };
    expect(storeDashboard.storeId).toBe(storeA.id);
    expect(storeDashboard.revenue).toBe("11.00");
    expect(storeDashboard.revenueByStore).toHaveLength(1);
    expect(storeDashboard.revenueByStore[0]?.storeId).toBe(storeA.id);

    const snapshotResponse = await request(httpServer)
      .post("/analytics/snapshots")
      .set("Authorization", `Bearer ${ownerTokens.accessToken}`)
      .send({
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z"
      })
      .expect(201);
    const snapshot = snapshotResponse.body as {
      id: string;
      kind: string;
      createdByUserId: string | null;
      payload: { revenue: string };
    };
    expect(snapshot.kind).toBe("OWNER_DASHBOARD");
    expect(snapshot.createdByUserId).not.toBeNull();
    expect(snapshot.payload.revenue).toBe("20.00");

    const snapshotsListResponse = await request(httpServer)
      .get("/analytics/snapshots")
      .query({
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z"
      })
      .set("Authorization", `Bearer ${ownerTokens.accessToken}`)
      .expect(200);
    const snapshotsList = snapshotsListResponse.body as {
      total: number;
      items: Array<{ id: string }>;
    };
    expect(snapshotsList.total).toBe(1);
    expect(snapshotsList.items[0]?.id).toBe(snapshot.id);

    const persistedSnapshot = await prisma.analyticsSnapshot.findUniqueOrThrow({
      where: { id: snapshot.id }
    });
    expect(persistedSnapshot.tenantId).toBe(tenant.id);

    const analyticsAudit = await prisma.auditLog.findFirstOrThrow({
      where: {
        action: "analytics.snapshot_created",
        entityId: snapshot.id
      }
    });
    expect(analyticsAudit.entityType).toBe("analytics_snapshot");

    const analyticsOutbox = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        eventName: "analytics.snapshot_created",
        aggregateId: snapshot.id
      }
    });
    expect(analyticsOutbox.aggregate).toBe("analytics_snapshot");

    expect(kioskCheckout.order.id).not.toBeNull();
  });
});
