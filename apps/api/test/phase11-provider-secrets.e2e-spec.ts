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

describe("PHASE 11 provider secrets handling", () => {
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

  it("stores provider secrets in encrypted persistence and only exposes redacted metadata via API", async () => {
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
        slug: "phase11-provider-secrets",
        name: "Phase 11 Provider Secrets Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase11-payments",
        name: "Phase 11 Payments Store",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string };

    const createResponse = await request(httpServer)
      .post("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        providerKey: "phase11-card-store",
        providerType: "CARD_SIMULATED",
        method: "CARD",
        allowedChannels: ["POS", "KIOSK"],
        autoConfirmOrderOnSuccess: true,
        settings: {
          simulateResult: "SUCCEEDED",
          externalReferencePrefix: "phase11-card"
        },
        secrets: {
          apiKey: "sk_test_phase11_secret_key",
          terminalToken: "terminal_phase11_token"
        }
      })
      .expect(201);
    const created = createResponse.body as {
      id: string;
      settings: Record<string, unknown> | null;
      secrets: null | {
        hasSecrets: boolean;
        keys: string[];
        updatedAt: string | null;
      };
    };

    expect(created.settings).toEqual({
      simulateResult: "SUCCEEDED",
      externalReferencePrefix: "phase11-card"
    });
    expect(created.secrets).toEqual({
      hasSecrets: true,
      keys: ["apiKey", "terminalToken"],
      updatedAt: expect.any(String)
    });

    const listResponse = await request(httpServer)
      .get("/payments/provider-configs")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .query({ tenantId: tenant.id, storeId: store.id })
      .expect(200);
    const listed = listResponse.body as {
      items: Array<{
        id: string;
        settings: Record<string, unknown> | null;
        secrets: null | { keys: string[] };
      }>;
    };

    expect(listed.items[0]?.id).toBe(created.id);
    expect(listed.items[0]?.settings).toEqual(created.settings);
    expect(listed.items[0]?.secrets?.keys).toEqual(["apiKey", "terminalToken"]);

    const persisted = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { id: created.id }
    });
    const persistedSettings = JSON.stringify(persisted.settings);
    expect(persistedSettings).toContain("__secretEnvelope");
    expect(persistedSettings).toContain("__secretMeta");
    expect(persistedSettings).not.toContain("sk_test_phase11_secret_key");
    expect(persistedSettings).not.toContain("terminal_phase11_token");

    const clearedResponse = await request(httpServer)
      .patch(`/payments/provider-configs/${created.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        secrets: null
      })
      .expect(200);
    const cleared = clearedResponse.body as {
      settings: Record<string, unknown> | null;
      secrets: null | { keys: string[] };
    };

    expect(cleared.settings).toEqual({
      simulateResult: "SUCCEEDED",
      externalReferencePrefix: "phase11-card"
    });
    expect(cleared.secrets).toBeNull();

    const persistedAfterClear = await prisma.paymentProviderConfig.findUniqueOrThrow({
      where: { id: created.id }
    });
    const persistedAfterClearSettings = JSON.stringify(persistedAfterClear.settings);
    expect(persistedAfterClearSettings).not.toContain("__secretEnvelope");
    expect(persistedAfterClearSettings).not.toContain("__secretMeta");
  });
});
