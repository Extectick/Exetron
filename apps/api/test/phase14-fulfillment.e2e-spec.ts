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

describe("PHASE 14 fulfillment depth for storefront and operator dispatch", () => {
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

  it("supports delivery, pickup and dine-in fulfillment flows with dispatch updates", async () => {
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
        slug: "phase14-fulfillment",
        name: "Phase 14 Fulfillment Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase14-store",
        name: "Phase 14 Store",
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
          allowedPaymentMethods: ["CARD", "CASH"]
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/fulfillment/config/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: store.id,
        enabledModes: ["DELIVERY", "PICKUP", "DINE_IN"],
        defaultMode: "DELIVERY",
        deliveryZones: [
          {
            code: "central",
            name: "Central Zone",
            postalCodes: ["630001", "630004"],
            fee: "4.50",
            etaMinMinutes: 20,
            etaMaxMinutes: 40,
            slaMinutes: 55,
            isActive: true
          }
        ],
        pickup: {
          enabled: true,
          leadTimeMinutes: 15,
          promisedWindowMinutes: 10,
          instructions: "Collect from the front desk."
        },
        dineIn: {
          enabled: true,
          leadTimeMinutes: 12,
          tables: [
            {
              code: "T1",
              label: "Window T1",
              capacity: 4,
              isActive: true
            }
          ]
        },
        providers: [
          {
            providerKey: "manual-dispatch",
            providerType: "MANUAL",
            enabled: true
          }
        ]
      })
      .expect(200);

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "bowls",
        name: "Bowls",
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
        code: "salmon-bowl",
        name: "Salmon Bowl",
        description: "Rice bowl with salmon",
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
        providerKey: "fulfillment-card-provider",
        providerType: "CARD_SIMULATED",
        method: "CARD",
        allowedChannels: ["DELIVERY"],
        autoConfirmOrderOnSuccess: false,
        priority: 1,
        settings: {
          simulateResult: "SUCCEEDED",
          externalReferencePrefix: "ff-card"
        }
      })
      .expect(201);

    const bootstrapResponse = await request(httpServer)
      .get("/storefront/bootstrap")
      .query({
        storeCode: store.code
      })
      .expect(200);
    const bootstrap = bootstrapResponse.body as {
      fulfillment: {
        defaultMode: string;
        enabledModes: string[];
        deliveryZones: Array<{ code: string; fee: string }>;
        dineIn: { tables: Array<{ code: string }> };
      };
    };

    expect(bootstrap.fulfillment.defaultMode).toBe("DELIVERY");
    expect(bootstrap.fulfillment.enabledModes).toEqual(
      expect.arrayContaining(["DELIVERY", "PICKUP", "DINE_IN"])
    );
    expect(bootstrap.fulfillment.deliveryZones[0]?.code).toBe("central");
    expect(bootstrap.fulfillment.deliveryZones[0]?.fee).toBe("4.50");
    expect(bootstrap.fulfillment.dineIn.tables[0]?.code).toBe("T1");

    const deliveryCartResponse = await request(httpServer)
      .post("/storefront/carts")
      .send({
        storeId: store.id,
        customerPhone: "+79135550001"
      })
      .expect(201);
    const deliveryCart = deliveryCartResponse.body as {
      cart: { id: string };
      access: { accessToken: string };
    };

    await request(httpServer)
      .post(`/storefront/carts/${deliveryCart.cart.id}/items`)
      .send({
        accessToken: deliveryCart.access.accessToken,
        productId: product.id,
        quantity: 1
      })
      .expect(201);

    const deliveryFulfillmentResponse = await request(httpServer)
      .patch(`/storefront/carts/${deliveryCart.cart.id}/fulfillment`)
      .send({
        accessToken: deliveryCart.access.accessToken,
        fulfillment: {
          mode: "DELIVERY",
          zoneCode: "central",
          addressLine1: "Lenina 10",
          postalCode: "630001",
          instructions: "Leave at reception"
        }
      })
      .expect(200);
    const deliveryCartAfterFulfillment = deliveryFulfillmentResponse.body as {
      cart: {
        total: string;
        fulfillment: {
          mode: string | null;
          fee: string;
          details: { zoneCode: string | null; addressLine1: string | null } | null;
        };
      };
    };

    expect(deliveryCartAfterFulfillment.cart.fulfillment.mode).toBe("DELIVERY");
    expect(deliveryCartAfterFulfillment.cart.fulfillment.fee).toBe("4.50");
    expect(deliveryCartAfterFulfillment.cart.total).toBe("17.00");
    expect(deliveryCartAfterFulfillment.cart.fulfillment.details?.zoneCode).toBe("central");
    expect(deliveryCartAfterFulfillment.cart.fulfillment.details?.addressLine1).toBe("Lenina 10");

    const deliveryCheckoutResponse = await request(httpServer)
      .post(`/storefront/carts/${deliveryCart.cart.id}/checkout`)
      .send({
        accessToken: deliveryCart.access.accessToken,
        customerPhone: "+79135550001",
        paymentMethod: "CARD"
      })
      .expect(201);
    const deliveryCheckout = deliveryCheckoutResponse.body as {
      order: {
        id: string;
        total: string;
        fulfillment: {
          mode: string | null;
          fee: string;
          status: string | null;
        };
      };
      tracking: { accessToken: string };
    };

    expect(deliveryCheckout.order.total).toBe("17.00");
    expect(deliveryCheckout.order.fulfillment.mode).toBe("DELIVERY");
    expect(deliveryCheckout.order.fulfillment.fee).toBe("4.50");
    expect(deliveryCheckout.order.fulfillment.status).toBe("PENDING");

    const deliveryProjectionResponse = await request(httpServer)
      .post(`/fulfillment/orders/${deliveryCheckout.order.id}/assignment`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        courierName: "Courier One",
        courierPhone: "+79000000001",
        courierExternalId: "courier-1"
      })
      .expect(201);
    const deliveryProjection = deliveryProjectionResponse.body as {
      fulfillment: {
        courier: { courierName: string | null } | null;
      };
    };
    expect(deliveryProjection.fulfillment.courier?.courierName).toBe("Courier One");

    const etaAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const promisedAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    await request(httpServer)
      .post(`/fulfillment/orders/${deliveryCheckout.order.id}/eta`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        etaAt,
        promisedAt
      })
      .expect(201);

    await request(httpServer)
      .post(`/fulfillment/orders/${deliveryCheckout.order.id}/status`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        status: "OUT_FOR_DELIVERY"
      })
      .expect(201);

    const deliveryTrackingResponse = await request(httpServer)
      .get(`/storefront/orders/${deliveryCheckout.order.id}/tracking`)
      .query({
        accessToken: deliveryCheckout.tracking.accessToken
      })
      .expect(200);
    const deliveryTracking = deliveryTrackingResponse.body as {
      fulfillment: {
        mode: string | null;
        status: string | null;
        etaAt: string | null;
        promisedAt: string | null;
        courier: { courierName: string | null } | null;
      };
      notifications: Array<{ templateKey: string | null }>;
    };

    expect(deliveryTracking.fulfillment.mode).toBe("DELIVERY");
    expect(deliveryTracking.fulfillment.status).toBe("OUT_FOR_DELIVERY");
    expect(deliveryTracking.fulfillment.etaAt).toBe(etaAt);
    expect(deliveryTracking.fulfillment.promisedAt).toBe(promisedAt);
    expect(deliveryTracking.fulfillment.courier?.courierName).toBe("Courier One");
    expect(deliveryTracking.notifications.map((item) => item.templateKey)).toContain(
      "storefront-out-for-delivery"
    );

    const pickupCartResponse = await request(httpServer)
      .post("/storefront/carts")
      .send({
        storeId: store.id,
        customerPhone: "+79135550002"
      })
      .expect(201);
    const pickupCart = pickupCartResponse.body as {
      cart: { id: string };
      access: { accessToken: string };
    };

    await request(httpServer)
      .post(`/storefront/carts/${pickupCart.cart.id}/items`)
      .send({
        accessToken: pickupCart.access.accessToken,
        productId: product.id,
        quantity: 1
      })
      .expect(201);

    const pickupFulfillmentResponse = await request(httpServer)
      .patch(`/storefront/carts/${pickupCart.cart.id}/fulfillment`)
      .send({
        accessToken: pickupCart.access.accessToken,
        fulfillment: {
          mode: "PICKUP",
          pickupSlotLabel: "18:15-18:25"
        }
      })
      .expect(200);
    expect(pickupFulfillmentResponse.body.cart.fulfillment.mode).toBe("PICKUP");
    expect(pickupFulfillmentResponse.body.cart.total).toBe("12.50");

    const pickupCheckoutResponse = await request(httpServer)
      .post(`/storefront/carts/${pickupCart.cart.id}/checkout`)
      .send({
        accessToken: pickupCart.access.accessToken,
        customerPhone: "+79135550002",
        paymentMethod: "CARD"
      })
      .expect(201);
    const pickupCheckout = pickupCheckoutResponse.body as {
      order: {
        id: string;
        fulfillment: {
          mode: string | null;
          status: string | null;
          fee: string;
        };
      };
      tracking: { accessToken: string };
    };

    expect(pickupCheckout.order.fulfillment.mode).toBe("PICKUP");
    expect(pickupCheckout.order.fulfillment.status).toBe("SCHEDULED");
    expect(pickupCheckout.order.fulfillment.fee).toBe("0.00");

    await request(httpServer)
      .post(`/fulfillment/orders/${pickupCheckout.order.id}/status`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        status: "READY_FOR_PICKUP"
      })
      .expect(201);

    const pickupTrackingResponse = await request(httpServer)
      .get(`/storefront/orders/${pickupCheckout.order.id}/tracking`)
      .query({
        accessToken: pickupCheckout.tracking.accessToken
      })
      .expect(200);
    expect(
      (pickupTrackingResponse.body as { notifications: Array<{ templateKey: string | null }> }).notifications.map(
        (item) => item.templateKey
      )
    ).toContain("storefront-pickup-ready");

    const dineInCartResponse = await request(httpServer)
      .post("/storefront/carts")
      .send({
        storeId: store.id,
        customerPhone: "+79135550003"
      })
      .expect(201);
    const dineInCart = dineInCartResponse.body as {
      cart: { id: string };
      access: { accessToken: string };
    };

    await request(httpServer)
      .post(`/storefront/carts/${dineInCart.cart.id}/items`)
      .send({
        accessToken: dineInCart.access.accessToken,
        productId: product.id,
        quantity: 1
      })
      .expect(201);

    const dineInFulfillmentResponse = await request(httpServer)
      .patch(`/storefront/carts/${dineInCart.cart.id}/fulfillment`)
      .send({
        accessToken: dineInCart.access.accessToken,
        fulfillment: {
          mode: "DINE_IN",
          tableCode: "T1",
          guestCount: 3
        }
      })
      .expect(200);
    const dineInCartAfter = dineInFulfillmentResponse.body as {
      cart: {
        fulfillment: {
          mode: string | null;
          status: string | null;
          details: { tableCode: string | null; guestCount: number | null } | null;
        };
      };
    };
    expect(dineInCartAfter.cart.fulfillment.mode).toBe("DINE_IN");
    expect(dineInCartAfter.cart.fulfillment.status).toBe("TABLE_ASSIGNED");
    expect(dineInCartAfter.cart.fulfillment.details?.tableCode).toBe("T1");
    expect(dineInCartAfter.cart.fulfillment.details?.guestCount).toBe(3);

    const dineInCheckoutResponse = await request(httpServer)
      .post(`/storefront/carts/${dineInCart.cart.id}/checkout`)
      .send({
        accessToken: dineInCart.access.accessToken,
        customerPhone: "+79135550003",
        paymentMethod: "CARD"
      })
      .expect(201);
    const dineInCheckout = dineInCheckoutResponse.body as {
      order: {
        id: string;
        fulfillment: {
          mode: string | null;
          status: string | null;
          details: { tableCode: string | null } | null;
        };
      };
    };

    expect(dineInCheckout.order.fulfillment.mode).toBe("DINE_IN");
    expect(dineInCheckout.order.fulfillment.status).toBe("TABLE_ASSIGNED");
    expect(dineInCheckout.order.fulfillment.details?.tableCode).toBe("T1");

    const dispatchBoardResponse = await request(httpServer)
      .get("/fulfillment/dispatch-board")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .query({
        storeId: store.id
      })
      .expect(200);
    const dispatchBoard = dispatchBoardResponse.body as {
      items: Array<{
        orderId: string;
        fulfillment: { mode: string | null };
      }>;
    };

    expect(dispatchBoard.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: deliveryCheckout.order.id,
          fulfillment: expect.objectContaining({
            mode: "DELIVERY"
          })
        }),
        expect.objectContaining({
          orderId: pickupCheckout.order.id,
          fulfillment: expect.objectContaining({
            mode: "PICKUP"
          })
        }),
        expect.objectContaining({
          orderId: dineInCheckout.order.id,
          fulfillment: expect.objectContaining({
            mode: "DINE_IN"
          })
        })
      ])
    );
  });
});
