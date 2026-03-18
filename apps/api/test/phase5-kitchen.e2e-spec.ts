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

describe("PHASE 5 kitchen and board runtime", () => {
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

  it("creates kitchen tickets on order confirmation and updates board status through kitchen flow", async () => {
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
        slug: "phase5-kitchen",
        name: "Phase 5 Kitchen Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "store-a",
        name: "Store A",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string };

    const otherStoreResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "store-b",
        name: "Store B",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const otherStore = otherStoreResponse.body as { id: string };

    await request(httpServer)
      .put("/settings/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: store.id,
        key: "kitchen.routing",
        value: {
          defaultStationKey: "KITCHEN",
          productCodeMap: {
            latte: "BAR",
            burger: "HOT"
          }
        }
      })
      .expect(200);

    const drinksCategoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "drinks",
        name: "Drinks"
      })
      .expect(201);
    const drinksCategory = drinksCategoryResponse.body as { id: string };

    const mainsCategoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "mains",
        name: "Mains"
      })
      .expect(201);
    const mainsCategory = mainsCategoryResponse.body as { id: string };

    const latteResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: drinksCategory.id,
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
        categoryId: mainsCategory.id,
        code: "burger",
        name: "Burger",
        basePrice: "8.00"
      })
      .expect(201);
    const burger = burgerResponse.body as { id: string };

    const cashierRoleResponse = await request(httpServer)
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
          "orders.write"
        ]
      })
      .expect(201);
    const cashierRole = cashierRoleResponse.body as { id: string };

    const kitchenRoleResponse = await request(httpServer)
      .post("/roles")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        key: "kitchen",
        name: "Kitchen",
        permissionKeys: ["orders.read", "kitchen.read", "kitchen.write", "board.read"]
      })
      .expect(201);
    const kitchenRole = kitchenRoleResponse.body as { id: string };

    const cashierPassword = "CashierPass123!";
    await request(httpServer)
      .post("/users")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        email: "cashier.phase5@exetron.local",
        firstName: "Cashier",
        lastName: "Phase5",
        password: cashierPassword,
        roleIds: [cashierRole.id],
        storeIds: [store.id]
      })
      .expect(201);

    const kitchenPassword = "KitchenPass123!";
    await request(httpServer)
      .post("/users")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        email: "kitchen.phase5@exetron.local",
        firstName: "Kitchen",
        lastName: "Phase5",
        password: kitchenPassword,
        roleIds: [kitchenRole.id],
        storeIds: [store.id]
      })
      .expect(201);

    const cashierLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: "cashier.phase5@exetron.local",
        password: cashierPassword
      })
      .expect(201);
    const cashierTokens = cashierLogin.body as AuthTokens;

    const kitchenLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: "kitchen.phase5@exetron.local",
        password: kitchenPassword
      })
      .expect(201);
    const kitchenTokens = kitchenLogin.body as AuthTokens;

    const cartResponse = await request(httpServer)
      .post("/carts")
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        storeId: store.id,
        channel: "POS",
        customerName: "Kitchen Guest"
      })
      .expect(201);
    const cart = cartResponse.body as { id: string };

    await request(httpServer)
      .post(`/carts/${cart.id}/items`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        productId: latte.id,
        quantity: 1
      })
      .expect(201);

    await request(httpServer)
      .post(`/carts/${cart.id}/items`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        productId: burger.id,
        quantity: 1
      })
      .expect(201);

    const orderResponse = await request(httpServer)
      .post(`/carts/${cart.id}/checkout`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        note: "Kitchen board order"
      })
      .expect(201);
    const order = orderResponse.body as { id: string; status: string };
    expect(order.status).toBe("PLACED");

    await request(httpServer)
      .post(`/orders/${order.id}/transition`)
      .set("Authorization", `Bearer ${cashierTokens.accessToken}`)
      .send({
        toStatus: "CONFIRMED"
      })
      .expect(201);

    const kitchenTicketsResponse = await request(httpServer)
      .get("/kitchen/tickets")
      .query({ storeId: store.id })
      .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
      .expect(200);
    const kitchenTickets = kitchenTicketsResponse.body as {
      items: Array<{ id: string; stationKey: string; status: string }>;
    };

    expect(kitchenTickets.items).toHaveLength(2);
    expect(kitchenTickets.items.map((item) => item.stationKey).sort()).toEqual(["BAR", "HOT"]);
    expect(kitchenTickets.items.every((item) => item.status === "NEW")).toBe(true);

    await request(httpServer)
      .get("/kitchen/tickets")
      .query({ storeId: otherStore.id })
      .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
      .expect(403);

    const boardInitialResponse = await request(httpServer)
      .get("/board/orders")
      .query({ storeId: store.id })
      .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
      .expect(200);
    const boardInitial = boardInitialResponse.body as {
      items: Array<{ orderId: string; boardStatus: string; orderStatus: string }>;
    };
    expect(boardInitial.items[0]?.orderId).toBe(order.id);
    expect(boardInitial.items[0]?.boardStatus).toBe("NEW");
    expect(boardInitial.items[0]?.orderStatus).toBe("CONFIRMED");

    for (const ticket of kitchenTickets.items) {
      await request(httpServer)
        .post(`/kitchen/tickets/${ticket.id}/transition`)
        .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
        .send({
          toStatus: "IN_PROGRESS"
        })
        .expect(201);
    }

    const boardInPreparationResponse = await request(httpServer)
      .get("/board/orders")
      .query({ storeId: store.id })
      .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
      .expect(200);
    const boardInPreparation = boardInPreparationResponse.body as {
      items: Array<{ boardStatus: string; orderStatus: string }>;
    };
    expect(boardInPreparation.items[0]?.boardStatus).toBe("IN_PROGRESS");
    expect(boardInPreparation.items[0]?.orderStatus).toBe("IN_PREPARATION");

    for (const ticket of kitchenTickets.items) {
      await request(httpServer)
        .post(`/kitchen/tickets/${ticket.id}/transition`)
        .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
        .send({
          toStatus: "READY"
        })
        .expect(201);
    }

    const boardReadyResponse = await request(httpServer)
      .get("/board/orders")
      .query({ storeId: store.id })
      .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
      .expect(200);
    const boardReady = boardReadyResponse.body as {
      items: Array<{ boardStatus: string; orderStatus: string }>;
    };
    expect(boardReady.items[0]?.boardStatus).toBe("READY");
    expect(boardReady.items[0]?.orderStatus).toBe("READY");

    for (const ticket of kitchenTickets.items) {
      await request(httpServer)
        .post(`/kitchen/tickets/${ticket.id}/transition`)
        .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
        .send({
          toStatus: "COMPLETED"
        })
        .expect(201);
    }

    const boardCompletedResponse = await request(httpServer)
      .get("/board/orders")
      .query({ storeId: store.id })
      .set("Authorization", `Bearer ${kitchenTokens.accessToken}`)
      .expect(200);
    const boardCompleted = boardCompletedResponse.body as {
      items: Array<{ boardStatus: string; orderStatus: string }>;
    };
    expect(boardCompleted.items[0]?.boardStatus).toBe("COMPLETED");
    expect(boardCompleted.items[0]?.orderStatus).toBe("COMPLETED");

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: {
        eventName: {
          in: ["kitchen.ticket_created", "kitchen.ticket_status_changed", "order.status_changed"]
        }
      }
    });

    expect(outboxEvents.map((event) => event.eventName)).toEqual(
      expect.arrayContaining([
        "kitchen.ticket_created",
        "kitchen.ticket_status_changed",
        "order.status_changed"
      ])
    );
  });
});
