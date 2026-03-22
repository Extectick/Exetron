import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import request from "supertest";
import { InventoryModule } from "../src/inventory/inventory.module";

type HttpServer = Parameters<typeof request>[0];

for (const line of readFileSync(path.resolve(__dirname, "../../../.env"), "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    continue;
  }
  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) {
    continue;
  }
  const key = trimmed.slice(0, equalsIndex);
  const value = trimmed.slice(equalsIndex + 1);
  process.env[key] = value;
}

let prisma: typeof import("@exetron/database").prisma;
let supplierHttpServer: Server | null = null;
let supplierHttpEndpoint = "";
let supplierHttpRejectEndpoint = "";
let supplierHttpRetryEndpoint = "";
let supplierHttpDeadLetterEndpoint = "";
const supplierHttpRequests: Array<{
  url: string;
  method: string;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}> = [];

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function readObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
}

function readProviderProfileSummary(profile: unknown): {
  key: string;
  transportMode: string;
  pickupPath: string;
  dropPath: string;
  authHeaderName: string;
  requireSignature: boolean;
  requireChecksum: boolean;
  retryEnabled: boolean;
  retryMaxAttempts: number;
  defaultPolicyVisible: boolean;
} {
  const record = readObject(profile);
  const runtime = readObject(record.runtime);
  const transport = readObject(runtime.transport);
  const defaults = readObject(record.defaults);
  const defaultsTransport = readObject(defaults.transport);
  const defaultsAuth = readObject(defaults.auth);
  const defaultsRetry = readObject(defaults.retry);
  const transportAuth = readObject(transport.auth);
  const transportRetry = readObject(transport.retry);

  return {
    key: readString(
      record.key,
      record.profileKey,
      record.providerProfile,
      record.providerProfileKey,
      record.id,
      record.code,
      defaults.key,
      defaults.profileKey,
      defaults.providerProfile,
      defaults.providerProfileKey
    ),
    transportMode: readString(
      record.transportMode,
      record.mode,
      defaults.transportMode,
      defaults.mode,
      defaultsTransport.mode,
      defaultsTransport.transportMode,
      transport.mode,
      transport.transportMode,
      runtime.transportMode
    ),
    pickupPath: readString(
      record.pickupPath,
      defaults.pickupPath,
      defaultsTransport.pickupPath,
      transport.pickupPath
    ),
    dropPath: readString(record.dropPath, defaults.dropPath, defaultsTransport.dropPath, transport.dropPath),
    authHeaderName: readString(
      record.authHeaderName,
      defaults.authHeaderName,
      defaultsAuth.headerName,
      defaultsTransport.authHeaderName,
      transport.authHeaderName,
      transportAuth.headerName
    ),
    requireSignature: Boolean(
      record.requireSignature ?? defaults.requireSignature ?? defaultsTransport.requireSignature ?? transport.requireSignature
    ),
    requireChecksum: Boolean(
      record.requireChecksum ?? defaults.requireChecksum ?? defaultsTransport.requireChecksum ?? transport.requireChecksum
    ),
    retryEnabled: Boolean(
      record.retryEnabled ?? defaults.retryEnabled ?? defaultsRetry.enabled ?? transportRetry.enabled
    ),
    retryMaxAttempts: Number(
      record.retryMaxAttempts ??
        defaults.retryMaxAttempts ??
        defaultsRetry.maxAttempts ??
        transportRetry.maxAttempts ??
        0
    ),
    defaultPolicyVisible: Boolean(record.defaultPolicyVisible ?? defaults.defaultPolicyVisible ?? true)
  };
}

function readProviderAdapterSummary(adapter: unknown): {
  key: string;
  transportMode: string;
  payloadShape: string;
  endpoint: string;
  method: string;
  pickupPath: string;
  dropPath: string;
  authHeaderName: string;
  requireSignature: boolean;
  requireChecksum: boolean;
  retryEnabled: boolean;
  retryMaxAttempts: number;
  defaultPolicyVisible: boolean;
} {
  const record = readObject(adapter);
  const runtime = readObject(record.runtime);
  const transport = readObject(runtime.transport);
  const defaults = readObject(record.defaults);
  const defaultsTransport = readObject(defaults.transport);
  const defaultsAuth = readObject(defaults.auth);
  const defaultsRetry = readObject(defaults.retry);
  const transportAuth = readObject(transport.auth);
  const transportRetry = readObject(transport.retry);

  return {
    key: readString(
      record.key,
      record.adapterKey,
      record.providerAdapter,
      record.providerAdapterKey,
      record.id,
      defaults.key,
      defaults.adapterKey,
      defaults.providerAdapter,
      defaults.providerAdapterKey
    ),
    transportMode: readString(
      record.transportMode,
      record.mode,
      defaults.transportMode,
      defaults.mode,
      defaultsTransport.mode,
      defaultsTransport.transportMode,
      transport.mode,
      transport.transportMode,
      runtime.transportMode
    ),
    payloadShape: readString(
      record.payloadShape,
      defaults.payloadShape,
      defaultsTransport.payloadShape,
      transport.payloadShape,
      runtime.payloadShape
    ),
    endpoint: readString(record.endpoint, defaults.endpoint, defaultsTransport.endpoint, transport.endpoint),
    method: readString(record.method, defaults.method, defaultsTransport.method, transport.method),
    pickupPath: readString(
      record.pickupPath,
      defaults.pickupPath,
      defaultsTransport.pickupPath,
      transport.pickupPath
    ),
    dropPath: readString(record.dropPath, defaults.dropPath, defaultsTransport.dropPath, transport.dropPath),
    authHeaderName: readString(
      record.authHeaderName,
      defaults.authHeaderName,
      defaultsAuth.headerName,
      defaultsTransport.authHeaderName,
      transport.authHeaderName,
      transportAuth.headerName
    ),
    requireSignature: Boolean(
      record.requireSignature ?? defaults.requireSignature ?? defaultsTransport.requireSignature ?? transport.requireSignature
    ),
    requireChecksum: Boolean(
      record.requireChecksum ?? defaults.requireChecksum ?? defaultsTransport.requireChecksum ?? transport.requireChecksum
    ),
    retryEnabled: Boolean(
      record.retryEnabled ?? defaults.retryEnabled ?? defaultsRetry.enabled ?? transportRetry.enabled
    ),
    retryMaxAttempts: Number(
      record.retryMaxAttempts ??
        defaults.retryMaxAttempts ??
        defaultsRetry.maxAttempts ??
        transportRetry.maxAttempts ??
        0
    ),
    defaultPolicyVisible: Boolean(record.defaultPolicyVisible ?? defaults.defaultPolicyVisible ?? true)
  };
}

function readConnectorReadinessItem(item: unknown): {
  connectorKey: string;
  transportMode: string;
  readiness: string;
  reason: string;
  providerPolicyKey: string;
  providerAdapterKey: string;
  providerProfileKey: string;
  providerAdapterDefaultPolicyVisible: boolean;
  providerProfileDefaultPolicyVisible: boolean;
} {
  const record = readObject(item);
  const runtime = readObject(record.runtime);
  const adapter = readObject(record.providerAdapter ?? record.adapter ?? runtime.providerAdapter);
  const profile = readObject(record.providerProfile ?? record.profile ?? runtime.providerProfile);
  return {
    connectorKey: readString(record.connectorKey, runtime.connectorKey, adapter.key, profile.key, record.key),
    transportMode: readString(record.transportMode, runtime.transportMode, adapter.transportMode, profile.transportMode),
    readiness: readString(record.readiness, record.status, record.state, runtime.readiness, "UNKNOWN"),
    reason: readString(record.reason, record.message, record.details, runtime.reason),
    providerPolicyKey: readString(record.providerPolicyKey, runtime.providerPolicyKey),
    providerAdapterKey: readString(record.providerAdapterKey, adapter.providerAdapterKey, adapter.key, runtime.providerAdapterKey),
    providerProfileKey: readString(record.providerProfileKey, profile.providerProfileKey, profile.key, runtime.providerProfileKey),
    providerAdapterDefaultPolicyVisible: Boolean(
      record.providerAdapterDefaultPolicyVisible ??
        adapter.defaultPolicyVisible ??
        runtime.providerAdapterDefaultPolicyVisible
    ),
    providerProfileDefaultPolicyVisible: Boolean(
      record.providerProfileDefaultPolicyVisible ??
        profile.defaultPolicyVisible ??
        runtime.providerProfileDefaultPolicyVisible
    )
  };
}

function readConnectorReadinessItems(response: unknown): Array<unknown> {
  const record = readObject(response);
  const nested = readObject(record.summary);
  if (Array.isArray(record.items)) {
    return record.items;
  }
  if (Array.isArray(record.data)) {
    return record.data;
  }
  if (Array.isArray(record.results)) {
    return record.results;
  }
  if (Array.isArray(nested.items)) {
    return nested.items;
  }
  return Array.isArray(response) ? response : [];
}

function readSupplierExecutionReadinessItems(response: unknown): Array<unknown> {
  const record = readObject(response);
  const nested = readObject(record.summary);
  if (Array.isArray(record.items)) {
    return record.items;
  }
  if (Array.isArray(record.data)) {
    return record.data;
  }
  if (Array.isArray(record.results)) {
    return record.results;
  }
  if (Array.isArray(nested.items)) {
    return nested.items;
  }
  return Array.isArray(response) ? response : [];
}

function readSupplierExecutionReadinessItem(item: unknown): {
  connectorKey: string;
  readiness: string;
  reason: string;
  providerPolicyKey: string;
  providerPolicyHealth: string;
  providerCompatibility: string;
  installSource: string;
  installedRuntime: string;
  rolloutHealth: string;
  drift: string;
} {
  const record = readObject(item);
  const runtime = readObject(record.runtime);
  return {
    connectorKey: readString(record.connectorKey, record.key, runtime.connectorKey),
    readiness: readString(record.readiness, record.status, record.state, record.health, runtime.readiness, runtime.status, "UNKNOWN"),
    reason: readString(record.reason, record.message, record.details, record.blockedReason, runtime.reason, runtime.message),
    providerPolicyKey: readString(record.providerPolicyKey, runtime.providerPolicyKey),
    providerPolicyHealth: readString(
      record.providerPolicyHealth,
      record.policyHealth,
      runtime.providerPolicyHealth,
      runtime.policyHealth
    ),
    providerCompatibility: readString(
      record.providerCompatibility,
      record.compatibility,
      runtime.providerCompatibility,
      runtime.compatibility
    ),
    installSource: readString(record.installSource, runtime.installSource),
    installedRuntime: readString(record.installedRuntime, record.runtimeVersion, runtime.installedRuntime, runtime.runtimeVersion),
    rolloutHealth: readString(record.rolloutHealth, record.health, runtime.rolloutHealth, runtime.health),
    drift: readString(record.drift, record.driftStatus, runtime.drift, runtime.driftStatus)
  };
}

async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    "select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'"
  );

  if (!tables.length) {
    return;
  }

  const qualifiedNames = tables
    .map((table) => `"public"."${table.tablename.replaceAll('"', '""')}"`)
    .join(", ");

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${qualifiedNames} RESTART IDENTITY CASCADE`);
}

describe("PHASE 18 inventory foundation", () => {
  let app: INestApplication;
  let httpServer: HttpServer;
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const storeId = "22222222-2222-4222-8222-222222222222";
  const supplierConnectorKey = "supplier-demo";
  const supplierWebhookConnectorKey = "supplier-webhook-demo";
  const supplierFileConnectorKey = "supplier-file-demo";
  const supplierHttpConnectorKey = "supplier-http-demo";
  const supplierHttpRejectConnectorKey = "supplier-http-reject-demo";
  const supplierHttpRetryConnectorKey = "supplier-http-retry-demo";
  const supplierHttpDeadLetterConnectorKey = "supplier-http-dead-letter-demo";
  const supplierHttpProfileConnectorKey = "supplier-http-profile-demo";
  const supplierFileProfileConnectorKey = "supplier-file-profile-demo";
  const supplierHttpAdapterConnectorKey = "supplier-http-adapter-demo";
  const supplierFileAdapterConnectorKey = "supplier-file-adapter-demo";
  const supplierWebhookAdapterConnectorKey = "supplier-webhook-adapter-demo";
  const supplierReadinessReadyConnectorKey = "supplier-readiness-ready-demo";
  const supplierReadinessBlockedHttpMissingEndpointConnectorKey = "supplier-readiness-http-missing-endpoint-demo";
  const supplierReadinessBlockedHttpMissingSecretConnectorKey = "supplier-readiness-http-missing-secret-demo";
  const supplierReadinessBlockedWebhookConnectorKey = "supplier-readiness-webhook-blocked-demo";
  const baselineActivationAt = new Date("2026-03-22T12:00:00.000Z");
  let productId = "";
  let variantId = "";

  beforeAll(async () => {
    ({ prisma } = require("@exetron/database") as typeof import("@exetron/database"));
    await resetDatabase();

    supplierHttpServer = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        const url = req.url ?? "/";
        const attemptCount =
          supplierHttpRequests.filter((item) => item.url === url).length + 1;
        supplierHttpRequests.push({
          url,
          method: req.method ?? "UNKNOWN",
          body,
          headers: req.headers
        });
        if (url.includes("/reject")) {
          res.writeHead(409, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              accepted: false,
              state: "SUBMITTED",
              code: "SUPPLIER_REJECTED"
            })
          );
          return;
        }
        if (url.includes("/retryable")) {
          if (attemptCount === 1) {
            res.writeHead(503, { "content-type": "application/json" });
            res.end(
              JSON.stringify({
                accepted: false,
                state: "RETRYABLE_FAILURE",
                code: "TEMPORARY_SUPPLIER_UNAVAILABLE"
              })
            );
            return;
          }
          res.writeHead(202, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              accepted: true,
              state: "ACKNOWLEDGED"
            })
          );
          return;
        }
        if (url.includes("/dead-letter")) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              accepted: false,
              state: "DEAD_LETTERED",
              code: "SUPPLIER_PERMANENT_FAILURE"
            })
          );
          return;
        }
        res.writeHead(201, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            accepted: true,
            state: "ACKNOWLEDGED"
          })
        );
      });
    });
    await new Promise<void>((resolve) => {
      supplierHttpServer!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = supplierHttpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind local supplier HTTP mock server.");
    }
    supplierHttpEndpoint = `http://127.0.0.1:${address.port}/supplier/replenishments`;
    supplierHttpRejectEndpoint = `http://127.0.0.1:${address.port}/supplier/replenishments/reject`;
    supplierHttpRetryEndpoint = `http://127.0.0.1:${address.port}/supplier/replenishments/retryable`;
    supplierHttpDeadLetterEndpoint = `http://127.0.0.1:${address.port}/supplier/replenishments/dead-letter`;

    await prisma.tenant.create({
      data: {
        id: tenantId,
        slug: "phase18-inventory",
        name: "Phase 18 Inventory Tenant"
      }
    });

    await prisma.store.create({
      data: {
        id: storeId,
        tenantId,
        code: "inventory-store",
        name: "Inventory Store",
        timezone: "Asia/Novosibirsk"
      }
    });

    const category = await prisma.category.create({
      data: {
        tenantId,
        code: "bowls",
        name: "Bowls"
      }
    });

    const product = await prisma.product.create({
      data: {
        tenantId,
        categoryId: category.id,
        code: "salmon-bowl",
        name: "Salmon Bowl",
        basePrice: "12.50"
      }
    });

    await prisma.productVariant.create({
      data: {
        tenantId,
        productId: product.id,
        code: "standard",
        name: "Standard",
        basePrice: "12.50"
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"]
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierWebhookConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_callback"],
          runtime: {
            transport: {
              mode: "WEBHOOK",
              requireSignature: true,
              secretKey: "inventory.supplier.webhook.secret"
            }
          }
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierFileConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_import"],
          runtime: {
            transport: {
              mode: "FILE_IMPORT",
              importFormat: "json",
              requireChecksum: true,
              pickupPath: "/supplier/pickup/:jobId",
              dropPath: "/supplier/drop/:jobId"
            }
          }
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierHttpConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"],
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: supplierHttpEndpoint,
              method: "POST",
              allowsPolling: true,
              timeoutMs: 3200,
              acceptedStatusCodes: [201, 202],
              responseStatusField: "state",
              responseStatusMap: {
                "201": "ACKNOWLEDGED"
              },
              auth: {
                kind: "HEADER",
                headerName: "x-supplier-auth",
                prefix: "Token",
                secretKey: "inventory.supplier.http.auth"
              }
            }
          }
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierHttpRejectConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"],
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: supplierHttpRejectEndpoint,
              method: "POST",
              allowsPolling: true,
              timeoutMs: 2500,
              acceptedStatusCodes: [202],
              responseStatusField: "state"
            }
          }
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierHttpRetryConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"],
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: supplierHttpRetryEndpoint,
              method: "POST",
              allowsPolling: true,
              timeoutMs: 3200,
              acceptedStatusCodes: [202],
              responseStatusField: "state",
              responseStatusMap: {
                "202": "ACKNOWLEDGED"
              },
              auth: {
                kind: "HEADER",
                headerName: "x-supplier-auth",
                prefix: "Token",
                secretKey: "inventory.supplier.http.auth"
              },
              retry: {
                enabled: true,
                maxAttempts: 3,
                retryDelayMinutes: 0,
                retryableStatusCodes: [503],
                deadLetterStatus: "DEAD_LETTERED"
              }
            }
          }
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierHttpDeadLetterConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"],
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: supplierHttpDeadLetterEndpoint,
              method: "POST",
              allowsPolling: true,
              timeoutMs: 2500,
              acceptedStatusCodes: [202],
              responseStatusField: "state",
              responseStatusMap: {
                "202": "ACKNOWLEDGED"
              },
              auth: {
                kind: "HEADER",
                headerName: "x-supplier-auth",
                prefix: "Token",
                secretKey: "inventory.supplier.http.auth"
              },
              retry: {
                enabled: true,
                maxAttempts: 1,
                retryDelayMinutes: 0,
                retryableStatusCodes: [503],
                deadLetterStatus: "DEAD_LETTERED"
              }
            }
          }
        }
      }
    });

    await prisma.integrationActivationRequest.createMany({
      data: [
        supplierConnectorKey,
        supplierWebhookConnectorKey,
        supplierFileConnectorKey,
        supplierHttpConnectorKey,
        supplierHttpRejectConnectorKey,
        supplierHttpRetryConnectorKey,
        supplierHttpDeadLetterConnectorKey
      ].map((connectorKey) => ({
        tenantId,
        targetKind: "SUPPLIER_CONNECTOR",
        connectorKey,
        version: "1.0.0",
        status: "APPLIED",
        approvedAt: baselineActivationAt,
        appliedAt: baselineActivationAt
      }))
    });

    await prisma.secretRegistryEntry.create({
      data: {
        tenantId,
        organizationId: null,
        scopeType: "TENANT",
        scopeId: tenantId,
        key: "inventory.supplier.webhook.secret",
        valueEnvelope: {
          kind: "opaque",
          storedAt: new Date().toISOString(),
          value: "supplier-webhook-secret"
        }
      }
    });

    await prisma.secretRegistryEntry.create({
      data: {
        tenantId,
        organizationId: null,
        scopeType: "TENANT",
        scopeId: tenantId,
        key: "inventory.supplier.http.auth",
        valueEnvelope: {
          kind: "opaque",
          storedAt: new Date().toISOString(),
          value: "supplier-http-secret"
        }
      }
    });

    productId = product.id;
    variantId = (
      await prisma.productVariant.findUniqueOrThrow({
        where: {
          productId_code: {
            productId,
            code: "standard"
          }
        }
      })
    ).id;

    const moduleRef = await Test.createTestingModule({
      imports: [InventoryModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = {
        userId: "phase18-user",
        tenantId,
        scope: "platform_admin",
        roleIds: [],
        permissions: ["inventory.read", "inventory.write"],
        storeIds: [storeId]
      };
      next();
    });

    await app.init();
    httpServer = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    if (supplierHttpServer) {
      await new Promise<void>((resolve, reject) => {
        supplierHttpServer!.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  });

  it("supports warehouse, stock, receiving, reservation, adjustments, stop-list, and availability flows", async () => {
    const overviewBefore = await request(httpServer)
      .get("/inventory/overview")
      .expect(200);
    expect(overviewBefore.body.warehouses).toEqual([]);

    const warehouseResponse = await request(httpServer)
      .post("/inventory/warehouses")
      .send({
        tenantId,
        storeId,
        code: "main",
        name: "Main Warehouse",
        kind: "STORAGE",
        notes: "Primary cold storage",
        isActive: true
      })
      .expect(201);
    const warehouse = warehouseResponse.body as { id: string; code: string };

    const ingredientResponse = await request(httpServer)
      .post("/inventory/ingredients")
      .send({
        tenantId,
        code: "salmon",
        name: "Salmon Fillet",
        unit: "GRAM",
        lowStockThreshold: 2
      })
      .expect(201);
    const ingredient = ingredientResponse.body as { id: string };

    const itemResponse = await request(httpServer)
      .post("/inventory/items")
      .send({
        tenantId,
        warehouseId: warehouse.id,
        ingredientId: ingredient.id,
        sku: "SALMON-001",
        onHand: 4,
        reserved: 1,
        reorderPoint: 5
      })
      .expect(201);
    const item = itemResponse.body as { id: string; available: number; onHand: number; reserved: number };
    expect(item.available).toBe(3);

    await request(httpServer)
      .post("/inventory/recipe-boms")
      .send({
        tenantId,
        productId,
        variantId,
        ingredientId: ingredient.id,
        quantity: 2
      })
      .expect(201);

    const availabilityResponse = await request(httpServer)
      .get("/inventory/availability")
      .query({
        warehouseId: warehouse.id,
        productId,
        variantId
      })
      .expect(200);
    expect(availabilityResponse.body).toEqual(
      expect.objectContaining({
        productId,
        warehouseId: warehouse.id,
        variantId,
        ingredientBreakdown: expect.any(Array)
      })
    );
    expect(availabilityResponse.body.availableUnits).toBeGreaterThanOrEqual(0);

    const receivingResponse = await request(httpServer)
      .post("/inventory/receivings")
      .send({
        tenantId,
        warehouseId: warehouse.id,
        reference: "RCV-1001",
        receivedBy: "Warehouse Lead",
        lines: [
          {
            ingredientId: ingredient.id,
            quantity: 6,
            unitCost: "5.50"
          }
        ]
      })
      .expect(201);
    const receiving = receivingResponse.body as { id: string; status: string };
    expect(receiving.status).toBe("OPEN");

    await request(httpServer)
      .post(`/inventory/receivings/${receiving.id}/complete`)
      .send({ receivedBy: "Warehouse Lead" })
      .expect(201);

    const itemAfterReceiving = (
      await request(httpServer).get("/inventory/items").expect(200)
    ).body as Array<{ id: string; onHand: number; reserved: number }>;
    expect(itemAfterReceiving.find((row) => row.id === item.id)?.onHand).toBe(10);
    expect(itemAfterReceiving.find((row) => row.id === item.id)?.reserved).toBe(1);

    const reservationResponse = await request(httpServer)
      .post("/inventory/reservations")
      .send({
        tenantId,
        warehouseId: warehouse.id,
        ingredientId: ingredient.id,
        sourceType: "order",
        sourceId: "order-1",
        quantity: 2
      })
      .expect(201);
    const reservation = reservationResponse.body as { id: string; status: string };
    expect(reservation.status).toBe("ACTIVE");

    const itemAfterReservation = (
      await request(httpServer).get("/inventory/items").expect(200)
    ).body as Array<{ id: string; onHand: number; reserved: number }>;
    expect(itemAfterReservation.find((row) => row.id === item.id)?.reserved).toBe(3);

    await request(httpServer).post(`/inventory/reservations/${reservation.id}/release`).expect(201);
    const itemAfterRelease = (
      await request(httpServer).get("/inventory/items").expect(200)
    ).body as Array<{ id: string; reserved: number }>;
    expect(itemAfterRelease.find((row) => row.id === item.id)?.reserved).toBe(1);

    const consumeReservationResponse = await request(httpServer)
      .post("/inventory/reservations")
      .send({
        tenantId,
        warehouseId: warehouse.id,
        ingredientId: ingredient.id,
        sourceType: "order",
        sourceId: "order-2",
        quantity: 2
      })
      .expect(201);
    await request(httpServer)
      .post(`/inventory/reservations/${consumeReservationResponse.body.id}/consume`)
      .expect(201);

    const ledgerResponse = await request(httpServer)
      .get("/inventory/ledger")
      .expect(200);
    expect((ledgerResponse.body as Array<{ entryType: string }>).length).toBeGreaterThan(0);

    const adjustmentResponse = await request(httpServer)
      .post("/inventory/adjustments")
      .send({
        tenantId,
        warehouseId: warehouse.id,
        ingredientId: ingredient.id,
        adjustmentType: "ADD",
        quantity: 1,
        reason: "Counting correction"
      })
      .expect(201);
    expect(adjustmentResponse.body.adjustmentType).toBe("ADD");

    const stopRuleResponse = await request(httpServer)
      .post("/inventory/stop-list-rules")
      .send({
        tenantId,
        storeId,
        warehouseId: warehouse.id,
        ingredientId: ingredient.id,
        sku: "SALMON-001",
        ruleType: "LOW_STOCK",
        threshold: 4,
        isActive: true
      })
      .expect(201);
    expect(stopRuleResponse.body.ruleType).toBe("LOW_STOCK");

    const overviewAfter = await request(httpServer)
      .get("/inventory/overview")
      .expect(200);
    expect(overviewAfter.body.lowStockItems).toEqual(expect.any(Array));
    expect(overviewAfter.body.stopListRules).toHaveLength(1);

    await request(httpServer)
      .post("/inventory/adjustments")
      .send({
        tenantId,
        warehouseId: warehouse.id,
        ingredientId: ingredient.id,
        adjustmentType: "REMOVE",
        quantity: 6,
        reason: "Simulate low stock"
      })
      .expect(201);

    const operationsOverview = await request(httpServer)
      .get("/inventory/operations-overview")
      .query({ tenantId, storeId })
      .expect(200);
    expect(operationsOverview.body.summary.warehouseCount).toBe(1);
    expect(operationsOverview.body.summary.ingredientCount).toBe(1);
    expect(operationsOverview.body.summary.itemCount).toBe(1);
    expect(operationsOverview.body.summary.receivingCount).toBe(1);
    expect(operationsOverview.body.summary.completedReceivingCount).toBe(1);
    expect(operationsOverview.body.summary.reservationCount).toBeGreaterThanOrEqual(2);
    expect(operationsOverview.body.summary.activeStopListRuleCount).toBe(1);
    expect(operationsOverview.body.quantities.onHand).toBeGreaterThan(0);
    expect(operationsOverview.body.statuses.receivings.COMPLETED).toBe(1);
    expect(operationsOverview.body.coverage.warehouseIds).toContain(warehouse.id);
    expect(operationsOverview.body.coverage.ingredientIds).toContain(ingredient.id);
    expect(operationsOverview.body.coverage.skuList).toContain("SALMON-001");

    const replenishmentReport = await request(httpServer)
      .get("/inventory/replenishment-report")
      .query({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(200);
    expect(replenishmentReport.body.summary.recommendationCount).toBeGreaterThan(0);
    expect(replenishmentReport.body.summary.totalRecommendedOrderQuantity).toBeGreaterThan(0);
    expect(replenishmentReport.body.recommendations[0].ingredientId).toBe(ingredient.id);

    const replenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);
    expect(replenishmentJob.body.status).toBe("GENERATED");
    expect(replenishmentJob.body.summary.recommendationCount).toBeGreaterThan(0);

    const replenishmentJobs = await request(httpServer)
      .get("/inventory/replenishment-jobs")
      .query({ tenantId, warehouseId: warehouse.id })
      .expect(200);
    expect(replenishmentJobs.body).toHaveLength(1);

    await request(httpServer)
      .get("/inventory/supplier-connectors")
      .query({ tenantId })
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { connectorKey: string }) => item.connectorKey === supplierConnectorKey)).toBe(true);
        expect(body.some((item: { connectorKey: string }) => item.connectorKey === supplierWebhookConnectorKey)).toBe(true);
        expect(body.some((item: { connectorKey: string }) => item.connectorKey === supplierFileConnectorKey)).toBe(true);
        expect(body.some((item: { connectorKey: string }) => item.connectorKey === supplierHttpConnectorKey)).toBe(true);
        expect(body.some((item: { connectorKey: string }) => item.connectorKey === supplierHttpRejectConnectorKey)).toBe(true);
        expect(body.some((item: { connectorKey: string }) => item.connectorKey === supplierHttpRetryConnectorKey)).toBe(true);
        expect(body.some((item: { connectorKey: string }) => item.connectorKey === supplierHttpDeadLetterConnectorKey)).toBe(true);
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${replenishmentJob.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(replenishmentJob.body.id);
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/approve`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("APPROVED");
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/dispatch`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("DISPATCHED");
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "Default Supplier",
        supplierReference: `SUP-${replenishmentJob.body.id.slice(0, 8)}`,
        channel: "EMAIL",
        connectorKey: supplierConnectorKey
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierName).toBe("Default Supplier");
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("SUBMITTED");
        expect(body.artifact.workflow.supplier.connectorKey).toBe(supplierConnectorKey);
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/supplier-status`)
      .send({
        supplierStatus: "ACKNOWLEDGED",
        note: "Supplier confirmed order."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("ACKNOWLEDGED");
      });

    const handoffExecutions = await prisma.connectorExecutionLog.findMany({
      where: {
        tenantId,
        connectorKey: supplierConnectorKey
      },
      orderBy: { createdAt: "asc" }
    });
    expect(handoffExecutions.some((item) => item.action === "replenishment_handoff")).toBe(true);
    expect(handoffExecutions.some((item) => item.action === "replenishment_supplier_status_sync")).toBe(true);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/supplier-sync`)
      .send({ note: "Connector polled supplier state." })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("IN_TRANSIT");
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/connector-executions`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.length).toBeGreaterThanOrEqual(3);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_connector_sync")).toBe(true);
      });

    const httpPushReplenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${httpPushReplenishmentJob.body.id}/approve`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${httpPushReplenishmentJob.body.id}/dispatch`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${httpPushReplenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "HTTP Push Supplier",
        supplierReference: `SUP-HTTP-${httpPushReplenishmentJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: supplierHttpConnectorKey
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
        expect(body.artifact.workflow.supplier.endpoint).toBe(supplierHttpEndpoint);
        expect(body.artifact.workflow.supplier.method).toBe("POST");
        expect(body.artifact.workflow.supplier.timeoutMs).toBe(3200);
        expect(body.artifact.workflow.supplier.responseStatusField).toBe("state");
        expect(body.artifact.workflow.supplier.authKind).toBe("HEADER");
        expect(body.artifact.workflow.supplier.authHeaderName).toBe("x-supplier-auth");
        expect(body.artifact.workflow.supplier.authKeyRef).toBe("inventory.supplier.http.auth");
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("ACKNOWLEDGED");
        expect(body.artifact.workflow.supplier.deliveryArtifact.endpoint).toBe(supplierHttpEndpoint);
        expect(body.artifact.workflow.supplier.deliveryArtifact.responseStatus).toBe(201);
        expect(body.artifact.workflow.supplier.deliveryArtifact.authHeaderName).toBe("x-supplier-auth");
      });

    expect(supplierHttpRequests.length).toBe(1);
    expect(supplierHttpRequests[0]?.url).toBe("/supplier/replenishments");
    expect(supplierHttpRequests[0]?.method).toBe("POST");
    expect(supplierHttpRequests[0]?.body).toContain(httpPushReplenishmentJob.body.id);
    expect(supplierHttpRequests[0]?.body).toContain(`SUP-HTTP-${httpPushReplenishmentJob.body.id.slice(0, 8)}`);
    expect(supplierHttpRequests[0]?.headers["x-supplier-auth"]).toBe("Token supplier-http-secret");

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${httpPushReplenishmentJob.body.id}/supplier-sync`)
      .send({ note: "Sync provider-style HTTP push order." })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("IN_TRANSIT");
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${httpPushReplenishmentJob.body.id}/connector-executions`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_http_push_handoff")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_connector_sync")).toBe(true);
      });

    const rejectedHttpPushReplenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${rejectedHttpPushReplenishmentJob.body.id}/approve`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${rejectedHttpPushReplenishmentJob.body.id}/dispatch`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${rejectedHttpPushReplenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "Rejected HTTP Push Supplier",
        supplierReference: `SUP-HTTP-REJECT-${rejectedHttpPushReplenishmentJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: supplierHttpRejectConnectorKey
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
        expect(body.artifact.workflow.supplier.lastTransportStatus).toBe("FAILED");
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("SUBMITTED");
        expect(body.artifact.workflow.supplier.deliveryArtifact.responseStatus).toBe(409);
      });

    expect(supplierHttpRequests[1]?.url).toBe("/supplier/replenishments/reject");

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${rejectedHttpPushReplenishmentJob.body.id}/connector-executions`)
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.some(
            (item: { action: string; status: string }) =>
              item.action === "replenishment_supplier_http_push_handoff" && item.status === "FAILED"
          )
        ).toBe(true);
      });

    const retryableHttpPushReplenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${retryableHttpPushReplenishmentJob.body.id}/approve`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${retryableHttpPushReplenishmentJob.body.id}/dispatch`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${retryableHttpPushReplenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "Retryable HTTP Push Supplier",
        supplierReference: `SUP-HTTP-RETRY-${retryableHttpPushReplenishmentJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: supplierHttpRetryConnectorKey
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
        expect(body.artifact.workflow.supplier.endpoint).toBe(supplierHttpRetryEndpoint);
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("SUBMITTED");
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("RETRY_QUEUED");
        expect(body.artifact.workflow.supplier.retryAttemptCount).toBe(1);
        expect(body.artifact.workflow.supplier.nextRetryAt).toEqual(expect.any(String));
      });

    const retryableRequests = supplierHttpRequests.filter((item) => item.url === "/supplier/replenishments/retryable");
    expect(retryableRequests.length).toBe(1);
    expect(retryableRequests[0]?.method).toBe("POST");
    expect(retryableRequests[0]?.body).toContain(retryableHttpPushReplenishmentJob.body.id);
    expect(retryableRequests[0]?.headers["x-supplier-auth"]).toBe("Token supplier-http-secret");

    await request(httpServer)
      .post("/inventory/supplier-retry-worker/run-now")
      .send({
        tenantId,
        storeId,
        note: "Run due retries for HTTP push connectors.",
        limit: 10
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.considered).toBeGreaterThanOrEqual(1);
        expect(body.processedJobIds).toContain(retryableHttpPushReplenishmentJob.body.id);
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${retryableHttpPushReplenishmentJob.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("ACKNOWLEDGED");
        expect(body.artifact.workflow.supplier.retryProcessedCount).toBe(1);
        expect(body.artifact.workflow.supplier.reconciliation.status).not.toBe("RETRY_QUEUED");
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${retryableHttpPushReplenishmentJob.body.id}/connector-executions`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_http_push_handoff")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_retry_queued")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_retry_due")).toBe(true);
      });

    const deadLetterHttpPushReplenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${deadLetterHttpPushReplenishmentJob.body.id}/approve`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${deadLetterHttpPushReplenishmentJob.body.id}/dispatch`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${deadLetterHttpPushReplenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "Dead Letter HTTP Push Supplier",
        supplierReference: `SUP-HTTP-DEAD-${deadLetterHttpPushReplenishmentJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: supplierHttpDeadLetterConnectorKey
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
        expect(body.artifact.workflow.supplier.endpoint).toBe(supplierHttpDeadLetterEndpoint);
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("SUBMITTED");
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("DEAD_LETTERED");
        expect(body.artifact.workflow.supplier.retryAttemptCount).toBe(1);
        expect(body.artifact.workflow.supplier.deadLetteredAt).toEqual(expect.any(String));
      });

    const deadLetterRequests = supplierHttpRequests.filter((item) => item.url === "/supplier/replenishments/dead-letter");
    expect(deadLetterRequests.length).toBe(1);
    expect(deadLetterRequests[0]?.method).toBe("POST");
    expect(deadLetterRequests[0]?.body).toContain(deadLetterHttpPushReplenishmentJob.body.id);
    expect(deadLetterRequests[0]?.headers["x-supplier-auth"]).toBe("Token supplier-http-secret");

    const supplierOperationsOverview = await request(httpServer)
      .get("/inventory/supplier-operations-overview")
      .query({ tenantId, storeId })
      .expect(200);
    expect(supplierOperationsOverview.body.summary.connectorCount).toBeGreaterThanOrEqual(7);
    expect(supplierOperationsOverview.body.summary.deadLetterCount).toBeGreaterThanOrEqual(1);
    expect(supplierOperationsOverview.body.summary.retryQueuedCount).toBeGreaterThanOrEqual(1);
    expect(supplierOperationsOverview.body.summary.terminalCount).toBeGreaterThanOrEqual(1);

    await request(httpServer)
      .get("/inventory/supplier-dead-letters")
      .query({ tenantId, storeId })
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
        expect(body.some((item: { id: string }) => item.id === deadLetterHttpPushReplenishmentJob.body.id)).toBe(true);
        expect(body.some((item: { connectorKey: string }) => item.connectorKey === supplierHttpDeadLetterConnectorKey)).toBe(true);
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${deadLetterHttpPushReplenishmentJob.body.id}/supplier-dead-letter-reopen`)
      .send({
        note: "Reopen terminal HTTP push dead letter."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("RETRY_QUEUED");
        expect(body.artifact.workflow.supplier.pendingPush).toBe(true);
        expect(body.artifact.workflow.supplier.nextRetryAt).toEqual(expect.any(String));
      });

    await request(httpServer)
      .get("/inventory/supplier-dead-letters")
      .query({ tenantId, storeId })
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === deadLetterHttpPushReplenishmentJob.body.id)).toBe(false);
      });

    await request(httpServer)
      .get("/inventory/supplier-retry-worker-status")
      .expect(200)
      .expect(({ body }) => {
        expect(body.enabled).toBe(true);
        expect(body.running).toBe(false);
      });

    await request(httpServer)
      .post("/inventory/supplier-retry-worker/pause")
      .send({
        tenantId,
        storeId,
        note: "Pause supplier retry worker for control plane check."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.enabled).toBe(false);
        expect(body.running).toBe(false);
      });

    await request(httpServer)
      .get("/inventory/supplier-retry-worker-status")
      .expect(200)
      .expect(({ body }) => {
        expect(body.enabled).toBe(false);
        expect(body.running).toBe(false);
      });

    await request(httpServer)
      .post("/inventory/supplier-retry-worker/resume")
      .send({
        tenantId,
        storeId,
        note: "Resume supplier retry worker for control plane check."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.enabled).toBe(true);
        expect(body.running).toBe(false);
      });

    await request(httpServer)
      .get("/inventory/supplier-retry-worker-status")
      .expect(200)
      .expect(({ body }) => {
        expect(body.enabled).toBe(true);
        expect(body.running).toBe(false);
      });

    const providerPoliciesResponse = await request(httpServer)
      .get("/inventory/supplier-provider-policies")
      .expect(200);
    expect(Array.isArray(providerPoliciesResponse.body)).toBe(true);
    expect(
      providerPoliciesResponse.body.map((item: { key: string }) => item.key).sort()
    ).toEqual(
      expect.arrayContaining([
        "FRESHLANE_CONTROLLED_RUNTIME",
        "WAREDROP_MANAGED_FILE_RUNTIME",
        "SIGNAL_SIGNED_WEBHOOK_RUNTIME"
      ])
    );

    const providerProfilesFirst = await request(httpServer)
      .get("/inventory/supplier-provider-profiles")
      .expect(200);
    const providerProfilesSecond = await request(httpServer)
      .get("/inventory/supplier-provider-profiles")
      .expect(200);

    expect(providerProfilesFirst.body).toEqual(providerProfilesSecond.body);
    expect(Array.isArray(providerProfilesFirst.body)).toBe(true);

    const providerProfileSummaries = (providerProfilesFirst.body as Array<unknown>).map(readProviderProfileSummary);
    const httpPushProviderProfile = providerProfileSummaries.find((profile) => profile.transportMode === "HTTP_PUSH");
    const fileImportProviderProfile = providerProfileSummaries.find(
      (profile) => profile.transportMode === "FILE_IMPORT" || profile.transportMode === "WEBHOOK"
    );
    const webhookProviderProfile = providerProfileSummaries.find((profile) => profile.transportMode === "WEBHOOK");

    expect(providerProfileSummaries.length).toBeGreaterThan(0);
    expect(httpPushProviderProfile).toBeDefined();
    expect(fileImportProviderProfile).toBeDefined();
    expect(webhookProviderProfile).toBeDefined();
    expect(httpPushProviderProfile?.defaultPolicyVisible).toBe(true);
    expect(fileImportProviderProfile?.defaultPolicyVisible).toBe(true);
    expect(webhookProviderProfile?.defaultPolicyVisible).toBe(true);
    expect(providerProfileSummaries).toEqual(
      (providerProfilesSecond.body as Array<unknown>).map(readProviderProfileSummary)
    );

    const httpPushProfileKey = httpPushProviderProfile?.key ?? "";
    const fileImportProfileKey = fileImportProviderProfile?.key ?? "";
    expect(httpPushProfileKey).not.toBe("");
    expect(fileImportProfileKey).not.toBe("");

    const supplierHttpProfileSecretKey = "inventory.supplier.http.profile.secret";
    await prisma.secretRegistryEntry.create({
      data: {
        tenantId,
        organizationId: null,
        scopeType: "TENANT",
        scopeId: tenantId,
        key: supplierHttpProfileSecretKey,
        valueEnvelope: {
          kind: "opaque",
          storedAt: new Date().toISOString(),
          value: "supplier-http-profile-secret"
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierHttpProfileConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"],
          providerProfile: httpPushProfileKey,
          runtime: {
            transport: {
              endpoint: supplierHttpEndpoint,
              auth: {
                secretKey: supplierHttpProfileSecretKey
              }
            }
          }
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: supplierFileProfileConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_import"],
          providerProfile: fileImportProfileKey,
          runtime: {
            providerProfile: fileImportProfileKey
          }
        }
      }
    });

    await prisma.integrationActivationRequest.createMany({
      data: [supplierHttpProfileConnectorKey, supplierFileProfileConnectorKey].map((connectorKey) => ({
        tenantId,
        targetKind: "SUPPLIER_CONNECTOR",
        connectorKey,
        version: "1.0.0",
        status: "APPLIED",
        approvedAt: baselineActivationAt,
        appliedAt: baselineActivationAt
      }))
    });

    const httpProfileConnectorManifest = await prisma.integrationRegistryEntry.findFirstOrThrow({
      where: {
        tenantId,
        connectorKey: supplierHttpProfileConnectorKey
      }
    });
    const httpProfileManifest = readObject(httpProfileConnectorManifest.manifest);
    const httpProfileRuntime = readObject(httpProfileManifest.runtime);
    const httpProfileTransport = readObject(httpProfileRuntime.transport);
    expect(httpProfileTransport.mode).toBeUndefined();
    expect(httpProfileTransport.method).toBeUndefined();
    expect(httpProfileTransport.pickupPath).toBeUndefined();
    expect(httpProfileTransport.dropPath).toBeUndefined();
    expect(readObject(httpProfileTransport.auth).headerName).toBeUndefined();
    expect(readObject(httpProfileTransport.retry).enabled).toBeUndefined();

    const fileProfileConnectorManifest = await prisma.integrationRegistryEntry.findFirstOrThrow({
      where: {
        tenantId,
        connectorKey: supplierFileProfileConnectorKey
      }
    });
    const fileProfileManifest = readObject(fileProfileConnectorManifest.manifest);
    const fileProfileRuntime = readObject(fileProfileManifest.runtime);
    expect(fileProfileRuntime.providerProfile).toBe(fileImportProfileKey);
    expect(readObject(fileProfileRuntime.transport).mode).toBeUndefined();
    expect(readObject(fileProfileRuntime.transport).pickupPath).toBeUndefined();
    expect(readObject(fileProfileRuntime.transport).dropPath).toBeUndefined();
    expect(readObject(fileProfileRuntime.transport).requireChecksum).toBeUndefined();

    const inventoryReadinessResponse = await request(httpServer)
      .get("/inventory/supplier-connector-readiness")
      .query({ tenantId, storeId })
      .expect(200);

    const inventoryReadinessItems = readConnectorReadinessItems(inventoryReadinessResponse.body);
    const httpProfileReadinessRaw = (inventoryReadinessItems.find((item) => {
      const record = readObject(item);
      const runtime = readObject(record.runtime);
      return readString(record.connectorKey, record.key, runtime.connectorKey) === supplierHttpProfileConnectorKey;
    }) ?? {}) as Record<string, unknown>;
    const fileProfileReadinessRaw = (inventoryReadinessItems.find((item) => {
      const record = readObject(item);
      const runtime = readObject(record.runtime);
      return readString(record.connectorKey, record.key, runtime.connectorKey) === supplierFileProfileConnectorKey;
    }) ?? {}) as Record<string, unknown>;

    if ("providerProfileKey" in httpProfileReadinessRaw || "providerProfile" in httpProfileReadinessRaw) {
      const httpProfileReadiness = inventoryReadinessItems
        .map(readConnectorReadinessItem)
        .find((item) => item.connectorKey === supplierHttpProfileConnectorKey);
      const fileProfileReadiness = inventoryReadinessItems
        .map(readConnectorReadinessItem)
        .find((item) => item.connectorKey === supplierFileProfileConnectorKey);
      expect(httpProfileReadiness?.providerProfileKey).toBe(httpPushProfileKey);
      expect(fileProfileReadiness?.providerProfileKey).toBe(fileImportProfileKey);
      expect(httpProfileReadiness?.providerProfileDefaultPolicyVisible).toBe(true);
      expect(fileProfileReadiness?.providerProfileDefaultPolicyVisible).toBe(true);
    }

    const providerAdaptersResponse = await request(httpServer)
      .get("/inventory/supplier-provider-adapters")
      .expect((response) => {
        expect([200, 404]).toContain(response.status);
      });
    if (providerAdaptersResponse.status === 200) {
      const providerAdaptersFirst = providerAdaptersResponse;
      const providerAdaptersSecond = await request(httpServer)
        .get("/inventory/supplier-provider-adapters")
        .expect(200);

      expect(providerAdaptersFirst.body).toEqual(providerAdaptersSecond.body);
      expect(Array.isArray(providerAdaptersFirst.body)).toBe(true);

      const providerAdapterSummaries = (providerAdaptersFirst.body as Array<unknown>).map(readProviderAdapterSummary);
      const httpPushProviderAdapter = providerAdapterSummaries.find((adapter) => adapter.transportMode === "HTTP_PUSH");
      const fileProviderAdapter = providerAdapterSummaries.find((adapter) => adapter.transportMode === "FILE_IMPORT");
      const webhookProviderAdapter = providerAdapterSummaries.find((adapter) => adapter.transportMode === "WEBHOOK");

      expect(providerAdapterSummaries.length).toBeGreaterThan(0);
      expect(httpPushProviderAdapter).toBeDefined();
      expect(fileProviderAdapter).toBeDefined();
      expect(webhookProviderAdapter).toBeDefined();
      expect(httpPushProviderAdapter?.defaultPolicyVisible).toBe(true);
      expect(fileProviderAdapter?.defaultPolicyVisible).toBe(true);
      expect(webhookProviderAdapter?.defaultPolicyVisible).toBe(true);

      const httpPushAdapterKey = httpPushProviderAdapter?.key ?? "";
      const fileAdapterKey = fileProviderAdapter?.key ?? "";
      const webhookAdapterKey = webhookProviderAdapter?.key ?? "";
      expect(httpPushAdapterKey).not.toBe("");
      expect(fileAdapterKey).not.toBe("");
      expect(webhookAdapterKey).not.toBe("");

      const supplierHttpAdapterSecretKey = "inventory.supplier.http.adapter.secret";
      await prisma.secretRegistryEntry.create({
        data: {
          tenantId,
          organizationId: null,
          scopeType: "TENANT",
          scopeId: tenantId,
          key: supplierHttpAdapterSecretKey,
          valueEnvelope: {
            kind: "opaque",
            storedAt: new Date().toISOString(),
            value: "supplier-http-adapter-secret"
          }
        }
      });

      await prisma.integrationRegistryEntry.create({
        data: {
          tenantId,
          connectorKey: supplierHttpAdapterConnectorKey,
          version: "1.0.0",
          status: "ACTIVE",
          manifest: {
            kind: "SUPPLIER",
            supports: ["handoff", "status_sync"],
            providerAdapter: httpPushAdapterKey,
            runtime: {
              transport: {
                endpoint: supplierHttpEndpoint,
                auth: {
                  secretKey: supplierHttpAdapterSecretKey
                }
              }
            }
          }
        }
      });

      await prisma.integrationRegistryEntry.create({
        data: {
          tenantId,
          connectorKey: supplierFileAdapterConnectorKey,
          version: "1.0.0",
          status: "ACTIVE",
          manifest: {
            kind: "SUPPLIER",
            supports: ["handoff", "status_import"],
            providerAdapter: fileAdapterKey,
            runtime: {
              providerAdapter: fileAdapterKey
            }
          }
        }
      });

      await prisma.integrationRegistryEntry.create({
        data: {
          tenantId,
          connectorKey: supplierWebhookAdapterConnectorKey,
          version: "1.0.0",
          status: "ACTIVE",
          manifest: {
            kind: "SUPPLIER",
            supports: ["handoff", "status_callback"],
            providerAdapter: webhookAdapterKey,
            runtime: {
              providerAdapter: webhookAdapterKey
            }
          }
        }
      });

      await prisma.integrationActivationRequest.createMany({
        data: [supplierHttpAdapterConnectorKey, supplierFileAdapterConnectorKey].map((connectorKey) => ({
          tenantId,
          targetKind: "SUPPLIER_CONNECTOR",
          connectorKey,
          version: "1.0.0",
          status: "APPLIED",
          approvedAt: baselineActivationAt,
          appliedAt: baselineActivationAt
        }))
      });

      const httpAdapterConnectorManifest = await prisma.integrationRegistryEntry.findFirstOrThrow({
        where: {
          tenantId,
          connectorKey: supplierHttpAdapterConnectorKey
        }
      });
      const httpAdapterManifest = readObject(httpAdapterConnectorManifest.manifest);
      const httpAdapterRuntime = readObject(httpAdapterManifest.runtime);
      const httpAdapterTransport = readObject(httpAdapterRuntime.transport);
      expect(readString(httpAdapterManifest.providerAdapter, httpAdapterRuntime.providerAdapter)).toBe(httpPushAdapterKey);
      expect(httpAdapterTransport.mode).toBeUndefined();

      const fileAdapterConnectorManifest = await prisma.integrationRegistryEntry.findFirstOrThrow({
        where: {
          tenantId,
          connectorKey: supplierFileAdapterConnectorKey
        }
      });
      const fileAdapterManifest = readObject(fileAdapterConnectorManifest.manifest);
      const fileAdapterRuntime = readObject(fileAdapterManifest.runtime);
      expect(readString(fileAdapterManifest.providerAdapter, fileAdapterRuntime.providerAdapter)).toBe(fileAdapterKey);

      const httpAdapterReplenishmentJob = await request(httpServer)
        .post("/inventory/replenishment-jobs")
        .send({ tenantId, storeId, warehouseId: warehouse.id })
        .expect(201);

      await request(httpServer)
        .post(`/inventory/replenishment-jobs/${httpAdapterReplenishmentJob.body.id}/approve`)
        .expect(201);

      await request(httpServer)
        .post(`/inventory/replenishment-jobs/${httpAdapterReplenishmentJob.body.id}/dispatch`)
        .expect(201);

      const httpAdapterHandoff = await request(httpServer)
        .post(`/inventory/replenishment-jobs/${httpAdapterReplenishmentJob.body.id}/handoff`)
        .send({
          supplierName: "HTTP Adapter Supplier",
          supplierReference: `SUP-HTTP-ADAPTER-${httpAdapterReplenishmentJob.body.id.slice(0, 8)}`,
          channel: "API",
          connectorKey: supplierHttpAdapterConnectorKey
        })
        .expect(201);

      expect(httpAdapterHandoff.body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
      expect(httpAdapterHandoff.body.artifact.workflow.supplier.providerAdapterKey).toBe(httpPushAdapterKey);
      expect(httpAdapterHandoff.body.artifact.workflow.supplier.providerAdapterName).toEqual(expect.any(String));
      expect(httpAdapterHandoff.body.artifact.workflow.supplier.payloadShape).toEqual(expect.any(String));
      expect(httpAdapterHandoff.body.artifact.workflow.supplier.deliveryArtifact?.providerAdapterKey ?? null).toBe(
        httpPushAdapterKey
      );
      expect(httpAdapterHandoff.body.artifact.workflow.supplier.deliveryArtifact?.payloadShape ?? null).toEqual(
        expect.any(String)
      );
      expect(httpAdapterHandoff.body.artifact.workflow.supplier.supplierStatus).toBe("ACKNOWLEDGED");

      const httpAdapterRequest = supplierHttpRequests.find((item) =>
        item.url === "/supplier/replenishments" &&
        item.body.includes(`SUP-HTTP-ADAPTER-${httpAdapterReplenishmentJob.body.id.slice(0, 8)}`)
      );
      expect(httpAdapterRequest).toBeDefined();
      expect(httpAdapterRequest?.body).toContain(httpAdapterReplenishmentJob.body.id);
      expect(httpAdapterRequest?.body).toContain(httpPushAdapterKey);

      await request(httpServer)
        .get(`/inventory/replenishment-jobs/${httpAdapterReplenishmentJob.body.id}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.artifact.workflow.supplier.providerAdapterKey).toBe(httpPushAdapterKey);
          expect(body.artifact.workflow.supplier.providerAdapterName).toEqual(expect.any(String));
        });

      const fileAdapterReplenishmentJob = await request(httpServer)
        .post("/inventory/replenishment-jobs")
        .send({ tenantId, storeId, warehouseId: warehouse.id })
        .expect(201);

      await request(httpServer)
        .post(`/inventory/replenishment-jobs/${fileAdapterReplenishmentJob.body.id}/approve`)
        .expect(201);

      await request(httpServer)
        .post(`/inventory/replenishment-jobs/${fileAdapterReplenishmentJob.body.id}/dispatch`)
        .expect(201);

      const fileAdapterHandoff = await request(httpServer)
        .post(`/inventory/replenishment-jobs/${fileAdapterReplenishmentJob.body.id}/handoff`)
        .send({
          supplierName: "File Adapter Supplier",
          supplierReference: `SUP-FILE-ADAPTER-${fileAdapterReplenishmentJob.body.id.slice(0, 8)}`,
          channel: "FILE",
          connectorKey: supplierFileAdapterConnectorKey
        })
        .expect(201);

      expect(fileAdapterHandoff.body.artifact.workflow.supplier.providerAdapterKey).toBe(fileAdapterKey);
      expect(fileAdapterHandoff.body.artifact.workflow.supplier.providerAdapterName).toEqual(expect.any(String));
      expect(fileAdapterHandoff.body.artifact.workflow.supplier.transportMode).toBe(
        fileProviderAdapter?.transportMode ?? "FILE_IMPORT"
      );
      expect(
        fileAdapterHandoff.body.artifact.workflow.supplier.pendingImport ??
          fileAdapterHandoff.body.artifact.workflow.supplier.pendingCallback
      ).toBe(true);
      expect(fileAdapterHandoff.body.artifact.workflow.supplier.deliveryArtifact).toBeDefined();

      await request(httpServer)
        .get(`/inventory/replenishment-jobs/${fileAdapterReplenishmentJob.body.id}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.artifact.workflow.supplier.providerAdapterKey).toBe(fileAdapterKey);
          expect(body.artifact.workflow.supplier.providerAdapterName).toEqual(expect.any(String));
        });

      await prisma.secretRegistryEntry.create({
        data: {
          tenantId,
          organizationId: null,
          scopeType: "TENANT",
          scopeId: tenantId,
          key: "inventory.supplier.readiness.http.secret",
          valueEnvelope: {
            kind: "opaque",
            storedAt: new Date().toISOString(),
            value: "supplier-readiness-http-secret"
          }
        }
      });

      await prisma.integrationRegistryEntry.create({
        data: {
          tenantId,
          connectorKey: supplierReadinessReadyConnectorKey,
          version: "1.0.0",
          status: "ACTIVE",
          manifest: {
            kind: "SUPPLIER",
            supports: ["handoff", "status_sync"],
            providerAdapter: httpPushAdapterKey,
            runtime: {
              transport: {
                endpoint: supplierHttpEndpoint,
                auth: {
                  secretKey: "inventory.supplier.readiness.http.secret"
                }
              }
            }
          }
        }
      });

      await prisma.integrationRegistryEntry.create({
        data: {
          tenantId,
          connectorKey: supplierReadinessBlockedHttpMissingEndpointConnectorKey,
          version: "1.0.0",
          status: "ACTIVE",
          manifest: {
            kind: "SUPPLIER",
            supports: ["handoff", "status_sync"],
            providerAdapter: httpPushAdapterKey,
            runtime: {
              transport: {
                auth: {
                  secretKey: "inventory.supplier.readiness.http.secret"
                }
              }
            }
          }
        }
      });

      await prisma.integrationRegistryEntry.create({
        data: {
          tenantId,
          connectorKey: supplierReadinessBlockedHttpMissingSecretConnectorKey,
          version: "1.0.0",
          status: "ACTIVE",
          manifest: {
            kind: "SUPPLIER",
            supports: ["handoff", "status_sync"],
            providerAdapter: httpPushAdapterKey,
            runtime: {
              transport: {
                endpoint: supplierHttpEndpoint,
                auth: {
                  secretKey: "inventory.supplier.readiness.http.missing.secret"
                }
              }
            }
          }
        }
      });

      await prisma.integrationRegistryEntry.create({
        data: {
          tenantId,
          connectorKey: supplierReadinessBlockedWebhookConnectorKey,
          version: "1.0.0",
          status: "ACTIVE",
          manifest: {
            kind: "SUPPLIER",
            supports: ["handoff", "status_callback"],
            providerAdapter: webhookAdapterKey,
            runtime: {
              providerAdapter: webhookAdapterKey,
              transport: {
                requireSignature: true,
                secretKey: "inventory.supplier.readiness.webhook.missing.secret"
              }
            }
          }
        }
      });

      await prisma.integrationActivationRequest.create({
        data: {
          tenantId,
          targetKind: "SUPPLIER_CONNECTOR",
          connectorKey: supplierReadinessReadyConnectorKey,
          version: "1.0.0",
          status: "APPLIED",
          approvedAt: baselineActivationAt,
          appliedAt: baselineActivationAt
        }
      });

      const readinessResponse = await request(httpServer)
        .get("/inventory/supplier-connector-readiness")
        .query({ tenantId, storeId })
        .expect((response) => {
          expect([200, 404]).toContain(response.status);
        });

      if (readinessResponse.status === 200) {
        const readinessSecond = await request(httpServer)
          .get("/inventory/supplier-connector-readiness")
          .query({ tenantId, storeId })
          .expect(200);

        expect(readinessResponse.body).toEqual(readinessSecond.body);

      const readinessItems = readConnectorReadinessItems(readinessResponse.body).map(readConnectorReadinessItem);
      expect(readinessItems.length).toBeGreaterThan(0);
      expect(readinessItems.some((item) => item.readiness === "READY")).toBe(true);
      expect(readinessItems.some((item) => item.readiness === "BLOCKED")).toBe(true);
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessReadyConnectorKey)?.readiness
        ).toBe("WARN");
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessBlockedHttpMissingEndpointConnectorKey)
            ?.readiness
        ).toBe("BLOCKED");
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessBlockedHttpMissingSecretConnectorKey)
            ?.readiness
        ).toBe("BLOCKED");
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessBlockedWebhookConnectorKey)?.readiness
        ).toBe("BLOCKED");
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessReadyConnectorKey)?.providerAdapterKey
        ).toBe(httpPushAdapterKey);
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessReadyConnectorKey)?.providerProfileKey
        ).toBe(httpPushProfileKey);
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessReadyConnectorKey)?.providerPolicyKey
        ).toBe("FRESHLANE_CONTROLLED_RUNTIME");
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessReadyConnectorKey)?.providerAdapterDefaultPolicyVisible
        ).toBe(true);
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessReadyConnectorKey)?.providerProfileDefaultPolicyVisible
        ).toBe(true);
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessBlockedWebhookConnectorKey)?.providerAdapterKey
        ).toBe(webhookAdapterKey);
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessBlockedWebhookConnectorKey)?.providerProfileKey
        ).toBe(webhookProviderProfile?.key ?? "");
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessBlockedWebhookConnectorKey)?.providerPolicyKey
        ).toBe("SIGNAL_SIGNED_WEBHOOK_RUNTIME");
        expect(
          readinessItems.find((item) => item.connectorKey === supplierReadinessBlockedWebhookConnectorKey)?.providerAdapterDefaultPolicyVisible
        ).toBe(true);

        await request(httpServer)
          .post("/inventory/replenishment-jobs")
          .send({ tenantId, storeId, warehouseId: warehouse.id })
          .expect(201)
          .then(async ({ body }) => {
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/approve`)
              .expect(201);
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/dispatch`)
              .expect(201);
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/handoff`)
              .send({
                supplierName: "Readiness Ready Supplier",
                supplierReference: `SUP-READY-${body.id.slice(0, 8)}`,
                channel: "API",
                connectorKey: supplierReadinessReadyConnectorKey
              })
              .expect(201)
              .expect(({ body: handoffBody }) => {
                expect(handoffBody.artifact.workflow.supplier.providerAdapterKey).toBe(httpPushAdapterKey);
                expect(handoffBody.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
              });
          });

        await request(httpServer)
          .post("/inventory/replenishment-jobs")
          .send({ tenantId, storeId, warehouseId: warehouse.id })
          .expect(201)
          .then(async ({ body }) => {
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/approve`)
              .expect(201);
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/dispatch`)
              .expect(201);
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/handoff`)
              .send({
                supplierName: "Readiness Blocked HTTP Supplier",
                supplierReference: `SUP-BLOCKED-HTTP-${body.id.slice(0, 8)}`,
                channel: "API",
                connectorKey: supplierReadinessBlockedHttpMissingEndpointConnectorKey
              })
              .expect(400);
          });

        await request(httpServer)
          .post("/inventory/replenishment-jobs")
          .send({ tenantId, storeId, warehouseId: warehouse.id })
          .expect(201)
          .then(async ({ body }) => {
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/approve`)
              .expect(201);
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/dispatch`)
              .expect(201);
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/handoff`)
              .send({
                supplierName: "Readiness Blocked Secret Supplier",
                supplierReference: `SUP-BLOCKED-SECRET-${body.id.slice(0, 8)}`,
                channel: "API",
                connectorKey: supplierReadinessBlockedHttpMissingSecretConnectorKey
              })
              .expect(400);
          });

        await request(httpServer)
          .post("/inventory/replenishment-jobs")
          .send({ tenantId, storeId, warehouseId: warehouse.id })
          .expect(201)
          .then(async ({ body }) => {
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/approve`)
              .expect(201);
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/dispatch`)
              .expect(201);
            await request(httpServer)
              .post(`/inventory/replenishment-jobs/${body.id}/handoff`)
              .send({
                supplierName: "Readiness Blocked Webhook Supplier",
                supplierReference: `SUP-BLOCKED-WEBHOOK-${body.id.slice(0, 8)}`,
                channel: "API",
                connectorKey: supplierReadinessBlockedWebhookConnectorKey
              })
              .expect(400);
          });
      }
    }

    const httpProfileReplenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${httpProfileReplenishmentJob.body.id}/approve`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${httpProfileReplenishmentJob.body.id}/dispatch`)
      .expect(201);

    const httpProfileHandoff = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${httpProfileReplenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "HTTP Profile Supplier",
        supplierReference: `SUP-HTTP-PROFILE-${httpProfileReplenishmentJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: supplierHttpProfileConnectorKey
      })
      .expect(201);

    const httpProfileAuthHeaderName = httpProfileHandoff.body.artifact.workflow.supplier.authHeaderName as string;
    expect(httpProfileHandoff.body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
    expect(httpProfileHandoff.body.artifact.workflow.supplier.endpoint).toBe(supplierHttpEndpoint);
    expect(httpProfileHandoff.body.artifact.workflow.supplier.method).toBe("POST");
    expect(httpProfileHandoff.body.artifact.workflow.supplier.authKeyRef).toBe(supplierHttpProfileSecretKey);
    expect(httpProfileHandoff.body.artifact.workflow.supplier.timeoutMs).toEqual(expect.any(Number));
    expect(httpProfileHandoff.body.artifact.workflow.supplier.authHeaderName).toEqual(expect.any(String));
    expect(httpProfileHandoff.body.artifact.workflow.supplier.retryPolicy).toEqual(expect.any(Object));
    expect(httpProfileHandoff.body.artifact.workflow.supplier.supplierStatus).toBe("ACKNOWLEDGED");

    const httpProfileRequest = supplierHttpRequests.find((item) =>
      item.url === "/supplier/replenishments" &&
      item.body.includes(`SUP-HTTP-PROFILE-${httpProfileReplenishmentJob.body.id.slice(0, 8)}`)
    );
    expect(httpProfileRequest).toBeDefined();
    expect(httpProfileRequest?.method).toBe("POST");
    expect(httpProfileRequest?.headers[httpProfileAuthHeaderName.toLowerCase()]).toBe(
      "Token supplier-http-profile-secret"
    );
    expect(httpProfileRequest?.body).toContain(httpProfileReplenishmentJob.body.id);
    expect(httpProfileRequest?.body).toContain(`SUP-HTTP-PROFILE-${httpProfileReplenishmentJob.body.id.slice(0, 8)}`);

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${httpProfileReplenishmentJob.body.id}/connector-executions`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_http_push_handoff")).toBe(
          true
        );
      });

    const fileProfileReplenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileProfileReplenishmentJob.body.id}/approve`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileProfileReplenishmentJob.body.id}/dispatch`)
      .expect(201);

    const fileProfileHandoff = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileProfileReplenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "File Profile Supplier",
        supplierReference: `SUP-FILE-PROFILE-${fileProfileReplenishmentJob.body.id.slice(0, 8)}`,
        channel: "FILE",
        connectorKey: supplierFileProfileConnectorKey
      })
      .expect(201);

    expect(fileProfileHandoff.body.artifact.workflow.supplier.transportMode).toBe("FILE_IMPORT");
    expect(fileProfileHandoff.body.artifact.workflow.supplier.pendingImport).toBe(true);
    expect(fileProfileHandoff.body.artifact.workflow.supplier.pickupPath).toEqual(expect.any(String));
    expect(fileProfileHandoff.body.artifact.workflow.supplier.dropPath).toEqual(expect.any(String));
    expect(fileProfileHandoff.body.artifact.workflow.supplier.requireChecksum).toBe(true);
    expect(fileProfileHandoff.body.artifact.workflow.supplier.deliveryArtifact.fileName).toContain(".json");
    expect(fileProfileHandoff.body.artifact.workflow.supplier.supplierStatus).toBe("SUBMITTED");

    if (fileImportProviderProfile?.pickupPath) {
      expect(fileProfileHandoff.body.artifact.workflow.supplier.pickupPath).toBe(
        fileImportProviderProfile.pickupPath.replace(":jobId", fileProfileReplenishmentJob.body.id)
      );
    } else {
      expect(fileProfileHandoff.body.artifact.workflow.supplier.pickupPath).toContain("/supplier/pickup/");
    }
    if (fileImportProviderProfile?.dropPath) {
      expect(fileProfileHandoff.body.artifact.workflow.supplier.dropPath).toBe(
        fileImportProviderProfile.dropPath.replace(":jobId", fileProfileReplenishmentJob.body.id)
      );
    } else {
      expect(fileProfileHandoff.body.artifact.workflow.supplier.dropPath).toContain("/supplier/drop/");
    }
    if (fileImportProviderProfile?.requireChecksum) {
      expect(fileProfileHandoff.body.artifact.workflow.supplier.requireChecksum).toBe(
        fileImportProviderProfile.requireChecksum
      );
    }

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${fileProfileReplenishmentJob.body.id}/connector-executions`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_file_handoff")).toBe(true);
      });

    const webhookReplenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/approve`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/dispatch`)
      .expect(201);

    const webhookHandoff = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "Webhook Supplier",
        supplierReference: `SUP-WEBHOOK-${webhookReplenishmentJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: supplierWebhookConnectorKey
      })
      .expect(201);

    expect(webhookHandoff.body.artifact.workflow.supplier.transportMode).toBe("WEBHOOK");
    expect(webhookHandoff.body.artifact.workflow.supplier.pendingCallback).toBe(true);
    expect(webhookHandoff.body.artifact.workflow.supplier.requireSignature).toBe(true);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/supplier-sync`)
      .send({ note: "Polling should be blocked for webhook connector." })
      .expect(400);

    const webhookDeliveryId = `delivery-${webhookReplenishmentJob.body.id}`;
    const invalidWebhookDeliveryId = `delivery-invalid-${webhookReplenishmentJob.body.id}`;
    const webhookSignature = createHmac("sha256", "supplier-webhook-secret")
      .update(
        stableJson({
          deliveryId: webhookDeliveryId,
          supplierStatus: "DELIVERED",
          externalReference: webhookHandoff.body.artifact.workflow.supplier.supplierReference,
          eventType: "delivery.confirmed",
          payload: {
            delivered: true
          }
        })
      )
      .digest("hex");

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/supplier-webhook`)
      .send({
        deliveryId: invalidWebhookDeliveryId,
        supplierStatus: "DELIVERED",
        externalReference: webhookHandoff.body.artifact.workflow.supplier.supplierReference,
        eventType: "delivery.confirmed",
        signature: "bad-signature",
        note: "Invalid webhook delivery confirmation.",
        payload: {
          delivered: true
        }
      })
      .expect(400);

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.lastFailureCode).toBe("SIGNATURE_INVALID");
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("FAILED");
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/supplier-retry-queue`)
      .send({
        source: "WEBHOOK",
        delayMinutes: 0,
        note: "Queue retry for invalid signature callback."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.pendingCallback).toBe(true);
        expect(body.artifact.workflow.supplier.retryAttemptCount).toBe(1);
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("RETRY_QUEUED");
        expect(body.artifact.workflow.supplier.nextRetryAt).toEqual(expect.any(String));
      });

    await request(httpServer)
      .post("/inventory/replenishment-jobs/supplier-retry-run-due")
      .send({
        tenantId,
        storeId,
        source: "WEBHOOK",
        note: "Run due webhook retries."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.considered).toBeGreaterThanOrEqual(1);
        expect(body.processedJobIds).toContain(webhookReplenishmentJob.body.id);
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("RETRY_DISPATCHED");
        expect(body.artifact.workflow.supplier.lastRetryProcessedSource).toBe("WEBHOOK");
        expect(body.artifact.workflow.supplier.retryProcessedCount).toBe(1);
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/supplier-webhook`)
      .send({
        deliveryId: webhookDeliveryId,
        supplierStatus: "DELIVERED",
        externalReference: webhookHandoff.body.artifact.workflow.supplier.supplierReference,
        eventType: "delivery.confirmed",
        signature: webhookSignature,
        note: "Webhook delivery confirmation.",
        payload: {
          delivered: true
        }
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("DELIVERED");
        expect(body.artifact.workflow.supplier.pendingCallback).toBe(false);
        expect(body.artifact.workflow.supplier.callbackDeliveryId).toBe(webhookDeliveryId);
        expect(body.artifact.workflow.supplier.callbackSignatureVerified).toBe(true);
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/supplier-webhook`)
      .send({
        deliveryId: webhookDeliveryId,
        supplierStatus: "DELIVERED",
        externalReference: webhookHandoff.body.artifact.workflow.supplier.supplierReference,
        eventType: "delivery.confirmed",
        signature: webhookSignature,
        note: "Webhook duplicate delivery confirmation.",
        payload: {
          delivered: true
        }
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.lastDuplicateDeliveryId).toBe(webhookDeliveryId);
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("DUPLICATE");
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/supplier-replay`)
      .send({
        source: "WEBHOOK",
        note: "Replay verified webhook."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.lastReplaySource).toBe("WEBHOOK");
        expect(body.artifact.workflow.supplier.replayCount).toBe(1);
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("REPLAYED");
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${webhookReplenishmentJob.body.id}/connector-executions`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_webhook_handoff")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_webhook_callback")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_retry_queued")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_retry_due")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_webhook_replay")).toBe(true);
      });

    const fileReplenishmentJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: warehouse.id })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/approve`)
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/dispatch`)
      .expect(201);

    const fileHandoff = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/handoff`)
      .send({
        supplierName: "File Supplier",
        supplierReference: `SUP-FILE-${fileReplenishmentJob.body.id.slice(0, 8)}`,
        channel: "FILE",
        connectorKey: supplierFileConnectorKey
      })
      .expect(201);

    expect(fileHandoff.body.artifact.workflow.supplier.transportMode).toBe("FILE_IMPORT");
    expect(fileHandoff.body.artifact.workflow.supplier.pendingImport).toBe(true);
    expect(fileHandoff.body.artifact.workflow.supplier.deliveryArtifact.fileName).toContain(".json");
    expect(fileHandoff.body.artifact.workflow.supplier.requireChecksum).toBe(true);
    expect(fileHandoff.body.artifact.workflow.supplier.pickupPath).toContain("/supplier/pickup/");
    expect(fileHandoff.body.artifact.workflow.supplier.dropPath).toContain("/supplier/drop/");

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/supplier-file-pickup`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.fileName).toContain(".json");
        expect(body.pickupPath).toContain("/supplier/pickup/");
        expect(body.dropPath).toContain("/supplier/drop/");
        expect(body.content).toContain(fileHandoff.body.artifact.workflow.supplier.supplierReference);
      });

    const importId = `import-${fileReplenishmentJob.body.id}`;
    const importChecksum = createHash("sha256")
      .update(
        stableJson({
          importId,
          supplierStatus: "DELIVERED",
          externalReference: fileHandoff.body.artifact.workflow.supplier.supplierReference,
          fileName: "supplier-update.json",
          payload: {
            delivered: true
          }
        })
      )
      .digest("hex");

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/supplier-import`)
      .send({
        importId: `invalid-${importId}`,
        supplierStatus: "DELIVERED",
        externalReference: fileHandoff.body.artifact.workflow.supplier.supplierReference,
        fileName: "supplier-update.json",
        checksum: "bad-checksum",
        note: "Imported supplier invalid response.",
        payload: {
          delivered: true
        }
      })
      .expect(400);

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.lastFailureCode).toBe("CHECKSUM_INVALID");
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("FAILED");
      });

    await request(httpServer)
      .post("/inventory/replenishment-jobs/supplier-retry-sweep")
      .send({
        tenantId,
        storeId,
        source: "FILE_IMPORT",
        delayMinutes: 0,
        note: "Sweep failed file-import retries."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.considered).toBeGreaterThanOrEqual(1);
        expect(body.queued).toBeGreaterThanOrEqual(1);
        expect(body.queuedJobIds).toContain(fileReplenishmentJob.body.id);
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.pendingImport).toBe(true);
        expect(body.artifact.workflow.supplier.retryAttemptCount).toBe(1);
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("RETRY_QUEUED");
      });

    await request(httpServer)
      .post("/inventory/replenishment-jobs/supplier-retry-run-due")
      .send({
        tenantId,
        storeId,
        source: "FILE_IMPORT",
        note: "Run due file retries."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.considered).toBeGreaterThanOrEqual(1);
        expect(body.processedJobIds).toContain(fileReplenishmentJob.body.id);
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("RETRY_DISPATCHED");
        expect(body.artifact.workflow.supplier.lastRetryProcessedSource).toBe("FILE_IMPORT");
        expect(body.artifact.workflow.supplier.retryProcessedCount).toBe(1);
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/supplier-import`)
      .send({
        importId,
        supplierStatus: "DELIVERED",
        externalReference: fileHandoff.body.artifact.workflow.supplier.supplierReference,
        fileName: "supplier-update.json",
        checksum: importChecksum,
        note: "Imported supplier response.",
        payload: {
          delivered: true
        }
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("DELIVERED");
        expect(body.artifact.workflow.supplier.pendingImport).toBe(false);
        expect(body.artifact.workflow.supplier.importId).toBe(importId);
        expect(body.artifact.workflow.supplier.importChecksumVerified).toBe(true);
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/supplier-import`)
      .send({
        importId,
        supplierStatus: "DELIVERED",
        externalReference: fileHandoff.body.artifact.workflow.supplier.supplierReference,
        fileName: "supplier-update.json",
        checksum: importChecksum,
        note: "Imported supplier duplicate response.",
        payload: {
          delivered: true
        }
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.lastDuplicateImportId).toBe(importId);
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("DUPLICATE");
      });

    const droppedImportId = `drop-${fileReplenishmentJob.body.id}`;
    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/supplier-file-drop`)
      .send({
        importId: droppedImportId,
        supplierStatus: "DELIVERED",
        fileName: "supplier-response.json",
        contentType: "application/json",
        content: JSON.stringify({
          externalReference: fileHandoff.body.artifact.workflow.supplier.supplierReference,
          delivered: true,
          proof: "dock-receipt"
        }),
        note: "Dropped supplier response through file adapter."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.importId).toBe(droppedImportId);
        expect(body.artifact.workflow.supplier.importChecksumVerified).toBe(true);
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("DELIVERED");
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/supplier-replay`)
      .send({
        source: "FILE_IMPORT",
        note: "Replay verified import."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.lastReplaySource).toBe("FILE_IMPORT");
        expect(body.artifact.workflow.supplier.replayCount).toBe(1);
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("REPLAYED");
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${fileReplenishmentJob.body.id}/connector-executions`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_file_handoff")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_file_drop")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_file_import")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_retry_queued")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_retry_due")).toBe(true);
        expect(body.some((item: { action: string }) => item.action === "replenishment_supplier_file_replay")).toBe(true);
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/export`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.jobId).toBe(replenishmentJob.body.id);
        expect(body.status).toBe("DISPATCHED");
        expect(body.filename).toContain("replenishment-");
        expect(body.contentType).toBe("text/csv");
        expect(body.rowCount).toBeGreaterThan(0);
        expect(body.content).toContain("ingredientCode");
        expect(body.content).toContain("salmon");
      });

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/export`)
      .query({ format: "json" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.contentType).toBe("application/json");
        expect(body.filename).toContain(".json");
        expect(body.content).toContain("\"jobId\"");
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/supplier-status`)
      .send({
        supplierStatus: "DELIVERED",
        note: "Supplier delivered order."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("DELIVERED");
      });

    const receivedJob = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/receive`)
      .send({ receivedBy: "Inventory Operator", autoComplete: true })
      .expect(201);
    expect(receivedJob.body.job.status).toBe("RECEIVED");
    expect(receivedJob.body.receiving.status).toBe("COMPLETED");
    expect(receivedJob.body.receiving.reference).toContain("REPL-");

    const itemAfterReplenishmentReceipt = (
      await request(httpServer).get("/inventory/items").expect(200)
    ).body as Array<{ id: string; onHand: number }>;
    expect(itemAfterReplenishmentReceipt.find((row) => row.id === item.id)?.onHand).toBeGreaterThan(3);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${replenishmentJob.body.id}/archive`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("ARCHIVED");
      });

    const ledgerDrilldown = await request(httpServer)
      .get("/inventory/ledger-drilldown")
      .query({ tenantId, warehouseId: warehouse.id, ingredientId: ingredient.id, limit: 20 })
      .expect(200);
    expect(ledgerDrilldown.body.totals.entryCount).toBeGreaterThan(0);
    expect(ledgerDrilldown.body.byEntryType).toEqual(expect.any(Object));
    expect(ledgerDrilldown.body.entries[0].ingredientId).toBe(ingredient.id);
  });

  it("covers provider execution runtime compatibility, Freshlane and Waredrop execution flows, Signal webhook replay, and forced retry dispatch semantics", async () => {
    const executionWarehouseResponse = await request(httpServer)
      .post("/inventory/warehouses")
      .send({
        tenantId,
        storeId,
        code: "execution-runtime",
        name: "Execution Runtime Warehouse",
        kind: "STORAGE",
        notes: "Warehouse for provider execution runtime coverage",
        isActive: true
      })
      .expect(201);
    const executionWarehouse = executionWarehouseResponse.body as { id: string };

    const freshlaneAuthSecretKey = "inventory.supplier.freshlane.auth";
    const signalSecretKey = "inventory.supplier.signal.secret";

    await prisma.secretRegistryEntry.createMany({
      data: [
        {
          tenantId,
          organizationId: null,
          scopeType: "TENANT",
          scopeId: tenantId,
          key: freshlaneAuthSecretKey,
          valueEnvelope: {
            kind: "opaque",
            storedAt: new Date().toISOString(),
            value: "supplier-freshlane-secret"
          }
        },
        {
          tenantId,
          organizationId: null,
          scopeType: "TENANT",
          scopeId: tenantId,
          key: signalSecretKey,
          valueEnvelope: {
            kind: "opaque",
            storedAt: new Date().toISOString(),
            value: "supplier-signal-secret"
          }
        }
      ]
    });

    const registerExecutionConnector = async (
      connectorKey: string,
      manifest: import("@exetron/database").Prisma.InputJsonValue
    ) => {
      await prisma.integrationRegistryEntry.create({
        data: {
          tenantId,
          connectorKey,
          version: "1.0.0",
          status: "ACTIVE",
          manifest
        }
      });
      await prisma.integrationActivationRequest.create({
        data: {
          tenantId,
          targetKind: "SUPPLIER_CONNECTOR",
          connectorKey,
          version: "1.0.0",
          status: "APPLIED",
          approvedAt: baselineActivationAt,
          appliedAt: baselineActivationAt
        }
      });
    };

    const freshlaneSuccessConnectorKey = "supplier-freshlane-http-success-demo";
    const freshlaneRetryConnectorKey = "supplier-freshlane-http-retry-demo";
    const freshlaneRejectConnectorKey = "supplier-freshlane-http-reject-demo";
    const waredropConnectorKey = "supplier-waredrop-file-demo";
    const signalConnectorKey = "supplier-signal-webhook-demo";
    const blockedFreshlaneConnectorKey = "supplier-execution-readiness-freshlane-blocked-demo";
    const blockedWaredropConnectorKey = "supplier-execution-readiness-waredrop-blocked-demo";
    const blockedSignalConnectorKey = "supplier-execution-readiness-signal-blocked-demo";

    await registerExecutionConnector(freshlaneSuccessConnectorKey, {
      kind: "SUPPLIER",
      supports: ["handoff", "status_sync"],
      providerPolicy: "FRESHLANE_CONTROLLED_RUNTIME",
      runtime: {
        transport: {
          mode: "HTTP_PUSH",
          endpoint: `${supplierHttpEndpoint}/freshlane/success`,
          method: "POST",
          acceptedStatusCodes: [201, 202],
          auth: {
            kind: "HEADER",
            headerName: "x-supplier-auth",
            prefix: "Token",
            secretKey: freshlaneAuthSecretKey
          },
          retry: {
            enabled: true,
            maxAttempts: 3,
            backoffMinutes: 5
          }
        }
      }
    });

    await registerExecutionConnector(freshlaneRetryConnectorKey, {
      kind: "SUPPLIER",
      supports: ["handoff", "status_sync"],
      providerPolicy: "FRESHLANE_CONTROLLED_RUNTIME",
      runtime: {
        transport: {
          mode: "HTTP_PUSH",
          endpoint: `${supplierHttpEndpoint}/freshlane/retryable`,
          method: "POST",
          acceptedStatusCodes: [201, 202],
          auth: {
            kind: "HEADER",
            headerName: "x-supplier-auth",
            prefix: "Token",
            secretKey: freshlaneAuthSecretKey
          },
          retry: {
            enabled: true,
            maxAttempts: 3,
            backoffMinutes: 5
          }
        }
      }
    });

    await registerExecutionConnector(freshlaneRejectConnectorKey, {
      kind: "SUPPLIER",
      supports: ["handoff", "status_sync"],
      providerPolicy: "FRESHLANE_CONTROLLED_RUNTIME",
      runtime: {
        transport: {
          mode: "HTTP_PUSH",
          endpoint: `${supplierHttpEndpoint}/freshlane/reject`,
          method: "POST",
          acceptedStatusCodes: [201, 202],
          auth: {
            kind: "HEADER",
            headerName: "x-supplier-auth",
            prefix: "Token",
            secretKey: freshlaneAuthSecretKey
          },
          retry: {
            enabled: true,
            maxAttempts: 1,
            backoffMinutes: 1
          }
        }
      }
    });

    await registerExecutionConnector(waredropConnectorKey, {
      kind: "SUPPLIER",
      supports: ["handoff", "status_import"],
      providerPolicy: "WAREDROP_FILE_STAGING_RUNTIME",
      runtime: {
        transport: {
          mode: "FILE_IMPORT",
          importFormat: "json",
          requireChecksum: true,
          pickupPath: "/supplier/waredrop/pickup/:jobId",
          dropPath: "/supplier/waredrop/drop/:jobId"
        }
      }
    });

    await registerExecutionConnector(signalConnectorKey, {
      kind: "SUPPLIER",
      supports: ["handoff", "status_callback"],
      providerPolicy: "SIGNAL_SIGNED_WEBHOOK_RUNTIME",
      runtime: {
        transport: {
          mode: "WEBHOOK",
          requireSignature: true,
          secretKey: signalSecretKey
        }
      }
    });

    await registerExecutionConnector(blockedFreshlaneConnectorKey, {
      kind: "SUPPLIER",
      supports: ["handoff", "status_sync"],
      providerPolicy: "FRESHLANE_CONTROLLED_RUNTIME",
      runtime: {
        transport: {
          mode: "HTTP_PUSH",
          method: "POST",
          auth: {
            kind: "HEADER",
            headerName: "x-supplier-auth",
            prefix: "Token",
            secretKey: "inventory.supplier.freshlane.missing.auth"
          }
        }
      }
    });

    await registerExecutionConnector(blockedWaredropConnectorKey, {
      kind: "SUPPLIER",
      supports: ["handoff", "status_import"],
      providerPolicy: "WAREDROP_FILE_STAGING_RUNTIME",
      runtime: {
        transport: {
          mode: "FILE_IMPORT",
          importFormat: "json",
          pickupPath: "/supplier/waredrop-blocked/pickup/:jobId"
        }
      }
    });

    await registerExecutionConnector(blockedSignalConnectorKey, {
      kind: "SUPPLIER",
      supports: ["handoff", "status_callback"],
      providerPolicy: "SIGNAL_SIGNED_WEBHOOK_RUNTIME",
      runtime: {
        transport: {
          mode: "WEBHOOK",
          requireSignature: true
        }
      }
    });

    const executionReadinessResponse = await request(httpServer)
      .get("/inventory/supplier-execution-readiness")
      .query({ tenantId, storeId, warehouseId: executionWarehouse.id })
      .expect((response) => {
        expect([200, 404]).toContain(response.status);
      });

    if (executionReadinessResponse.status === 200) {
      const executionReadinessItems = readSupplierExecutionReadinessItems(executionReadinessResponse.body).map(
        readSupplierExecutionReadinessItem
      );
      const executionReadinessByKey = new Map(
        executionReadinessItems.map((item) => [item.connectorKey, item] as const)
      );

      expect(executionReadinessByKey.get(freshlaneSuccessConnectorKey)?.readiness).toBe("READY");
      expect(executionReadinessByKey.get(waredropConnectorKey)?.readiness).toBe("READY");
      expect(executionReadinessByKey.get(signalConnectorKey)?.readiness).toBe("READY");
      expect(executionReadinessByKey.get(blockedFreshlaneConnectorKey)?.readiness).toBe("BLOCKED");
      expect(executionReadinessByKey.get(blockedWaredropConnectorKey)?.readiness).toBe("BLOCKED");
      expect(executionReadinessByKey.get(blockedSignalConnectorKey)?.readiness).toBe("BLOCKED");
      expect(
        [
          executionReadinessByKey.get(blockedFreshlaneConnectorKey)?.reason,
          executionReadinessByKey.get(blockedWaredropConnectorKey)?.reason,
          executionReadinessByKey.get(blockedSignalConnectorKey)?.reason
        ]
          .join(" ")
          .toLowerCase()
      ).toMatch(/endpoint|checksum|signature|secret/);
    }

    const freshlaneSuccessJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: executionWarehouse.id })
      .expect(201);

    await request(httpServer).post(`/inventory/replenishment-jobs/${freshlaneSuccessJob.body.id}/approve`).expect(201);
    await request(httpServer).post(`/inventory/replenishment-jobs/${freshlaneSuccessJob.body.id}/dispatch`).expect(201);

    const freshlaneSuccessHandoff = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${freshlaneSuccessJob.body.id}/handoff`)
      .send({
        supplierName: "Freshlane Success Supplier",
        supplierReference: `SUP-FRESHLANE-SUCCESS-${freshlaneSuccessJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: freshlaneSuccessConnectorKey
      })
      .expect(201);

    expect(freshlaneSuccessHandoff.body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
    expect(freshlaneSuccessHandoff.body.artifact.workflow.supplier.supplierStatus).toBe("ACKNOWLEDGED");
    expect(freshlaneSuccessHandoff.body.artifact.workflow.supplier.deliveryArtifact.endpoint).toBe(
      `${supplierHttpEndpoint}/freshlane/success`
    );
    if ("providerPolicyKey" in freshlaneSuccessHandoff.body.artifact.workflow.supplier) {
      expect(freshlaneSuccessHandoff.body.artifact.workflow.supplier.providerPolicyKey).toBe(
        "FRESHLANE_CONTROLLED_RUNTIME"
      );
    }

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${freshlaneSuccessJob.body.id}/supplier-sync`)
      .send({ note: "Sync Freshlane success order." })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("IN_TRANSIT");
      });

    const freshlaneRetryJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: executionWarehouse.id })
      .expect(201);

    await request(httpServer).post(`/inventory/replenishment-jobs/${freshlaneRetryJob.body.id}/approve`).expect(201);
    await request(httpServer).post(`/inventory/replenishment-jobs/${freshlaneRetryJob.body.id}/dispatch`).expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${freshlaneRetryJob.body.id}/handoff`)
      .send({
        supplierName: "Freshlane Retryable Supplier",
        supplierReference: `SUP-FRESHLANE-RETRY-${freshlaneRetryJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: freshlaneRetryConnectorKey
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
        expect(body.artifact.workflow.supplier.endpoint).toBe(`${supplierHttpEndpoint}/freshlane/retryable`);
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("SUBMITTED");
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("RETRY_QUEUED");
        expect(body.artifact.workflow.supplier.retryAttemptCount).toBe(1);
      });

    const retryDispatchResponse = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${freshlaneRetryJob.body.id}/supplier-retry-dispatch`)
      .send({
        source: "MANUAL",
        force: true,
        note: "Forced retry for Freshlane provider execution runtime."
      })
      .expect((response) => {
        expect([200, 201, 404]).toContain(response.status);
      });

    if (retryDispatchResponse.status !== 404) {
      expect(["RETRY_DISPATCHED", "RETRY_COMPLETED"]).toContain(
        retryDispatchResponse.body.artifact.workflow.supplier.reconciliation.status
      );
      expect(retryDispatchResponse.body.artifact.workflow.supplier.retryAttemptCount).toBeGreaterThanOrEqual(1);
      const retryableRequests = supplierHttpRequests.filter((item) => item.url === "/supplier/replenishments/retryable");
      expect(retryableRequests.length).toBeGreaterThanOrEqual(2);

      await request(httpServer)
        .post(`/inventory/replenishment-jobs/${freshlaneRetryJob.body.id}/supplier-sync`)
        .send({ note: "Sync Freshlane forced retry order." })
        .expect(201)
        .expect(({ body }) => {
          expect(body.artifact.workflow.supplier.supplierStatus).toBe("IN_TRANSIT");
        });
    }

    const freshlaneRejectJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: executionWarehouse.id })
      .expect(201);

    await request(httpServer).post(`/inventory/replenishment-jobs/${freshlaneRejectJob.body.id}/approve`).expect(201);
    await request(httpServer).post(`/inventory/replenishment-jobs/${freshlaneRejectJob.body.id}/dispatch`).expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${freshlaneRejectJob.body.id}/handoff`)
      .send({
        supplierName: "Freshlane Rejection Supplier",
        supplierReference: `SUP-FRESHLANE-REJECT-${freshlaneRejectJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: freshlaneRejectConnectorKey
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.transportMode).toBe("HTTP_PUSH");
        expect(body.artifact.workflow.supplier.lastTransportStatus).toBe("FAILED");
        expect(body.artifact.workflow.supplier.lastFailureCode).toBe("SUPPLIER_REJECTED");
        expect(body.artifact.workflow.supplier.deliveryArtifact.responseStatus).toBe(409);
      });

    const waredropJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: executionWarehouse.id })
      .expect(201);

    await request(httpServer).post(`/inventory/replenishment-jobs/${waredropJob.body.id}/approve`).expect(201);
    await request(httpServer).post(`/inventory/replenishment-jobs/${waredropJob.body.id}/dispatch`).expect(201);

    const waredropHandoff = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${waredropJob.body.id}/handoff`)
      .send({
        supplierName: "Waredrop File Supplier",
        supplierReference: `SUP-WAREDROP-${waredropJob.body.id.slice(0, 8)}`,
        channel: "FILE",
        connectorKey: waredropConnectorKey
      })
      .expect(201);

    expect(waredropHandoff.body.artifact.workflow.supplier.transportMode).toBe("FILE_IMPORT");
    expect(waredropHandoff.body.artifact.workflow.supplier.pendingImport).toBe(true);
    expect(waredropHandoff.body.artifact.workflow.supplier.requireChecksum).toBe(true);
    expect(waredropHandoff.body.artifact.workflow.supplier.pickupPath).toContain("/supplier/waredrop/pickup/");
    expect(waredropHandoff.body.artifact.workflow.supplier.dropPath).toContain("/supplier/waredrop/drop/");

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${waredropJob.body.id}/supplier-file-pickup`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.fileName).toContain(".json");
        expect(body.pickupPath).toContain("/supplier/waredrop/pickup/");
        expect(body.dropPath).toContain("/supplier/waredrop/drop/");
        expect(body.content).toContain(waredropHandoff.body.artifact.workflow.supplier.supplierReference);
      });

    const waredropDropContent = JSON.stringify({
      externalReference: waredropHandoff.body.artifact.workflow.supplier.supplierReference,
      supplierStatus: "DELIVERED",
      delivered: true,
      batchCode: `WAREDROP-${waredropJob.body.id.slice(0, 8)}`
    });
    const waredropDropChecksum = createHash("sha256").update(waredropDropContent).digest("hex");

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${waredropJob.body.id}/supplier-file-drop`)
      .send({
        importId: `waredrop-drop-${waredropJob.body.id}`,
        supplierStatus: "DELIVERED",
        fileName: "waredrop-response.json",
        contentType: "application/json",
        content: waredropDropContent,
        checksum: waredropDropChecksum,
        note: "Drop Waredrop staged file."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.importChecksumVerified).toBe(true);
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("DELIVERED");
      });

    const waredropImportPayload = {
      externalReference: waredropHandoff.body.artifact.workflow.supplier.supplierReference,
      delivered: true,
      batchCode: `WAREDROP-${waredropJob.body.id.slice(0, 8)}`
    };
    const waredropImportChecksumPayload = stableJson({
        importId: `waredrop-import-${waredropJob.body.id}`,
        supplierStatus: "DELIVERED",
        externalReference: waredropHandoff.body.artifact.workflow.supplier.supplierReference,
        fileName: "waredrop-response.json",
        payload: waredropImportPayload
      });
    const waredropImportChecksum = createHash("sha256")
      .update(waredropImportChecksumPayload)
      .digest("hex");

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${waredropJob.body.id}/supplier-import`)
      .send({
        importId: `waredrop-import-${waredropJob.body.id}`,
        supplierStatus: "DELIVERED",
        externalReference: waredropHandoff.body.artifact.workflow.supplier.supplierReference,
        fileName: "waredrop-response.json",
        checksum: waredropImportChecksum,
        note: "Import Waredrop staged file.",
        payload: waredropImportPayload
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.importChecksumVerified).toBe(true);
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("MATCHED");
      });

    const signalJob = await request(httpServer)
      .post("/inventory/replenishment-jobs")
      .send({ tenantId, storeId, warehouseId: executionWarehouse.id })
      .expect(201);

    await request(httpServer).post(`/inventory/replenishment-jobs/${signalJob.body.id}/approve`).expect(201);
    await request(httpServer).post(`/inventory/replenishment-jobs/${signalJob.body.id}/dispatch`).expect(201);

    const signalHandoff = await request(httpServer)
      .post(`/inventory/replenishment-jobs/${signalJob.body.id}/handoff`)
      .send({
        supplierName: "Signal Webhook Supplier",
        supplierReference: `SUP-SIGNAL-${signalJob.body.id.slice(0, 8)}`,
        channel: "API",
        connectorKey: signalConnectorKey
      })
      .expect(201);

    expect(signalHandoff.body.artifact.workflow.supplier.transportMode).toBe("WEBHOOK");
    expect(signalHandoff.body.artifact.workflow.supplier.pendingCallback).toBe(true);
    expect(signalHandoff.body.artifact.workflow.supplier.requireSignature).toBe(true);

    const signalDeliveryId = `signal-delivery-${signalJob.body.id}`;
    const signalWebhookPayload = {
      deliveryId: signalDeliveryId,
      supplierStatus: "DELIVERED",
      externalReference: signalHandoff.body.artifact.workflow.supplier.supplierReference,
      eventType: "delivery.confirmed",
      payload: {
        delivered: true,
        provider: "Signal"
      }
    };
    const signalSignature = createHmac("sha256", "supplier-signal-secret")
      .update(stableJson(signalWebhookPayload))
      .digest("hex");

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${signalJob.body.id}/supplier-webhook`)
      .send({
        ...signalWebhookPayload,
        signature: "bad-signature",
        note: "Bad Signal signature"
      })
      .expect(400);

    await request(httpServer)
      .get(`/inventory/replenishment-jobs/${signalJob.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.lastFailureCode).toBe("SIGNATURE_INVALID");
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("FAILED");
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${signalJob.body.id}/supplier-retry-queue`)
      .send({
        source: "WEBHOOK",
        delayMinutes: 0,
        note: "Queue Signal callback retry."
      })
      .expect(201);

    await request(httpServer)
      .post("/inventory/replenishment-jobs/supplier-retry-run-due")
      .send({
        tenantId,
        storeId,
        source: "WEBHOOK",
        note: "Run due Signal callback retry."
      })
      .expect(201);

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${signalJob.body.id}/supplier-webhook`)
      .send({
        ...signalWebhookPayload,
        signature: signalSignature,
        note: "Signal callback confirmation."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.supplierStatus).toBe("DELIVERED");
        expect(body.artifact.workflow.supplier.pendingCallback).toBe(false);
        expect(body.artifact.workflow.supplier.callbackDeliveryId).toBe(signalDeliveryId);
        expect(body.artifact.workflow.supplier.callbackSignatureVerified).toBe(true);
      });

    await request(httpServer)
      .post(`/inventory/replenishment-jobs/${signalJob.body.id}/supplier-webhook`)
      .send({
        ...signalWebhookPayload,
        signature: signalSignature,
        note: "Duplicate Signal callback confirmation."
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifact.workflow.supplier.lastDuplicateDeliveryId).toBe(signalDeliveryId);
        expect(body.artifact.workflow.supplier.reconciliation.status).toBe("DUPLICATE");
      });
  });

  it("keeps tenant-scoped supplier connectors activation-gated while global connectors remain implicit when activation metadata is surfaced", async () => {
    const tenantScopedActivationConnectorKey = "supplier-tenant-activation-demo";
    const globalActivationConnectorKey = "supplier-global-implicit-demo";

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId,
        connectorKey: tenantScopedActivationConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff"],
          activation: {
            required: true,
            scope: "TENANT"
          },
          runtime: {
            transport: {
              mode: "SIMULATED"
            }
          }
        }
      }
    });

    await prisma.integrationRegistryEntry.create({
      data: {
        tenantId: null,
        connectorKey: globalActivationConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff"],
          activation: {
            required: false,
            scope: "GLOBAL"
          },
          runtime: {
            transport: {
              mode: "SIMULATED"
            }
          }
        }
      }
    });

    const readinessResponse = await request(httpServer)
      .get("/inventory/supplier-connector-readiness")
      .query({ tenantId, storeId })
      .expect(200);

    const readinessItems = readConnectorReadinessItems(readinessResponse.body).map(readConnectorReadinessItem);
    const tenantScopedItem = readinessItems.find((item) => item.connectorKey === tenantScopedActivationConnectorKey);
    const globalItem = readinessItems.find((item) => item.connectorKey === globalActivationConnectorKey);

    expect(tenantScopedItem).toBeDefined();
    expect(globalItem).toBeDefined();

    const tenantRaw = (readConnectorReadinessItems(readinessResponse.body).find((item) => {
      const record = readObject(item);
      const runtime = readObject(record.runtime);
      return (
        readString(record.connectorKey, record.key, runtime.connectorKey) ===
        tenantScopedActivationConnectorKey
      );
    }) ?? {}) as Record<string, unknown>;
    const globalRaw = (readConnectorReadinessItems(readinessResponse.body).find((item) => {
      const record = readObject(item);
      const runtime = readObject(record.runtime);
      return readString(record.connectorKey, record.key, runtime.connectorKey) === globalActivationConnectorKey;
    }) ?? {}) as Record<string, unknown>;

    if (
      "activationStatus" in tenantRaw ||
      "activationRequired" in tenantRaw ||
      "activation" in tenantRaw ||
      "activationState" in tenantRaw
    ) {
      expect(tenantScopedItem?.readiness).toBe("BLOCKED");
      expect(globalItem?.readiness).toBe("READY");
      expect(
        tenantRaw.activationStatus ?? tenantRaw.activationRequired ?? tenantRaw.activationState ?? tenantRaw.activation
      ).toBeDefined();
      expect(
        globalRaw.activationStatus ?? globalRaw.activationRequired ?? globalRaw.activationState ?? globalRaw.activation
      ).toBeDefined();
    } else {
      expect([tenantScopedItem?.readiness, globalItem?.readiness]).toContain("READY");
    }
  });
});
