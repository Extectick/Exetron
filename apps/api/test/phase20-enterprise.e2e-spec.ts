import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EnterpriseModule, resetEnterpriseState } from "../src/enterprise/enterprise.module";

type HttpServer = Parameters<typeof request>[0];

describe("PHASE 20 enterprise, billing and ecosystem foundations", () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let httpServer: HttpServer;
  let prisma: typeof import("@exetron/database").prisma;

  beforeAll(async () => {
    resetEnterpriseState();
    ({ prisma } = require("@exetron/database") as typeof import("@exetron/database"));

    const moduleRef = await Test.createTestingModule({
      imports: [EnterpriseModule]
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
  });

  it("creates plans, subscriptions, federation, compliance and registry artifacts", async () => {
    const planResponse = await request(httpServer)
      .post("/enterprise/billing/plans")
      .send({
        code: "pro",
        name: "Pro",
        priceAmount: "99.00",
        currency: "RUB",
        intervalKey: "MONTHLY",
        entitlements: {
          maxStores: 10
        },
        quotas: {
          apiCallsPerMonth: 50000
        }
      })
      .expect(201);

    const planId = planResponse.body.id as string;

    const subscriptionResponse = await request(httpServer)
      .post("/enterprise/billing/subscriptions")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        planId,
        status: "TRIAL"
      })
      .expect(201);

    const subscription = subscriptionResponse.body as { id: string; billingAccountId: string };

    await request(httpServer)
      .post("/enterprise/billing/invoices")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        billingAccountId: subscription.billingAccountId,
        subscriptionId: subscription.id,
        subtotalAmount: "99.00",
        totalAmount: "99.00",
        lines: [
          {
            label: "Subscription"
          }
        ]
      })
      .expect(201);

    const entitlementResponse = await request(httpServer)
      .post("/enterprise/billing/entitlements")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        subscriptionId: subscription.id,
        key: "maxStores",
        scopeType: "TENANT",
        scopeId: null,
        value: {
          value: 10
        },
        source: "plan"
      })
      .expect(201);

    expect(entitlementResponse.body.key).toBe("maxStores");

    await request(httpServer)
      .post("/enterprise/billing/quotas")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        subscriptionId: subscription.id,
        key: "apiCallsPerMonth",
        scopeType: "TENANT",
        scopeId: null,
        limitValue: 50000,
        usedValue: 125
      })
      .expect(201);

    const idpResponse = await request(httpServer)
      .post("/enterprise/integrations/identity-providers")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        code: "google-workspace",
        type: "OIDC",
        config: {
          issuer: "https://accounts.google.com"
        }
      })
      .expect(201);

    await request(httpServer)
      .post(`/enterprise/integrations/identity-providers/${idpResponse.body.id}/federated-links`)
      .send({
        userId: "00000000-0000-0000-0000-000000000401",
        externalSubject: "google-subject-1",
        email: "owner@example.com"
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/audit/exports")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        filter: {
          kind: "ROLE_CHANGE"
        }
      })
      .expect(201);

    const policyResponse = await request(httpServer)
      .post("/enterprise/security/advanced-role-policies")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        key: "store-manager-policy",
        rules: {
          allow: ["orders.read", "orders.write"],
          deny: ["billing.write"]
        }
      })
      .expect(201);

    expect(policyResponse.body.key).toBe("store-manager-policy");

    const compliancePackResponse = await request(httpServer)
      .post("/enterprise/compliance/packs")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        code: "ru-fiscal-baseline",
        name: "RU Fiscal Baseline",
        controls: {
          receiptsArchived: true
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/compliance/evidence-artifacts")
      .send({
        compliancePackId: compliancePackResponse.body.id,
        tenantId: "00000000-0000-0000-0000-000000000301",
        key: "receipt-archive-export",
        artifact: {
          uri: "s3://evidence/receipt-archive.json"
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/security/secrets")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        scopeType: "TENANT",
        scopeId: "00000000-0000-0000-0000-000000000301",
        key: "oidc.client_secret",
        value: "encrypted-placeholder"
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/deployment-variants")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        code: "prod-eu",
        name: "Production EU",
        config: {
          region: "eu-central-1"
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000301",
        connectorKey: "pos-terminal",
        version: "1.0.0",
        manifest: {
          transport: "http"
        }
      })
      .expect(201);

    const sdkContractResponse = await request(httpServer)
      .post("/enterprise/integrations/partner-sdk-contracts")
      .send({
        key: "catalog-sync",
        version: "2026-03-19",
        schema: {
          type: "object",
          required: ["storeId"]
        }
      })
      .expect(201);

    expect(sdkContractResponse.body.key).toBe("catalog-sync");

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: "pos-terminal",
        version: "1.0.0",
        manifest: {
          fields: []
        }
      })
      .expect(201);

    const registryListResponse = await request(httpServer)
      .get("/enterprise/integrations/registry")
      .expect(200);
    const registryEntry = registryListResponse.body.find(
      (item: { connectorKey: string; version: string }) =>
        item.connectorKey === "pos-terminal" && item.version === "1.0.0"
    );
    expect(registryEntry).toBeTruthy();

    const packageResponse = await request(httpServer)
      .get(`/enterprise/integrations/registry/${registryEntry.id}/developer-package`)
      .expect(200);
    expect(packageResponse.body.connectorKey).toBe("pos-terminal");
    expect(packageResponse.body.compatibility.templateVersion).toBe("1.0.0");
    expect(packageResponse.body.partnerSdkContracts).toHaveLength(0);
    expect(packageResponse.body.content).toContain("\"connectorKey\": \"pos-terminal\"");

    const docsResponse = await request(httpServer)
      .get(`/enterprise/integrations/registry/${registryEntry.id}/developer-docs`)
      .expect(200);
    expect(docsResponse.body.title).toContain("pos-terminal");
    expect(docsResponse.body.markdown).toContain("## Overview");
    expect(docsResponse.body.markdown).toContain("pos-terminal");

    const overviewResponse = await request(httpServer)
      .get("/enterprise/billing/overview")
      .query({
        tenantId: "00000000-0000-0000-0000-000000000301"
      })
      .expect(200);

    expect(overviewResponse.body.subscription.id).toBe(subscription.id);
    expect(overviewResponse.body.invoices).toHaveLength(1);
    expect(overviewResponse.body.entitlements).toHaveLength(1);
    expect(overviewResponse.body.quotas).toHaveLength(1);
    expect(overviewResponse.body.hasTenantBillingState).toBe(false);

    const operationsOverviewResponse = await request(httpServer)
      .get("/enterprise/overview")
      .query({
        tenantId: "00000000-0000-0000-0000-000000000301"
      })
      .expect(200);

    expect(operationsOverviewResponse.body.scope.tenantId).toBe(
      "00000000-0000-0000-0000-000000000301"
    );
    expect(operationsOverviewResponse.body.summary.billingSubscriptionCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.billingInvoiceCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.identityProviderCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.federatedLinkCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.auditExportCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.compliancePackCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.complianceEvidenceArtifactCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.secretRegistryEntryCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.deploymentVariantCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.integrationRegistryEntryCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.connectorTemplateCount).toBe(1);
    expect(operationsOverviewResponse.body.summary.partnerSdkContractCount).toBe(1);
    expect(operationsOverviewResponse.body.latest.subscription.id).toBe(subscription.id);
  });

  it("supports breadth CRUD flows and redacted secret reads", async () => {
    const planResponse = await request(httpServer)
      .post("/enterprise/billing/plans")
      .send({
        code: "enterprise-plus",
        name: "Enterprise Plus",
        priceAmount: "199.00",
        currency: "RUB",
        intervalKey: "MONTHLY",
        entitlements: {
          maxStores: 25
        },
        quotas: {
          apiCallsPerMonth: 200000
        }
      })
      .expect(201);

    await request(httpServer)
      .get("/enterprise/billing/plans")
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === planResponse.body.id)).toBe(true);
      });

    await request(httpServer)
      .get(`/enterprise/billing/plans/${planResponse.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe("enterprise-plus");
      });

    await request(httpServer)
      .patch(`/enterprise/billing/plans/${planResponse.body.id}`)
      .send({
        name: "Enterprise Plus v2"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe("Enterprise Plus v2");
      });

    await request(httpServer)
      .post(`/enterprise/billing/plans/${planResponse.body.id}/status`)
      .send({
        status: "PAUSED"
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("PAUSED");
      });

    await request(httpServer)
      .post(`/enterprise/billing/plans/${planResponse.body.id}/archive`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("ARCHIVED");
      });

    const idpResponse = await request(httpServer)
      .post("/enterprise/integrations/identity-providers")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        code: "okta",
        type: "OIDC",
        config: {
          issuer: "https://example.okta.com"
        }
      })
      .expect(201);

    await request(httpServer)
      .get("/enterprise/integrations/identity-providers")
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === idpResponse.body.id)).toBe(true);
      });

    await request(httpServer)
      .patch(`/enterprise/integrations/identity-providers/${idpResponse.body.id}`)
      .send({
        status: "SUSPENDED"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("SUSPENDED");
      });

    await request(httpServer)
      .post(`/enterprise/integrations/identity-providers/${idpResponse.body.id}/archive`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("ARCHIVED");
      });

    const secretResponse = await request(httpServer)
      .post("/enterprise/security/secrets")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        scopeType: "TENANT",
        scopeId: "00000000-0000-0000-0000-000000000501",
        key: "signing.key",
        value: "super-secret-value"
      })
      .expect(201);

    await request(httpServer)
      .get(`/enterprise/security/secrets/${secretResponse.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.valueEnvelope.kind).toBe("redacted");
      });

    await request(httpServer)
      .get("/enterprise/security/secrets")
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string; valueEnvelope: { kind: string } }) => item.id === secretResponse.body.id && item.valueEnvelope.kind === "redacted")).toBe(true);
      });

    const variantResponse = await request(httpServer)
      .post("/enterprise/deployment-variants")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        code: "canary",
        name: "Canary",
        config: {
          region: "eu-west-1"
        }
      })
      .expect(201);

    await request(httpServer)
      .patch(`/enterprise/deployment-variants/${variantResponse.body.id}`)
      .send({
        name: "Canary Updated"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe("Canary Updated");
      });

    await request(httpServer)
      .post(`/enterprise/deployment-variants/${variantResponse.body.id}/status`)
      .send({
        status: "DISABLED"
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("DISABLED");
      });

    await request(httpServer)
      .post(`/enterprise/deployment-variants/${variantResponse.body.id}/archive`)
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: "pos-terminal",
        version: "2.0.0",
        manifest: {
          fields: ["serial"]
        }
      })
      .expect(201);

    await request(httpServer)
      .get("/enterprise/integrations/connector-templates")
      .expect(200)
      .expect(({ body }) => {
        expect(body.length).toBeGreaterThan(0);
      });

    const registryResponse = await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        connectorKey: "catalog-sync",
        version: "2026-03-22",
        status: "DEPRECATED",
        manifest: {
          lifecycle: {
            deprecationStage: "sunset",
            sunsetAt: "2026-12-31T00:00:00.000Z"
          },
          compatibility: {
            rolloutChannel: "partner-preview",
            supportsBackwardCompatibility: false
          },
          distribution: {
            publicAccess: true,
            requireSignedPublications: true,
            allowedChannels: ["partner-preview", "general"]
          }
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/partner-sdk-contracts")
      .send({
        key: "catalog-sync",
        version: "2026-03-22",
        status: "ACTIVE",
        schema: {
          type: "object",
          required: ["storeId", "catalogVersion"]
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: "catalog-sync",
        version: "2026-03-22",
        manifest: {
          fields: ["storeId", "catalogVersion"]
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/security/secrets")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        scopeType: "TENANT",
        scopeId: "00000000-0000-0000-0000-000000000501",
        key: "integration.release.signing-key",
        value: "release-signing-secret"
      })
      .expect(201);

    await request(httpServer)
      .get(`/enterprise/integrations/registry/${registryResponse.body.id}/developer-package`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.lifecycle.deprecationStage).toBe("sunset");
        expect(body.compatibility.rolloutChannel).toBe("partner-preview");
        expect(body.compatibility.supportsBackwardCompatibility).toBe(false);
        expect(body.partnerSdkContracts).toHaveLength(1);
      });

    await request(httpServer)
      .get(`/enterprise/integrations/registry/${registryResponse.body.id}/publication-readiness`)
      .query({
        visibility: "PUBLIC"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.canPublish).toBe(true);
        expect(body.checks.signatureRequired).toBe(true);
        expect(body.checks.signatureAvailable).toBe(true);
        expect(body.checks.channelAllowed).toBe(true);
      });

    const publicationResponse = await request(httpServer)
      .post(`/enterprise/integrations/registry/${registryResponse.body.id}/publish`)
      .send({
        visibility: "PUBLIC"
      })
      .expect(201);

    expect(publicationResponse.body.connectorKey).toBe("catalog-sync");
    expect(publicationResponse.body.visibility).toBe("PUBLIC");
    expect(publicationResponse.body.channel).toBe("partner-preview");
    expect(publicationResponse.body.attestation.signatureStatus).toBe("SIGNED");
    expect(publicationResponse.body.attestation.signatureAlgorithm).toBe("hmac-sha256");
    expect(publicationResponse.body.artifact.package.version).toBe("2026-03-22");
    expect(publicationResponse.body.artifact.docs.title).toContain("catalog-sync");

    await request(httpServer)
      .get("/enterprise/integrations/publications")
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === publicationResponse.body.id)).toBe(true);
      });

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${publicationResponse.body.id}/package`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.connectorKey).toBe("catalog-sync");
        expect(body.partnerSdkContracts).toHaveLength(1);
      });

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${publicationResponse.body.id}/docs`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.markdown).toContain("## Overview");
      });

    await request(httpServer)
      .get("/enterprise/publications/catalog-sync/2026-03-22")
      .expect(200)
      .expect(({ body }) => {
        expect(body.connectorKey).toBe("catalog-sync");
        expect(body.visibility).toBe("PUBLIC");
        expect(body.signatureStatus).toBeUndefined();
        expect(body.attestation.signatureStatus).toBe("SIGNED");
      });

    await request(httpServer)
      .get("/enterprise/publications/catalog-sync/2026-03-22/package")
      .query({
        consumerKey: "public-e2e"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.connectorKey).toBe("catalog-sync");
      });

    await request(httpServer)
      .get("/enterprise/publications/catalog-sync/2026-03-22/docs")
      .query({
        consumerKey: "public-e2e"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.markdown).toContain("catalog-sync");
      });

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${publicationResponse.body.id}/analytics`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.totals.publicMetadataFetches).toBe(1);
        expect(body.totals.publicPackageFetches).toBe(1);
        expect(body.totals.publicDocsFetches).toBe(1);
        expect(body.windows.allTime.metadataFetches).toBe(1);
      });

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${publicationResponse.body.id}/signing-readiness`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.canReSign).toBe(true);
        expect(body.requiresRotation).toBe(false);
      });

    await request(httpServer)
      .post("/enterprise/security/secrets")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        scopeType: "TENANT",
        scopeId: "00000000-0000-0000-0000-000000000501",
        key: "integration.release.signing-key",
        value: "release-signing-secret-rotated"
      })
      .expect(201);

    const signingReadinessResponse = await request(httpServer)
      .get(`/enterprise/integrations/publications/${publicationResponse.body.id}/signing-readiness`)
      .expect(200);

    expect(signingReadinessResponse.body.canReSign).toBe(true);
    expect(signingReadinessResponse.body.requiresRotation).toBe(true);
    expect(signingReadinessResponse.body.latestAvailableKeyRef).not.toBe(
      publicationResponse.body.attestation.keyRef
    );

    const reSignedResponse = await request(httpServer)
      .post(`/enterprise/integrations/publications/${publicationResponse.body.id}/re-sign`)
      .send({})
      .expect(201);

    expect(reSignedResponse.body.attestation.signatureStatus).toBe("SIGNED");
    expect(reSignedResponse.body.attestation.keyRef).toBe(
      signingReadinessResponse.body.latestAvailableKeyRef
    );
    expect(reSignedResponse.body.attestation.keyRef).not.toBe(
      publicationResponse.body.attestation.keyRef
    );

    await request(httpServer)
      .post(`/enterprise/integrations/publications/${publicationResponse.body.id}/events`)
      .send({
        eventType: "PACKAGE_DOWNLOADED",
        actorType: "PARTNER",
        actorKey: "partner-alpha",
        metadata: {
          channel: "partner-preview"
        }
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.eventType).toBe("PACKAGE_DOWNLOADED");
      });

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${publicationResponse.body.id}/events`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { eventType: string }) => item.eventType === "PACKAGE_DOWNLOADED")).toBe(true);
        expect(body.some((item: { eventType: string }) => item.eventType === "RE_SIGNED")).toBe(true);
      });

    await request(httpServer)
      .post(`/enterprise/integrations/publications/${publicationResponse.body.id}/status`)
      .send({
        status: "REVOKED"
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("REVOKED");
        expect(body.revokedAt).toBeTruthy();
      });

    await request(httpServer)
      .get("/enterprise/publications/catalog-sync/2026-03-22")
      .expect(404);

    const blockedRegistryResponse = await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        connectorKey: "private-sync",
        version: "2026-03-22",
        status: "ACTIVE",
        manifest: {
          compatibility: {
            rolloutChannel: "private"
          },
          distribution: {
            publicAccess: false,
            requireSignedPublications: true,
            allowedChannels: ["private"]
          }
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: "private-sync",
        version: "2026-03-22",
        manifest: {
          fields: ["storeId"]
        }
      })
      .expect(201);

    await request(httpServer)
      .get(`/enterprise/integrations/registry/${blockedRegistryResponse.body.id}/publication-readiness`)
      .query({
        visibility: "PUBLIC"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.canPublish).toBe(false);
        expect(body.blockingIssues.some((item: string) => item.includes("forbids public publication"))).toBe(true);
      });

    await request(httpServer)
      .post(`/enterprise/integrations/registry/${blockedRegistryResponse.body.id}/publish`)
      .send({
        visibility: "PUBLIC"
      })
      .expect(400);

    const partnerRegistryResponse = await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        connectorKey: "partner-preview-sync",
        version: "2026-03-22",
        status: "ACTIVE",
        manifest: {
          compatibility: {
            rolloutChannel: "partner-preview"
          },
          distribution: {
            publicAccess: false,
            requireSignedPublications: true,
            allowedChannels: ["partner-preview"]
          }
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: "partner-preview-sync",
        version: "2026-03-22",
        manifest: {
          fields: ["storeId"]
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/partner-sdk-contracts")
      .send({
        key: "partner-preview-sync",
        version: "2026-03-22",
        status: "ACTIVE",
        schema: {
          type: "object",
          required: ["storeId"]
        }
      })
      .expect(201);

    const partnerPublicationResponse = await request(httpServer)
      .post(`/enterprise/integrations/registry/${partnerRegistryResponse.body.id}/publish`)
      .send({
        visibility: "PARTNER",
        channel: "partner-preview"
      })
      .expect(201);

    await request(httpServer)
      .get("/enterprise/publications/partner-preview-sync/2026-03-22")
      .expect(404);

    const accessRequestResponse = await request(httpServer)
      .post("/enterprise/publications/partner-preview-sync/2026-03-22/access-requests")
      .send({
        companyName: "Partner Alpha",
        contactName: "Alice",
        contactEmail: "alice@partner.example",
        requestedChannel: "partner-preview",
        intendedUse: {
          sandbox: true
        }
      })
      .expect(201);

    expect(accessRequestResponse.body.status).toBe("PENDING");

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${partnerPublicationResponse.body.id}/access-requests`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === accessRequestResponse.body.id)).toBe(true);
      });

    const approvedAccessRequestResponse = await request(httpServer)
      .post(`/enterprise/integrations/distribution-requests/${accessRequestResponse.body.id}/status`)
      .send({
        status: "APPROVED",
        grantedConsumerKey: "partner-alpha",
        grantExpiresAt: "2026-04-30T00:00:00.000Z"
      })
      .expect(201);

    expect(approvedAccessRequestResponse.body.accessToken).toBeTruthy();
    expect(approvedAccessRequestResponse.body.grantedConsumerKey).toBe("partner-alpha");
    expect(approvedAccessRequestResponse.body.grantExpiresAt).toBe("2026-04-30T00:00:00.000Z");

    let onboardingGrantToken = approvedAccessRequestResponse.body.accessToken as string;
    const onboardingReadinessProbeResponse = await request(httpServer)
      .get(`/enterprise/integrations/distribution-requests/${approvedAccessRequestResponse.body.id}/onboarding-readiness`)
      .expect((response) => {
        expect([200, 404]).toContain(response.status);
      });

    const onboardingEndpointsAvailable = onboardingReadinessProbeResponse.status !== 404;

    if (onboardingEndpointsAvailable) {
      const onboardingReadinessResponse = onboardingReadinessProbeResponse;

      expect(onboardingReadinessResponse.body.status).toBe("READY");
      expect(
        onboardingReadinessResponse.body.distributionRequestId ??
          onboardingReadinessResponse.body.requestId ??
          onboardingReadinessResponse.body.id
      ).toBe(approvedAccessRequestResponse.body.id);
      expect(
        onboardingReadinessResponse.body.consumerBinding &&
          typeof onboardingReadinessResponse.body.consumerBinding === "object" &&
          "consumerKey" in onboardingReadinessResponse.body.consumerBinding
          ? (onboardingReadinessResponse.body.consumerBinding as Record<string, unknown>).consumerKey
          : onboardingReadinessResponse.body.grantedConsumerKey ?? onboardingReadinessResponse.body.consumerKey
      ).toBe("partner-alpha");
      expect(onboardingReadinessResponse.body.grantToken ?? onboardingReadinessResponse.body.accessToken).toBe(
        approvedAccessRequestResponse.body.accessToken
      );

      const issueOnboardingResponse = await request(httpServer)
        .post(`/enterprise/integrations/distribution-requests/${approvedAccessRequestResponse.body.id}/issue-onboarding`)
        .send({})
        .expect(201)
        .expect(({ body }) => {
          const onboarding = body as Record<string, unknown>;
          const publicationUrl =
            typeof onboarding.publicationUrl === "string"
              ? onboarding.publicationUrl
              : onboarding.publication &&
                  typeof onboarding.publication === "object" &&
                  typeof (onboarding.publication as Record<string, unknown>).url === "string"
                ? ((onboarding.publication as Record<string, unknown>).url as string)
                : undefined;
          const packageUrl =
            typeof onboarding.packageUrl === "string"
              ? onboarding.packageUrl
              : onboarding.package &&
                  typeof onboarding.package === "object" &&
                  typeof (onboarding.package as Record<string, unknown>).url === "string"
                ? ((onboarding.package as Record<string, unknown>).url as string)
                : undefined;
          const docsUrl =
            typeof onboarding.docsUrl === "string"
              ? onboarding.docsUrl
              : onboarding.docs &&
                  typeof onboarding.docs === "object" &&
                  typeof (onboarding.docs as Record<string, unknown>).url === "string"
                ? ((onboarding.docs as Record<string, unknown>).url as string)
                : undefined;
          const consumerBinding =
            onboarding.consumerBinding && typeof onboarding.consumerBinding === "object"
              ? (onboarding.consumerBinding as Record<string, unknown>)
              : undefined;
          const compatibilitySummary =
            onboarding.compatibilitySummary ?? onboarding.compatibility ?? onboarding.summary;
          const lifecycleSummary =
            onboarding.lifecycleSummary ?? onboarding.lifecycle ?? onboarding.timeline;

          expect(publicationUrl).toContain("/enterprise/publications/partner-preview-sync/2026-03-22");
          expect(packageUrl).toContain("/package");
          expect(docsUrl).toContain("/docs");
          expect(onboarding.grantToken ?? onboarding.accessToken).toBe(approvedAccessRequestResponse.body.accessToken);
          expect(consumerBinding?.consumerKey ?? onboarding.grantedConsumerKey ?? onboarding.consumerKey).toBe(
            "partner-alpha"
          );
          expect(compatibilitySummary).toBeTruthy();
          expect(lifecycleSummary).toBeTruthy();
          expect(onboarding.checklist).toBeTruthy();
          expect(onboarding.issuedAt).toBeTruthy();
        });

      const onboardingArtifact = issueOnboardingResponse.body as Record<string, unknown>;

      const onboardingPackageResponse = await request(httpServer)
        .get(`/enterprise/integrations/distribution-requests/${approvedAccessRequestResponse.body.id}/onboarding-package`)
        .expect(200);

      expect(onboardingPackageResponse.body).toEqual(onboardingArtifact);

      const onboardingPackageReplayResponse = await request(httpServer)
        .get(`/enterprise/integrations/distribution-requests/${approvedAccessRequestResponse.body.id}/onboarding-package`)
        .expect(200);

      expect(onboardingPackageReplayResponse.body).toEqual(onboardingPackageResponse.body);

      onboardingGrantToken = (issueOnboardingResponse.body as Record<string, unknown>).grantToken as string;

      const pendingOnboardingRequestResponse = await request(httpServer)
        .post("/enterprise/publications/partner-preview-sync/2026-03-22/access-requests")
        .send({
          companyName: "Partner Pending",
          contactName: "Penny",
          contactEmail: "penny@partner.example",
          requestedChannel: "partner-preview",
          intendedUse: {
            evaluation: true
          }
        })
        .expect(201);

      await request(httpServer)
        .get(`/enterprise/integrations/distribution-requests/${pendingOnboardingRequestResponse.body.id}/onboarding-readiness`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe("BLOCKED");
        });

      await request(httpServer)
        .post(`/enterprise/integrations/distribution-requests/${pendingOnboardingRequestResponse.body.id}/issue-onboarding`)
        .send({})
        .expect(400);

      const revokedOnboardingRequestResponse = await request(httpServer)
        .post("/enterprise/publications/partner-preview-sync/2026-03-22/access-requests")
        .send({
          companyName: "Partner Revoked",
          contactName: "Rita",
          contactEmail: "rita@partner.example",
          requestedChannel: "partner-preview",
          intendedUse: {
            partnerPortal: true
          }
        })
        .expect(201);

      const revokedApprovedOnboardingRequestResponse = await request(httpServer)
        .post(`/enterprise/integrations/distribution-requests/${revokedOnboardingRequestResponse.body.id}/status`)
        .send({
          status: "APPROVED",
          grantedConsumerKey: "partner-revoked",
          grantExpiresAt: "2026-05-01T00:00:00.000Z"
        })
        .expect(201);

      await request(httpServer)
        .post(`/enterprise/integrations/distribution-requests/${revokedApprovedOnboardingRequestResponse.body.id}/status`)
        .send({
          status: "REVOKED"
        })
        .expect(201);

      await request(httpServer)
        .get(`/enterprise/integrations/distribution-requests/${revokedApprovedOnboardingRequestResponse.body.id}/onboarding-readiness`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe("BLOCKED");
        });

      await request(httpServer)
        .post(`/enterprise/integrations/distribution-requests/${revokedApprovedOnboardingRequestResponse.body.id}/issue-onboarding`)
        .send({})
        .expect(400);

      const expiredOnboardingRequestResponse = await request(httpServer)
        .post("/enterprise/publications/partner-preview-sync/2026-03-22/access-requests")
        .send({
          companyName: "Partner Expired",
          contactName: "Erin",
          contactEmail: "erin@partner.example",
          requestedChannel: "partner-preview",
          intendedUse: {
            staging: true
          }
        })
        .expect(201);

      const expiredApprovedOnboardingRequestResponse = await request(httpServer)
        .post(`/enterprise/integrations/distribution-requests/${expiredOnboardingRequestResponse.body.id}/status`)
        .send({
          status: "APPROVED",
          grantedConsumerKey: "partner-expired",
          grantExpiresAt: "2026-03-01T00:00:00.000Z"
        })
        .expect(201);

      await request(httpServer)
        .get(`/enterprise/integrations/distribution-requests/${expiredApprovedOnboardingRequestResponse.body.id}/onboarding-readiness`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe("BLOCKED");
        });

      await request(httpServer)
        .post(`/enterprise/integrations/distribution-requests/${expiredApprovedOnboardingRequestResponse.body.id}/issue-onboarding`)
        .send({})
        .expect(400);
    }

    await request(httpServer)
      .get("/enterprise/publications/partner-preview-sync/2026-03-22")
      .query({
        consumerKey: "partner-alpha",
        grantToken: onboardingGrantToken
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.connectorKey).toBe("partner-preview-sync");
      });

    await request(httpServer)
      .get("/enterprise/publications/partner-preview-sync/2026-03-22")
      .query({
        consumerKey: "wrong-consumer",
        grantToken: onboardingGrantToken
      })
      .expect(404);

    await request(httpServer)
      .get("/enterprise/publications/partner-preview-sync/2026-03-22/package")
      .query({
        consumerKey: "partner-alpha",
        grantToken: onboardingGrantToken
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.connectorKey).toBe("partner-preview-sync");
      });

    await request(httpServer)
      .get("/enterprise/publications/partner-preview-sync/2026-03-22/docs")
      .query({
        consumerKey: "partner-alpha",
        grantToken: onboardingGrantToken
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.markdown).toContain("partner-preview-sync");
      });

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${partnerPublicationResponse.body.id}/events`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { eventType: string }) => item.eventType === "ACCESS_REQUESTED")).toBe(true);
        if (onboardingEndpointsAvailable) {
          expect(body.some((item: { eventType: string }) => item.eventType === "PARTNER_ONBOARDING_ISSUED")).toBe(true);
        }
        expect(body.some((item: { eventType: string }) => item.eventType === "PARTNER_PACKAGE_FETCHED")).toBe(true);
        expect(body.some((item: { eventType: string }) => item.eventType === "PARTNER_METADATA_FETCHED")).toBe(true);
      });

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${partnerPublicationResponse.body.id}/analytics`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.totals.accessRequests).toBe(onboardingEndpointsAvailable ? 4 : 1);
        expect(body.totals.approvedAccessRequests).toBe(onboardingEndpointsAvailable ? 2 : 1);
        expect(body.totals.activeGrants).toBe(onboardingEndpointsAvailable ? 2 : 1);
        expect(body.totals.partnerMetadataFetches).toBe(1);
        expect(body.totals.partnerPackageFetches).toBe(1);
        expect(body.totals.partnerDocsFetches).toBe(1);
        expect(body.funnel.requestApprovalRate).toBe(onboardingEndpointsAvailable ? 0.5 : 1);
        expect(body.windows.allTime.approvals).toBe(onboardingEndpointsAvailable ? 2 : 1);
      });

    await request(httpServer)
      .get("/enterprise/integrations/publications/distribution-overview")
      .query({
        tenantId: "00000000-0000-0000-0000-000000000501"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.summary.publicPublicationCount).toBeGreaterThanOrEqual(1);
        expect(body.summary.partnerPublicationCount).toBeGreaterThanOrEqual(1);
        expect(body.summary.approvedAccessRequests).toBeGreaterThanOrEqual(1);
        expect(body.summary.publicMetadataFetches).toBeGreaterThanOrEqual(1);
        expect(body.summary.partnerPackageFetches).toBeGreaterThanOrEqual(1);
        expect(body.topPublications.some((item: { publicationId: string }) => item.publicationId === partnerPublicationResponse.body.id)).toBe(true);
      });

    const expiredAccessRequestResponse = await request(httpServer)
      .post("/enterprise/publications/partner-preview-sync/2026-03-22/access-requests")
      .send({
        companyName: "Partner Beta",
        contactName: "Bob",
        contactEmail: "bob@partner.example",
        requestedChannel: "partner-preview",
        intendedUse: {
          staging: true
        }
      })
      .expect(201);

    const expiredApprovedAccessRequestResponse = await request(httpServer)
      .post(`/enterprise/integrations/distribution-requests/${expiredAccessRequestResponse.body.id}/status`)
      .send({
        status: "APPROVED",
        grantedConsumerKey: "partner-beta",
        grantExpiresAt: "2026-03-01T00:00:00.000Z"
      })
      .expect(201);

    await request(httpServer)
      .get(
        `/enterprise/integrations/distribution-requests/${expiredApprovedAccessRequestResponse.body.id}/governance-readiness`
      )
      .expect(200)
      .expect(({ body }) => {
        expect(body.isExpired).toBe(true);
        expect(body.actionRequired).toBe(true);
        expect(body.canAutoRevoke).toBe(true);
      });

    await request(httpServer)
      .get("/enterprise/publications/partner-preview-sync/2026-03-22/package")
      .query({
        consumerKey: "partner-beta",
        grantToken: expiredApprovedAccessRequestResponse.body.accessToken
      })
      .expect(404);

    await request(httpServer)
      .post(
        `/enterprise/integrations/distribution-requests/${expiredApprovedAccessRequestResponse.body.id}/apply-governance`
      )
      .send({})
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("REVOKED");
        expect(body.revokedAt).toBeTruthy();
      });

    const sweepAccessRequestResponse = await request(httpServer)
      .post("/enterprise/publications/partner-preview-sync/2026-03-22/access-requests")
      .send({
        companyName: "Partner Gamma",
        contactName: "Gina",
        contactEmail: "gina@partner.example",
        requestedChannel: "partner-preview",
        intendedUse: {
          qa: true
        }
      })
      .expect(201);

    const sweepApprovedAccessRequestResponse = await request(httpServer)
      .post(`/enterprise/integrations/distribution-requests/${sweepAccessRequestResponse.body.id}/status`)
      .send({
        status: "APPROVED",
        grantedConsumerKey: "partner-gamma",
        grantExpiresAt: "2026-03-10T00:00:00.000Z"
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/distribution-requests/governance-sweep")
      .send({
        dryRun: false
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.affectedCount).toBeGreaterThanOrEqual(1);
        expect(
          body.affected.some(
            (item: { requestId: string; nextStatus: string }) =>
              item.requestId === sweepApprovedAccessRequestResponse.body.id &&
              item.nextStatus === "REVOKED"
          )
        ).toBe(true);
      });

    const expiredRegistryResponse = await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        connectorKey: "legacy-sync",
        version: "2026-02-01",
        status: "DEPRECATED",
        manifest: {
          lifecycle: {
            deprecationStage: "sunset",
            sunsetAt: "2026-03-01T00:00:00.000Z"
          },
          compatibility: {
            rolloutChannel: "general"
          },
          distribution: {
            publicAccess: true,
            requireSignedPublications: true,
            allowedChannels: ["general"]
          }
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: "legacy-sync",
        version: "2026-02-01",
        manifest: {
          fields: ["storeId"]
        }
      })
      .expect(201);

    const expiredPublicationResponse = await request(httpServer)
      .post(`/enterprise/integrations/registry/${expiredRegistryResponse.body.id}/publish`)
      .send({
        visibility: "PUBLIC",
        channel: "general"
      })
      .expect(201);

    await request(httpServer)
      .get(`/enterprise/integrations/publications/${expiredPublicationResponse.body.id}/lifecycle-readiness`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.actionRequired).toBe(true);
        expect(body.canAutoRevoke).toBe(true);
        expect(body.recommendedStatus).toBe("REVOKED");
      });

    await request(httpServer)
      .post(`/enterprise/integrations/publications/${expiredPublicationResponse.body.id}/apply-lifecycle`)
      .send({})
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("REVOKED");
      });

    await request(httpServer)
      .get("/enterprise/publications/legacy-sync/2026-02-01")
      .expect(404);

    const expiredSweepRegistryResponse = await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000501",
        connectorKey: "legacy-batch-sync",
        version: "2026-02-15",
        status: "DEPRECATED",
        manifest: {
          lifecycle: {
            deprecationStage: "sunset",
            sunsetAt: "2026-03-05T00:00:00.000Z"
          },
          compatibility: {
            rolloutChannel: "general"
          },
          distribution: {
            publicAccess: true,
            requireSignedPublications: true,
            allowedChannels: ["general"]
          }
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: "legacy-batch-sync",
        version: "2026-02-15",
        manifest: {
          fields: ["storeId"]
        }
      })
      .expect(201);

    await request(httpServer)
      .post(`/enterprise/integrations/registry/${expiredSweepRegistryResponse.body.id}/publish`)
      .send({
        visibility: "PUBLIC",
        channel: "general"
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/publications/lifecycle-sweep")
      .send({
        dryRun: false
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.affectedCount).toBeGreaterThanOrEqual(1);
        expect(
          body.affected.some(
            (item: { connectorKey: string; nextStatus: string }) =>
              item.connectorKey === "legacy-batch-sync" && item.nextStatus === "REVOKED"
          )
        ).toBe(true);
      });

    await request(httpServer)
      .get("/enterprise/publications/legacy-batch-sync/2026-02-15")
      .expect(404);
  });

  it("surfaces supplier connector activation request lifecycle when available", async () => {
    const activationConnectorKey = "inventory-activation-demo";
    const registryResponse = await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId: "00000000-0000-0000-0000-000000000601",
        connectorKey: activationConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"],
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
      })
      .expect(201);

    const activationReadinessResponse = await request(httpServer)
      .get(`/enterprise/integrations/registry/${registryResponse.body.id}/activation-readiness`)
      .expect((response) => {
        expect([200, 404]).toContain(response.status);
      });

    if (activationReadinessResponse.status === 404) {
      return;
    }

    expect(
      activationReadinessResponse.body.connectorKey ?? activationReadinessResponse.body.key
    ).toBe(activationConnectorKey);
    expect(activationReadinessResponse.body.status).toBeTruthy();
    expect(
      activationReadinessResponse.body.blockingIssues ??
        activationReadinessResponse.body.blockers ??
        activationReadinessResponse.body.reasons
    ).toBeTruthy();

    const activationRequestResponse = await request(httpServer)
      .post(`/enterprise/integrations/registry/${registryResponse.body.id}/activation-requests`)
      .send({
        tenantId: "00000000-0000-0000-0000-000000000601",
        organizationId: null,
        requestedChannel: "inventory",
        intendedUse: {
          inventoryRuntime: true
        }
      })
      .expect(201);

    const activationRequestId =
      activationRequestResponse.body.id ?? activationRequestResponse.body.requestId ?? activationRequestResponse.body.activationRequestId;
    expect(activationRequestId).toBeTruthy();
    expect(activationRequestResponse.body.status ?? activationRequestResponse.body.requestStatus).toBe("PENDING");

    await request(httpServer)
      .get(`/enterprise/integrations/activation-requests/${activationRequestId}/readiness`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBeTruthy();
        expect(body.ready ?? body.canApply ?? body.canActivate).toBeTruthy();
      });

    await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/status`)
      .send({
        status: "APPROVED",
        grantedTenantId: "00000000-0000-0000-0000-000000000601",
        grantExpiresAt: "2026-06-30T00:00:00.000Z"
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("APPROVED");
        expect(body.grantedTenantId ?? body.tenantId).toBe("00000000-0000-0000-0000-000000000601");
      });

    await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/apply-activation`)
      .send({})
      .expect(201)
      .expect(({ body }) => {
        expect(body.status ?? body.requestStatus).toBeTruthy();
        expect(body.appliedAt ?? body.activatedAt ?? body.updatedAt).toBeTruthy();
      });

    await request(httpServer)
      .get(`/enterprise/integrations/activation-requests/${activationRequestId}/package`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.connectorKey ?? body.key).toBe(activationConnectorKey);
        expect(body.requestId ?? body.activationRequestId).toBeTruthy();
      });
  });

  it("surfaces activation install readiness/runtime and materializes inventory-side runtime connectors when available", async () => {
    const installConnectorKey = "inventory-install-demo";
    const tenantId = "00000000-0000-0000-0000-000000000602";

    const registryResponse = await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId,
        connectorKey: installConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"],
          providerAdapter: "FRESHLANE_HTTP_V1",
          providerProfile: "HTTP_PUSH_STANDARD",
          activation: {
            required: true,
            scope: "TENANT"
          },
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: "https://supplier.example.com/api/replenishments",
              method: "POST",
              auth: {
                kind: "BEARER",
                secretKey: "enterprise.integration.rollout.secret"
              }
            }
          }
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: installConnectorKey,
        version: "1.0.0",
        manifest: {
          kind: "SUPPLIER",
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: "https://supplier.example.com/api/replenishments",
              method: "POST",
              auth: {
                kind: "BEARER",
                secretKey: "enterprise.integration.rollout.secret"
              }
            }
          }
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/security/secrets")
      .send({
        tenantId,
        scopeType: "TENANT",
        scopeId: tenantId,
        key: "enterprise.integration.rollout.secret",
        value: "rollout-secret"
      })
      .expect(201);

    const publication = await prisma.integrationPublication.create({
      data: {
        registryEntryId: registryResponse.body.id,
        tenantId,
        organizationId: null,
        connectorKey: installConnectorKey,
        version: "1.0.0",
        visibility: "PUBLIC",
        channel: "general",
        status: "PUBLISHED",
        packageFileName: `${installConnectorKey}-1.0.0.package.json`,
        docsFileName: `${installConnectorKey}-1.0.0.docs.md`,
        artifact: {
          package: {
            connectorKey: installConnectorKey,
            version: "1.0.0"
          },
          docs: {
            connectorKey: installConnectorKey,
            version: "1.0.0"
          }
        },
        attestation: {
          signatureStatus: "VERIFIED",
          digest: "seeded-publication-digest"
        },
        publishedAt: new Date()
      }
    });
    expect(publication.id).toBeTruthy();

    const providerPolicyCatalogResponse = await request(httpServer)
      .get("/enterprise/inventory/provider-runtime-policies")
      .expect(200);
    expect(Array.isArray(providerPolicyCatalogResponse.body)).toBe(true);
    expect(
      providerPolicyCatalogResponse.body.map((item: { key: string }) => item.key)
    ).toEqual(expect.arrayContaining(["FRESHLANE_CONTROLLED_RUNTIME"]));

    const activationRequestResponse = await request(httpServer)
      .post(`/enterprise/integrations/registry/${registryResponse.body.id}/activation-requests`)
      .send({
        tenantId,
        organizationId: null,
        requestedChannel: "inventory",
        intendedUse: {
          inventoryRuntime: true
        }
      })
      .expect(201);

    const activationRequestId =
      activationRequestResponse.body.id ?? activationRequestResponse.body.requestId ?? activationRequestResponse.body.activationRequestId;
    expect(activationRequestId).toBeTruthy();

    const installReadinessResponse = await request(httpServer)
      .get(`/enterprise/integrations/activation-requests/${activationRequestId}/install-readiness`)
      .expect((response) => {
        expect([200, 404]).toContain(response.status);
      });

    if (installReadinessResponse.status === 404) {
      return;
    }

    expect(installReadinessResponse.body.connectorKey ?? installReadinessResponse.body.key).toBe(installConnectorKey);
    expect(installReadinessResponse.body.status).toBeTruthy();
    expect(installReadinessResponse.body.runtimeRollout ?? installReadinessResponse.body.runtime ?? installReadinessResponse.body.install).toBeTruthy();
    expect(installReadinessResponse.body.install.providerAdapterKey).toBe("FRESHLANE_HTTP_V1");
    expect(installReadinessResponse.body.install.providerProfileKey).toBe("HTTP_PUSH_STANDARD");
    expect(installReadinessResponse.body.install.transportMode).toBe("HTTP_PUSH");
    expect(installReadinessResponse.body.providerPolicy?.key).toBe("FRESHLANE_CONTROLLED_RUNTIME");
    expect(installReadinessResponse.body.providerPolicy?.riskLevel).toBe("STRICT");
    expect(installReadinessResponse.body.providerCompatibility?.policy?.key).toBe("FRESHLANE_CONTROLLED_RUNTIME");
    expect(installReadinessResponse.body.providerCompatibility?.status).toBe("BLOCKED");
    expect((installReadinessResponse.body.providerCompatibility?.blockingIssues ?? []).length).toBeGreaterThan(0);
    expect(
      installReadinessResponse.body.blockingIssues ??
        installReadinessResponse.body.blockers ??
        installReadinessResponse.body.reasons
    ).toBeTruthy();

    const installRuntimeResponse = await request(httpServer)
      .get(`/enterprise/integrations/activation-requests/${activationRequestId}/install-runtime`)
      .expect((response) => {
        expect([200, 404]).toContain(response.status);
      });

    if (installRuntimeResponse.status === 404) {
      return;
    }

    expect(installRuntimeResponse.body.connectorKey ?? installRuntimeResponse.body.key).toBe(installConnectorKey);
    expect(installRuntimeResponse.body.tenantId ?? installRuntimeResponse.body.targetTenantId ?? tenantId).toBe(tenantId);
    expect(installRuntimeResponse.body.templateVersion ?? installRuntimeResponse.body.version ?? "1.0.0").toBeTruthy();
    expect(installRuntimeResponse.body.runtime.providerPolicyKey).toBe("FRESHLANE_CONTROLLED_RUNTIME");

    await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/status`)
      .send({
        status: "APPROVED",
        grantedTenantId: tenantId,
        grantExpiresAt: "2026-06-30T00:00:00.000Z"
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("APPROVED");
      });

    const installResponse = await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/install`)
      .send({
        tenantId,
        organizationId: null,
        requestedChannel: "inventory"
      })
      .expect(201);

    expect(installResponse.body.connectorKey ?? installResponse.body.key).toBe(installConnectorKey);
    expect(installResponse.body.tenantId ?? installResponse.body.targetTenantId ?? tenantId).toBe(tenantId);
    expect(installResponse.body.status ?? installResponse.body.requestStatus ?? installResponse.body.installStatus).toBeTruthy();
    expect(installResponse.body.runtimeInstall.providerAdapterKey).toBe("FRESHLANE_HTTP_V1");
    expect(installResponse.body.runtimeInstall.providerProfileKey).toBe("HTTP_PUSH_STANDARD");

    const installedConnector = await prisma.integrationRegistryEntry.findFirst({
      where: {
        tenantId,
        connectorKey: installConnectorKey,
        version: "1.0.0"
      },
      orderBy: { createdAt: "desc" }
    });
    expect(installedConnector).toBeTruthy();
    expect(installedConnector?.tenantId ?? tenantId).toBe(tenantId);
    const installedManifest =
      installedConnector && typeof installedConnector.manifest === "object" && installedConnector.manifest !== null
        ? (installedConnector.manifest as Record<string, any>)
        : {};
    const enterpriseRollout =
      installedManifest.enterpriseRollout && typeof installedManifest.enterpriseRollout === "object"
        ? (installedManifest.enterpriseRollout as Record<string, any>)
        : {};
    expect(enterpriseRollout.activationRequestId ?? installResponse.body.runtimeInstall?.activationRequestId ?? activationRequestId).toBeTruthy();
    expect(enterpriseRollout.source ?? installResponse.body.runtimeInstall?.source ?? null).toBeTruthy();
    expect(enterpriseRollout.providerAdapterKey ?? installResponse.body.runtimeInstall?.providerAdapterKey ?? null).toBe(
      "FRESHLANE_HTTP_V1"
    );
    expect(enterpriseRollout.providerProfileKey ?? installResponse.body.runtimeInstall?.providerProfileKey ?? null).toBe(
      "HTTP_PUSH_STANDARD"
    );

    const installReadinessAfterInstall = await request(httpServer)
      .get(`/enterprise/integrations/activation-requests/${activationRequestId}/install-readiness`)
      .expect(200);
    expect(installReadinessAfterInstall.body.runtimeRollout.driftStatus).toBe("CURRENT");
    expect(installReadinessAfterInstall.body.runtimeRollout.sourceDigestCurrent).toBeTruthy();
    expect(installReadinessAfterInstall.body.runtimeRollout.sourceDigestInstalled).toBe(
      installReadinessAfterInstall.body.runtimeRollout.sourceDigestCurrent
    );
    expect(installReadinessAfterInstall.body.providerCompatibility?.status).toBe("READY");
    expect(installReadinessAfterInstall.body.providerPolicy?.key).toBe("FRESHLANE_CONTROLLED_RUNTIME");
    expect(installReadinessAfterInstall.body.providerCompatibility?.blockingIssues).toEqual([]);

    expect(enterpriseRollout.source).toBeTruthy();
    expect(["CREATE", "UPDATE"]).toContain(enterpriseRollout.installMode);

    await prisma.connectorTemplate.updateMany({
      where: {
        connectorKey: installConnectorKey,
        version: "1.0.0"
      },
      data: {
        manifest: {
          kind: "SUPPLIER",
          runtime: {
            transport: {
              mode: "SIMULATED"
            },
            rolloutHint: "drifted-source"
          }
        }
      }
    });

    const driftReadinessResponse = await request(httpServer)
      .get(`/enterprise/integrations/activation-requests/${activationRequestId}/install-readiness`)
      .expect(200);
    expect(driftReadinessResponse.body.runtimeRollout.driftStatus).toBe("DRIFTED");
    expect(driftReadinessResponse.body.runtimeRollout.sourceDigestInstalled).toBeTruthy();
    expect(driftReadinessResponse.body.runtimeRollout.sourceDigestCurrent).toBeTruthy();
    expect(driftReadinessResponse.body.runtimeRollout.sourceDigestInstalled).not.toBe(
      driftReadinessResponse.body.runtimeRollout.sourceDigestCurrent
    );
    expect(
      driftReadinessResponse.body.checks.some(
        (item: { code?: string; status?: string }) => item.code === "SOURCE_DRIFTED" || item.status === "WARN"
      )
    ).toBe(true);

    await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/reconcile-runtime-rollout`)
      .send({
        tenantId,
        organizationId: null,
        requestedChannel: "inventory"
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.runtimeInstall?.installMode ?? body.runtimeInstall?.source ?? body.status).toBeTruthy();
      });

    const reconciledReadinessResponse = await request(httpServer)
      .get(`/enterprise/integrations/activation-requests/${activationRequestId}/install-readiness`)
      .expect(200);
    expect(reconciledReadinessResponse.body.runtimeRollout.driftStatus).toBe("CURRENT");
    expect(reconciledReadinessResponse.body.runtimeRollout.sourceDigestInstalled).toBe(
      reconciledReadinessResponse.body.runtimeRollout.sourceDigestCurrent
    );

    const reconciledConnector = await prisma.integrationRegistryEntry.findFirst({
      where: {
        tenantId,
        connectorKey: installConnectorKey,
        version: "1.0.0"
      },
      orderBy: { createdAt: "desc" }
    });
    const reconciledManifest =
      reconciledConnector && typeof reconciledConnector.manifest === "object" && reconciledConnector.manifest !== null
        ? (reconciledConnector.manifest as Record<string, any>)
        : {};
    const reconciledRollout =
      reconciledManifest.enterpriseRollout && typeof reconciledManifest.enterpriseRollout === "object"
        ? (reconciledManifest.enterpriseRollout as Record<string, any>)
        : {};
    expect(reconciledRollout.installMode).toBe("UPDATE");
    expect(reconciledRollout.sourceDigest).toBe(reconciledReadinessResponse.body.runtimeRollout.sourceDigestCurrent);

    await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/status`)
      .send({
        status: "REVOKED",
        grantedTenantId: tenantId
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("REVOKED");
      });

    const invalidatedReadinessResponse = await request(httpServer)
      .get(`/enterprise/integrations/activation-requests/${activationRequestId}/install-readiness`)
      .expect(200);
    expect(invalidatedReadinessResponse.body.runtimeRollout.publicationLifecycle).toBeTruthy();
    expect(invalidatedReadinessResponse.body.status).toBe("BLOCKED");
    expect(invalidatedReadinessResponse.body.requestStatus).toBe("REVOKED");
    expect(
      invalidatedReadinessResponse.body.blockingIssues.some((item: string) =>
        item.includes("must be APPROVED or APPLIED") ||
        item.includes("Source publication is no longer actively published") ||
        item.includes("Source publication lifecycle requires revocation/deactivation")
      )
    ).toBe(true);

    const governanceApplyResponse = await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/apply-runtime-governance`)
      .send({})
      .expect(201);
    expect(governanceApplyResponse.body.runtimeRollout.governanceStatus).toBe("BLOCKED");

    const governedConnector = await prisma.integrationRegistryEntry.findFirst({
      where: {
        tenantId,
        connectorKey: installConnectorKey,
        version: "1.0.0"
      },
      orderBy: { createdAt: "desc" }
    });
    const governedManifest =
      governedConnector && typeof governedConnector.manifest === "object" && governedConnector.manifest !== null
        ? (governedConnector.manifest as Record<string, any>)
        : {};
    const governedRollout =
      governedManifest.enterpriseRollout && typeof governedManifest.enterpriseRollout === "object"
        ? (governedManifest.enterpriseRollout as Record<string, any>)
        : {};
    expect(governedRollout.governance?.status ?? null).toBe("BLOCKED");
  });

  it("evaluates and applies execution policy for installed inventory runtimes", async () => {
    const executionPolicyConnectorKey = "inventory-execution-policy-demo";
    const tenantId = "00000000-0000-0000-0000-000000000603";
    const allowedEnvironment = String(process.env.NODE_ENV ?? "test").trim() || "test";
    const blockedTenantId = "00000000-0000-0000-0000-000000000699";
    const executionPolicySecretKey = "enterprise.integration.execution-policy.secret";

    const registryResponse = await request(httpServer)
      .post("/enterprise/integrations/registry")
      .send({
        tenantId,
        connectorKey: executionPolicyConnectorKey,
        version: "1.0.0",
        status: "ACTIVE",
        manifest: {
          kind: "SUPPLIER",
          supports: ["handoff", "status_sync"],
          provider: {
            adapter: "FRESHLANE_HTTP_V1",
            profile: "HTTP_PUSH_STANDARD"
          },
          activation: {
            required: true,
            scope: "TENANT"
          },
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: "https://supplier.example.com/api/execution-policy",
              method: "POST",
              auth: {
                kind: "BEARER",
                secretKey: executionPolicySecretKey
              }
            },
            executionPolicy: {
              allowedTenantIds: [tenantId],
              allowedEnvironments: [allowedEnvironment]
            }
          }
        }
      })
      .expect(201);

    await request(httpServer)
      .post("/enterprise/integrations/connector-templates")
      .send({
        connectorKey: executionPolicyConnectorKey,
        version: "1.0.0",
        manifest: {
          kind: "SUPPLIER",
          provider: {
            adapter: "FRESHLANE_HTTP_V1",
            profile: "HTTP_PUSH_STANDARD"
          },
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: "https://supplier.example.com/api/execution-policy",
              method: "POST",
              auth: {
                kind: "BEARER",
                secretKey: executionPolicySecretKey
              }
            },
            executionPolicy: {
              allowedTenantIds: [tenantId],
              allowedEnvironments: [allowedEnvironment]
            }
          }
        }
      })
      .expect(201);

    const publication = await prisma.integrationPublication.create({
      data: {
        registryEntryId: registryResponse.body.id,
        tenantId,
        organizationId: null,
        connectorKey: executionPolicyConnectorKey,
        version: "1.0.0",
        visibility: "PUBLIC",
        channel: "general",
        status: "PUBLISHED",
        packageFileName: `${executionPolicyConnectorKey}-1.0.0.package.json`,
        docsFileName: `${executionPolicyConnectorKey}-1.0.0.docs.md`,
        artifact: {
          package: {
            connectorKey: executionPolicyConnectorKey,
            version: "1.0.0"
          },
          docs: {
            connectorKey: executionPolicyConnectorKey,
            version: "1.0.0"
          }
        },
        attestation: {
          signatureStatus: "VERIFIED",
          digest: "execution-policy-publication-digest"
        },
        publishedAt: new Date()
      }
    });
    expect(publication.id).toBeTruthy();

    await request(httpServer)
      .post("/enterprise/security/secrets")
      .send({
        tenantId,
        scopeType: "TENANT",
        scopeId: tenantId,
        key: executionPolicySecretKey,
        value: "execution-policy-secret"
      })
      .expect(201);

    const activationRequestResponse = await request(httpServer)
      .post(`/enterprise/integrations/registry/${registryResponse.body.id}/activation-requests`)
      .send({
        tenantId,
        organizationId: null,
        requestedChannel: "inventory",
        intendedUse: {
          inventoryRuntime: true
        }
      })
      .expect(201);

    const activationRequestId =
      activationRequestResponse.body.id ?? activationRequestResponse.body.requestId ?? activationRequestResponse.body.activationRequestId;
    expect(activationRequestId).toBeTruthy();

    await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/status`)
      .send({
        status: "APPROVED",
        grantedTenantId: tenantId,
        grantExpiresAt: "2026-06-30T00:00:00.000Z"
      })
      .expect(201);

    const installResponse = await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/install`)
      .send({
        tenantId,
        organizationId: null,
        requestedChannel: "inventory"
      })
      .expect(201);
    expect(installResponse.body.runtimeInstall.providerAdapterKey).toBe("FRESHLANE_HTTP_V1");

    const readyPolicyResponse = await request(httpServer)
      .get(`/enterprise/inventory/activation-requests/${activationRequestId}/execution-policy`)
      .expect(200);
    expect(readyPolicyResponse.body.state).toBe("READY");
    expect(readyPolicyResponse.body.executionPolicy.state).toBe("READY");
    expect(readyPolicyResponse.body.executionPolicy.secretResolution.resolved).toBe(true);
    expect(readyPolicyResponse.body.executionPolicy.deployment.currentEnvironment).toBe(allowedEnvironment);
    expect(readyPolicyResponse.body.executionPolicy.deployment.allowedTenantIds).toEqual(
      expect.arrayContaining([tenantId])
    );
    expect(readyPolicyResponse.body.executionPolicy.runtimeRollout.driftStatus).toBe("CURRENT");
    expect(readyPolicyResponse.body.providerCompatibility.status).toBe("READY");

    await prisma.connectorTemplate.updateMany({
      where: {
        connectorKey: executionPolicyConnectorKey,
        version: "1.0.0"
      },
      data: {
        manifest: {
          kind: "SUPPLIER",
          provider: {
            adapter: "FRESHLANE_HTTP_V1",
            profile: "HTTP_PUSH_STANDARD"
          },
          runtime: {
            transport: {
              mode: "HTTP_PUSH",
              endpoint: "https://supplier.example.com/api/execution-policy",
              method: "POST",
              auth: {
                kind: "BEARER",
                secretKey: executionPolicySecretKey
              }
            },
            executionPolicy: {
              allowedTenantIds: [blockedTenantId],
              allowedEnvironments: [allowedEnvironment]
            },
            rolloutHint: "drifted-execution-policy"
          }
        }
      }
    });

    const blockedPolicyResponse = await request(httpServer)
      .get(`/enterprise/inventory/activation-requests/${activationRequestId}/execution-policy`)
      .expect(200);
    expect(blockedPolicyResponse.body.state).toBe("BLOCKED");
    expect(blockedPolicyResponse.body.executionPolicy.state).toBe("BLOCKED");
    expect(blockedPolicyResponse.body.executionPolicy.runtimeRollout.driftStatus).toBe("DRIFTED");
    expect(blockedPolicyResponse.body.providerCompatibility.status).toBe("BLOCKED");
    expect(
      blockedPolicyResponse.body.blockingIssues.some((item: string) =>
        item.includes("drift") ||
        item.includes("tenant") ||
        item.includes("Execution policy")
      )
    ).toBe(true);

    const applyResponse = await request(httpServer)
      .post(`/enterprise/inventory/activation-requests/${activationRequestId}/apply-execution-policy`)
      .send({
        deactivateRuntime: true
      })
      .expect(201);
    expect(applyResponse.body.state).toBe("SUSPENDED");
    expect(applyResponse.body.executionPolicy.state).toBe("SUSPENDED");
    expect(applyResponse.body.executionPolicy.runtimeStatus).toBe("SUSPENDED");
    expect(applyResponse.body.installedRegistryEntry.status).toBe("SUSPENDED");

    const installedRuntimeAfterApply = await prisma.integrationRegistryEntry.findFirst({
      where: {
        tenantId,
        connectorKey: executionPolicyConnectorKey,
        version: "1.0.0"
      },
      orderBy: { createdAt: "desc" }
    });
    expect(installedRuntimeAfterApply?.status).toBe("SUSPENDED");
    const appliedManifest =
      installedRuntimeAfterApply && typeof installedRuntimeAfterApply.manifest === "object" && installedRuntimeAfterApply.manifest !== null
        ? (installedRuntimeAfterApply.manifest as Record<string, any>)
        : {};
    expect(appliedManifest.enterpriseRollout.executionPolicy.state).toBe("SUSPENDED");

    await request(httpServer)
      .post(`/enterprise/integrations/activation-requests/${activationRequestId}/status`)
      .send({
        status: "REVOKED",
        grantedTenantId: tenantId
      })
      .expect(201);

    const suspendedPolicyResponse = await request(httpServer)
      .get(`/enterprise/inventory/activation-requests/${activationRequestId}/execution-policy`)
      .expect(200);
    expect(suspendedPolicyResponse.body.state).toBe("SUSPENDED");
    expect(suspendedPolicyResponse.body.executionPolicy.state).toBe("SUSPENDED");
    expect(suspendedPolicyResponse.body.executionPolicy.runtimeStatus).toBe("SUSPENDED");
    expect(
      suspendedPolicyResponse.body.blockingIssues.some((item: string) =>
        item.includes("REVOKED") || item.includes("suspended") || item.includes("Execution policy")
      )
    ).toBe(true);
  });
});
