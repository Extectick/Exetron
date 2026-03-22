import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { prisma } from "@exetron/database";
import request from "supertest";
import { OrganizationsModule, resetOrganizationsState } from "../src/organizations/organizations.module";

type HttpServer = Parameters<typeof request>[0];

describe("PHASE 19 organization breadth", () => {
  let app: INestApplication;
  let httpServer: HttpServer;

  beforeAll(async () => {
    resetOrganizationsState();

    const moduleRef = await Test.createTestingModule({
      imports: [OrganizationsModule]
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

  it("supports detail, update, archive, status and history flows across organizations assets", async () => {
    const organizationResponse = await request(httpServer)
      .post("/organizations")
      .send({
        code: "network-core",
        name: "Network Core",
        metadata: { wave: "PHASE 19" }
      })
      .expect(201);

    const organizationId = organizationResponse.body.id as string;

    await request(httpServer)
      .patch(`/organizations/${organizationId}`)
      .send({
        name: "Network Core Updated"
      })
      .expect(200);

    const organizationDetail = await request(httpServer).get(`/organizations/${organizationId}`).expect(200);
    expect(organizationDetail.body.name).toBe("Network Core Updated");

    await request(httpServer)
      .post(`/organizations/${organizationId}/status`)
      .send({
        status: "ACTIVE"
      })
      .expect(201);

    await request(httpServer).post(`/organizations/${organizationId}/memberships`).send({
      userId: "00000000-0000-0000-0000-000000000101",
      roleKey: "owner"
    });

    const membershipList = await request(httpServer)
      .get(`/organizations/${organizationId}/memberships`)
      .expect(200);
    const membershipId = membershipList.body.items[0].id as string;

    await request(httpServer)
      .get(`/organizations/${organizationId}/memberships/${membershipId}`)
      .expect(200);

    await request(httpServer)
      .patch(`/organizations/${organizationId}/memberships/${membershipId}`)
      .send({
        roleKey: "admin"
      })
      .expect(200);

    await request(httpServer)
      .post(`/organizations/${organizationId}/memberships/${membershipId}/status`)
      .send({
        status: "ACTIVE"
      })
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/memberships/${membershipId}/archive`)
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/memberships/${membershipId}/status`)
      .send({
        status: "ARCHIVED"
      })
      .expect(201);

    await request(httpServer).post(`/organizations/${organizationId}/tenants`).send({
      tenantId: "00000000-0000-0000-0000-000000000201",
      roleKey: "parent"
    });

    const tenantLinkList = await request(httpServer)
      .get(`/organizations/${organizationId}/tenants`)
      .expect(200);
    const tenantLinkId = tenantLinkList.body.items[0].id as string;

    await request(httpServer)
      .get(`/organizations/${organizationId}/tenants/${tenantLinkId}`)
      .expect(200);

    await request(httpServer)
      .patch(`/organizations/${organizationId}/tenants/${tenantLinkId}`)
      .send({
        roleKey: "child"
      })
      .expect(200);

    await request(httpServer)
      .post(`/organizations/${organizationId}/tenants/${tenantLinkId}/status`)
      .send({
        status: "ACTIVE"
      })
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/tenants/${tenantLinkId}/archive`)
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/tenants/${tenantLinkId}/status`)
      .send({
        status: "ARCHIVED"
      })
      .expect(201);

    await request(httpServer)
      .put(`/organizations/${organizationId}/governance-policies/rollout-precedence`)
      .send({
        rules: {
          mode: "template-first",
          precedence: ["organization", "tenant", "store"]
        }
      })
      .expect(200);

    await request(httpServer)
      .get(`/organizations/${organizationId}/governance-policies/rollout-precedence`)
      .expect(200);

    await request(httpServer)
      .patch(`/organizations/${organizationId}/governance-policies/rollout-precedence`)
      .send({
        rules: {
          mode: "policy-first",
          precedence: ["store", "tenant", "organization"]
        }
      })
      .expect(200);

    await request(httpServer)
      .post(`/organizations/${organizationId}/governance-policies/rollout-precedence/status`)
      .send({
        status: "ACTIVE"
      })
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/governance-policies/rollout-precedence/archive`)
      .expect(201);

    const templateResponse = await request(httpServer)
      .post(`/organizations/${organizationId}/templates`)
      .send({
        code: "regional-template",
        name: "Regional Template",
        artifact: {
          locale: "en-US",
          currency: "USD"
        }
      })
      .expect(201);
    const templateId = templateResponse.body.id as string;

    await request(httpServer)
      .get(`/organizations/${organizationId}/templates/${templateId}`)
      .expect(200);

    await request(httpServer)
      .patch(`/organizations/${organizationId}/templates/${templateId}`)
      .send({
        name: "Regional Template v2"
      })
      .expect(200);

    const applicationResponse = await request(httpServer)
      .post(`/organizations/templates/${templateId}/applications`)
      .send({
        tenantId: "00000000-0000-0000-0000-000000000201",
        storeId: null
      })
      .expect(201);
    const applicationId = applicationResponse.body.id as string;

    await request(httpServer)
      .get(`/organizations/${organizationId}/templates/${templateId}/applications`)
      .expect(200);

    await request(httpServer)
      .get(`/organizations/${organizationId}/templates/${templateId}/applications/${applicationId}`)
      .expect(200);

    await request(httpServer)
      .post(`/organizations/${organizationId}/templates/${templateId}/reapply`)
      .send({
        tenantId: "00000000-0000-0000-0000-000000000201",
        storeId: null,
        applicationId
      })
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/templates/${templateId}/applications/${applicationId}/status`)
      .send({
        status: "APPLIED"
      })
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/templates/${templateId}/status`)
      .send({
        status: "ACTIVE"
      })
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/templates/${templateId}/archive`)
      .expect(201);

    const packResponse = await request(httpServer)
      .post(`/organizations/${organizationId}/white-label-packs`)
      .send({
        code: "white-label-basic",
        name: "White Label Basic",
        artifact: {
          branding: "core"
        }
      })
      .expect(201);
    const packId = packResponse.body.id as string;

    await request(httpServer)
      .get(`/organizations/${organizationId}/white-label-packs/${packId}`)
      .expect(200);

    await request(httpServer)
      .patch(`/organizations/${organizationId}/white-label-packs/${packId}`)
      .send({
        name: "White Label Basic v2"
      })
      .expect(200);

    await request(httpServer)
      .post(`/organizations/${organizationId}/white-label-packs/${packId}/status`)
      .send({
        status: "ACTIVE"
      })
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/white-label-packs/${packId}/archive`)
      .expect(201);

    const partnerResponse = await request(httpServer)
      .post(`/organizations/${organizationId}/partner-accounts`)
      .send({
        code: "partner-001",
        name: "Partner 001",
        metadata: {
          tier: "starter"
        }
      })
      .expect(201);
    const partnerId = partnerResponse.body.id as string;

    await request(httpServer)
      .get(`/organizations/${organizationId}/partner-accounts/${partnerId}`)
      .expect(200);

    await request(httpServer)
      .patch(`/organizations/${organizationId}/partner-accounts/${partnerId}`)
      .send({
        name: "Partner 001 v2"
      })
      .expect(200);

    await request(httpServer)
      .post(`/organizations/${organizationId}/partner-accounts/${partnerId}/status`)
      .send({
        status: "ACTIVE"
      })
      .expect(201);

    await request(httpServer)
      .post(`/organizations/${organizationId}/partner-accounts/${partnerId}/archive`)
      .expect(201);

    const overviewResponse = await request(httpServer)
      .get(`/organizations/${organizationId}/overview`)
      .expect(200);

    expect(overviewResponse.body.organization.id).toBe(organizationId);
    expect(overviewResponse.body.summary.membershipCount).toBe(0);
    expect(overviewResponse.body.summary.tenantLinkCount).toBe(0);
    expect(overviewResponse.body.summary.governancePolicyCount).toBe(1);
    expect(overviewResponse.body.summary.rolloutTemplateCount).toBe(1);
    expect(overviewResponse.body.summary.templateApplicationCount).toBe(2);
    expect(overviewResponse.body.summary.whiteLabelPackCount).toBe(1);
    expect(overviewResponse.body.summary.partnerAccountCount).toBe(1);
    expect(overviewResponse.body.statuses.governancePolicies.ARCHIVED).toBe(1);
    expect(overviewResponse.body.statuses.rolloutTemplates.ARCHIVED).toBe(1);
    expect(overviewResponse.body.statuses.whiteLabelPacks.ARCHIVED).toBe(1);
    expect(overviewResponse.body.statuses.partnerAccounts.ARCHIVED).toBe(1);
    expect(overviewResponse.body.coverage.linkedTenantIds).toContain(
      "00000000-0000-0000-0000-000000000201"
    );

    const finalOrganizations = await request(httpServer).get("/organizations").expect(200);
    expect(finalOrganizations.body.total).toBe(1);
    expect(finalOrganizations.body.items[0].status).toBe("ACTIVE");
  });
});
