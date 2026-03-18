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

describe("PHASE 4 POS runtime", () => {
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

  it("starts POS shift/session, exposes bootstrap catalog, and records split payment selection", async () => {
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
        slug: "phase4-pos",
        name: "Phase 4 POS Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "pos-store",
        name: "POS Store",
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
        code: "POS-001",
        name: "Front POS",
        type: "POS"
      })
      .expect(201);
    const device = deviceResponse.body as { id: string };

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "coffee",
        name: "Coffee"
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const productResponse = await request(httpServer)
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
    const product = productResponse.body as { id: string };

    const variantResponse = await request(httpServer)
      .post(`/products/${product.id}/variants`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        code: "regular",
        name: "Regular",
        basePrice: "5.75"
      })
      .expect(201);
    const variant = variantResponse.body as { id: string };

    const roleResponse = await request(httpServer)
      .post("/roles")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        key: "cashier",
        name: "Cashier",
        permissionKeys: [
          "products.read",
          "carts.read",
          "carts.write",
          "orders.read",
          "orders.write",
          "order_events.read",
          "pos.read",
          "pos.write"
        ]
      })
      .expect(201);
    const role = roleResponse.body as { id: string };

    const cashierPassword = "CashierPass123!";
    await request(httpServer)
      .post("/users")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        email: "cashier@exetron.local",
        firstName: "POS",
        lastName: "Cashier",
        password: cashierPassword,
        roleIds: [role.id],
        storeIds: [store.id]
      })
      .expect(201);

    const cashierLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: "cashier@exetron.local",
        password: cashierPassword
      })
      .expect(201);
    const cashierTokens = cashierLogin.body as AuthTokens;

    const openShiftResponse = await request(httpServer)
      .post("/pos/shifts")
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        storeId: store.id,
        deviceId: device.id,
        openingCashAmount: "1000.00"
      })
      .expect(201);
    const shift = openShiftResponse.body as { id: string; status: string };
    expect(shift.status).toBe("OPEN");

    const startSessionResponse = await request(httpServer)
      .post("/pos/sessions")
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        storeId: store.id,
        deviceId: device.id,
        shiftId: shift.id
      })
      .expect(201);
    const session = startSessionResponse.body as { id: string; status: string };
    expect(session.status).toBe("ACTIVE");

    const bootstrapResponse = await request(httpServer)
      .get("/pos/bootstrap")
      .query({ deviceId: device.id })
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .expect(200);
    const bootstrap = bootstrapResponse.body as {
      activeShift: { id: string } | null;
      activeSession: { id: string } | null;
      catalog: {
        categories: Array<{
          products: Array<{
            id: string;
            variants: Array<{ id: string; effectivePrice: string | null }>;
          }>;
        }>;
      };
    };

    expect(bootstrap.activeShift?.id).toBe(shift.id);
    expect(bootstrap.activeSession?.id).toBe(session.id);
    expect(bootstrap.catalog.categories[0]?.products[0]?.id).toBe(product.id);
    expect(bootstrap.catalog.categories[0]?.products[0]?.variants[0]?.effectivePrice).toBe(
      "5.75"
    );

    const cartResponse = await request(httpServer)
      .post("/carts")
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        storeId: store.id,
        deviceId: device.id,
        channel: "POS",
        customerName: "POS Guest"
      })
      .expect(201);
    const cart = cartResponse.body as { id: string };

    const cartWithItemResponse = await request(httpServer)
      .post(`/carts/${cart.id}/items`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        productId: product.id,
        variantId: variant.id,
        quantity: 2
      })
      .expect(201);
    const cartWithItem = cartWithItemResponse.body as { total: string };
    expect(cartWithItem.total).toBe("11.50");

    const orderResponse = await request(httpServer)
      .post(`/carts/${cart.id}/checkout`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        note: "POS phase 4"
      })
      .expect(201);
    const order = orderResponse.body as { id: string; total: string; channel: string };
    expect(order.channel).toBe("POS");

    await request(httpServer)
      .post("/pos/payment-intents")
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        storeId: store.id,
        orderId: order.id,
        posSessionId: session.id,
        allocations: [
          { method: "CASH", amount: "5.00" },
          { method: "CARD", amount: "6.00" }
        ]
      })
      .expect(400);

    const paymentIntentResponse = await request(httpServer)
      .post("/pos/payment-intents")
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        storeId: store.id,
        orderId: order.id,
        posSessionId: session.id,
        allocations: [
          { method: "CASH", amount: "5.00" },
          { method: "CARD", amount: "6.50" }
        ]
      })
      .expect(201);
    const paymentIntent = paymentIntentResponse.body as {
      id: string;
      status: string;
      totalAmount: string;
      allocations: Array<{ method: string; amount: string }>;
    };

    expect(paymentIntent.status).toBe("PENDING");
    expect(paymentIntent.totalAmount).toBe(order.total);
    expect(paymentIntent.allocations.map((allocation) => allocation.method)).toEqual([
      "CASH",
      "CARD"
    ]);

    const heartbeatResponse = await request(httpServer)
      .patch(`/pos/sessions/${session.id}/heartbeat`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .expect(200);
    const heartbeatedSession = heartbeatResponse.body as {
      id: string;
      lastHeartbeatAt: string | null;
    };
    expect(heartbeatedSession.id).toBe(session.id);
    expect(heartbeatedSession.lastHeartbeatAt).not.toBeNull();

    const endedSessionResponse = await request(httpServer)
      .post(`/pos/sessions/${session.id}/end`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .expect(201);
    const endedSession = endedSessionResponse.body as { status: string; endedAt: string | null };
    expect(endedSession.status).toBe("ENDED");
    expect(endedSession.endedAt).not.toBeNull();

    const closedShiftResponse = await request(httpServer)
      .post(`/pos/shifts/${shift.id}/close`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        closingCashAmount: "1011.50"
      })
      .expect(201);
    const closedShift = closedShiftResponse.body as { status: string; closedAt: string | null };
    expect(closedShift.status).toBe("CLOSED");
    expect(closedShift.closedAt).not.toBeNull();

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: {
        eventName: {
          in: ["pos.shift_opened", "pos.session_started", "payment.intent_created"]
        }
      },
      orderBy: { createdAt: "asc" }
    });
    expect(outboxEvents.map((item) => item.eventName)).toEqual(
      expect.arrayContaining([
        "pos.shift_opened",
        "pos.session_started",
        "payment.intent_created"
      ])
    );
  });
});
