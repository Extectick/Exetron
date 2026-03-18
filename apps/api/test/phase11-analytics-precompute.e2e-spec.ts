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

describe("PHASE 11 analytics precompute", () => {
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

  it("creates owner-cabinet precompute artifacts and serves snapshot-only analytics reads", async () => {
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
        slug: "phase11-precompute",
        name: "Phase 11 Precompute Tenant"
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

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase11-analytics",
        name: "Phase 11 Analytics Store",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string };

    const deviceResponse = await request(httpServer)
      .post("/devices")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        code: "PH11-ANA-POS",
        name: "Phase 11 Analytics POS",
        type: "POS"
      })
      .expect(201);
    const device = deviceResponse.body as { id: string };

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase11-menu",
        name: "Phase 11 Menu"
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "phase11-flat-white",
        name: "Phase 11 Flat White",
        basePrice: "7.00"
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    const shiftResponse = await request(httpServer)
      .post("/pos/shifts")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        deviceId: device.id,
        openingCashAmount: "0.00"
      })
      .expect(201);
    const shift = shiftResponse.body as { id: string };

    const sessionResponse = await request(httpServer)
      .post("/pos/sessions")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        deviceId: device.id,
        shiftId: shift.id
      })
      .expect(201);
    const session = sessionResponse.body as { id: string };

    const cartResponse = await request(httpServer)
      .post("/carts")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        deviceId: device.id,
        channel: "POS"
      })
      .expect(201);
    const cart = cartResponse.body as { id: string };

    await request(httpServer)
      .post(`/carts/${cart.id}/items`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        productId: product.id,
        quantity: 2
      })
      .expect(201);

    const orderResponse = await request(httpServer)
      .post(`/carts/${cart.id}/checkout`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({})
      .expect(201);
    const order = orderResponse.body as { id: string; total: string };

    const paymentIntentResponse = await request(httpServer)
      .post("/pos/payment-intents")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        orderId: order.id,
        posSessionId: session.id,
        allocations: [{ method: "CASH", amount: order.total }]
      })
      .expect(201);
    const paymentIntent = paymentIntentResponse.body as {
      id: string;
      allocations: Array<{ id: string }>;
    };

    await request(httpServer)
      .post(
        `/payments/intents/${paymentIntent.id}/allocations/${paymentIntent.allocations[0]?.id}/process`
      )
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({})
      .expect(201);

    const precomputeResponse = await request(httpServer)
      .post("/analytics/precompute")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z",
        kind: "OWNER_DASHBOARD"
      })
      .expect(201);
    const precompute = precomputeResponse.body as {
      executionMode: string;
      status: string;
      artifactKey: string;
      snapshot: { id: string; artifactKey: string; payload: { revenue: string } };
    };

    expect(precompute.executionMode).toBe("INLINE");
    expect(precompute.status).toBe("COMPLETED");
    expect(precompute.snapshot.artifactKey).toBe(precompute.artifactKey);
    expect(precompute.snapshot.payload.revenue).toBe("14.00");

    const snapshotDashboardResponse = await request(httpServer)
      .get("/analytics/owner-cabinet")
      .query({
        tenantId: tenant.id,
        storeId: store.id,
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z",
        mode: "SNAPSHOT_ONLY"
      })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const snapshotDashboard = snapshotDashboardResponse.body as {
      dataSource: string;
      snapshotId: string | null;
      revenue: string;
    };

    expect(snapshotDashboard.dataSource).toBe("SNAPSHOT");
    expect(snapshotDashboard.snapshotId).toBe(precompute.snapshot.id);
    expect(snapshotDashboard.revenue).toBe("14.00");

    const liveDashboardResponse = await request(httpServer)
      .get("/analytics/owner-cabinet")
      .query({
        tenantId: tenant.id,
        storeId: store.id,
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z",
        mode: "LIVE"
      })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const liveDashboard = liveDashboardResponse.body as {
      dataSource: string;
      snapshotId: string | null;
      revenue: string;
    };

    expect(liveDashboard.dataSource).toBe("LIVE");
    expect(liveDashboard.snapshotId).toBeNull();
    expect(liveDashboard.revenue).toBe("14.00");

    const requestedAudit = await prisma.auditLog.findFirst({
      where: {
        action: "analytics.precompute_requested",
        entityId: precompute.artifactKey
      }
    });
    const completedAudit = await prisma.auditLog.findFirst({
      where: {
        action: "analytics.precompute_completed",
        entityId: precompute.artifactKey
      }
    });
    expect(requestedAudit).not.toBeNull();
    expect(completedAudit).not.toBeNull();
  });
});
