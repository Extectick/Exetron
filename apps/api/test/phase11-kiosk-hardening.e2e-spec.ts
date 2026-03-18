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

describe("PHASE 11 kiosk token hardening", () => {
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

  it("issues signed kiosk access tokens and rejects unsigned public bootstrap and checkout", async () => {
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
        slug: "phase11-kiosk-hardening",
        name: "Phase 11 Hardening Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase11-store",
        name: "Phase 11 Store",
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
        code: "PHASE11-KIOSK",
        name: "Phase 11 Kiosk",
        type: "KIOSK"
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
        code: "phase11-coffee",
        name: "Phase 11 Coffee",
        basePrice: "5.40"
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    await request(httpServer)
      .get("/kiosk/bootstrap")
      .query({ deviceId: device.id })
      .expect(401);

    const kioskAccessResponse = await request(httpServer)
      .post(`/devices/${device.id}/kiosk-access-token`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(201);
    const kioskAccess = kioskAccessResponse.body as {
      deviceId: string;
      accessToken: string;
      kioskPath: string;
    };

    expect(kioskAccess.deviceId).toBe(device.id);
    expect(kioskAccess.kioskPath).toContain(`/kiosk/${device.id}?token=`);

    await request(httpServer)
      .get("/kiosk/bootstrap")
      .query({ deviceId: device.id, accessToken: "invalid-token" })
      .expect(401);

    const bootstrapResponse = await request(httpServer)
      .get("/kiosk/bootstrap")
      .query({ deviceId: device.id, accessToken: kioskAccess.accessToken })
      .expect(200);
    expect(bootstrapResponse.body.deviceId).toBe(device.id);

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

    const checkoutResponse = await request(httpServer)
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
      .expect(201);

    expect(checkoutResponse.body.order.channel).toBe("KIOSK");
    expect(checkoutResponse.body.paymentHandoff.status).toBe("COMPLETED");

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: "device.kiosk_access_token_issued",
        entityId: device.id
      }
    });
    expect(auditLogs).toHaveLength(1);
  });
});
