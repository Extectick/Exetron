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

describe("PHASE 3 orders core", () => {
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

  it("creates carts, snapshots pricing into orders, enforces transitions, and emits events", async () => {
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
        slug: "phase3-orders",
        name: "Phase 3 Orders Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "orders-store",
        name: "Orders Store",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string };

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "combo",
        name: "Combo"
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const modifierGroupResponse = await request(httpServer)
      .post("/modifier-groups")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "addons",
        name: "Addons",
        selectionMode: "MULTIPLE",
        minSelection: 0,
        maxSelection: 3
      })
      .expect(201);
    const modifierGroup = modifierGroupResponse.body as { id: string };

    const modifierOptionResponse = await request(httpServer)
      .post(`/modifier-groups/${modifierGroup.id}/options`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        code: "extra-cheese",
        name: "Extra Cheese",
        priceDelta: "1.00"
      })
      .expect(201);
    const modifierOption = modifierOptionResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "combo-meal",
        name: "Combo Meal",
        basePrice: "8.00",
        modifierGroupIds: [modifierGroup.id]
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    const variantResponse = await request(httpServer)
      .post(`/products/${product.id}/variants`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        code: "standard",
        name: "Standard",
        basePrice: "9.00"
      })
      .expect(201);
    const variant = variantResponse.body as { id: string };

    const priceListResponse = await request(httpServer)
      .post("/price-lists")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "orders-main",
        name: "Orders Main",
        currency: "RUB",
        items: [
          { targetType: "VARIANT", targetId: variant.id, price: "10.25" },
          { targetType: "MODIFIER_OPTION", targetId: modifierOption.id, price: "1.25" }
        ]
      })
      .expect(201);
    const priceList = priceListResponse.body as { id: string };

    const overrideResponse = await request(httpServer)
      .post("/store-catalog-overrides")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        targetType: "VARIANT",
        targetId: variant.id,
        priceOverride: "10.50"
      })
      .expect(201);
    const override = overrideResponse.body as { id: string };

    const roleResponse = await request(httpServer)
      .post("/roles")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        key: "order-ops",
        name: "Order Ops",
        permissionKeys: [
          "carts.read",
          "carts.write",
          "orders.read",
          "orders.write",
          "order_events.read"
        ]
      })
      .expect(201);
    const role = roleResponse.body as { id: string };

    const userPassword = "OrdersPass123!";
    await request(httpServer)
      .post("/users")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        email: "orders.operator@exetron.local",
        firstName: "Orders",
        lastName: "Operator",
        password: userPassword,
        roleIds: [role.id],
        storeIds: [store.id]
      })
      .expect(201);

    const tenantLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: "orders.operator@exetron.local",
        password: userPassword
      })
      .expect(201);
    const tenantTokens = tenantLogin.body as AuthTokens;

    const cartResponse = await request(httpServer)
      .post("/carts")
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        storeId: store.id,
        channel: "POS",
        customerName: "Alice"
      })
      .expect(201);
    const cart = cartResponse.body as { id: string; status: string };

    expect(cart.status).toBe("OPEN");

    const cartWithItemResponse = await request(httpServer)
      .post(`/carts/${cart.id}/items`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
        priceListId: priceList.id,
        modifierOptionIds: [modifierOption.id]
      })
      .expect(201);
    const cartWithItem = cartWithItemResponse.body as {
      items: Array<{ id: string; unitBasePrice: string | null; modifierTotal: string; lineTotal: string }>;
      subtotal: string;
      modifierTotal: string;
      total: string;
    };
    const cartItemId = cartWithItem.items[0]?.id;

    expect(cartWithItem.items[0]).toEqual(
      expect.objectContaining({
        unitBasePrice: "10.50",
        modifierTotal: "1.25",
        lineTotal: "11.75"
      })
    );
    expect(cartWithItem.total).toBe("11.75");

    const updatedCartResponse = await request(httpServer)
      .patch(`/carts/${cart.id}/items/${cartItemId}`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        quantity: 2
      })
      .expect(200);
    const updatedCart = updatedCartResponse.body as {
      subtotal: string;
      modifierTotal: string;
      total: string;
    };

    expect(updatedCart).toEqual(
      expect.objectContaining({
        subtotal: "21.00",
        modifierTotal: "2.50",
        total: "23.50"
      })
    );

    await request(httpServer)
      .patch("/store-catalog-overrides/" + override.id)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        priceOverride: "12.00"
      })
      .expect(200);

    const orderResponse = await request(httpServer)
      .post(`/carts/${cart.id}/checkout`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        note: "No onions"
      })
      .expect(201);
    const order = orderResponse.body as {
      id: string;
      status: string;
      total: string;
      note: string | null;
      items: Array<{
        unitBasePrice: string | null;
        modifierTotal: string;
        lineTotal: string;
        snapshot: Record<string, unknown>;
      }>;
    };

    expect(order.status).toBe("PLACED");
    expect(order.total).toBe("23.50");
    expect(order.note).toBe("No onions");
    expect(order.items[0]).toEqual(
      expect.objectContaining({
        unitBasePrice: "10.50",
        modifierTotal: "2.50",
        lineTotal: "23.50"
      })
    );
    expect(order.items[0]?.snapshot).toEqual(
      expect.objectContaining({
        priceListId: priceList.id,
        source: "store_override"
      })
    );

    const convertedCartResponse = await request(httpServer)
      .get(`/carts/${cart.id}`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .expect(200);
    const convertedCart = convertedCartResponse.body as { status: string };
    expect(convertedCart.status).toBe("CONVERTED");

    await request(httpServer)
      .post(`/orders/${order.id}/transition`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({ toStatus: "READY" })
      .expect(400);

    await request(httpServer)
      .post(`/orders/${order.id}/transition`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({ toStatus: "CONFIRMED" })
      .expect(201);

    await request(httpServer)
      .post(`/orders/${order.id}/transition`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({ toStatus: "IN_PREPARATION" })
      .expect(201);

    await request(httpServer)
      .post(`/orders/${order.id}/transition`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({ toStatus: "READY" })
      .expect(201);

    const completedOrderResponse = await request(httpServer)
      .post(`/orders/${order.id}/transition`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({ toStatus: "COMPLETED" })
      .expect(201);
    const completedOrder = completedOrderResponse.body as {
      status: string;
      completedAt: string | null;
    };
    expect(completedOrder.status).toBe("COMPLETED");
    expect(completedOrder.completedAt).not.toBeNull();

    const orderEventsResponse = await request(httpServer)
      .get(`/orders/${order.id}/events`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .expect(200);
    const orderEvents = orderEventsResponse.body as {
      items: Array<{ type: string }>;
    };

    expect(orderEvents.items.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "order.placed",
        "order.status_changed",
        "order.kitchen_handoff_requested"
      ])
    );

    const cartForCancelResponse = await request(httpServer)
      .post("/carts")
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        storeId: store.id
      })
      .expect(201);
    const cartForCancel = cartForCancelResponse.body as { id: string };

    await request(httpServer)
      .post(`/carts/${cartForCancel.id}/items`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
        modifierOptionIds: [modifierOption.id]
      })
      .expect(201);

    const cancellableOrderResponse = await request(httpServer)
      .post(`/carts/${cartForCancel.id}/checkout`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({})
      .expect(201);
    const cancellableOrder = cancellableOrderResponse.body as { id: string };

    const cancelledOrderResponse = await request(httpServer)
      .post(`/orders/${cancellableOrder.id}/transition`)
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        toStatus: "CANCELLED",
        reason: "Guest changed mind",
        hasExternalPayment: true
      })
      .expect(201);
    const cancelledOrder = cancelledOrderResponse.body as {
      status: string;
      refundStatus: string;
      cancelledAt: string | null;
      cancelReason: string | null;
    };

    expect(cancelledOrder).toEqual(
      expect.objectContaining({
        status: "CANCELLED",
        refundStatus: "PENDING_MANUAL",
        cancelReason: "Guest changed mind"
      })
    );
    expect(cancelledOrder.cancelledAt).not.toBeNull();

    const storedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        items: true
      }
    });
    const storedSnapshot = storedOrder.items[0]?.snapshot as Record<string, unknown>;

    expect(storedSnapshot).toEqual(
      expect.objectContaining({
        source: "store_override"
      })
    );
    expect(storedOrder.items[0]?.unitBasePrice?.toFixed(2)).toBe("10.50");

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { aggregateId: order.id },
      orderBy: { createdAt: "asc" }
    });
    expect(outboxEvents.map((item) => item.eventName)).toEqual(
      expect.arrayContaining(["order.placed", "order.kitchen_handoff_requested"])
    );
  });
});
