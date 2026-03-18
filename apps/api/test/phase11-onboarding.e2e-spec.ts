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

describe("PHASE 11 onboarding bootstrap", () => {
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

  it("bootstraps tenant, store and devices through a single platform-admin onboarding flow", async () => {
    const adminLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: env.PLATFORM_ADMIN_EMAIL,
        password: env.PLATFORM_ADMIN_PASSWORD
      })
      .expect(201);
    const adminTokens = adminLogin.body as AuthTokens;

    const onboardingResponse = await request(httpServer)
      .post("/onboarding/bootstrap")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenant: {
          slug: "phase11-onboarding",
          name: "Phase 11 Onboarding Tenant"
        },
        store: {
          code: "phase11-launch",
          name: "Phase 11 Launch Store",
          timezone: "Asia/Novosibirsk"
        },
        devices: [
          {
            code: "PH11-POS-001",
            name: "Phase 11 POS",
            type: "POS"
          },
          {
            code: "PH11-KIOSK-001",
            name: "Phase 11 Kiosk",
            type: "KIOSK",
            issueKioskAccessToken: true
          }
        ]
      })
      .expect(201);
    const onboarding = onboardingResponse.body as {
      tenant: { id: string; slug: string };
      store: { id: string; tenantId: string; code: string };
      devices: Array<{
        device: { id: string; tenantId: string; storeId: string; code: string; type: string };
        bootstrapSecret: string;
        kioskAccessToken: null | {
          deviceId: string;
          accessToken: string;
          kioskPath: string;
        };
      }>;
    };

    expect(onboarding.tenant.slug).toBe("phase11-onboarding");
    expect(onboarding.store.tenantId).toBe(onboarding.tenant.id);
    expect(onboarding.store.code).toBe("phase11-launch");
    expect(onboarding.devices).toHaveLength(2);
    expect(onboarding.devices.every((entry) => entry.bootstrapSecret.length >= 32)).toBe(
      true
    );

    const kioskDevice = onboarding.devices.find(
      (entry) => entry.device.type === "KIOSK"
    );
    expect(kioskDevice?.kioskAccessToken?.deviceId).toBe(kioskDevice?.device.id);
    expect(kioskDevice?.kioskAccessToken?.kioskPath).toContain(
      `/kiosk/${kioskDevice?.device.id}?token=`
    );

    const bootstrapResponse = await request(httpServer)
      .get("/kiosk/bootstrap")
      .query({
        deviceId: kioskDevice?.device.id,
        accessToken: kioskDevice?.kioskAccessToken?.accessToken
      })
      .expect(200);

    expect(bootstrapResponse.body.deviceId).toBe(kioskDevice?.device.id);
    expect(bootstrapResponse.body.storeId).toBe(onboarding.store.id);

    const persistedDevices = await prisma.device.findMany({
      where: {
        tenantId: onboarding.tenant.id
      },
      orderBy: { code: "asc" }
    });
    expect(persistedDevices.map((device) => device.code)).toEqual([
      "PH11-KIOSK-001",
      "PH11-POS-001"
    ]);
    expect(persistedDevices.every((device) => device.status === "ACTIVE")).toBe(true);

    const onboardingAudit = await prisma.auditLog.findFirst({
      where: {
        action: "onboarding.bootstrap_completed",
        entityId: onboarding.tenant.id
      }
    });
    expect(onboardingAudit).not.toBeNull();
  });
});
