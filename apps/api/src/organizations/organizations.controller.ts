import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { JsonRecord, ResolveContextRequest } from "./organizations.dto";
import { OrganizationListQueryDto } from "./organizations.dto";
import { resolveContext } from "./organizations.helpers";
import { OrganizationsService } from "./organizations.service";

@ApiTags("organizations")
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Permissions("organizations.read")
  listOrganizations(
    @Req() _request: ResolveContextRequest,
    @Query() query: OrganizationListQueryDto
  ) {
    return this.organizationsService.listOrganizations(query);
  }

  @Post()
  @Permissions("organizations.write")
  createOrganization(@Req() request: ResolveContextRequest, @Body() body: JsonRecord) {
    return this.organizationsService.createOrganization(resolveContext(request), body);
  }

  @Get(":organizationId")
  @Permissions("organizations.read")
  getOrganization(@Param("organizationId") organizationId: string) {
    return this.organizationsService.getOrganization(organizationId);
  }

  @Get(":organizationId/overview")
  @Permissions("organizations.read")
  organizationOverview(@Param("organizationId") organizationId: string) {
    return this.organizationsService.organizationOverview(organizationId);
  }

  @Patch(":organizationId")
  @Permissions("organizations.write")
  updateOrganization(@Param("organizationId") organizationId: string, @Body() body: JsonRecord) {
    return this.organizationsService.updateOrganization(organizationId, body);
  }

  @Post(":organizationId/status")
  @Permissions("organizations.write")
  setOrganizationStatus(
    @Param("organizationId") organizationId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.setOrganizationStatus(organizationId, body);
  }

  @Post(":organizationId/archive")
  @Permissions("organizations.write")
  archiveOrganization(@Param("organizationId") organizationId: string) {
    return this.organizationsService.archiveOrganization(organizationId);
  }

  @Get(":organizationId/memberships")
  @Permissions("organizations.read")
  listMemberships(@Param("organizationId") organizationId: string) {
    return this.organizationsService.listMemberships(organizationId);
  }

  @Get(":organizationId/memberships/:membershipId")
  @Permissions("organizations.read")
  getMembership(
    @Param("organizationId") organizationId: string,
    @Param("membershipId") membershipId: string
  ) {
    return this.organizationsService.getMembership(organizationId, membershipId);
  }

  @Post(":organizationId/memberships")
  @Permissions("organizations.write")
  addMembership(@Param("organizationId") organizationId: string, @Body() body: JsonRecord) {
    return this.organizationsService.addMembership(organizationId, body);
  }

  @Patch(":organizationId/memberships/:membershipId")
  @Permissions("organizations.write")
  updateMembership(
    @Param("organizationId") organizationId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.updateMembership(organizationId, membershipId, body);
  }

  @Post(":organizationId/memberships/:membershipId/status")
  @Permissions("organizations.write")
  setMembershipStatus(
    @Param("organizationId") organizationId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.setMembershipStatus(organizationId, membershipId, body);
  }

  @Post(":organizationId/memberships/:membershipId/archive")
  @Permissions("organizations.write")
  archiveMembership(
    @Param("organizationId") organizationId: string,
    @Param("membershipId") membershipId: string
  ) {
    return this.organizationsService.archiveMembership(organizationId, membershipId);
  }

  @Get(":organizationId/tenants")
  @Permissions("organizations.read")
  listTenantLinks(@Param("organizationId") organizationId: string) {
    return this.organizationsService.listTenantLinks(organizationId);
  }

  @Get(":organizationId/tenants/:linkId")
  @Permissions("organizations.read")
  getTenantLink(
    @Param("organizationId") organizationId: string,
    @Param("linkId") linkId: string
  ) {
    return this.organizationsService.getTenantLink(organizationId, linkId);
  }

  @Post(":organizationId/tenants")
  @Permissions("organizations.write")
  linkTenant(@Param("organizationId") organizationId: string, @Body() body: JsonRecord) {
    return this.organizationsService.linkTenant(organizationId, body);
  }

  @Patch(":organizationId/tenants/:linkId")
  @Permissions("organizations.write")
  updateTenantLink(
    @Param("organizationId") organizationId: string,
    @Param("linkId") linkId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.updateTenantLink(organizationId, linkId, body);
  }

  @Post(":organizationId/tenants/:linkId/status")
  @Permissions("organizations.write")
  setTenantLinkStatus(
    @Param("organizationId") organizationId: string,
    @Param("linkId") linkId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.setTenantLinkStatus(organizationId, linkId, body);
  }

  @Post(":organizationId/tenants/:linkId/archive")
  @Permissions("organizations.write")
  archiveTenantLink(@Param("organizationId") organizationId: string, @Param("linkId") linkId: string) {
    return this.organizationsService.archiveTenantLink(organizationId, linkId);
  }

  @Get(":organizationId/governance-policies")
  @Permissions("organizations.read")
  listGovernancePolicies(@Param("organizationId") organizationId: string) {
    return this.organizationsService.listGovernancePolicies(organizationId);
  }

  @Get(":organizationId/governance-policies/:policyKey")
  @Permissions("organizations.read")
  getGovernancePolicy(
    @Param("organizationId") organizationId: string,
    @Param("policyKey") policyKey: string
  ) {
    return this.organizationsService.getGovernancePolicy(organizationId, policyKey);
  }

  @Put(":organizationId/governance-policies/:policyKey")
  @Permissions("organizations.write")
  upsertGovernancePolicy(
    @Param("organizationId") organizationId: string,
    @Param("policyKey") policyKey: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.upsertGovernancePolicy(organizationId, policyKey, body);
  }

  @Patch(":organizationId/governance-policies/:policyKey")
  @Permissions("organizations.write")
  updateGovernancePolicy(
    @Param("organizationId") organizationId: string,
    @Param("policyKey") policyKey: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.updateGovernancePolicy(organizationId, policyKey, body);
  }

  @Post(":organizationId/governance-policies/:policyKey/status")
  @Permissions("organizations.write")
  setGovernancePolicyStatus(
    @Param("organizationId") organizationId: string,
    @Param("policyKey") policyKey: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.setGovernancePolicyStatus(organizationId, policyKey, body);
  }

  @Post(":organizationId/governance-policies/:policyKey/archive")
  @Permissions("organizations.write")
  archiveGovernancePolicy(
    @Param("organizationId") organizationId: string,
    @Param("policyKey") policyKey: string
  ) {
    return this.organizationsService.archiveGovernancePolicy(organizationId, policyKey);
  }

  @Get(":organizationId/templates")
  @Permissions("organizations.read")
  listTemplates(@Param("organizationId") organizationId: string) {
    return this.organizationsService.listTemplates(organizationId);
  }

  @Get(":organizationId/templates/:templateId")
  @Permissions("organizations.read")
  getTemplate(
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string
  ) {
    return this.organizationsService.getTemplate(organizationId, templateId);
  }

  @Post(":organizationId/templates")
  @Permissions("organizations.write")
  createTemplate(
    @Req() request: ResolveContextRequest,
    @Param("organizationId") organizationId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.createTemplate(resolveContext(request), organizationId, body);
  }

  @Patch(":organizationId/templates/:templateId")
  @Permissions("organizations.write")
  updateTemplate(
    @Req() request: ResolveContextRequest,
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.updateTemplate(
      resolveContext(request),
      organizationId,
      templateId,
      body
    );
  }

  @Post(":organizationId/templates/:templateId/status")
  @Permissions("organizations.write")
  setTemplateStatus(
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.setTemplateStatus(organizationId, templateId, body);
  }

  @Post(":organizationId/templates/:templateId/archive")
  @Permissions("organizations.write")
  archiveTemplate(
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string
  ) {
    return this.organizationsService.archiveTemplate(organizationId, templateId);
  }

  @Get(":organizationId/templates/:templateId/applications")
  @Permissions("organizations.read")
  listTemplateApplications(
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string
  ) {
    return this.organizationsService.listTemplateApplications(organizationId, templateId);
  }

  @Get(":organizationId/templates/:templateId/applications/:applicationId")
  @Permissions("organizations.read")
  getTemplateApplication(
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string,
    @Param("applicationId") applicationId: string
  ) {
    return this.organizationsService.getTemplateApplication(
      organizationId,
      templateId,
      applicationId
    );
  }

  @Post("templates/:templateId/applications")
  @Permissions("organizations.write")
  applyTemplate(
    @Req() request: ResolveContextRequest,
    @Param("templateId") templateId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.applyTemplate(resolveContext(request), templateId, body);
  }

  @Post(":organizationId/templates/:templateId/reapply")
  @Permissions("organizations.write")
  reapplyTemplate(
    @Req() request: ResolveContextRequest,
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.reapplyTemplate(
      resolveContext(request),
      organizationId,
      templateId,
      body
    );
  }

  @Post(":organizationId/templates/:templateId/applications/:applicationId/status")
  @Permissions("organizations.write")
  updateTemplateApplicationStatus(
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string,
    @Param("applicationId") applicationId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.updateTemplateApplicationStatus(
      organizationId,
      templateId,
      applicationId,
      body
    );
  }

  @Get(":organizationId/white-label-packs")
  @Permissions("organizations.read")
  listWhiteLabelPacks(@Param("organizationId") organizationId: string) {
    return this.organizationsService.listWhiteLabelPacks(organizationId);
  }

  @Get(":organizationId/white-label-packs/:packId")
  @Permissions("organizations.read")
  getWhiteLabelPack(
    @Param("organizationId") organizationId: string,
    @Param("packId") packId: string
  ) {
    return this.organizationsService.getWhiteLabelPack(organizationId, packId);
  }

  @Post(":organizationId/white-label-packs")
  @Permissions("organizations.write")
  createWhiteLabelPack(
    @Param("organizationId") organizationId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.createWhiteLabelPack(organizationId, body);
  }

  @Patch(":organizationId/white-label-packs/:packId")
  @Permissions("organizations.write")
  updateWhiteLabelPack(
    @Param("organizationId") organizationId: string,
    @Param("packId") packId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.updateWhiteLabelPack(organizationId, packId, body);
  }

  @Post(":organizationId/white-label-packs/:packId/status")
  @Permissions("organizations.write")
  setWhiteLabelPackStatus(
    @Param("organizationId") organizationId: string,
    @Param("packId") packId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.setWhiteLabelPackStatus(organizationId, packId, body);
  }

  @Post(":organizationId/white-label-packs/:packId/archive")
  @Permissions("organizations.write")
  archiveWhiteLabelPack(
    @Param("organizationId") organizationId: string,
    @Param("packId") packId: string
  ) {
    return this.organizationsService.archiveWhiteLabelPack(organizationId, packId);
  }

  @Get(":organizationId/partner-accounts")
  @Permissions("organizations.read")
  listPartnerAccounts(@Param("organizationId") organizationId: string) {
    return this.organizationsService.listPartnerAccounts(organizationId);
  }

  @Get(":organizationId/partner-accounts/:accountId")
  @Permissions("organizations.read")
  getPartnerAccount(
    @Param("organizationId") organizationId: string,
    @Param("accountId") accountId: string
  ) {
    return this.organizationsService.getPartnerAccount(organizationId, accountId);
  }

  @Post(":organizationId/partner-accounts")
  @Permissions("organizations.write")
  createPartnerAccount(
    @Param("organizationId") organizationId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.createPartnerAccount(organizationId, body);
  }

  @Patch(":organizationId/partner-accounts/:accountId")
  @Permissions("organizations.write")
  updatePartnerAccount(
    @Param("organizationId") organizationId: string,
    @Param("accountId") accountId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.updatePartnerAccount(organizationId, accountId, body);
  }

  @Post(":organizationId/partner-accounts/:accountId/status")
  @Permissions("organizations.write")
  setPartnerAccountStatus(
    @Param("organizationId") organizationId: string,
    @Param("accountId") accountId: string,
    @Body() body: JsonRecord
  ) {
    return this.organizationsService.setPartnerAccountStatus(organizationId, accountId, body);
  }

  @Post(":organizationId/partner-accounts/:accountId/archive")
  @Permissions("organizations.write")
  archivePartnerAccount(
    @Param("organizationId") organizationId: string,
    @Param("accountId") accountId: string
  ) {
    return this.organizationsService.archivePartnerAccount(organizationId, accountId);
  }
}
