export let shouldResetEnterpriseState = false;

export const ENTERPRISE_RESET_STATEMENTS: string[] = [
  `DELETE FROM "integration_activation_requests"`,
  `DELETE FROM "integration_distribution_requests"`,
  `DELETE FROM "integration_publication_events"`,
  `DELETE FROM "integration_publications"`,
  `DELETE FROM "ConnectorTemplate"`,
  `DELETE FROM "IntegrationRegistryEntry"`,
  `DELETE FROM "PartnerSdkContract"`,
  `DELETE FROM "DeploymentVariant"`,
  `DELETE FROM "SecretRegistryEntry"`,
  `DELETE FROM "ComplianceEvidenceArtifact"`,
  `DELETE FROM "CompliancePack"`,
  `DELETE FROM "AuditExportJob"`,
  `DELETE FROM "AdvancedRolePolicy"`,
  `DELETE FROM "FederatedIdentityLink"`,
  `DELETE FROM "EnterpriseIdentityProvider"`,
  `DELETE FROM "EnterpriseTrialGrant"`,
  `DELETE FROM "EnterpriseQuotaCounter"`,
  `DELETE FROM "EnterpriseEntitlementGrant"`,
  `DELETE FROM "EnterpriseInvoice"`,
  `DELETE FROM "EnterpriseSubscription"`,
  `DELETE FROM "EnterpriseBillingAccount"`,
  `DELETE FROM "EnterpriseBillingPlan"`,
  `DELETE FROM "TenantSetting" WHERE "key" = 'billing.state'`
];

export function resetEnterpriseState(): void {
  shouldResetEnterpriseState = true;
}

export function consumeEnterpriseResetState(): boolean {
  if (!shouldResetEnterpriseState) {
    return false;
  }

  shouldResetEnterpriseState = false;
  return true;
}
