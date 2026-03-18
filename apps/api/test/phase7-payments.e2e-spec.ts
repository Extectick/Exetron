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

jest.setTimeout(120_000);

describe("PHASE 7 payments abstraction", () => {
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

  it("supports mixed POS payments, store-level provider overrides, kiosk auto-confirm, failed attempts, and reconciliation summary", async () => {
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
        slug: "phase7-payments",
        name: "Phase 7 Payments Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeAResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "payments-a",
        name: "Payments Store A",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const storeA = storeAResponse.body as { id: string };

    const storeBResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "payments-b",
        name: "Payments Store B",
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
        code: "POS-P7-001",
        name: "Payments POS",
        type: "POS"
      })
      .expect(201);
    const posDevice = posDeviceResponse.body as { id: string };

    const kioskDeviceAResponse = await request(httpServer)
      .post("/devices")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        code: "KIOSK-P7-001",
        name: "Payments Kiosk A",
        type: "KIOSK"
      })
      .expect(201);
    const kioskDeviceA = kioskDeviceAResponse.body as { id: string };

    const kioskDeviceBResponse = await request(httpServer)
      .post("/devices")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeB.id,
        code: "KIOSK-P7-002",
        name: "Payments Kiosk B",
        type: "KIOSK"
      })
      .expect(201);
    const kioskDeviceB = kioskDeviceBResponse.body as { id: string };

    const kioskAccessAResponse = await request(httpServer)
      .post(`/devices/${kioskDeviceA.id}/kiosk-access-token`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(201);
    const kioskAccessA = kioskAccessAResponse.body as { accessToken: string };

    const kioskAccessBResponse = await request(httpServer)
      .post(`/devices/${kioskDeviceB.id}/kiosk-access-token`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(201);
    const kioskAccessB = kioskAccessBResponse.body as { accessToken: string };

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: storeA.id,
        key: "kitchen.routing",
        value: {
          defaultStationKey: "KITCHEN"
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: storeB.id,
        key: "kitchen.routing",
        value: {
          defaultStationKey: "KITCHEN"
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: storeA.id,
        key: "kiosk.rules",
        value: {
          allowNotes: true,
          requireCustomerName: false,
          allowedPaymentMethods: ["CARD", "QR"],
          autoConfirmPaidOrders: true
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: storeB.id,
        key: "kiosk.rules",
        value: {
          allowNotes: true,
          requireCustomerName: false,
          allowedPaymentMethods: ["QR"],
          autoConfirmPaidOrders: true
        }
      })
      .expect(200);

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "payments-menu",
        name: "Payments Menu"
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "phase7-burger",
        name: "Phase 7 Burger",
        basePrice: "9.50"
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    await request(httpServer)
      .post("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        providerKey: "tenant-kiosk-card-failure",
        providerType: "CARD_SIMULATED",
        method: "CARD",
        allowedChannels: ["KIOSK"],
        autoConfirmOrderOnSuccess: false,
        settings: {
          simulateResult: "FAILED",
          failureMessage: "Tenant card provider should be overridden."
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        providerKey: "store-a-kiosk-card-success",
        providerType: "CARD_SIMULATED",
        method: "CARD",
        allowedChannels: ["KIOSK"],
        autoConfirmOrderOnSuccess: true,
        priority: 1,
        settings: {
          simulateResult: "SUCCEEDED",
          externalReferencePrefix: "store-a-card"
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        providerKey: "tenant-kiosk-qr-failure",
        providerType: "QR_SIMULATED",
        method: "QR",
        allowedChannels: ["KIOSK"],
        autoConfirmOrderOnSuccess: true,
        settings: {
          simulateResult: "FAILED",
          failureCode: "QR_DECLINED",
          failureMessage: "QR provider declined payment."
        }
      })
      .expect(201);

    const openShiftResponse = await request(httpServer)
      .post("/pos/shifts")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        deviceId: posDevice.id,
        openingCashAmount: "100.00"
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
        channel: "POS",
        customerName: "POS Payments Guest"
      })
      .expect(201);
    const posCart = posCartResponse.body as { id: string };

    await request(httpServer)
      .post(`/carts/${posCart.id}/items`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        productId: product.id,
        quantity: 1
      })
      .expect(201);

    const posOrderResponse = await request(httpServer)
      .post(`/carts/${posCart.id}/checkout`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        note: "Phase 7 POS order"
      })
      .expect(201);
    const posOrder = posOrderResponse.body as { id: string; total: string; status: string };
    expect(posOrder.status).toBe("PLACED");

    const paymentIntentResponse = await request(httpServer)
      .post("/pos/payment-intents")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: storeA.id,
        orderId: posOrder.id,
        posSessionId: session.id,
        allocations: [
          { method: "CASH", amount: "4.50" },
          { method: "CARD", amount: "5.00" }
        ]
      })
      .expect(201);
    const paymentIntent = paymentIntentResponse.body as {
      id: string;
      status: string;
      allocations: Array<{ id: string; status: string; method: string }>;
    };
    expect(paymentIntent.status).toBe("PENDING");
    expect(paymentIntent.allocations).toHaveLength(2);

    let processedIntent = paymentIntentResponse.body as {
      id: string;
      status: string;
      paidAmount: string;
      allocations: Array<{ id: string; method: string; status: string }>;
    };
    for (const allocation of paymentIntent.allocations) {
      const processedResponse = await request(httpServer)
        .post(`/payments/intents/${paymentIntent.id}/allocations/${allocation.id}/process`)
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send({})
        .expect(201);
      processedIntent = processedResponse.body as typeof processedIntent;
    }

    expect(processedIntent.status).toBe("COMPLETED");
    expect(processedIntent.paidAmount).toBe(posOrder.total);
    expect(processedIntent.allocations.map((allocation) => allocation.status)).toEqual([
      "COMPLETED",
      "COMPLETED"
    ]);

    const persistedPosOrder = await prisma.order.findUniqueOrThrow({
      where: { id: posOrder.id }
    });
    expect(persistedPosOrder.status).toBe("PLACED");

    const kioskSuccessResponse = await request(httpServer)
      .post("/kiosk/checkout")
      .send({
        deviceId: kioskDeviceA.id,
        accessToken: kioskAccessA.accessToken,
        customerName: "Kiosk Success Guest",
        paymentMethod: "CARD",
        items: [{ productId: product.id, quantity: 1 }]
      })
      .expect(201);
    const kioskSuccess = kioskSuccessResponse.body as {
      order: { id: string; status: string; total: string };
      paymentHandoff: { id: string; status: string; provider: string };
    };
    expect(kioskSuccess.order.status).toBe("CONFIRMED");
    expect(kioskSuccess.paymentHandoff.status).toBe("COMPLETED");

    const successAttempts = await prisma.paymentAttempt.findMany({
      where: {
        orderId: kioskSuccess.order.id
      }
    });
    expect(successAttempts).toHaveLength(1);
    expect(successAttempts[0]?.providerKey).toBe("store-a-kiosk-card-success");
    expect(successAttempts[0]?.status).toBe("SUCCEEDED");

    const failedKioskResponse = await request(httpServer)
      .post("/kiosk/checkout")
      .send({
        deviceId: kioskDeviceB.id,
        accessToken: kioskAccessB.accessToken,
        customerName: "Kiosk Failed Guest",
        paymentMethod: "QR",
        items: [{ productId: product.id, quantity: 1 }]
      })
      .expect(201);
    const failedKiosk = failedKioskResponse.body as {
      order: { id: string; status: string };
      paymentHandoff: { status: string };
    };
    expect(failedKiosk.order.status).toBe("PLACED");
    expect(failedKiosk.paymentHandoff.status).toBe("FAILED");

    const failedIntent = await prisma.paymentIntent.findFirstOrThrow({
      where: {
        orderId: failedKiosk.order.id
      }
    });
    expect(failedIntent.status).toBe("FAILED");

    const failedAttempts = await prisma.paymentAttempt.findMany({
      where: {
        orderId: failedKiosk.order.id
      }
    });
    expect(failedAttempts).toHaveLength(1);
    expect(failedAttempts[0]?.status).toBe("FAILED");
    expect(failedAttempts[0]?.errorCode).toBe("QR_DECLINED");
    expect(failedAttempts[0]?.errorMessage).toBe("QR provider declined payment.");

    const failedKitchenTickets = await prisma.kitchenTicket.findMany({
      where: {
        orderId: failedKiosk.order.id
      }
    });
    expect(failedKitchenTickets).toHaveLength(0);

    const reconciliationResponse = await request(httpServer)
      .get("/payments/reconciliation/summary")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const reconciliation = reconciliationResponse.body as {
      intentsByStatus: Array<{ status: string; count: number }>;
      allocationsByMethod: Array<{ method: string; status: string; count: number }>;
      failedAttempts: { count: number };
    };
    expect(reconciliation.intentsByStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "COMPLETED", count: 2 }),
        expect.objectContaining({ status: "FAILED", count: 1 })
      ])
    );
    expect(reconciliation.allocationsByMethod).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "CASH", status: "COMPLETED", count: 1 }),
        expect.objectContaining({ method: "CARD", status: "COMPLETED", count: 2 }),
        expect.objectContaining({ method: "QR", status: "FAILED", count: 1 })
      ])
    );
    expect(reconciliation.failedAttempts.count).toBe(1);

    const attemptsListResponse = await request(httpServer)
      .get(`/payments/intents/${paymentIntent.id}/attempts`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const attemptsList = attemptsListResponse.body as {
      total: number;
      items: Array<{ status: string }>;
    };
    expect(attemptsList.total).toBe(2);
    expect(attemptsList.items.every((attempt) => attempt.status === "SUCCEEDED")).toBe(true);

    const legacyHandoffs = await prisma.kioskPaymentHandoff.findMany({
      where: {
        orderId: {
          in: [kioskSuccess.order.id, failedKiosk.order.id]
        }
      }
    });
    expect(legacyHandoffs).toHaveLength(0);
  });
});
