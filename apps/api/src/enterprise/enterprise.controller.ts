import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Public } from "../common/decorators/public.decorator";
import { JsonRecord, resolveContext } from "./enterprise.helpers";
import { EnterpriseService } from "./enterprise.service";

@ApiTags("enterprise")
@Controller("enterprise")
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Get("overview")
  @Permissions("enterprise.read")
  operationsOverview(
    @Query("tenantId") tenantId?: string,
    @Query("organizationId") organizationId?: string
  ) {
    return this.enterpriseService.operationsOverview({ tenantId, organizationId });
  }

  @Get("billing/overview")
  @Permissions("enterprise.read")
  billingOverview(@Req() request: any, @Query("tenantId") tenantId: string) {
    return this.enterpriseService.billingOverview(resolveContext(request, tenantId), tenantId);
  }

  @Get("billing/plans")
  @Permissions("enterprise.read")
  listBillingPlans() {
    return this.enterpriseService.listBillingPlans();
  }

  @Get("billing/plans/:id")
  @Permissions("enterprise.read")
  getBillingPlan(@Param("id") id: string) {
    return this.enterpriseService.getBillingPlan(id);
  }

  @Patch("billing/plans/:id")
  @Permissions("enterprise.write")
  updateBillingPlan(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateBillingPlan(id, body);
  }

  @Post("billing/plans/:id/archive")
  @Permissions("enterprise.write")
  archiveBillingPlan(@Param("id") id: string) {
    return this.enterpriseService.archiveBillingPlan(id);
  }

  @Post("billing/plans/:id/status")
  @Permissions("enterprise.write")
  updateBillingPlanStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateBillingPlanStatus(id, body);
  }

  @Post("billing/plans")
  @Permissions("enterprise.write")
  createPlan(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createPlan(resolveContext(request), body);
  }

  @Get("billing/subscriptions")
  @Permissions("enterprise.read")
  listBillingSubscriptions() {
    return this.enterpriseService.listBillingSubscriptions();
  }

  @Get("billing/subscriptions/:id")
  @Permissions("enterprise.read")
  getBillingSubscription(@Param("id") id: string) {
    return this.enterpriseService.getBillingSubscription(id);
  }

  @Patch("billing/subscriptions/:id")
  @Permissions("enterprise.write")
  updateBillingSubscription(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateBillingSubscription(id, body);
  }

  @Post("billing/subscriptions/:id/archive")
  @Permissions("enterprise.write")
  archiveBillingSubscription(@Param("id") id: string) {
    return this.enterpriseService.archiveBillingSubscription(id);
  }

  @Post("billing/subscriptions/:id/status")
  @Permissions("enterprise.write")
  updateBillingSubscriptionStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateBillingSubscriptionStatus(id, body);
  }

  @Post("billing/subscriptions")
  @Permissions("enterprise.write")
  createSubscription(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createSubscription(resolveContext(request), body);
  }

  @Get("billing/invoices")
  @Permissions("enterprise.read")
  listBillingInvoices() {
    return this.enterpriseService.listBillingInvoices();
  }

  @Get("billing/invoices/:id")
  @Permissions("enterprise.read")
  getBillingInvoice(@Param("id") id: string) {
    return this.enterpriseService.getBillingInvoice(id);
  }

  @Patch("billing/invoices/:id")
  @Permissions("enterprise.write")
  updateBillingInvoice(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateBillingInvoice(id, body);
  }

  @Post("billing/invoices/:id/archive")
  @Permissions("enterprise.write")
  archiveBillingInvoice(@Param("id") id: string) {
    return this.enterpriseService.archiveBillingInvoice(id);
  }

  @Post("billing/invoices/:id/status")
  @Permissions("enterprise.write")
  updateBillingInvoiceStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateBillingInvoiceStatus(id, body);
  }

  @Post("billing/invoices")
  @Permissions("enterprise.write")
  issueInvoice(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.issueInvoice(resolveContext(request), body);
  }

  @Get("billing/entitlements")
  @Permissions("enterprise.read")
  listBillingEntitlements() {
    return this.enterpriseService.listBillingEntitlements();
  }

  @Get("billing/entitlements/:id")
  @Permissions("enterprise.read")
  getBillingEntitlement(@Param("id") id: string) {
    return this.enterpriseService.getBillingEntitlement(id);
  }

  @Patch("billing/entitlements/:id")
  @Permissions("enterprise.write")
  updateBillingEntitlement(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateBillingEntitlement(id, body);
  }

  @Post("billing/entitlements/:id/archive")
  @Permissions("enterprise.write")
  archiveBillingEntitlement(@Param("id") id: string) {
    return this.enterpriseService.archiveBillingEntitlement(id);
  }

  @Post("billing/entitlements")
  @Permissions("enterprise.write")
  upsertEntitlement(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.upsertEntitlement(resolveContext(request), body);
  }

  @Get("billing/quotas")
  @Permissions("enterprise.read")
  listBillingQuotas() {
    return this.enterpriseService.listBillingQuotas();
  }

  @Get("billing/quotas/:id")
  @Permissions("enterprise.read")
  getBillingQuota(@Param("id") id: string) {
    return this.enterpriseService.getBillingQuota(id);
  }

  @Patch("billing/quotas/:id")
  @Permissions("enterprise.write")
  updateBillingQuota(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateBillingQuota(id, body);
  }

  @Post("billing/quotas/:id/archive")
  @Permissions("enterprise.write")
  archiveBillingQuota(@Param("id") id: string) {
    return this.enterpriseService.archiveBillingQuota(id);
  }

  @Post("billing/quotas")
  @Permissions("enterprise.write")
  upsertQuota(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.upsertQuota(resolveContext(request), body);
  }

  @Get("integrations/identity-providers")
  @Permissions("enterprise.read")
  listIdentityProviders() {
    return this.enterpriseService.listIdentityProviders();
  }

  @Get("integrations/identity-providers/:id")
  @Permissions("enterprise.read")
  getIdentityProvider(@Param("id") id: string) {
    return this.enterpriseService.getIdentityProvider(id);
  }

  @Patch("integrations/identity-providers/:id")
  @Permissions("enterprise.write")
  updateIdentityProvider(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateIdentityProvider(id, body);
  }

  @Post("integrations/identity-providers/:id/archive")
  @Permissions("enterprise.write")
  archiveIdentityProvider(@Param("id") id: string) {
    return this.enterpriseService.archiveIdentityProvider(id);
  }

  @Post("integrations/identity-providers/:id/status")
  @Permissions("enterprise.write")
  updateIdentityProviderStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateIdentityProviderStatus(id, body);
  }

  @Post("integrations/identity-providers")
  @Permissions("enterprise.write")
  createIdentityProvider(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createIdentityProvider(resolveContext(request), body);
  }

  @Get("integrations/identity-providers/:identityProviderId/federated-links")
  @Permissions("enterprise.read")
  listFederatedLinks(@Param("identityProviderId") identityProviderId: string) {
    return this.enterpriseService.listFederatedLinks(identityProviderId);
  }

  @Get("integrations/federated-links/:id")
  @Permissions("enterprise.read")
  getFederatedLink(@Param("id") id: string) {
    return this.enterpriseService.getFederatedLink(id);
  }

  @Patch("integrations/federated-links/:id")
  @Permissions("enterprise.write")
  updateFederatedLink(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateFederatedLink(id, body);
  }

  @Post("integrations/federated-links/:id/archive")
  @Permissions("enterprise.write")
  archiveFederatedLink(@Param("id") id: string) {
    return this.enterpriseService.archiveFederatedLink(id);
  }

  @Post("integrations/identity-providers/:id/federated-links")
  @Permissions("enterprise.write")
  addFederatedLink(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.addFederatedLink(resolveContext(request), id, body);
  }

  @Get("security/advanced-role-policies")
  @Permissions("enterprise.read")
  listAdvancedRolePolicies() {
    return this.enterpriseService.listAdvancedRolePolicies();
  }

  @Get("security/advanced-role-policies/:id")
  @Permissions("enterprise.read")
  getAdvancedRolePolicy(@Param("id") id: string) {
    return this.enterpriseService.getAdvancedRolePolicy(id);
  }

  @Patch("security/advanced-role-policies/:id")
  @Permissions("enterprise.write")
  updateAdvancedRolePolicy(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateAdvancedRolePolicy(id, body);
  }

  @Post("security/advanced-role-policies/:id/archive")
  @Permissions("enterprise.write")
  archiveAdvancedRolePolicy(@Param("id") id: string) {
    return this.enterpriseService.archiveAdvancedRolePolicy(id);
  }

  @Post("security/advanced-role-policies")
  @Permissions("enterprise.write")
  createAdvancedRolePolicy(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createAdvancedRolePolicy(resolveContext(request), body);
  }

  @Get("audit/exports")
  @Permissions("enterprise.read")
  listAuditExports() {
    return this.enterpriseService.listAuditExports();
  }

  @Get("audit/exports/:id")
  @Permissions("enterprise.read")
  getAuditExport(@Param("id") id: string) {
    return this.enterpriseService.getAuditExport(id);
  }

  @Patch("audit/exports/:id")
  @Permissions("enterprise.write")
  updateAuditExport(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateAuditExport(id, body);
  }

  @Post("audit/exports/:id/archive")
  @Permissions("enterprise.write")
  archiveAuditExport(@Param("id") id: string) {
    return this.enterpriseService.archiveAuditExport(id);
  }

  @Post("audit/exports/:id/status")
  @Permissions("enterprise.write")
  updateAuditExportStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateAuditExportStatus(id, body);
  }

  @Post("audit/exports")
  @Permissions("enterprise.write")
  createAuditExport(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createAuditExport(resolveContext(request), body);
  }

  @Get("compliance/packs")
  @Permissions("enterprise.read")
  listCompliancePacks() {
    return this.enterpriseService.listCompliancePacks();
  }

  @Get("compliance/packs/:id")
  @Permissions("enterprise.read")
  getCompliancePack(@Param("id") id: string) {
    return this.enterpriseService.getCompliancePack(id);
  }

  @Patch("compliance/packs/:id")
  @Permissions("enterprise.write")
  updateCompliancePack(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateCompliancePack(id, body);
  }

  @Post("compliance/packs/:id/archive")
  @Permissions("enterprise.write")
  archiveCompliancePack(@Param("id") id: string) {
    return this.enterpriseService.archiveCompliancePack(id);
  }

  @Post("compliance/packs/:id/status")
  @Permissions("enterprise.write")
  updateCompliancePackStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateCompliancePackStatus(id, body);
  }

  @Post("compliance/packs")
  @Permissions("enterprise.write")
  createCompliancePack(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createCompliancePack(resolveContext(request), body);
  }

  @Get("compliance/evidence-artifacts")
  @Permissions("enterprise.read")
  listComplianceEvidenceArtifacts() {
    return this.enterpriseService.listComplianceEvidenceArtifacts();
  }

  @Get("compliance/evidence-artifacts/:id")
  @Permissions("enterprise.read")
  getComplianceEvidenceArtifact(@Param("id") id: string) {
    return this.enterpriseService.getComplianceEvidenceArtifact(id);
  }

  @Patch("compliance/evidence-artifacts/:id")
  @Permissions("enterprise.write")
  updateComplianceEvidenceArtifact(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateComplianceEvidenceArtifact(id, body);
  }

  @Post("compliance/evidence-artifacts/:id/archive")
  @Permissions("enterprise.write")
  archiveComplianceEvidenceArtifact(@Param("id") id: string) {
    return this.enterpriseService.archiveComplianceEvidenceArtifact(id);
  }

  @Post("compliance/evidence-artifacts")
  @Permissions("enterprise.write")
  createComplianceEvidence(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createComplianceEvidence(resolveContext(request), body);
  }

  @Get("security/secrets")
  @Permissions("enterprise.read")
  listSecretRegistryEntries() {
    return this.enterpriseService.listSecretRegistryEntries();
  }

  @Get("security/secrets/:id")
  @Permissions("enterprise.read")
  getSecretRegistryEntry(@Param("id") id: string) {
    return this.enterpriseService.getSecretRegistryEntry(id);
  }

  @Patch("security/secrets/:id")
  @Permissions("enterprise.write")
  updateSecretRegistryEntry(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateSecretRegistryEntry(id, body);
  }

  @Post("security/secrets/:id/archive")
  @Permissions("enterprise.write")
  archiveSecretRegistryEntry(@Param("id") id: string) {
    return this.enterpriseService.archiveSecretRegistryEntry(id);
  }

  @Post("security/secrets")
  @Permissions("enterprise.write")
  createSecretEntry(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createSecretEntry(resolveContext(request), body);
  }

  @Get("deployment-variants")
  @Permissions("enterprise.read")
  listDeploymentVariants() {
    return this.enterpriseService.listDeploymentVariants();
  }

  @Get("deployment-variants/:id")
  @Permissions("enterprise.read")
  getDeploymentVariant(@Param("id") id: string) {
    return this.enterpriseService.getDeploymentVariant(id);
  }

  @Patch("deployment-variants/:id")
  @Permissions("enterprise.write")
  updateDeploymentVariant(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateDeploymentVariant(id, body);
  }

  @Post("deployment-variants/:id/archive")
  @Permissions("enterprise.write")
  archiveDeploymentVariant(@Param("id") id: string) {
    return this.enterpriseService.archiveDeploymentVariant(id);
  }

  @Post("deployment-variants/:id/status")
  @Permissions("enterprise.write")
  updateDeploymentVariantStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateDeploymentVariantStatus(id, body);
  }

  @Post("deployment-variants")
  @Permissions("enterprise.write")
  createDeploymentVariant(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createDeploymentVariant(resolveContext(request), body);
  }

  @Get("integrations/partner-sdk-contracts")
  @Permissions("enterprise.read")
  listPartnerSdkContracts() {
    return this.enterpriseService.listPartnerSdkContracts();
  }

  @Get("integrations/partner-sdk-contracts/:id")
  @Permissions("enterprise.read")
  getPartnerSdkContract(@Param("id") id: string) {
    return this.enterpriseService.getPartnerSdkContract(id);
  }

  @Patch("integrations/partner-sdk-contracts/:id")
  @Permissions("enterprise.write")
  updatePartnerSdkContract(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updatePartnerSdkContract(id, body);
  }

  @Post("integrations/partner-sdk-contracts/:id/archive")
  @Permissions("enterprise.write")
  archivePartnerSdkContract(@Param("id") id: string) {
    return this.enterpriseService.archivePartnerSdkContract(id);
  }

  @Post("integrations/partner-sdk-contracts/:id/status")
  @Permissions("enterprise.write")
  updatePartnerSdkContractStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updatePartnerSdkContractStatus(id, body);
  }

  @Post("integrations/partner-sdk-contracts")
  @Permissions("enterprise.write")
  createPartnerSdkContract(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createPartnerSdkContract(resolveContext(request), body);
  }

  @Get("integrations/registry")
  @Permissions("enterprise.read")
  listIntegrationRegistryEntries() {
    return this.enterpriseService.listIntegrationRegistryEntries();
  }

  @Get("integrations/registry/:id")
  @Permissions("enterprise.read")
  getIntegrationRegistryEntry(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationRegistryEntry(id);
  }

  @Get("integrations/registry/:id/developer-package")
  @Permissions("enterprise.read")
  getDeveloperPackage(@Param("id") id: string) {
    return this.enterpriseService.getDeveloperPackage(id);
  }

  @Get("integrations/registry/:id/developer-docs")
  @Permissions("enterprise.read")
  getDeveloperDocs(@Param("id") id: string) {
    return this.enterpriseService.getDeveloperDocs(id);
  }

  @Get("integrations/registry/:id/publication-readiness")
  @Permissions("enterprise.read")
  getIntegrationPublicationReadiness(
    @Param("id") id: string,
    @Query("visibility") visibility?: string,
    @Query("channel") channel?: string,
    @Query("signingKey") signingKey?: string
  ) {
    return this.enterpriseService.getIntegrationPublicationReadiness(id, {
      visibility,
      channel,
      signingKey
    });
  }

  @Get("integrations/registry/:id/activation-readiness")
  @Permissions("enterprise.read")
  getIntegrationRegistryActivationReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationRegistryActivationReadiness(id);
  }

  @Get("publications")
  @Public()
  listPublicIntegrationPublications(
    @Query("connectorKey") connectorKey?: string,
    @Query("channel") channel?: string
  ) {
    return this.enterpriseService.listPublicIntegrationPublications({ connectorKey, channel });
  }

  @Get("publications/:connectorKey/:version")
  @Public()
  getPublicIntegrationPublication(
    @Param("connectorKey") connectorKey: string,
    @Param("version") version: string,
    @Query("channel") channel?: string,
    @Query("consumerKey") consumerKey?: string,
    @Query("grantToken") grantToken?: string
  ) {
    return this.enterpriseService.getPublicIntegrationPublication(
      connectorKey,
      version,
      channel,
      grantToken,
      consumerKey
    );
  }

  @Get("publications/:connectorKey/:version/package")
  @Public()
  getPublicIntegrationPublicationPackage(
    @Param("connectorKey") connectorKey: string,
    @Param("version") version: string,
    @Query("channel") channel?: string,
    @Query("consumerKey") consumerKey?: string,
    @Query("grantToken") grantToken?: string
  ) {
    return this.enterpriseService.getPublicIntegrationPublicationPackage(
      connectorKey,
      version,
      channel,
      consumerKey,
      grantToken
    );
  }

  @Get("publications/:connectorKey/:version/docs")
  @Public()
  getPublicIntegrationPublicationDocs(
    @Param("connectorKey") connectorKey: string,
    @Param("version") version: string,
    @Query("channel") channel?: string,
    @Query("consumerKey") consumerKey?: string,
    @Query("grantToken") grantToken?: string
  ) {
    return this.enterpriseService.getPublicIntegrationPublicationDocs(
      connectorKey,
      version,
      channel,
      consumerKey,
      grantToken
    );
  }

  @Post("publications/:connectorKey/:version/access-requests")
  @Public()
  createPublicIntegrationDistributionRequest(
    @Param("connectorKey") connectorKey: string,
    @Param("version") version: string,
    @Body() body: JsonRecord
  ) {
    return this.enterpriseService.createPublicIntegrationDistributionRequest(connectorKey, version, body);
  }

  @Post("integrations/registry/:id/publish")
  @Permissions("enterprise.write")
  publishIntegrationRegistryEntry(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.publishIntegrationRegistryEntry(resolveContext(request), id, body);
  }

  @Post("integrations/registry/:id/activation-requests")
  @Permissions("enterprise.write")
  createIntegrationActivationRequestFromRegistry(
    @Req() request: any,
    @Param("id") id: string,
    @Body() body: JsonRecord
  ) {
    return this.enterpriseService.createInventoryActivationRequest(resolveContext(request), {
      ...body,
      registryEntryId: id
    });
  }

  @Patch("integrations/registry/:id")
  @Permissions("enterprise.write")
  updateIntegrationRegistryEntry(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateIntegrationRegistryEntry(id, body);
  }

  @Post("integrations/registry/:id/archive")
  @Permissions("enterprise.write")
  archiveIntegrationRegistryEntry(@Param("id") id: string) {
    return this.enterpriseService.archiveIntegrationRegistryEntry(id);
  }

  @Post("integrations/registry/:id/status")
  @Permissions("enterprise.write")
  updateIntegrationRegistryEntryStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateIntegrationRegistryEntryStatus(id, body);
  }

  @Post("integrations/registry")
  @Permissions("enterprise.write")
  createRegistryEntry(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createRegistryEntry(resolveContext(request), body);
  }

  @Get("integrations/publications")
  @Permissions("enterprise.read")
  listIntegrationPublications() {
    return this.enterpriseService.listIntegrationPublications();
  }

  @Get("integrations/publications/distribution-overview")
  @Permissions("enterprise.read")
  getIntegrationDistributionOverview(
    @Query("tenantId") tenantId?: string,
    @Query("organizationId") organizationId?: string
  ) {
    return this.enterpriseService.getIntegrationDistributionOverview({ tenantId, organizationId });
  }

  @Get("integrations/publications/:id")
  @Permissions("enterprise.read")
  getIntegrationPublication(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationPublication(id);
  }

  @Get("integrations/publications/:id/package")
  @Permissions("enterprise.read")
  getIntegrationPublicationPackage(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationPublicationPackage(id);
  }

  @Get("integrations/publications/:id/docs")
  @Permissions("enterprise.read")
  getIntegrationPublicationDocs(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationPublicationDocs(id);
  }

  @Get("integrations/publications/:id/events")
  @Permissions("enterprise.read")
  listIntegrationPublicationEvents(@Param("id") id: string) {
    return this.enterpriseService.listIntegrationPublicationEvents(id);
  }

  @Get("integrations/publications/:id/access-requests")
  @Permissions("enterprise.read")
  listIntegrationDistributionRequests(@Param("id") id: string) {
    return this.enterpriseService.listIntegrationDistributionRequests(id);
  }

  @Get("integrations/publications/:id/activation-requests")
  @Permissions("enterprise.read")
  listIntegrationActivationRequests(@Param("id") id: string) {
    return this.enterpriseService.listIntegrationActivationRequests(id);
  }

  @Post("integrations/publications/:id/activation-requests")
  @Permissions("enterprise.write")
  createIntegrationActivationRequest(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.createIntegrationActivationRequest(resolveContext(request), id, body);
  }

  @Get("integrations/publications/:id/analytics")
  @Permissions("enterprise.read")
  getIntegrationPublicationAnalytics(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationPublicationAnalytics(id);
  }

  @Get("integrations/publications/:id/signing-readiness")
  @Permissions("enterprise.read")
  getIntegrationPublicationSigningReadiness(
    @Param("id") id: string,
    @Query("signingKey") signingKey?: string
  ) {
    return this.enterpriseService.getIntegrationPublicationSigningReadiness(id, { signingKey });
  }

  @Get("integrations/publications/:id/lifecycle-readiness")
  @Permissions("enterprise.read")
  getIntegrationPublicationLifecycleReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationPublicationLifecycleReadiness(id);
  }

  @Post("integrations/publications/:id/events")
  @Permissions("enterprise.write")
  recordIntegrationPublicationEvent(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.recordIntegrationPublicationEvent(id, body);
  }

  @Post("integrations/publications/:id/status")
  @Permissions("enterprise.write")
  updateIntegrationPublicationStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateIntegrationPublicationStatus(id, body);
  }

  @Post("integrations/publications/:id/re-sign")
  @Permissions("enterprise.write")
  reSignIntegrationPublication(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.reSignIntegrationPublication(resolveContext(request), id, body);
  }

  @Post("integrations/distribution-requests/:id/status")
  @Permissions("enterprise.write")
  updateIntegrationDistributionRequestStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateIntegrationDistributionRequestStatus(id, body);
  }

  @Get("integrations/activation-requests/:id/readiness")
  @Permissions("enterprise.read")
  getIntegrationActivationRequestReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationActivationRequestReadiness(id);
  }

  @Get("integrations/activation-requests/:id/install-readiness")
  @Permissions("enterprise.read")
  getIntegrationActivationInstallReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationActivationInstallReadiness(id);
  }

  @Get("integrations/activation-requests/:id/install-runtime")
  @Permissions("enterprise.read")
  getIntegrationActivationInstallPackage(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationActivationInstallPackage(id);
  }

  @Get("integrations/activation-requests/:id/runtime-rollout-readiness")
  @Permissions("enterprise.read")
  getIntegrationRuntimeRolloutReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationRuntimeRolloutReadiness(id);
  }

  @Post("integrations/activation-requests/:id/status")
  @Permissions("enterprise.write")
  updateIntegrationActivationRequestStatus(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateIntegrationActivationRequestStatus(id, body);
  }

  @Post("integrations/activation-requests/:id/apply")
  @Permissions("enterprise.write")
  applyIntegrationActivationRequest(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.applyIntegrationActivationRequest(resolveContext(request), id, body);
  }

  @Post("integrations/activation-requests/:id/apply-activation")
  @Permissions("enterprise.write")
  applyIntegrationActivationRequestAlias(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.applyIntegrationActivationRequest(resolveContext(request), id, body);
  }

  @Post("integrations/activation-requests/:id/install-runtime")
  @Permissions("enterprise.write")
  installIntegrationActivationRuntime(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.installIntegrationActivationRuntime(resolveContext(request), id, body);
  }

  @Post("integrations/activation-requests/:id/install")
  @Permissions("enterprise.write")
  installIntegrationActivationRuntimeAlias(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.installIntegrationActivationRuntime(resolveContext(request), id, body);
  }

  @Post("integrations/activation-requests/:id/reconcile-runtime-rollout")
  @Permissions("enterprise.write")
  reconcileIntegrationRuntimeRollout(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.reconcileIntegrationRuntimeRollout(resolveContext(request), id, body);
  }

  @Post("integrations/activation-requests/:id/apply-runtime-governance")
  @Permissions("enterprise.write")
  applyIntegrationRuntimeRolloutGovernance(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.applyIntegrationRuntimeRolloutGovernance(resolveContext(request), id, body);
  }

  @Get("integrations/activation-requests/:id/package")
  @Permissions("enterprise.read")
  getIntegrationActivationRequestPackage(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationActivationRequestPackage(id);
  }

  @Get("inventory/activation-requests")
  @Permissions("enterprise.read")
  listInventoryActivationRequests(
    @Query("tenantId") tenantId?: string,
    @Query("organizationId") organizationId?: string
  ) {
    return this.enterpriseService.listInventoryActivationRequests({ tenantId, organizationId }).then((items) => ({
      items,
      total: items.length
    }));
  }

  @Get("inventory/provider-runtime-policies")
  @Permissions("enterprise.read")
  listInventoryProviderRuntimePolicies() {
    return this.enterpriseService.listInventoryProviderRuntimePolicies();
  }

  @Post("inventory/activation-requests")
  @Permissions("enterprise.write")
  createInventoryActivationRequest(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createInventoryActivationRequest(resolveContext(request), body);
  }

  @Get("inventory/activation-requests/:id/readiness")
  @Permissions("enterprise.read")
  getInventoryActivationRequestReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationActivationRequestReadiness(id);
  }

  @Get("inventory/activation-requests/:id/install-readiness")
  @Permissions("enterprise.read")
  getInventoryActivationInstallReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationActivationInstallReadiness(id);
  }

  @Get("inventory/activation-requests/:id/install-runtime")
  @Permissions("enterprise.read")
  getInventoryActivationInstallPackage(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationActivationInstallPackage(id);
  }

  @Get("inventory/activation-requests/:id/runtime-rollout-readiness")
  @Permissions("enterprise.read")
  getInventoryRuntimeRolloutReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationRuntimeRolloutReadiness(id);
  }

  @Get("inventory/activation-requests/:id/execution-policy")
  @Permissions("enterprise.read")
  getInventoryExecutionPolicy(@Param("id") id: string) {
    return this.enterpriseService.getInventoryActivationExecutionPolicy(id);
  }

  @Post("inventory/activation-requests/:id/apply")
  @Permissions("enterprise.write")
  applyInventoryActivationRequest(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.applyIntegrationActivationRequest(resolveContext(request), id, body);
  }

  @Post("inventory/activation-requests/:id/install-runtime")
  @Permissions("enterprise.write")
  installInventoryActivationRuntime(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.installIntegrationActivationRuntime(resolveContext(request), id, body);
  }

  @Post("inventory/activation-requests/:id/install")
  @Permissions("enterprise.write")
  installInventoryActivationRuntimeAlias(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.installIntegrationActivationRuntime(resolveContext(request), id, body);
  }

  @Post("inventory/activation-requests/:id/reconcile-runtime-rollout")
  @Permissions("enterprise.write")
  reconcileInventoryRuntimeRollout(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.reconcileIntegrationRuntimeRollout(resolveContext(request), id, body);
  }

  @Post("inventory/activation-requests/:id/apply-execution-policy")
  @Permissions("enterprise.write")
  applyInventoryExecutionPolicy(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.applyInventoryExecutionPolicy(resolveContext(request), id, body);
  }

  @Post("inventory/activation-requests/:id/apply-runtime-governance")
  @Permissions("enterprise.write")
  applyInventoryRuntimeRolloutGovernance(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.applyIntegrationRuntimeRolloutGovernance(resolveContext(request), id, body);
  }

  @Get("integrations/distribution-requests/:id/governance-readiness")
  @Permissions("enterprise.read")
  getIntegrationDistributionRequestGovernanceReadiness(@Param("id") id: string) {
    return this.enterpriseService.getIntegrationDistributionRequestGovernanceReadiness(id);
  }

  @Post("integrations/distribution-requests/:id/apply-governance")
  @Permissions("enterprise.write")
  applyIntegrationDistributionRequestGovernance(
    @Req() request: any,
    @Param("id") id: string,
    @Body() body: JsonRecord
  ) {
    return this.enterpriseService.applyIntegrationDistributionRequestGovernance(
      resolveContext(request),
      id,
      body
    );
  }

  @Post("integrations/distribution-requests/governance-sweep")
  @Permissions("enterprise.write")
  runIntegrationDistributionRequestGovernanceSweep(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.runIntegrationDistributionRequestGovernanceSweep(
      resolveContext(request),
      body
    );
  }

  @Post("integrations/publications/:id/apply-lifecycle")
  @Permissions("enterprise.write")
  applyIntegrationPublicationLifecycle(@Req() request: any, @Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.applyIntegrationPublicationLifecycle(resolveContext(request), id, body);
  }

  @Post("integrations/publications/lifecycle-sweep")
  @Permissions("enterprise.write")
  runIntegrationPublicationLifecycleSweep(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.runIntegrationPublicationLifecycleSweep(resolveContext(request), body);
  }

  @Get("integrations/connector-templates")
  @Permissions("enterprise.read")
  listConnectorTemplates() {
    return this.enterpriseService.listConnectorTemplates();
  }

  @Get("integrations/connector-templates/:id")
  @Permissions("enterprise.read")
  getConnectorTemplate(@Param("id") id: string) {
    return this.enterpriseService.getConnectorTemplate(id);
  }

  @Patch("integrations/connector-templates/:id")
  @Permissions("enterprise.write")
  updateConnectorTemplate(@Param("id") id: string, @Body() body: JsonRecord) {
    return this.enterpriseService.updateConnectorTemplate(id, body);
  }

  @Post("integrations/connector-templates/:id/archive")
  @Permissions("enterprise.write")
  archiveConnectorTemplate(@Param("id") id: string) {
    return this.enterpriseService.archiveConnectorTemplate(id);
  }

  @Post("integrations/connector-templates")
  @Permissions("enterprise.write")
  createConnectorTemplate(@Req() request: any, @Body() body: JsonRecord) {
    return this.enterpriseService.createConnectorTemplate(resolveContext(request), body);
  }
}
