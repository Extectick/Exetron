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

interface SimpleListBody<TItem> {
  items: TItem[];
  total: number;
}

describe("PHASE 2 catalog and pricing", () => {
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

  it("implements catalog CRUD, compiled catalog filtering, and price preview precedence", async () => {
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
        slug: "phase2-catalog",
        name: "Phase 2 Catalog Tenant"
      })
      .expect(201);
    const tenant = tenantResponse.body as { id: string };

    const storeResponse = await request(httpServer)
      .post("/stores")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "catalog-store",
        name: "Catalog Store",
        timezone: "Asia/Novosibirsk"
      })
      .expect(201);
    const store = storeResponse.body as { id: string };

    const categoryResponse = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "burgers",
        name: "Burgers",
        sortOrder: 1
      })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    await request(httpServer)
      .patch(`/categories/${category.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        name: "Signature Burgers"
      })
      .expect(200);

    const groupResponse = await request(httpServer)
      .post("/modifier-groups")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "burger-addons",
        name: "Burger Addons",
        selectionMode: "MULTIPLE",
        minSelection: 0,
        maxSelection: 3
      })
      .expect(201);
    const group = groupResponse.body as { id: string };

    await request(httpServer)
      .patch(`/modifier-groups/${group.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        name: "Burger Extras",
        required: true
      })
      .expect(200);

    const optionResponse = await request(httpServer)
      .post(`/modifier-groups/${group.id}/options`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        code: "extra-cheese",
        name: "Extra Cheese",
        priceDelta: "1.00"
      })
      .expect(201);
    const option = optionResponse.body as { id: string };

    const productResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "classic-burger",
        name: "Classic Burger",
        description: "Foundational burger SKU",
        basePrice: "8.00",
        modifierGroupIds: [group.id]
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    await request(httpServer)
      .patch(`/products/${product.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        description: "Updated burger description"
      })
      .expect(200);

    const hiddenProductResponse = await request(httpServer)
      .post("/products")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        categoryId: category.id,
        code: "sold-out-burger",
        name: "Sold Out Burger",
        basePrice: "5.50",
        isOutOfStock: true
      })
      .expect(201);
    const hiddenProduct = hiddenProductResponse.body as { id: string };

    const variantResponse = await request(httpServer)
      .post(`/products/${product.id}/variants`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        code: "default",
        name: "Default Variant",
        basePrice: "9.00"
      })
      .expect(201);
    const variant = variantResponse.body as { id: string };

    await request(httpServer)
      .patch(`/products/${product.id}/variants/${variant.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        sku: "SKU-001"
      })
      .expect(200);

    const priceListResponse = await request(httpServer)
      .post("/price-lists")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        code: "main-menu",
        name: "Main Menu",
        currency: "RUB",
        items: [
          { targetType: "VARIANT", targetId: variant.id, price: "10.00" },
          { targetType: "MODIFIER_OPTION", targetId: option.id, price: "1.25" }
        ]
      })
      .expect(201);
    const priceList = priceListResponse.body as { id: string };

    await request(httpServer)
      .patch(`/price-lists/${priceList.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        name: "Main Menu Updated",
        items: [
          { targetType: "VARIANT", targetId: variant.id, price: "10.25" },
          { targetType: "MODIFIER_OPTION", targetId: option.id, price: "1.25" }
        ]
      })
      .expect(200);

    const overrideResponse = await request(httpServer)
      .post("/store-catalog-overrides")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        tenantId: tenant.id,
        storeId: store.id,
        targetType: "VARIANT",
        targetId: variant.id,
        priceOverride: "10.40"
      })
      .expect(201);
    const override = overrideResponse.body as { id: string };

    await request(httpServer)
      .patch(`/store-catalog-overrides/${override.id}`)
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        priceOverride: "10.50"
      })
      .expect(200);

    const categoriesResponse = await request(httpServer)
      .get("/categories")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const categoriesBody = categoriesResponse.body as SimpleListBody<{ name: string }>;

    expect(categoriesBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Signature Burgers"
        })
      ])
    );

    const productsResponse = await request(httpServer)
      .get("/products")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const productsBody = productsResponse.body as SimpleListBody<{
      id: string;
      description: string | null;
      variants: Array<{ id: string; sku: string | null }>;
    }>;

    const listedProduct = productsBody.items.find((item) => item.id === product.id);
    const listedVariant = listedProduct?.variants.find((item) => item.id === variant.id);

    expect(listedProduct?.description).toBe("Updated burger description");
    expect(listedVariant?.sku).toBe("SKU-001");
    expect(productsBody.items.some((item) => item.id === hiddenProduct.id)).toBe(true);

    const modifiersResponse = await request(httpServer)
      .get("/modifier-groups")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const modifiersBody = modifiersResponse.body as SimpleListBody<{
      name: string;
      required: boolean;
      options: Array<{ id: string; priceDelta: string }>;
    }>;

    const listedModifierGroup = modifiersBody.items.find(
      (item) => item.name === "Burger Extras"
    );
    const listedOption = listedModifierGroup?.options.find((item) => item.id === option.id);

    expect(listedModifierGroup?.required).toBe(true);
    expect(listedOption?.priceDelta).toBe("1.00");

    const priceListsResponse = await request(httpServer)
      .get("/price-lists")
      .query({ tenantId: tenant.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const priceListsBody = priceListsResponse.body as SimpleListBody<{
      id: string;
      name: string;
      items: Array<{ price: string }>;
    }>;

    const listedPriceList = priceListsBody.items.find((item) => item.id === priceList.id);
    const listedPrices = new Set(listedPriceList?.items.map((item) => item.price) ?? []);

    expect(listedPriceList?.name).toBe("Main Menu Updated");
    expect(listedPrices).toEqual(new Set(["10.25", "1.25"]));

    const overridesResponse = await request(httpServer)
      .get("/store-catalog-overrides")
      .query({ tenantId: tenant.id, storeId: store.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const overridesBody = overridesResponse.body as SimpleListBody<{
      id: string;
      priceOverride: string | null;
    }>;

    expect(overridesBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: override.id,
          priceOverride: "10.50"
        })
      ])
    );

    const compiledCatalogResponse = await request(httpServer)
      .get("/catalog/compiled")
      .query({ storeId: store.id, priceListId: priceList.id })
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .expect(200);
    const compiledCatalog = compiledCatalogResponse.body as {
      categories: Array<{
        name: string;
        products: Array<{
          id: string;
          variants: Array<{ id: string; effectivePrice: string | null; priceSource: string }>;
          modifierGroups: Array<{ options: Array<{ id: string; priceDelta: string }> }>;
        }>;
      }>;
      uncategorizedProducts: Array<{ id: string }>;
    };

    expect(compiledCatalog.uncategorizedProducts).toEqual([]);
    expect(compiledCatalog.categories).toHaveLength(1);
    expect(compiledCatalog.categories[0]?.name).toBe("Signature Burgers");
    const compiledProduct = compiledCatalog.categories[0]?.products.find(
      (item) => item.id === product.id
    );
    const compiledVariant = compiledProduct?.variants.find((item) => item.id === variant.id);
    const compiledOption = compiledProduct?.modifierGroups
      .flatMap((group) => group.options)
      .find((item) => item.id === option.id);

    expect(compiledVariant?.effectivePrice).toBe("10.50");
    expect(compiledVariant?.priceSource).toBe("store_override");
    expect(compiledOption?.priceDelta).toBe("1.25");
    expect(
      compiledCatalog.categories[0]?.products.some((item) => item.id === hiddenProduct.id)
    ).toBe(false);

    const previewResponse = await request(httpServer)
      .post("/pricing/preview")
      .set("Authorization", `Bearer ${adminTokens.accessToken}`)
      .send({
        storeId: store.id,
        productId: product.id,
        variantId: variant.id,
        priceListId: priceList.id,
        modifierOptionIds: [option.id]
      })
      .expect(201);
    const previewBody = previewResponse.body as {
      basePrice: string | null;
      modifierTotal: string;
      finalPrice: string;
      source: string;
    };

    expect(previewBody).toEqual(
      expect.objectContaining({
        basePrice: "10.50",
        modifierTotal: "1.25",
        finalPrice: "11.75",
        source: "store_override"
      })
    );
  });
});
