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

describe("PHASE 9 customization layer", () => {
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

  it("manages branding configs, evaluates rules, and applies customization to kiosk bootstrap and checkout", async () => {
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
        slug: "phase9-customization",
        name: "Phase 9 Customization Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase9-store",
        name: "Phase 9 Store",
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
        code: "KIOSK-PHASE9",
        name: "Phase 9 Kiosk",
        type: "KIOSK"
      })
      .expect(201);
    const device = deviceResponse.body as { id: string; code?: string };

    const kioskAccessResponse = await request(httpServer)
      .post(`/devices/${device.id}/kiosk-access-token`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(201);
    const kioskAccess = kioskAccessResponse.body as {
      accessToken: string;
    };

    const currentWeekday = new Date().getUTCDay();

    await request(httpServer)
      .put("/settings/tenant")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        key: "kiosk.rules",
        value: {
          allowNotes: true,
          requireCustomerName: false,
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
          defaultStationKey: "KITCHEN"
        }
      })
      .expect(200);

    const brandingResponse = await request(httpServer)
      .post("/customization/branding")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        channel: "KIOSK",
        pointKey: "KIOSK-PHASE9",
        config: {
          heroTitle: "Customization Hero",
          heroSubtitle: "Scoped per kiosk"
        }
      })
      .expect(201);
    const brandingConfig = brandingResponse.body as { id: string; scopeKey: string };
    expect(brandingConfig.scopeKey).toContain("point:KIOSK-PHASE9");

    const ruleResponse = await request(httpServer)
      .post("/customization/rules")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        channel: "KIOSK",
        pointKey: "KIOSK-PHASE9",
        key: "phase9-kiosk-guest-policy",
        description: "Require guest name and allow cash on kiosk weekdays",
        priority: 50,
        conditions: {
          weekdayIn: [currentWeekday]
        },
        actions: {
          patchSettings: {
            "kiosk.rules": {
              requireCustomerName: true,
              allowedPaymentMethods: ["CARD", "CASH"]
            }
          },
          setFeatureFlags: {
            "kiosk.priorityUpsell": true
          },
          patchBranding: {
            accentColor: "#2f7a5f"
          }
        }
      })
      .expect(201);
    const rule = ruleResponse.body as { id: string; status: string };
    expect(rule.status).toBe("ACTIVE");

    const evaluationResponse = await request(httpServer)
      .post("/customization/evaluate")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        channel: "KIOSK",
        pointKey: "KIOSK-PHASE9",
        inputs: {
          paymentMethod: "CASH"
        }
      })
      .expect(201);
    const evaluation = evaluationResponse.body as {
      appliedRules: Array<{ id: string }>;
      featureFlags: Record<string, boolean>;
      branding: { heroTitle: string; accentColor: string } | null;
      settings: {
        "kiosk.rules": {
          requireCustomerName: boolean;
          allowedPaymentMethods: string[];
        };
      };
    };

    expect(evaluation.appliedRules.map((item) => item.id)).toContain(rule.id);
    expect(evaluation.featureFlags["kiosk.priorityUpsell"]).toBe(true);
    expect(evaluation.branding?.heroTitle).toBe("Customization Hero");
    expect(evaluation.branding?.accentColor).toBe("#2f7a5f");
    expect(evaluation.settings["kiosk.rules"]?.requireCustomerName).toBe(true);
    expect(evaluation.settings["kiosk.rules"]?.allowedPaymentMethods).toEqual(["CARD", "CASH"]);

    const bootstrapResponse = await request(httpServer)
      .get("/kiosk/bootstrap")
      .query({ deviceId: device.id, accessToken: kioskAccess.accessToken })
      .expect(200);
    const bootstrap = bootstrapResponse.body as {
      branding: { heroTitle: string; heroSubtitle: string; accentColor: string };
      rules: { requireCustomerName: boolean; allowedPaymentMethods: string[] };
    };
    expect(bootstrap.branding.heroTitle).toBe("Customization Hero");
    expect(bootstrap.branding.heroSubtitle).toBe("Scoped per kiosk");
    expect(bootstrap.branding.accentColor).toBe("#2f7a5f");
    expect(bootstrap.rules.requireCustomerName).toBe(true);
    expect(bootstrap.rules.allowedPaymentMethods).toEqual(["CARD", "CASH"]);

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase9",
        name: "Phase 9 Menu"
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "phase9-latte",
        name: "Phase 9 Latte",
        basePrice: "6.50"
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    await request(httpServer)
      .post("/kiosk/checkout")
      .send({
        deviceId: device.id,
        accessToken: kioskAccess.accessToken,
        paymentMethod: "CASH",
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
        customerName: "Custom Guest",
        paymentMethod: "CASH",
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ]
      })
      .expect(201);
    const checkout = checkoutResponse.body as {
      order: { id: string; status: string; customerName: string | null };
      paymentHandoff: { method: string; status: string };
    };

    expect(checkout.order.status).toBe("CONFIRMED");
    expect(checkout.order.customerName).toBe("Custom Guest");
    expect(checkout.paymentHandoff.method).toBe("CASH");
    expect(checkout.paymentHandoff.status).toBe("COMPLETED");

    const persistedBranding = await prisma.customizationBrandingConfig.findUniqueOrThrow({
      where: { id: brandingConfig.id }
    });
    expect(persistedBranding.channel).toBe("KIOSK");

    const persistedRule = await prisma.customizationRule.findUniqueOrThrow({
      where: { id: rule.id }
    });
    expect(persistedRule.key).toBe("phase9-kiosk-guest-policy");

    const customizationAudit = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            "customization.branding_config_created",
            "customization.rule_created"
          ]
        }
      }
    });
    expect(customizationAudit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "customization.branding_config_created",
        "customization.rule_created"
      ])
    );

    const customizationOutbox = await prisma.outboxEvent.findMany({
      where: {
        eventName: {
          in: [
            "customization.branding_config_created",
            "customization.rule_created"
          ]
        }
      }
    });
    expect(customizationOutbox.map((entry) => entry.eventName)).toEqual(
      expect.arrayContaining([
        "customization.branding_config_created",
        "customization.rule_created"
      ])
    );
  });
});
