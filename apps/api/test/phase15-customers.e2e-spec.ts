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

describe("PHASE 15 customers, loyalty, promotions, and repeat-order growth layer", () => {
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

  it("creates customer profiles, applies promotions, awards loyalty, and supports repeat orders", async () => {
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
        slug: "phase15-customers",
        name: "Phase 15 Customer Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "crm-store",
        name: "CRM Store",
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
          allowedPaymentMethods: ["CARD"]
        }
      })
      .expect(200);

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "coffee",
        name: "Coffee",
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
        code: "flat-white",
        name: "Flat White",
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
        providerKey: "phase15-card-provider",
        providerType: "CARD_SIMULATED",
        method: "CARD",
        allowedChannels: ["DELIVERY"],
        autoConfirmOrderOnSuccess: false,
        priority: 1,
        settings: {
          simulateResult: "SUCCEEDED",
          externalReferencePrefix: "phase15"
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/customers/promotions")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        code: "WELCOME10",
        name: "Welcome 10",
        type: "PERCENTAGE",
        value: "10.00"
      })
      .expect(201);

    await request(httpServer)
      .post("/customers/promotions")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        code: "POINTS5",
        name: "Points 5",
        type: "LOYALTY_REDEEM",
        value: "5.00",
        pointsCost: 10
      })
      .expect(201);

    const customerSessionResponse = await request(httpServer)
      .post("/storefront/customer-sessions")
      .send({
        storeCode: store.code,
        customerName: "Alice Growth",
        customerPhone: "+79135550102"
      })
      .expect(201);
    const customerSession = customerSessionResponse.body as {
      accessToken: string;
      customerPhone: string;
    };

    const bootstrapResponse = await request(httpServer)
      .get("/storefront/bootstrap")
      .query({
        storeCode: store.code,
        customerSessionToken: customerSession.accessToken
      })
      .expect(200);
    expect(bootstrapResponse.body.availablePromotions.map((item: { code: string }) => item.code)).toEqual(
      expect.arrayContaining(["WELCOME10", "POINTS5"])
    );

    const cartResponse = await request(httpServer)
      .post("/storefront/carts")
      .send({
        storeId: store.id,
        customerSessionToken: customerSession.accessToken
      })
      .expect(201);
    const cart = cartResponse.body as {
      cart: { id: string };
      access: { accessToken: string };
    };

    await request(httpServer)
      .post(`/storefront/carts/${cart.cart.id}/items`)
      .send({
        accessToken: cart.access.accessToken,
        productId: product.id,
        quantity: 2
      })
      .expect(201);

    const fulfillmentResponse = await request(httpServer)
      .patch(`/storefront/carts/${cart.cart.id}/fulfillment`)
      .send({
        accessToken: cart.access.accessToken,
        fulfillment: {
          mode: "PICKUP",
          pickupSlotLabel: "ASAP"
        }
      })
      .expect(200);
    expect(fulfillmentResponse.body.cart.fulfillment.mode).toBe("PICKUP");

    const promoResponse = await request(httpServer)
      .patch(`/storefront/carts/${cart.cart.id}/promotion`)
      .send({
        accessToken: cart.access.accessToken,
        customerSessionToken: customerSession.accessToken,
        code: "WELCOME10"
      })
      .expect(200);
    expect(promoResponse.body.cart.discountTotal).toBe("2.50");
    expect(promoResponse.body.cart.promotion.code).toBe("WELCOME10");

    const checkoutResponse = await request(httpServer)
      .post(`/storefront/carts/${cart.cart.id}/checkout`)
      .send({
        accessToken: cart.access.accessToken,
        customerSessionToken: customerSession.accessToken,
        paymentMethod: "CARD"
      })
      .expect(201);
    const checkout = checkoutResponse.body as {
      order: { id: string; total: string; customerProfileId: string | null };
    };

    expect(checkout.order.total).toBe("22.50");
    expect(checkout.order.customerProfileId).toEqual(expect.any(String));

    const profilesAfterFirstOrder = await request(httpServer)
      .get("/customers/profiles")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .query({
        tenantId: tenant.id
      })
      .expect(200);
    const firstProfile = profilesAfterFirstOrder.body.items[0] as {
      id: string;
      orderCount: number;
      segments: string[];
      loyalty: { pointsBalance: number };
    };

    expect(firstProfile.orderCount).toBe(1);
    expect(firstProfile.segments).toContain("NEW");
    expect(firstProfile.loyalty.pointsBalance).toBe(22);

    const customerOrdersResponse = await request(httpServer)
      .get("/storefront/customer-sessions/orders")
      .query({
        accessToken: customerSession.accessToken
      })
      .expect(200);
    const firstOrderEntry = customerOrdersResponse.body.items[0] as {
      orderId: string;
      canRepeatOrder: boolean;
    };
    expect(firstOrderEntry.orderId).toBe(checkout.order.id);
    expect(firstOrderEntry.canRepeatOrder).toBe(true);

    const repeatedCartResponse = await request(httpServer)
      .post(`/storefront/customer-sessions/orders/${checkout.order.id}/repeat`)
      .query({
        accessToken: customerSession.accessToken
      })
      .expect(201);
    const repeatedCart = repeatedCartResponse.body as {
      cart: { id: string; items: Array<{ id: string }> };
      access: { accessToken: string };
    };

    expect(repeatedCart.cart.items).toHaveLength(1);

    const loyaltyPromoResponse = await request(httpServer)
      .patch(`/storefront/carts/${repeatedCart.cart.id}/promotion`)
      .send({
        accessToken: repeatedCart.access.accessToken,
        customerSessionToken: customerSession.accessToken,
        code: "POINTS5"
      })
      .expect(200);
    expect(loyaltyPromoResponse.body.cart.discountTotal).toBe("5.00");
    expect(loyaltyPromoResponse.body.cart.promotion.code).toBe("POINTS5");

    const secondCheckoutResponse = await request(httpServer)
      .post(`/storefront/carts/${repeatedCart.cart.id}/checkout`)
      .send({
        accessToken: repeatedCart.access.accessToken,
        customerSessionToken: customerSession.accessToken,
        paymentMethod: "CARD"
      })
      .expect(201);
    const secondCheckout = secondCheckoutResponse.body as {
      order: { id: string; total: string };
    };
    expect(secondCheckout.order.total).toBe("20.00");

    const profilesAfterSecondOrder = await request(httpServer)
      .get("/customers/profiles")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .query({
        tenantId: tenant.id
      })
      .expect(200);
    const secondProfile = profilesAfterSecondOrder.body.items[0] as {
      id: string;
      orderCount: number;
      segments: string[];
      loyalty: { pointsBalance: number };
    };

    expect(secondProfile.id).toBe(firstProfile.id);
    expect(secondProfile.orderCount).toBe(2);
    expect(secondProfile.segments).toContain("REPEAT");
    expect(secondProfile.loyalty.pointsBalance).toBe(32);

    const eventsResponse = await request(httpServer)
      .get(`/orders/${secondCheckout.order.id}/events`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    expect(eventsResponse.body.items.map((item: { type: string }) => item.type)).toEqual(
      expect.arrayContaining([
        "customer.profile_linked",
        "customer.promotion_redeemed",
        "customer.loyalty_earned",
        "customer.retention_hook_queued"
      ])
    );

    const adjustedProfileResponse = await request(httpServer)
      .post(`/customers/profiles/${secondProfile.id}/loyalty/adjust`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        points: 5,
        description: "manual bonus"
      })
      .expect(201);
    expect(adjustedProfileResponse.body.loyalty.pointsBalance).toBe(37);
  });
});
