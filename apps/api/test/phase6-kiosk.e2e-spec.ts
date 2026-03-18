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

describe("PHASE 6 kiosk runtime", () => {
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

  it("serves public kiosk bootstrap, creates kiosk orders, routes payments through the generic runtime, and enters kitchen flow", async () => {
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
        slug: "phase6-kiosk",
        name: "Phase 6 Kiosk Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "kiosk-store",
        name: "Kiosk Store",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string; name: string };

    const deviceResponse = await request(httpServer)
      .post("/devices")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        code: "KIOSK-001",
        name: "Front Kiosk",
        type: "KIOSK"
      })
      .expect(201);
    const device = deviceResponse.body as { id: string; name: string };

    const kioskAccessResponse = await request(httpServer)
      .post(`/devices/${device.id}/kiosk-access-token`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(201);
    const kioskAccess = kioskAccessResponse.body as {
      deviceId: string;
      accessToken: string;
      expiresAt: string;
      kioskPath: string;
    };

    expect(kioskAccess.deviceId).toBe(device.id);
    expect(kioskAccess.accessToken.length).toBeGreaterThan(20);
    expect(kioskAccess.kioskPath).toContain(`/kiosk/${device.id}?token=`);

    await request(httpServer)
      .put("/settings/tenant")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        key: "kiosk.branding",
        value: {
          logoText: "Tenant Branding",
          heroTitle: "Tenant Title"
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: store.id,
        key: "kiosk.branding",
        value: {
          logoText: "Store Branding",
          heroTitle: "Order Here",
          heroSubtitle: "Self-service for the front counter",
          accentColor: "#14735f",
          surfaceColor: "#f6f1e8"
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: store.id,
        key: "kiosk.rules",
        value: {
          allowNotes: false,
          requireCustomerName: true,
          allowedPaymentMethods: ["CARD"],
          autoConfirmPaidOrders: true
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: store.id,
        key: "kitchen.routing",
        value: {
          defaultStationKey: "KITCHEN",
          productCodeMap: {
            burger: "HOT"
          }
        }
      })
      .expect(200);

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "mains",
        name: "Mains"
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "burger",
        name: "Burger",
        description: "Phase 6 kiosk burger",
        basePrice: "8.90"
      })
      .expect(201);
    const product = productResponse.body as { id: string; name: string };

    const bootstrapResponse = await request(httpServer)
      .get("/kiosk/bootstrap")
      .query({ deviceId: device.id })
      .expect(401);

    expect(bootstrapResponse.body.message).toBe("Kiosk access token is required.");

    const authorizedBootstrapResponse = await request(httpServer)
      .get("/kiosk/bootstrap")
      .query({ deviceId: device.id, accessToken: kioskAccess.accessToken })
      .expect(200);
    const bootstrap = authorizedBootstrapResponse.body as {
      tenantId: string;
      storeId: string;
      deviceId: string;
      storeName: string;
      deviceName: string;
      branding: {
        logoText: string;
        heroTitle: string;
      };
      rules: {
        allowNotes: boolean;
        requireCustomerName: boolean;
        allowedPaymentMethods: string[];
      };
      catalog: {
        categories: Array<{
          products: Array<{ id: string; name: string; effectivePrice: string | null }>;
        }>;
      };
    };

    expect(bootstrap.tenantId).toBe(tenant.id);
    expect(bootstrap.storeId).toBe(store.id);
    expect(bootstrap.deviceId).toBe(device.id);
    expect(bootstrap.storeName).toBe(store.name);
    expect(bootstrap.deviceName).toBe(device.name);
    expect(bootstrap.branding.logoText).toBe("Store Branding");
    expect(bootstrap.branding.heroTitle).toBe("Order Here");
    expect(bootstrap.rules.allowNotes).toBe(false);
    expect(bootstrap.rules.requireCustomerName).toBe(true);
    expect(bootstrap.rules.allowedPaymentMethods).toEqual(["CARD"]);
    expect(bootstrap.catalog.categories[0]?.products[0]?.id).toBe(product.id);
    expect(bootstrap.catalog.categories[0]?.products[0]?.name).toBe(product.name);
    expect(bootstrap.catalog.categories[0]?.products[0]?.effectivePrice).toBe("8.90");

    await request(httpServer)
      .post("/kiosk/checkout")
      .send({
        deviceId: device.id,
        paymentMethod: "CARD",
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ]
      })
      .expect(401);

    await request(httpServer)
      .post("/kiosk/checkout")
      .send({
        deviceId: device.id,
        accessToken: kioskAccess.accessToken,
        paymentMethod: "CARD",
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ]
      })
      .expect(400);

    const checkoutResponse = await request(httpServer)
      .post("/kiosk/checkout")
      .send({
        deviceId: device.id,
        accessToken: kioskAccess.accessToken,
        customerName: "Kiosk Guest",
        paymentMethod: "CARD",
        items: [
          {
            productId: product.id,
            quantity: 2
          }
        ]
      })
      .expect(201);
    const checkout = checkoutResponse.body as {
      order: {
        id: string;
        number: string;
        channel: string;
        status: string;
        total: string;
        customerName: string | null;
        createdByUserId: string | null;
      };
      paymentHandoff: {
        id: string;
        orderId: string;
        method: string;
        status: string;
        amount: string;
      };
    };

    expect(checkout.order.channel).toBe("KIOSK");
    expect(checkout.order.status).toBe("CONFIRMED");
    expect(checkout.order.customerName).toBe("Kiosk Guest");
    expect(checkout.order.createdByUserId).toBeNull();
    expect(checkout.order.total).toBe("17.80");
    expect(checkout.paymentHandoff.orderId).toBe(checkout.order.id);
    expect(checkout.paymentHandoff.method).toBe("CARD");
    expect(checkout.paymentHandoff.status).toBe("COMPLETED");
    expect(checkout.paymentHandoff.amount).toBe("17.80");

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.order.id }
    });
    expect(persistedOrder.channel).toBe("KIOSK");
    expect(persistedOrder.status).toBe("CONFIRMED");
    expect(persistedOrder.deviceId).toBe(device.id);
    expect(persistedOrder.createdByUserId).toBeNull();

    expect(persistedOrder.cartId).not.toBeNull();
    const persistedCart = await prisma.cart.findUniqueOrThrow({
      where: { id: persistedOrder.cartId as string }
    });
    expect(persistedCart.channel).toBe("KIOSK");
    expect(persistedCart.createdByUserId).toBeNull();

    const paymentIntent = await prisma.paymentIntent.findFirstOrThrow({
      where: {
        orderId: checkout.order.id
      },
      include: {
        allocations: true
      }
    });
    expect(paymentIntent.channel).toBe("KIOSK");
    expect(paymentIntent.deviceId).toBe(device.id);
    expect(paymentIntent.status).toBe("COMPLETED");
    expect(paymentIntent.allocations[0]?.method).toBe("CARD");
    expect(paymentIntent.allocations[0]?.status).toBe("COMPLETED");

    const paymentAttempts = await prisma.paymentAttempt.findMany({
      where: {
        paymentIntentId: paymentIntent.id
      }
    });
    expect(paymentAttempts).toHaveLength(1);
    expect(paymentAttempts[0]?.status).toBe("SUCCEEDED");

    const legacyHandoffs = await prisma.kioskPaymentHandoff.findMany({
      where: {
        orderId: checkout.order.id
      }
    });
    expect(legacyHandoffs).toHaveLength(0);

    const kitchenTickets = await prisma.kitchenTicket.findMany({
      where: {
        orderId: checkout.order.id
      }
    });
    expect(kitchenTickets).toHaveLength(1);
    expect(kitchenTickets[0]?.stationKey).toBe("HOT");
    expect(kitchenTickets[0]?.status).toBe("NEW");

    const deviceAuditLogs = await prisma.auditLog.findMany({
      where: {
        actorType: "DEVICE",
        actorId: device.id,
        action: {
          in: [
            "cart.created",
            "order.placed",
            "payment.intent_created",
            "payment.attempt_succeeded"
          ]
        }
      }
    });
    expect(deviceAuditLogs.map((item) => item.action)).toEqual(
      expect.arrayContaining([
        "cart.created",
        "order.placed",
        "payment.intent_created",
        "payment.attempt_succeeded"
      ])
    );

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: {
        eventName: {
          in: [
            "order.placed",
            "payment.intent_created",
            "payment.attempt_succeeded",
            "order.kitchen_handoff_requested",
            "kitchen.ticket_created"
          ]
        }
      }
    });
    expect(outboxEvents.map((event) => event.eventName)).toEqual(
      expect.arrayContaining([
        "order.placed",
        "payment.intent_created",
        "payment.attempt_succeeded",
        "order.kitchen_handoff_requested",
        "kitchen.ticket_created"
      ])
    );
  });
});
