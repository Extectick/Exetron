import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { loadApiEnv } from "@exetron/config";
import { prisma } from "@exetron/database";
import request from "supertest";
import { AuditModule } from "../src/audit/audit.module";
import { BillingModule } from "../src/billing/billing.module";
import { CommonModule } from "../src/common/common.module";
import { EnvironmentModule } from "../src/common/environment.module";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../src/common/guards/permissions.guard";
import { AuthModule } from "../src/auth/auth.module";
import { DatabaseModule } from "../src/database/database.module";
import { DomainEventsModule } from "../src/domain-events/domain-events.module";
import { resetDatabase, seedPlatformAdmin } from "./db-test.utils";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

type HttpServer = Parameters<typeof request>[0];

describe("PHASE 17 billing foundation", () => {
  const env = loadApiEnv(process.env);
  let app: INestApplication;
  let httpServer: HttpServer;

  beforeAll(async () => {
    await resetDatabase();
    await seedPlatformAdmin();

    const moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        EnvironmentModule,
        DatabaseModule,
        CommonModule,
        AuditModule,
        DomainEventsModule,
        AuthModule,
        BillingModule
      ],
      providers: [
        Reflector,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard
        },
        {
          provide: APP_GUARD,
          useClass: PermissionsGuard
        }
      ]
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

  it("bootstraps tenant billing and supports thin CRUD/runtime operations", async () => {
    const adminLogin = await request(httpServer)
      .post("/auth/login")
      .send({
        email: env.PLATFORM_ADMIN_EMAIL,
        password: env.PLATFORM_ADMIN_PASSWORD
      })
      .expect(201);
    const adminTokens = adminLogin.body as AuthTokens;

    const tenant = await prisma.tenant.create({
      data: {
        slug: "phase17-billing",
        name: "Phase 17 Billing Tenant"
      }
    });

    const bootstrapResponse = await request(httpServer)
      .post("/billing/bootstrap")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        planCode: "starter",
        planName: "Starter Plan",
        planPriceAmount: "0.00",
        currency: "RUB",
        intervalKey: "MONTHLY",
        trialDays: 14,
        resellerCode: "reseller-core",
        resellerName: "Reseller Core"
      })
      .expect(201);

    expect(bootstrapResponse.body.tenantId).toBe(tenant.id);
    expect(bootstrapResponse.body.activePlan.code).toBe("starter");
    expect(bootstrapResponse.body.activeSubscription.status).toBe("TRIAL");
    expect(bootstrapResponse.body.activeTrial.status).toBe("ACTIVE");
    expect(bootstrapResponse.body.billingAccount.resellerAccountId).toEqual(expect.any(String));

    const createPlanResponse = await request(httpServer)
      .post("/billing/plans")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "pro",
        name: "Pro Plan",
        priceAmount: "1490.00",
        currency: "RUB",
        intervalKey: "MONTHLY",
        entitlements: { seats: 25, support: "priority" },
        quotas: { apiCalls: 10000 }
      })
      .expect(201);

    const proPlan = createPlanResponse.body as { id: string; code: string; status: string };
    expect(proPlan.code).toBe("pro");
    expect(proPlan.status).toBe("ACTIVE");

    await request(httpServer)
      .patch(`/billing/plans/${proPlan.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        name: "Pro Plan Updated",
        status: "ARCHIVED"
      })
      .expect(200);

    const createSubscriptionResponse = await request(httpServer)
      .post("/billing/subscriptions")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        planId: proPlan.id,
        currentPeriodDays: 30
      })
      .expect(201);

    const subscription = createSubscriptionResponse.body as {
      id: string;
      status: string;
      planId: string;
      billingAccountId: string;
    };
    expect(subscription.planId).toBe(proPlan.id);
    expect(subscription.status).toBe("ACTIVE");

    const createInvoiceResponse = await request(httpServer)
      .post("/billing/invoices")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        billingAccountId: subscription.billingAccountId,
        subscriptionId: subscription.id,
        subtotalAmount: "1490.00",
        totalAmount: "1490.00",
        lines: [
          {
            code: "pro-monthly",
            name: "Pro Plan Monthly",
            amount: "1490.00"
          }
        ]
      })
      .expect(201);

    expect(createInvoiceResponse.body.status).toBe("ISSUED");

    const entitlementResponse = await request(httpServer)
      .post("/billing/entitlements")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        key: "seats",
        scopeType: "TENANT",
        value: { limit: 25 },
        source: "BOOTSTRAP"
      })
      .expect(201);
    expect(entitlementResponse.body.key).toBe("seats");

    const quotaResponse = await request(httpServer)
      .post("/billing/quotas")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        key: "apiCalls",
        scopeType: "TENANT",
        limitValue: 10000,
        usedValue: 125
      })
      .expect(201);
    expect(quotaResponse.body.limitValue).toBe(10000);

    const resellerResponse = await request(httpServer)
      .post("/billing/resellers")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "reseller-premium",
        name: "Reseller Premium",
        metadata: {
          tier: "gold"
        }
      })
      .expect(201);
    expect(resellerResponse.body.code).toBe("reseller-premium");

    const overviewResponse = await request(httpServer)
      .get("/billing/overview")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .query({ tenantId: tenant.id })
      .expect(200);

    expect(overviewResponse.body.tenantId).toBe(tenant.id);
    expect(overviewResponse.body.plans).toHaveLength(2);
    expect(overviewResponse.body.subscriptions).toHaveLength(2);
    expect(overviewResponse.body.invoices).toHaveLength(1);
    expect(overviewResponse.body.entitlements).toHaveLength(1);
    expect(overviewResponse.body.quotas).toHaveLength(1);
    expect(overviewResponse.body.resellers).toHaveLength(2);
    expect(overviewResponse.body.activeSubscription.planId).toBe(proPlan.id);
    expect(overviewResponse.body.activePlan.id).toBe(proPlan.id);

    const plansResponse = await request(httpServer)
      .get("/billing/plans")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .query({ tenantId: tenant.id })
      .expect(200);
    expect(plansResponse.body).toHaveLength(2);

    const subscriptionsResponse = await request(httpServer)
      .get("/billing/subscriptions")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .query({ tenantId: tenant.id })
      .expect(200);
    expect(subscriptionsResponse.body).toHaveLength(2);

    const invoicesResponse = await request(httpServer)
      .get("/billing/invoices")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .query({ tenantId: tenant.id })
      .expect(200);
    expect(invoicesResponse.body).toHaveLength(1);
  });
});
