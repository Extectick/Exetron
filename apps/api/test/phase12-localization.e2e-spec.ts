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

describe("PHASE 12 localization and globalization foundation", () => {
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

  it("resolves locale precedence, localizes compiled catalog, and supports language-pack workflows", async () => {
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
        slug: "phase12-localization",
        name: "Phase 12 Localization Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "phase12-store",
        name: "Phase 12 Store",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string };

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

    const modifierGroupResponse = await request(httpServer)
      .post("/modifier-groups")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "milk",
        name: "Milk",
        selectionMode: "SINGLE",
        minSelection: 0,
        maxSelection: 1
      })
      .expect(201);
    const modifierGroup = modifierGroupResponse.body as { id: string };

    const modifierOptionResponse = await request(httpServer)
      .post(`/modifier-groups/${modifierGroup.id}/options`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        code: "oat",
        name: "Oat Milk",
        priceDelta: "0.50"
      })
      .expect(201);
    const modifierOption = modifierOptionResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "flat-white",
        name: "Flat White",
        description: "Espresso with steamed milk",
        basePrice: "4.50",
        modifierGroupIds: [modifierGroup.id]
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    const variantResponse = await request(httpServer)
      .post(`/products/${product.id}/variants`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        code: "large",
        name: "Large",
        basePrice: "5.20"
      })
      .expect(201);
    const variant = variantResponse.body as { id: string };

    await request(httpServer)
      .put("/localization/preferences/tenant")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        defaultLocale: "en-US",
        fallbackLocale: "en-US",
        supportedLocales: ["en-US", "ru-RU"],
        countryCode: "US",
        currency: "USD",
        channelLocales: {
          DELIVERY: "en-US"
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/localization/preferences/store")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: store.id,
        defaultLocale: "ru-RU",
        fallbackLocale: "en-US",
        supportedLocales: ["ru-RU", "en-US"],
        countryCode: "RU",
        currency: "RUB",
        channelLocales: {
          KIOSK: "ru-RU"
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/localization/country-profiles/RU")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        defaultLocale: "ru-RU",
        supportedLocales: ["ru-RU", "en-US"],
        currency: "RUB",
        tax: {
          mode: "INCLUSIVE",
          ratePercent: 10,
          label: "VAT"
        },
        complianceFlags: ["fiscal_receipt_required"],
        metadata: {
          fiscalMode: "online"
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/localization/content")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        targetType: "CATEGORY",
        targetId: category.id,
        entries: {
          "ru-RU": {
            name: "Кофе"
          },
          "en-US": {
            name: "Coffee"
          }
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/localization/content")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        targetType: "PRODUCT",
        targetId: product.id,
        entries: {
          "ru-RU": {
            name: "Флэт Уайт",
            description: "Эспрессо со вспененным молоком"
          },
          "en-US": {
            name: "Flat White",
            description: "Espresso with textured milk"
          }
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/localization/content")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        targetType: "VARIANT",
        targetId: variant.id,
        entries: {
          "ru-RU": {
            name: "Большой"
          }
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/localization/content")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        targetType: "MODIFIER_OPTION",
        targetId: modifierOption.id,
        entries: {
          "ru-RU": {
            name: "Овсяное молоко"
          }
        }
      })
      .expect(200);

    await request(httpServer)
      .put("/localization/templates")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        templateKey: "order-status-paid",
        channel: "DELIVERY",
        description: "Order paid template",
        variables: ["orderNumber", "storeName"],
        entries: {
          "ru-RU": {
            title: "Заказ {{orderNumber}} принят",
            body: "{{storeName}} начал готовить заказ."
          },
          "en-US": {
            title: "Order {{orderNumber}} confirmed",
            body: "{{storeName}} started preparing your order."
          }
        }
      })
      .expect(200);

    const customerLocaleContextResponse = await request(httpServer)
      .get("/localization/context")
      .query({
        tenantId: tenant.id,
        storeId: store.id,
        customerLocale: "en-US",
        channel: "KIOSK"
      })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const customerLocaleContext = customerLocaleContextResponse.body as {
      locale: string;
      resolvedBy: string[];
    };

    expect(customerLocaleContext.locale).toBe("en-US");
    expect(customerLocaleContext.resolvedBy[0]).toBe("query.customerLocale");

    const storeLocaleContextResponse = await request(httpServer)
      .get("/localization/context")
      .query({
        tenantId: tenant.id,
        storeId: store.id,
        channel: "KIOSK"
      })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const storeLocaleContext = storeLocaleContextResponse.body as {
      locale: string;
      countryCode: string | null;
      currency: string;
      tax: { mode: string; ratePercent: number | null };
      formatting: { moneyExample: string };
    };

    expect(storeLocaleContext.locale).toBe("ru-RU");
    expect(storeLocaleContext.countryCode).toBe("RU");
    expect(storeLocaleContext.currency).toBe("RUB");
    expect(storeLocaleContext.tax).toEqual(
      expect.objectContaining({
        mode: "INCLUSIVE",
        ratePercent: 10
      })
    );
    expect(storeLocaleContext.formatting.moneyExample).toContain("₽");

    const compiledCatalogResponse = await request(httpServer)
      .get("/catalog/compiled")
      .query({
        storeId: store.id,
        channel: "KIOSK"
      })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const compiledCatalog = compiledCatalogResponse.body as {
      localization: {
        locale: string;
        countryCode: string | null;
        currency: string;
        tax: { mode: string };
      };
      categories: Array<{
        name: string;
        products: Array<{
          id: string;
          name: string;
          description: string | null;
          variants: Array<{ id: string; name: string }>;
          modifierGroups: Array<{ options: Array<{ id: string; name: string }> }>;
        }>;
      }>;
    };

    expect(compiledCatalog.localization.locale).toBe("ru-RU");
    expect(compiledCatalog.localization.countryCode).toBe("RU");
    expect(compiledCatalog.localization.currency).toBe("RUB");
    expect(compiledCatalog.localization.tax.mode).toBe("INCLUSIVE");
    expect(compiledCatalog.categories[0]?.name).toBe("Кофе");
    expect(compiledCatalog.categories[0]?.products[0]?.name).toBe("Флэт Уайт");
    expect(compiledCatalog.categories[0]?.products[0]?.description).toBe(
      "Эспрессо со вспененным молоком"
    );
    expect(compiledCatalog.categories[0]?.products[0]?.variants[0]?.name).toBe("Большой");
    expect(
      compiledCatalog.categories[0]?.products[0]?.modifierGroups[0]?.options[0]?.name
    ).toBe("Овсяное молоко");

    const languagePackResponse = await request(httpServer)
      .get("/localization/language-pack")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const languagePack = languagePackResponse.body as {
      tenantId: string;
      countryProfiles: Array<{ countryCode: string }>;
      content: Array<{ targetId: string }>;
      templates: Array<{ templateKey: string; entries: Record<string, { title?: string }> }>;
    };

    expect(languagePack.tenantId).toBe(tenant.id);
    expect(languagePack.countryProfiles.some((item) => item.countryCode === "RU")).toBe(true);
    expect(languagePack.content.some((item) => item.targetId === product.id)).toBe(true);
    expect(languagePack.templates.some((item) => item.templateKey === "order-status-paid")).toBe(
      true
    );

    const updatedLanguagePack = {
      ...languagePack,
      templates: languagePack.templates.map((template) =>
        template.templateKey === "order-status-paid"
          ? {
              ...template,
              entries: {
                ...template.entries,
                "en-US": {
                  ...template.entries["en-US"],
                  title: "Order {{orderNumber}} fully paid"
                }
              }
            }
          : template
      )
    };

    await request(httpServer)
      .post("/localization/language-pack/import")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        pack: updatedLanguagePack
      })
      .expect(201);

    const renderedTemplateResponse = await request(httpServer)
      .post("/localization/templates/render")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        templateKey: "order-status-paid",
        channel: "DELIVERY",
        locale: "en-US",
        variables: {
          orderNumber: "A-120",
          storeName: "Phase 12 Store"
        }
      })
      .expect(201);
    const renderedTemplate = renderedTemplateResponse.body as {
      locale: string;
      rendered: { title?: string; body?: string };
    };

    expect(renderedTemplate.locale).toBe("en-US");
    expect(renderedTemplate.rendered.title).toBe("Order A-120 fully paid");
    expect(renderedTemplate.rendered.body).toBe(
      "Phase 12 Store started preparing your order."
    );
  });
});
