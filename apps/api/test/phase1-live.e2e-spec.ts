import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { loadApiEnv } from "@exetron/config";
import { prisma } from "@exetron/database";
import request from "supertest";
import { resetDatabase, seedPlatformAdmin } from "./db-test.utils";
import { AppModule } from "../src/app.module";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

type HttpServer = Parameters<typeof request>[0];

interface SimpleListBody<TItem> {
  items: TItem[];
  total: number;
}

describe("PHASE 1 live smoke", () => {
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

  it("verifies auth, platform core CRUD, RBAC, audit, settings and feature flags", async () => {
    const adminLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: env.PLATFORM_ADMIN_EMAIL,
        password: env.PLATFORM_ADMIN_PASSWORD
      })
      .expect(201);
    const adminTokens = adminLogin.body as AuthTokens;

    const adminMe = await request(httpServer)
      .get("/auth/me")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const adminMeBody = adminMe.body as {
      claims: { scope: string };
      permissions: string[];
    };

    expect(adminMeBody.claims.scope).toBe("platform_admin");
    expect(adminMeBody.permissions).toEqual([]);

    const refreshedAdmin = await request(httpServer)
      .post("/auth/refresh")
      .send({ refreshToken: adminTokens.refreshToken })
      .expect(201);
    const refreshedAdminTokens = refreshedAdmin.body as AuthTokens;

    const tenantResponse = await request(httpServer)
      .post("/tenants")
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .send({
        slug: "phase1-smoke",
        name: "Phase 1 Smoke Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string; slug: string };

    const brandResponse = await request(httpServer)
      .post("/brands")
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "main-brand",
        name: "Main Brand"
      })
      .expect(201);
    const brand = brandResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        brandId: brand.id,
        code: "nsk-1",
        name: "Novosibirsk One",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string; tenantId: string };

    await request(httpServer)
      .put("/settings/tenant")
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .send({
        key: "currency",
        value: { default: "RUB" }
      })
      .query({ tenantId: tenant.id })
      .expect(200);

    await request(httpServer)
      .put("/feature-flags")
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        key: "beta-menu",
        enabled: true,
        kind: "BOOLEAN"
      })
      .expect(200);

    const roleResponse = await request(httpServer)
      .post("/roles")
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        key: "ops-manager",
        name: "Ops Manager",
        permissionKeys: [
          "stores.read",
          "users.read",
          "devices.read",
          "devices.write",
          "audit.read",
          "settings.read",
          "feature_flags.read"
        ]
      })
      .expect(201);
    const role = roleResponse.body as { id: string };

    const userPassword = "TenantPass123!";
    const userResponse = await request(httpServer)
      .post("/users")
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        email: "tenant.manager@exetron.local",
        firstName: "Tenant",
        lastName: "Manager",
        password: userPassword,
        roleIds: [role.id],
        storeIds: [store.id]
      })
      .expect(201);
    const user = userResponse.body as { id: string };

    const tenantLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: "tenant.manager@exetron.local",
        password: userPassword
      })
      .expect(201);
    const tenantTokens = tenantLogin.body as AuthTokens;

    const storesResponse = await request(httpServer)
      .get("/stores")
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .expect(200);
    const storesBody = storesResponse.body as SimpleListBody<{ id: string }>;

    expect(storesBody.total).toBe(1);
    expect(storesBody.items[0]?.id).toBe(store.id);

    await request(httpServer)
      .post("/tenants")
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        slug: "should-fail",
        name: "Should Fail"
      })
      .expect(403);

    const deviceResponse = await request(httpServer)
      .post("/devices")
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        code: "POS-001",
        name: "Front POS",
        type: "POS"
      })
      .expect(201);
    const deviceBody = deviceResponse.body as { status: string; tenantId: string };

    expect(deviceBody.status).toBe("ACTIVE");
    expect(deviceBody.tenantId).toBe(tenant.id);

    const tenantSettings = await request(httpServer)
      .get("/settings/tenant")
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .expect(200);
    const tenantSettingsBody = tenantSettings.body as SimpleListBody<{
      key: string;
      tenantId: string;
    }>;

    expect(tenantSettingsBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "currency",
          tenantId: tenant.id
        })
      ])
    );

    const featureFlags = await request(httpServer)
      .get("/feature-flags")
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .expect(200);
    const featureFlagsBody = featureFlags.body as SimpleListBody<{
      key: string;
      enabled: boolean;
      storeId: string | null;
    }>;

    expect(featureFlagsBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "beta-menu",
          enabled: true,
          storeId: store.id
        })
      ])
    );

    const auditResponse = await request(httpServer)
      .get("/audit")
      .set("Authorization", `Bearer ${tenantTokens.accessToken}`)
      .expect(200);
    const auditBody = auditResponse.body as SimpleListBody<{
      action: string;
      entityType: string;
    }>;

    expect(auditBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "device.registered",
          entityType: "device"
        }),
        expect.objectContaining({
          action: "feature_flag.upserted",
          entityType: "feature_flag"
        }),
        expect.objectContaining({
          action: "tenant_setting.upserted",
          entityType: "tenant_setting"
        })
      ])
    );

    const adminUsers = await request(httpServer)
      .get("/users")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .expect(200);
    const adminUsersBody = adminUsers.body as SimpleListBody<{
      id: string;
      email: string;
    }>;

    expect(adminUsersBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: user.id,
          email: "tenant.manager@exetron.local"
        })
      ])
    );

    await request(httpServer)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${refreshedAdminTokens.accessToken}`)
      .send({ refreshToken: refreshedAdminTokens.refreshToken })
      .expect(201);

    await request(httpServer)
      .post("/auth/refresh")
      .send({
        refreshToken: refreshedAdminTokens.refreshToken
      })
      .expect(401);
  });
});
