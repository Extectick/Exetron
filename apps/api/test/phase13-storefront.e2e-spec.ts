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

describe("PHASE 13 storefront and public commerce channel", () => {
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

  it("serves a public storefront, supports guest and customer flows, resolves QR links, and exposes tracking plus notification hooks", async () => {
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
        slug: "phase13-storefront",
        name: "Phase 13 Storefront Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "storefront-nsk",
        name: "Storefront NSK",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string; code: string };

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: store.id,
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
        storeId: store.id,
        key: "storefront.rules",
        value: {
          allowGuestCheckout: true,
          allowCustomerSessions: true,
          requireCustomerName: false,
          requireCustomerPhone: true,
          allowNotes: true,
          autoConfirmPaidOrders: false,
          allowedPaymentMethods: ["CARD", "QR"]
        }
      })
      .expect(200);

    await request(httpServer)
      .post("/customization/branding")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        channel: "DELIVERY",
        pointKey: "table-12",
        config: {
          heroTitle: "Order From Table 12",
          heroSubtitle: "Scan, add items, and follow status live."
        }
      })
      .expect(201);

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "pizza",
        name: "Pizza",
        sortOrder: 1
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "margherita",
        name: "Margherita",
        description: "Classic margherita",
        basePrice: "12.50"
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    await request(httpServer)
      .post("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        providerKey: "storefront-card-provider",
        providerType: "CARD_SIMULATED",
        method: "CARD",
        allowedChannels: ["DELIVERY"],
        autoConfirmOrderOnSuccess: false,
        priority: 1,
        settings: {
          simulateResult: "SUCCEEDED",
          externalReferencePrefix: "sf-card"
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        providerKey: "storefront-qr-provider",
        providerType: "QR_SIMULATED",
        method: "QR",
        allowedChannels: ["DELIVERY"],
        autoConfirmOrderOnSuccess: false,
        priority: 2,
        settings: {
          simulateResult: "SUCCEEDED",
          externalReferencePrefix: "sf-qr"
        }
      })
      .expect(201);

    const qrLinkResponse = await request(httpServer)
      .post("/storefront/qr-links")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        pointKey: "table-12",
        locale: "ru-RU"
      })
      .expect(201);
    const qrLink = qrLinkResponse.body as {
      accessToken: string;
      storefrontPath: string;
    };

    const qrResolutionResponse = await request(httpServer)
      .get(`/storefront/qr/${encodeURIComponent(qrLink.accessToken)}`)
      .expect(200);
    const qrResolution = qrResolutionResponse.body as {
      storeId: string;
      storeCode: string;
      pointKey: string | null;
    };

    expect(qrResolution.storeId).toBe(store.id);
    expect(qrResolution.storeCode).toBe(store.code);
    expect(qrResolution.pointKey).toBe("table-12");

    const bootstrapResponse = await request(httpServer)
      .get("/storefront/bootstrap")
      .query({
        storeCode: store.code,
        qrAccessToken: qrLink.accessToken
      })
      .expect(200);
    const bootstrap = bootstrapResponse.body as {
      storeId: string;
      pointKey: string | null;
      rules: {
        allowGuestCheckout: boolean;
        allowCustomerSessions: boolean;
      };
      branding: {
        heroTitle: string;
      };
      catalog: {
        categories: Array<{
          products: Array<{ id: string; name: string }>;
        }>;
      };
    };

    expect(bootstrap.storeId).toBe(store.id);
    expect(bootstrap.pointKey).toBe("table-12");
    expect(bootstrap.rules.allowGuestCheckout).toBe(true);
    expect(bootstrap.rules.allowCustomerSessions).toBe(true);
    expect(bootstrap.branding.heroTitle).toBe("Order From Table 12");
    expect(bootstrap.catalog.categories[0]?.products[0]?.id).toBe(product.id);

    const guestCartResponse = await request(httpServer)
      .post("/storefront/carts")
      .send({
        storeId: store.id
      })
      .expect(201);
    const guestCart = guestCartResponse.body as {
      cart: { id: string; channel: string; items: unknown[] };
      access: { accessToken: string };
      customerSession: null;
    };

    expect(guestCart.cart.channel).toBe("DELIVERY");
    expect(guestCart.cart.items).toEqual([]);
    expect(guestCart.customerSession).toBeNull();

    const guestCartWithItemResponse = await request(httpServer)
      .post(`/storefront/carts/${guestCart.cart.id}/items`)
      .send({
        accessToken: guestCart.access.accessToken,
        productId: product.id,
        quantity: 1
      })
      .expect(201);
    const guestCartWithItem = guestCartWithItemResponse.body as {
      cart: { items: Array<{ id: string }>; total: string };
    };

    expect(guestCartWithItem.cart.items).toHaveLength(1);
    expect(guestCartWithItem.cart.total).toBe("12.50");

    const customerSessionResponse = await request(httpServer)
      .post("/storefront/customer-sessions")
      .send({
        storeCode: store.code,
        customerName: "Alice Online",
        customerPhone: "+79135550101"
      })
      .expect(201);
    const customerSession = customerSessionResponse.body as {
      accessToken: string;
      customerPhone: string;
    };

    expect(customerSession.customerPhone).toBe("+79135550101");

    const customerOrdersBeforeResponse = await request(httpServer)
      .get("/storefront/customer-sessions/orders")
      .query({
        accessToken: customerSession.accessToken
      })
      .expect(200);
    expect(customerOrdersBeforeResponse.body.items).toEqual([]);

    const customerCartResponse = await request(httpServer)
      .post("/storefront/carts")
      .send({
        storeId: store.id,
        qrAccessToken: qrLink.accessToken,
        customerSessionToken: customerSession.accessToken,
        note: "Window seat"
      })
      .expect(201);
    const customerCart = customerCartResponse.body as {
      cart: { id: string; customerPhone: string | null; note: string | null };
      access: { accessToken: string };
      customerSession: { customerPhone: string };
    };

    expect(customerCart.cart.customerPhone).toBe("+79135550101");
    expect(customerCart.cart.note).toBe("Window seat");
    expect(customerCart.customerSession.customerPhone).toBe("+79135550101");

    await request(httpServer)
      .post(`/storefront/carts/${customerCart.cart.id}/items`)
      .send({
        accessToken: customerCart.access.accessToken,
        productId: product.id,
        quantity: 2
      })
      .expect(201);

    const checkoutResponse = await request(httpServer)
      .post(`/storefront/carts/${customerCart.cart.id}/checkout`)
      .send({
        accessToken: customerCart.access.accessToken,
        customerSessionToken: customerSession.accessToken,
        paymentMethod: "CARD"
      })
      .expect(201);
    const checkout = checkoutResponse.body as {
      order: { id: string; channel: string; status: string; customerPhone: string | null };
      paymentIntent: { status: string; allocations: Array<{ method: string }> };
      tracking: { accessToken: string; trackingPath: string };
    };

    expect(checkout.order.channel).toBe("DELIVERY");
    expect(checkout.order.status).toBe("CONFIRMED");
    expect(checkout.order.customerPhone).toBe("+79135550101");
    expect(checkout.paymentIntent.status).toBe("COMPLETED");
    expect(checkout.paymentIntent.allocations[0]?.method).toBe("CARD");
    expect(checkout.tracking.trackingPath).toContain(`/order-tracking/${checkout.order.id}`);

    const trackingResponse = await request(httpServer)
      .get(`/storefront/orders/${checkout.order.id}/tracking`)
      .query({
        accessToken: checkout.tracking.accessToken
      })
      .expect(200);
    const tracking = trackingResponse.body as {
      order: { status: string };
      events: Array<{ type: string }>;
      notifications: Array<{ templateKey: string | null }>;
    };

    expect(tracking.order.status).toBe("CONFIRMED");
    expect(tracking.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "order.placed",
        "storefront.status_hook_emitted",
        "storefront.notification_queued",
        "order.status_changed"
      ])
    );
    expect(tracking.notifications.map((item) => item.templateKey)).toEqual(
      expect.arrayContaining(["storefront-order-placed", "storefront-order-confirmed"])
    );

    await request(httpServer)
      .post(`/orders/${checkout.order.id}/transition`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        toStatus: "IN_PREPARATION"
      })
      .expect(201);

    await request(httpServer)
      .post(`/orders/${checkout.order.id}/transition`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        toStatus: "READY"
      })
      .expect(201);

    const readyTrackingResponse = await request(httpServer)
      .get(`/storefront/orders/${checkout.order.id}/tracking`)
      .query({
        accessToken: checkout.tracking.accessToken
      })
      .expect(200);
    const readyTracking = readyTrackingResponse.body as {
      order: { status: string };
      notifications: Array<{ templateKey: string | null }>;
    };

    expect(readyTracking.order.status).toBe("READY");
    expect(readyTracking.notifications.map((item) => item.templateKey)).toContain(
      "storefront-order-ready"
    );

    const customerOrdersAfterResponse = await request(httpServer)
      .get("/storefront/customer-sessions/orders")
      .query({
        accessToken: customerSession.accessToken
      })
      .expect(200);
    const customerOrdersAfter = customerOrdersAfterResponse.body as {
      items: Array<{ orderId: string; tracking: { accessToken: string } }>;
    };

    expect(customerOrdersAfter.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: checkout.order.id,
          tracking: expect.objectContaining({
            accessToken: expect.any(String)
          })
        })
      ])
    );
  });
});
