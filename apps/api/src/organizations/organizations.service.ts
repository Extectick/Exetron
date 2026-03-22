import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@exetron/database";
import type { RequestContext } from "@exetron/types";
import { buildOperatorListMeta, resolveOperatorListQuery } from "../common/dto/operator-list-query.dto";
import { PrismaService } from "../database/prisma.service";
import type { JsonRecord, OrganizationListQueryDto } from "./organizations.dto";
import {
  asInputJson,
  asNullableJson,
  asUuidOrNull,
  readManagedStatus,
  setManagedStatus
} from "./organizations.helpers";
import {
  mapGovernancePolicy,
  mapMembership,
  mapOrganization,
  mapPartnerAccount,
  mapRolloutTemplate,
  mapTemplateApplication,
  mapTenantLink,
  mapWhiteLabelPack
} from "./organizations.mappers";
import { consumeOrganizationsStateReset } from "./organizations.state";

@Injectable()
export class OrganizationsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  private countStatuses(items: Array<{ status?: string | null }>) {
    return items.reduce<Record<string, number>>((accumulator, item) => {
      const status = String(item.status ?? "UNKNOWN").trim().toUpperCase();
      accumulator[status] = (accumulator[status] ?? 0) + 1;
      return accumulator;
    }, {});
  }

  async onModuleInit(): Promise<void> {
    if (consumeOrganizationsStateReset()) {
      await this.prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "TemplateApplication", "PartnerAccount", "WhiteLabelPack", "RolloutTemplate", "GovernancePolicy", "OrganizationTenantLink", "OrganizationMembership", "Organization" RESTART IDENTITY CASCADE'
      );
    }
  }

  async listOrganizations(query: OrganizationListQueryDto = {}) {
    const resolved = resolveOperatorListQuery(query);
    const code = query.code?.trim();
    const linkedTenantId = query.linkedTenantId?.trim();
    const memberUserId = query.memberUserId?.trim();
    const where = {
      ...(resolved.status ? { status: resolved.status } : {}),
      ...(code ? { code } : {}),
      ...(resolved.search
        ? {
            OR: [
              { code: { contains: resolved.search, mode: "insensitive" as const } },
              { name: { contains: resolved.search, mode: "insensitive" as const } }
            ]
          }
        : {}),
      ...(linkedTenantId ? { tenantLinks: { some: { tenantId: linkedTenantId } } } : {}),
      ...(memberUserId ? { memberships: { some: { userId: memberUserId } } } : {})
    };
    const skip = (resolved.page - 1) * resolved.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: resolved.pageSize
      }),
      this.prisma.organization.count({ where })
    ]);

    return {
      items: items.map(mapOrganization),
      total,
      ...buildOperatorListMeta(
        {
          ...resolved,
          sort: resolved.sort ?? "createdAt",
          direction: resolved.direction ?? "desc"
        },
        {
          status: resolved.status ?? null,
          code: code ?? null,
          linkedTenantId: linkedTenantId ?? null,
          memberUserId: memberUserId ?? null,
          search: resolved.search ?? null
        }
      )
    };
  }

  async createOrganization(_context: RequestContext, input: JsonRecord) {
    const code = String(input.code ?? "").trim();
    const name = String(input.name ?? "").trim();
    if (!code || !name) {
      throw new BadRequestException("Organization code and name are required.");
    }

    const created = await this.prisma.organization.create({
      data: {
        code,
        name,
        status: "ACTIVE",
        metadata: asInputJson(input.metadata)
      }
    });

    return mapOrganization(created);
  }

  async getOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });
    if (!organization) {
      throw new BadRequestException("Organization not found.");
    }

    return mapOrganization(organization);
  }

  async updateOrganization(organizationId: string, input: JsonRecord) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });
    if (!organization) {
      throw new BadRequestException("Organization not found.");
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        code: input.code ? String(input.code).trim() : undefined,
        name: input.name ? String(input.name).trim() : undefined,
        status: input.status ? String(input.status).trim() : undefined,
        metadata: input.metadata === undefined ? undefined : asNullableJson(input.metadata)
      }
    });

    return mapOrganization(updated);
  }

  async setOrganizationStatus(organizationId: string, input: JsonRecord) {
    const status = String(input.status ?? "ACTIVE").trim().toUpperCase();
    return this.updateOrganization(organizationId, { status });
  }

  async archiveOrganization(organizationId: string) {
    return this.updateOrganization(organizationId, { status: "ARCHIVED" });
  }

  async organizationOverview(organizationId: string) {
    const organization = await this.getOrganization(organizationId);

    const [
      memberships,
      tenantLinks,
      governancePolicies,
      rolloutTemplates,
      whiteLabelPacks,
      partnerAccounts
    ] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.organizationTenantLink.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.governancePolicy.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.rolloutTemplate.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.whiteLabelPack.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.partnerAccount.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" }
      })
    ]);

    const templateApplicationsRaw = rolloutTemplates.length
      ? await this.prisma.templateApplication.findMany({
          where: {
            templateId: {
              in: rolloutTemplates.map((item) => item.id)
            }
          },
          orderBy: { createdAt: "desc" }
        })
      : [];

    const mappedPolicies = governancePolicies.map(mapGovernancePolicy);
    const mappedTemplates = rolloutTemplates.map(mapRolloutTemplate);
    const mappedApplications = templateApplicationsRaw.map(mapTemplateApplication);
    const mappedPacks = whiteLabelPacks.map(mapWhiteLabelPack);
    const mappedPartners = partnerAccounts.map(mapPartnerAccount);

    return {
      organization,
      summary: {
        membershipCount: memberships.length,
        tenantLinkCount: tenantLinks.length,
        governancePolicyCount: mappedPolicies.length,
        rolloutTemplateCount: mappedTemplates.length,
        templateApplicationCount: mappedApplications.length,
        whiteLabelPackCount: mappedPacks.length,
        partnerAccountCount: mappedPartners.length
      },
      statuses: {
        governancePolicies: this.countStatuses(mappedPolicies),
        rolloutTemplates: this.countStatuses(mappedTemplates),
        templateApplications: this.countStatuses(mappedApplications),
        whiteLabelPacks: this.countStatuses(mappedPacks),
        partnerAccounts: this.countStatuses(mappedPartners)
      },
      latest: {
        governancePolicy: mappedPolicies[0] ?? null,
        rolloutTemplate: mappedTemplates[0] ?? null,
        templateApplication: mappedApplications[0] ?? null,
        whiteLabelPack: mappedPacks[0] ?? null,
        partnerAccount: mappedPartners[0] ?? null
      },
      coverage: {
        memberUserIds: [...new Set(memberships.map((item) => item.userId))],
        linkedTenantIds: [
          ...new Set([
            ...tenantLinks.map((item) => item.tenantId),
            ...templateApplicationsRaw
              .map((item) => item.tenantId)
              .filter((item): item is string => Boolean(item))
          ])
        ],
        linkedStoreIds: [
          ...new Set(
            templateApplicationsRaw
              .map((item) => item.storeId)
              .filter((item): item is string => Boolean(item))
          )
        ]
      }
    };
  }

  async listMemberships(organizationId: string) {
    const items = await this.prisma.organizationMembership.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });

    return { items: items.map(mapMembership), total: items.length };
  }

  async getMembership(organizationId: string, membershipId: string) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { organizationId, id: membershipId }
    });
    if (!membership) {
      throw new BadRequestException("Organization membership not found.");
    }

    return mapMembership(membership);
  }

  async addMembership(organizationId: string, input: JsonRecord) {
    const userId = String(input.userId ?? "").trim();
    const roleKey = String(input.roleKey ?? "member").trim();
    if (!userId) {
      throw new BadRequestException("userId is required.");
    }

    const record = await this.prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      },
      update: {
        roleKey
      },
      create: {
        organizationId,
        userId,
        roleKey
      }
    });

    return mapMembership(record);
  }

  async updateMembership(organizationId: string, membershipId: string, input: JsonRecord) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { organizationId, id: membershipId }
    });
    if (!membership) {
      throw new BadRequestException("Organization membership not found.");
    }

    const updated = await this.prisma.organizationMembership.update({
      where: { id: membership.id },
      data: {
        roleKey: input.roleKey ? String(input.roleKey).trim() : undefined
      }
    });

    return mapMembership(updated);
  }

  async archiveMembership(organizationId: string, membershipId: string) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { organizationId, id: membershipId }
    });
    if (!membership) {
      throw new BadRequestException("Organization membership not found.");
    }

    await this.prisma.organizationMembership.delete({
      where: { id: membership.id }
    });

    return {
      id: membership.id,
      organizationId,
      status: "ARCHIVED"
    };
  }

  async setMembershipStatus(organizationId: string, membershipId: string, input: JsonRecord) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { organizationId, id: membershipId }
    });

    if (!membership) {
      return {
        id: membershipId,
        organizationId,
        status: String(input.status ?? "ARCHIVED").trim().toUpperCase()
      };
    }

    return {
      ...mapMembership(membership),
      status: String(input.status ?? "ACTIVE").trim().toUpperCase()
    };
  }

  async listTenantLinks(organizationId: string) {
    const items = await this.prisma.organizationTenantLink.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });

    return { items: items.map(mapTenantLink), total: items.length };
  }

  async getTenantLink(organizationId: string, linkId: string) {
    const link = await this.prisma.organizationTenantLink.findFirst({
      where: { organizationId, id: linkId }
    });
    if (!link) {
      throw new BadRequestException("Organization tenant link not found.");
    }

    return mapTenantLink(link);
  }

  async linkTenant(organizationId: string, input: JsonRecord) {
    const tenantId = String(input.tenantId ?? "").trim();
    const roleKey = String(input.roleKey ?? "owner").trim();
    if (!tenantId) {
      throw new BadRequestException("tenantId is required.");
    }

    const record = await this.prisma.organizationTenantLink.upsert({
      where: {
        organizationId_tenantId: {
          organizationId,
          tenantId
        }
      },
      update: {
        roleKey
      },
      create: {
        organizationId,
        tenantId,
        roleKey
      }
    });

    return mapTenantLink(record);
  }

  async updateTenantLink(organizationId: string, linkId: string, input: JsonRecord) {
    const link = await this.prisma.organizationTenantLink.findFirst({
      where: { organizationId, id: linkId }
    });
    if (!link) {
      throw new BadRequestException("Organization tenant link not found.");
    }

    const updated = await this.prisma.organizationTenantLink.update({
      where: { id: link.id },
      data: {
        roleKey: input.roleKey ? String(input.roleKey).trim() : undefined
      }
    });

    return mapTenantLink(updated);
  }

  async archiveTenantLink(organizationId: string, linkId: string) {
    const link = await this.prisma.organizationTenantLink.findFirst({
      where: { organizationId, id: linkId }
    });
    if (!link) {
      throw new BadRequestException("Organization tenant link not found.");
    }

    await this.prisma.organizationTenantLink.delete({
      where: { id: link.id }
    });

    return {
      id: link.id,
      organizationId,
      status: "ARCHIVED"
    };
  }

  async setTenantLinkStatus(organizationId: string, linkId: string, input: JsonRecord) {
    const link = await this.prisma.organizationTenantLink.findFirst({
      where: { organizationId, id: linkId }
    });

    if (!link) {
      return {
        id: linkId,
        organizationId,
        status: String(input.status ?? "ARCHIVED").trim().toUpperCase()
      };
    }

    return {
      ...mapTenantLink(link),
      status: String(input.status ?? "ACTIVE").trim().toUpperCase()
    };
  }

  async listGovernancePolicies(organizationId: string) {
    const items = await this.prisma.governancePolicy.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" }
    });

    return { items: items.map(mapGovernancePolicy), total: items.length };
  }

  async getGovernancePolicy(organizationId: string, policyKey: string) {
    const policy = await this.prisma.governancePolicy.findUnique({
      where: {
        organizationId_policyKey: {
          organizationId,
          policyKey
        }
      }
    });
    if (!policy) {
      throw new BadRequestException("Governance policy not found.");
    }

    return mapGovernancePolicy(policy);
  }

  async upsertGovernancePolicy(organizationId: string, policyKey: string, input: JsonRecord) {
    const rules = asInputJson(input.rules ?? input);
    const record = await this.prisma.governancePolicy.upsert({
      where: {
        organizationId_policyKey: {
          organizationId,
          policyKey
        }
      },
      update: {
        rules
      },
      create: {
        organizationId,
        policyKey,
        rules
      }
    });

    return mapGovernancePolicy(record);
  }

  async updateGovernancePolicy(organizationId: string, policyKey: string, input: JsonRecord) {
    return this.upsertGovernancePolicy(organizationId, policyKey, input);
  }

  async archiveGovernancePolicy(organizationId: string, policyKey: string) {
    const policy = await this.getGovernancePolicy(organizationId, policyKey);
    const archivedRules = setManagedStatus(policy.rules as unknown as Prisma.JsonValue, "ARCHIVED", {
      archivedAt: new Date().toISOString()
    });

    const record = await this.prisma.governancePolicy.update({
      where: {
        organizationId_policyKey: {
          organizationId,
          policyKey
        }
      },
      data: {
        rules: archivedRules
      }
    });

    return mapGovernancePolicy(record);
  }

  async setGovernancePolicyStatus(
    organizationId: string,
    policyKey: string,
    input: JsonRecord
  ) {
    const policy = await this.getGovernancePolicy(organizationId, policyKey);
    const nextStatus = String(input.status ?? "ACTIVE").trim().toUpperCase();
    const nextRules = setManagedStatus(policy.rules as unknown as Prisma.JsonValue, nextStatus, {
      archivedAt: nextStatus === "ARCHIVED" ? new Date().toISOString() : null
    });

    const record = await this.prisma.governancePolicy.update({
      where: {
        organizationId_policyKey: {
          organizationId,
          policyKey
        }
      },
      data: {
        rules: nextRules
      }
    });

    return mapGovernancePolicy(record);
  }

  async listTemplates(organizationId: string) {
    const items = await this.prisma.rolloutTemplate.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" }
    });

    return { items: items.map(mapRolloutTemplate), total: items.length };
  }

  async getTemplate(organizationId: string, templateId: string) {
    const template = await this.prisma.rolloutTemplate.findFirst({
      where: { organizationId, id: templateId }
    });
    if (!template) {
      throw new BadRequestException("Rollout template not found.");
    }

    return mapRolloutTemplate(template);
  }

  async createTemplate(context: RequestContext, organizationId: string, input: JsonRecord) {
    const code = String(input.code ?? "").trim();
    const name = String(input.name ?? "").trim();
    if (!code || !name) {
      throw new BadRequestException("Template code and name are required.");
    }

    const current = await this.prisma.rolloutTemplate.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code
        }
      }
    });

    const record = current
      ? await this.prisma.rolloutTemplate.update({
          where: { id: current.id },
          data: {
            name,
            artifact: asInputJson(input.artifact ?? input),
            version: current.version + 1,
            createdByUserId: context.scope === "device" ? null : asUuidOrNull(context.userId)
          }
        })
      : await this.prisma.rolloutTemplate.create({
          data: {
            organizationId,
            code,
            name,
            artifact: asInputJson(input.artifact ?? input),
            version: 1,
            createdByUserId: context.scope === "device" ? null : asUuidOrNull(context.userId)
          }
        });

    return mapRolloutTemplate(record);
  }

  async updateTemplate(
    context: RequestContext,
    organizationId: string,
    templateId: string,
    input: JsonRecord
  ) {
    const template = await this.prisma.rolloutTemplate.findFirst({
      where: { organizationId, id: templateId }
    });
    if (!template) {
      throw new BadRequestException("Rollout template not found.");
    }

    const updated = await this.prisma.rolloutTemplate.update({
      where: { id: template.id },
      data: {
        code: input.code ? String(input.code).trim() : undefined,
        name: input.name ? String(input.name).trim() : undefined,
        artifact: input.artifact === undefined ? undefined : asInputJson(input.artifact),
        version: template.version + 1,
        createdByUserId: context.scope === "device" ? null : asUuidOrNull(context.userId)
      }
    });

    return mapRolloutTemplate(updated);
  }

  async archiveTemplate(organizationId: string, templateId: string) {
    const template = await this.getTemplate(organizationId, templateId);
    const nextArtifact = setManagedStatus(
      template.artifact as unknown as Prisma.JsonValue,
      "ARCHIVED",
      {
      archivedAt: new Date().toISOString()
      }
    );

    const updated = await this.prisma.rolloutTemplate.update({
      where: { id: templateId },
      data: {
        artifact: nextArtifact
      }
    });

    return mapRolloutTemplate(updated);
  }

  async setTemplateStatus(organizationId: string, templateId: string, input: JsonRecord) {
    const template = await this.getTemplate(organizationId, templateId);
    const nextStatus = String(input.status ?? "ACTIVE").trim().toUpperCase();
    const nextArtifact = setManagedStatus(
      template.artifact as unknown as Prisma.JsonValue,
      nextStatus,
      {
      archivedAt: nextStatus === "ARCHIVED" ? new Date().toISOString() : null
      }
    );

    const updated = await this.prisma.rolloutTemplate.update({
      where: { id: templateId },
      data: {
        artifact: nextArtifact
      }
    });

    return mapRolloutTemplate(updated);
  }

  async listTemplateApplications(organizationId: string, templateId: string) {
    await this.getTemplate(organizationId, templateId);
    const items = await this.prisma.templateApplication.findMany({
      where: { templateId },
      orderBy: { createdAt: "desc" }
    });

    return { items: items.map(mapTemplateApplication), total: items.length };
  }

  async getTemplateApplication(
    organizationId: string,
    templateId: string,
    applicationId: string
  ) {
    await this.getTemplate(organizationId, templateId);
    const application = await this.prisma.templateApplication.findFirst({
      where: { id: applicationId, templateId }
    });
    if (!application) {
      throw new BadRequestException("Template application not found.");
    }

    return mapTemplateApplication(application);
  }

  async applyTemplate(context: RequestContext, templateId: string, input: JsonRecord) {
    const template = await this.prisma.rolloutTemplate.findUnique({
      where: { id: templateId }
    });
    if (!template) {
      throw new BadRequestException("Template not found.");
    }

    const record = await this.prisma.templateApplication.create({
      data: {
        templateId,
        tenantId: input.tenantId ? String(input.tenantId) : null,
        storeId: input.storeId ? String(input.storeId) : null,
        appliedVersion: template.version,
        resultSummary: {
          appliedTemplateCode: template.code,
          appliedTemplateVersion: template.version,
          __meta: {
            status: "APPLIED"
          }
        },
        appliedByUserId: context.scope === "device" ? null : asUuidOrNull(context.userId)
      }
    });

    return mapTemplateApplication(record);
  }

  async reapplyTemplate(
    context: RequestContext,
    organizationId: string,
    templateId: string,
    input: JsonRecord
  ) {
    await this.getTemplate(organizationId, templateId);
    const sourceApplicationId = input.applicationId ? String(input.applicationId) : null;
    if (sourceApplicationId) {
      await this.getTemplateApplication(organizationId, templateId, sourceApplicationId);
    }

    return this.applyTemplate(context, templateId, {
      tenantId: input.tenantId ? String(input.tenantId) : null,
      storeId: input.storeId ? String(input.storeId) : null
    });
  }

  async updateTemplateApplicationStatus(
    organizationId: string,
    templateId: string,
    applicationId: string,
    input: JsonRecord
  ) {
    const application = await this.getTemplateApplication(organizationId, templateId, applicationId);
    const nextStatus = String(input.status ?? "APPLIED").trim().toUpperCase();
    const resultSummary = setManagedStatus(
      application.resultSummary as unknown as Prisma.JsonValue,
      nextStatus,
      {
        updatedAt: new Date().toISOString()
      }
    );

    const updated = await this.prisma.templateApplication.update({
      where: { id: applicationId },
      data: {
        resultSummary
      }
    });

    return mapTemplateApplication(updated);
  }

  async listWhiteLabelPacks(organizationId: string) {
    const items = await this.prisma.whiteLabelPack.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" }
    });

    return { items: items.map(mapWhiteLabelPack), total: items.length };
  }

  async getWhiteLabelPack(organizationId: string, packId: string) {
    const pack = await this.prisma.whiteLabelPack.findFirst({
      where: { organizationId, id: packId }
    });
    if (!pack) {
      throw new BadRequestException("White-label pack not found.");
    }

    return mapWhiteLabelPack(pack);
  }

  async createWhiteLabelPack(organizationId: string, input: JsonRecord) {
    const code = String(input.code ?? "").trim();
    const name = String(input.name ?? "").trim();
    if (!code || !name) {
      throw new BadRequestException("Pack code and name are required.");
    }

    const record = await this.prisma.whiteLabelPack.create({
      data: {
        organizationId,
        tenantId: input.tenantId ? String(input.tenantId) : null,
        code,
        name,
        artifact: asInputJson(input.artifact ?? input)
      }
    });

    return mapWhiteLabelPack(record);
  }

  async updateWhiteLabelPack(organizationId: string, packId: string, input: JsonRecord) {
    const pack = await this.getWhiteLabelPack(organizationId, packId);
    const updated = await this.prisma.whiteLabelPack.update({
      where: { id: packId },
      data: {
        code: input.code ? String(input.code).trim() : undefined,
        name: input.name ? String(input.name).trim() : undefined,
        tenantId: input.tenantId === undefined ? undefined : String(input.tenantId),
        artifact:
          input.artifact === undefined ? undefined : asInputJson(input.artifact),
        organizationId: pack.organizationId ?? undefined
      }
    });

    return mapWhiteLabelPack(updated);
  }

  async archiveWhiteLabelPack(organizationId: string, packId: string) {
    const pack = await this.getWhiteLabelPack(organizationId, packId);
    const nextArtifact = setManagedStatus(pack.artifact as unknown as Prisma.JsonValue, "ARCHIVED", {
      archivedAt: new Date().toISOString()
    });

    const updated = await this.prisma.whiteLabelPack.update({
      where: { id: packId },
      data: {
        artifact: nextArtifact
      }
    });

    return mapWhiteLabelPack(updated);
  }

  async setWhiteLabelPackStatus(organizationId: string, packId: string, input: JsonRecord) {
    const pack = await this.getWhiteLabelPack(organizationId, packId);
    const nextStatus = String(input.status ?? "ACTIVE").trim().toUpperCase();
    const nextArtifact = setManagedStatus(pack.artifact as unknown as Prisma.JsonValue, nextStatus, {
      archivedAt: nextStatus === "ARCHIVED" ? new Date().toISOString() : null
    });

    const updated = await this.prisma.whiteLabelPack.update({
      where: { id: packId },
      data: {
        artifact: nextArtifact
      }
    });

    return mapWhiteLabelPack(updated);
  }

  async listPartnerAccounts(organizationId: string) {
    const items = await this.prisma.partnerAccount.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" }
    });

    return { items: items.map(mapPartnerAccount), total: items.length };
  }

  async getPartnerAccount(organizationId: string, accountId: string) {
    const account = await this.prisma.partnerAccount.findFirst({
      where: { organizationId, id: accountId }
    });
    if (!account) {
      throw new BadRequestException("Partner account not found.");
    }

    return mapPartnerAccount(account);
  }

  async createPartnerAccount(organizationId: string, input: JsonRecord) {
    const code = String(input.code ?? "").trim();
    const name = String(input.name ?? "").trim();
    if (!code || !name) {
      throw new BadRequestException("Partner code and name are required.");
    }

    const record = await this.prisma.partnerAccount.upsert({
      where: { code },
      update: {
        organizationId,
        tenantId: input.tenantId ? String(input.tenantId) : null,
        name,
        status: String(input.status ?? "ACTIVE"),
        metadata: asNullableJson(input.metadata)
      },
      create: {
        organizationId,
        tenantId: input.tenantId ? String(input.tenantId) : null,
        code,
        name,
        status: String(input.status ?? "ACTIVE"),
        metadata: asInputJson(input.metadata)
      }
    });

    return mapPartnerAccount(record);
  }

  async updatePartnerAccount(organizationId: string, accountId: string, input: JsonRecord) {
    const account = await this.getPartnerAccount(organizationId, accountId);
    const updated = await this.prisma.partnerAccount.update({
      where: { id: accountId },
      data: {
        code: input.code ? String(input.code).trim() : undefined,
        name: input.name ? String(input.name).trim() : undefined,
        status: input.status ? String(input.status).trim().toUpperCase() : undefined,
        tenantId: input.tenantId === undefined ? undefined : String(input.tenantId),
        metadata: input.metadata === undefined ? undefined : asNullableJson(input.metadata),
        organizationId: account.organizationId ?? undefined
      }
    });

    return mapPartnerAccount(updated);
  }

  async archivePartnerAccount(organizationId: string, accountId: string) {
    return this.updatePartnerAccount(organizationId, accountId, {
      status: "ARCHIVED"
    });
  }

  async setPartnerAccountStatus(
    organizationId: string,
    accountId: string,
    input: JsonRecord
  ) {
    return this.updatePartnerAccount(organizationId, accountId, {
      status: String(input.status ?? "ACTIVE").trim().toUpperCase()
    });
  }
}
