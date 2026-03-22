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

describe("PHASE 16 integrations and hardware foundation", () => {
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

  it("supports webhook-driven provider attempts, payment operations, settlements, and hardware jobs", async () => {
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
        slug: "phase16-integrations",
        name: "Phase 16 Integrations Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase16-store",
        name: "Phase 16 Store",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string };

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase16-menu",
        name: "Phase 16 Menu"
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "phase16-salad",
        name: "Phase 16 Salad",
        basePrice: "12.00"
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    await request(httpServer)
      .post("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        providerKey: "phase16-webhook-card",
        providerType: "CARD_SIMULATED",
        method: "CARD",
        allowedChannels: ["ADMIN"],
        autoConfirmOrderOnSuccess: true,
        settings: {
          adapterMode: "WEBHOOK"
        },
        secrets: {
          webhookSecret: "phase16-secret"
        }
      })
      .expect(201);

    const cartResponse = await request(httpServer)
      .post("/carts")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        channel: "ADMIN",
        customerName: "Phase 16 Guest"
      })
      .expect(201);
    const cart = cartResponse.body as { id: string };

    await request(httpServer)
      .post(`/carts/${cart.id}/items`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        productId: product.id,
        quantity: 1
      })
      .expect(201);

    const orderResponse = await request(httpServer)
      .post(`/carts/${cart.id}/checkout`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        note: "Phase 16 integration order"
      })
      .expect(201);
    const order = orderResponse.body as { id: string; total: string; status: string };
    expect(order.status).toBe("PLACED");

    const intentResponse = await request(httpServer)
      .post("/payments/intents")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        orderId: order.id,
        channel: "ADMIN",
        allocations: [{ method: "CARD", amount: order.total }]
      })
      .expect(201);
    const intent = intentResponse.body as {
      id: string;
      allocations: Array<{ id: string; status: string }>;
    };

    const processedIntentResponse = await request(httpServer)
      .post(`/payments/intents/${intent.id}/allocations/${intent.allocations[0]!.id}/process`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({})
      .expect(201);
    const processedIntent = processedIntentResponse.body as {
      status: string;
      allocations: Array<{ id: string; externalReference: string | null; status: string }>;
    };
    expect(processedIntent.status).toBe("PENDING");
    expect(processedIntent.allocations[0]?.status).toBe("PENDING");
    expect(processedIntent.allocations[0]?.externalReference).toEqual(expect.any(String));

    const attemptsResponse = await request(httpServer)
      .get(`/payments/intents/${intent.id}/attempts`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const attempt = (attemptsResponse.body as { items: Array<{ externalReference: string }> }).items[0]!;

    const connectorExecutionsBeforeWebhook = await request(httpServer)
      .get("/payments/connector-executions")
      .query({ tenantId: tenant.id, providerKey: "phase16-webhook-card" })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(connectorExecutionsBeforeWebhook.body.total).toBeGreaterThan(0);

    const webhookResponse = await request(httpServer)
      .post("/payments/webhooks/phase16-webhook-card")
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        deliveryId: "delivery-001",
        eventType: "payment.updated",
        signature: "phase16-secret",
        payload: {
          entityType: "PAYMENT_ATTEMPT",
          externalReference: attempt.externalReference,
          outcome: "SUCCEEDED"
        }
      })
      .expect(201);
    expect(webhookResponse.body.status).toBe("PROCESSED");

    const duplicateWebhookResponse = await request(httpServer)
      .post("/payments/webhooks/phase16-webhook-card")
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        deliveryId: "delivery-001",
        eventType: "payment.updated",
        signature: "phase16-secret",
        payload: {
          entityType: "PAYMENT_ATTEMPT",
          externalReference: attempt.externalReference,
          outcome: "SUCCEEDED"
        }
      })
      .expect(201);
    expect(duplicateWebhookResponse.body.id).toBe(webhookResponse.body.id);

    const persistedOrder = await request(httpServer)
      .get(`/orders/${order.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(persistedOrder.body.status).toBe("CONFIRMED");

    const operationResponse = await request(httpServer)
      .post("/payments/operations")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        paymentIntentId: intent.id,
        paymentAllocationId: processedIntent.allocations[0]!.id,
        kind: "REFUND",
        amount: order.total,
        reason: "Customer request"
      })
      .expect(201);
    expect(operationResponse.body.status).toBe("PENDING");

    await request(httpServer)
      .post("/payments/webhooks/phase16-webhook-card")
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        deliveryId: "delivery-002",
        eventType: "refund.updated",
        signature: "phase16-secret",
        payload: {
          entityType: "PAYMENT_OPERATION",
          externalReference: operationResponse.body.externalReference,
          outcome: "SUCCEEDED"
        }
      })
      .expect(201);

    const operationsResponse = await request(httpServer)
      .get("/payments/operations")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(operationsResponse.body.total).toBe(1);
    expect(operationsResponse.body.items[0]?.status).toBe("COMPLETED");

    const settlementResponse = await request(httpServer)
      .post("/payments/settlements")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        providerKey: "phase16-webhook-card",
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-01T23:59:59.000Z",
        totalAmount: order.total,
        settledAmount: order.total,
        summary: {
          batch: "batch-001"
        }
      })
      .expect(201);
    expect(settlementResponse.body.status).toBe("IMPORTED");

    const hardwareJobResponse = await request(httpServer)
      .post("/payments/hardware/jobs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        orderId: order.id,
        connectorKey: "printer-core",
        kind: "PRINT_RECEIPT",
        requestPayload: {
          copy: "merchant"
        }
      })
      .expect(201);
    expect(hardwareJobResponse.body.status).toBe("COMPLETED");

    const failedHardwareJobResponse = await request(httpServer)
      .post("/payments/hardware/jobs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        orderId: order.id,
        connectorKey: "terminal-core",
        kind: "TERMINAL_CAPTURE",
        requestPayload: {
          forceFailure: true
        }
      })
      .expect(201);
    expect(failedHardwareJobResponse.body.status).toBe("FAILED");

    const webhooksResponse = await request(httpServer)
      .get("/payments/webhooks")
      .query({ tenantId: tenant.id, providerKey: "phase16-webhook-card" })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(webhooksResponse.body.total).toBe(2);

    const settlementsResponse = await request(httpServer)
      .get("/payments/settlements")
      .query({ tenantId: tenant.id, providerKey: "phase16-webhook-card" })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(settlementsResponse.body.total).toBe(1);

    const hardwareJobsResponse = await request(httpServer)
      .get("/payments/hardware/jobs")
      .query({ tenantId: tenant.id, orderId: order.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(hardwareJobsResponse.body.total).toBe(2);

    const hardwareReceiptsResponse = await request(httpServer)
      .get("/payments/hardware/receipts")
      .query({ tenantId: tenant.id, orderId: order.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(hardwareReceiptsResponse.body.total).toBe(1);

    const connectorExecutionsResponse = await request(httpServer)
      .get("/payments/connector-executions")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(connectorExecutionsResponse.body.total).toBeGreaterThanOrEqual(5);
  });
});
