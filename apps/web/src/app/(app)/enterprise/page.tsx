"use client";

import type { BillingOverviewDto, BillingPlanDto, SubscriptionDto, InvoiceDto, EnterpriseIdentityProviderDto, FederatedIdentityLinkDto, AdvancedRolePolicyDto, AuditExportJobDto, CompliancePackDto, SecretRegistryEntryDto, DeploymentVariantDto, IntegrationRegistryEntryDto, ConnectorTemplateDto, PartnerSdkContractDto, EnterpriseOperationsOverviewDto, EnterpriseDeveloperPackageDto, EnterpriseDeveloperDocsDto, IntegrationPublicationDto, IntegrationPublicationEventDto, IntegrationPublicationReadinessDto, IntegrationPublicationAnalyticsDto, IntegrationPublicationSigningReadinessDto, IntegrationPublicationLifecycleReadinessDto, IntegrationPublicationLifecycleSweepDto, IntegrationDistributionRequestDto, IntegrationDistributionOverviewDto, IntegrationDistributionRequestGovernanceReadinessDto, IntegrationActivationInstallReadinessDto, IntegrationActivationRuntimeRolloutReadinessDto, InventorySupplierProviderRuntimePolicyDto } from "@exetron/contracts";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl } from "../../../lib/api";

type JsonRecord = Record<string, unknown>;
type ListResponse<T> = { items?: T[]; total?: number };
type OnboardingChecklistItem = { label?: string; status?: string; url?: string; note?: string; message?: string; details?: JsonRecord };
type EnterpriseDistributionRequestOnboardingReadinessDto = {
  requestId?: string;
  connectorKey?: string;
  version?: string;
  status?: string;
  canIssueOnboarding?: boolean;
  canIssue?: boolean;
  checks?: Array<OnboardingChecklistItem | string>;
  blockingIssues?: string[];
  warnings?: string[];
  publication?: { visibility?: string; status?: string; channel?: string };
  grant?: { consumerKey?: string; expiresAt?: string; revokedAt?: string | null; tokenPreview?: string };
  urls?: { packageUrl?: string; docsUrl?: string; onboardingPackageUrl?: string; accessRequestUrl?: string };
  summary?: JsonRecord;
};
type EnterpriseDistributionRequestOnboardingPackageDto = {
  requestId?: string;
  connectorKey?: string;
  version?: string;
  issuedAt?: string;
  grantToken?: string;
  grantBinding?: { consumerKey?: string; expiresAt?: string; revokedAt?: string | null; channel?: string };
  urls?: { packageUrl?: string; docsUrl?: string; publicUrl?: string; accessUrl?: string };
  checklist?: Array<OnboardingChecklistItem | string>;
  summary?: JsonRecord;
  package?: JsonRecord;
  docs?: JsonRecord;
};

type EnterpriseInventoryConnectorActivationRequestDto = {
  id?: string;
  connectorKey?: string;
  version?: string;
  status?: string;
  targetTenantId?: string | null;
  targetStoreId?: string | null;
  activationReadiness?: JsonRecord | null;
  readiness?: JsonRecord | null;
  checks?: Array<Record<string, unknown> | string>;
  blockingIssues?: string[];
  warnings?: string[];
  publication?: JsonRecord | null;
  notes?: string | null;
  requestedAt?: string | null;
  appliedAt?: string | null;
  updatedAt?: string | null;
  connector?: JsonRecord | null;
  activation?: JsonRecord | null;
  runtimeInstall?: JsonRecord | null;
  runtimeRollout?: IntegrationActivationRuntimeRolloutReadinessDto | null;
  providerPolicy?: {
    key?: string | null;
    name?: string | null;
    riskLevel?: string | null;
    executionModel?: string | null;
    preferredRetryExecution?: string | null;
  } | null;
  providerCompatibility?: {
    status?: string | null;
    blockingIssues?: string[];
    warnings?: string[];
    checks?: Array<{ code?: string; status?: string; message?: string }>;
  } | null;
};

type EnterpriseInventoryConnectorActivationReadinessDto = IntegrationActivationInstallReadinessDto;
type EnterpriseInventoryConnectorRuntimeRolloutReadinessDto = IntegrationActivationRuntimeRolloutReadinessDto;

async function apiRequest<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    cache: "no-store"
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.message ?? `Request failed with ${response.status}`);
  return payload as T;
}

async function apiRequestOptional<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    cache: "no-store"
  });
  if (response.status === 404) {
    return null;
  }
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.message ?? `Request failed with ${response.status}`);
  return payload as T;
}

function pretty(value: unknown) { return JSON.stringify(value, null, 2); }
function parseObjectJson(value: string): JsonRecord { if (!value.trim()) return {}; const parsed = JSON.parse(value) as unknown; if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object."); return parsed as JsonRecord; }
function parseArrayJson(value: string): Array<Record<string, unknown>> { if (!value.trim()) return []; const parsed = JSON.parse(value) as unknown; if (!Array.isArray(parsed)) throw new Error("Expected a JSON array."); return parsed as Array<Record<string, unknown>>; }
function detailRow(label: string, value: unknown) { return <div><strong>{label}</strong><span className="inline-code">{typeof value === "string" ? value : pretty(value)}</span></div>; }
function statusClass(status?: string) { return `status-chip status-${String(status ?? "active").toLowerCase()}`; }
function asRecord(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}; }
function activationInstallRuntime(item: EnterpriseInventoryConnectorActivationRequestDto) {
  const runtimeInstall = asRecord(item.runtimeInstall);
  if (Object.keys(runtimeInstall).length > 0) {
    return String(runtimeInstall.installMode ?? runtimeInstall.runtimeStatus ?? item.status ?? "n/a");
  }
  const activation = asRecord(item.activation);
  return String(activation.activationState ?? activation.activationStatus ?? activation.status ?? item.status ?? "n/a");
}
function activationInstallSource(item: EnterpriseInventoryConnectorActivationRequestDto) {
  const runtimeInstall = asRecord(item.runtimeInstall);
  if (Object.keys(runtimeInstall).length > 0) {
    return String(
      runtimeInstall.source ??
        runtimeInstall.connectorTemplateVersion ??
        runtimeInstall.installedRegistryEntryId ??
        item.id ??
        "manual"
    );
  }
  const activation = asRecord(item.activation);
  return String(activation.activationPublicationId ?? activation.activationRequestId ?? activation.publicationId ?? activation.requestId ?? item.id ?? "manual");
}
function activationInstallReadiness(readiness: EnterpriseInventoryConnectorActivationReadinessDto | JsonRecord | null | undefined) {
  if (!readiness) {
    return "n/a";
  }
  const record = asRecord(readiness);
  const status = String(record.status ?? record.readiness ?? "n/a").trim().toUpperCase();
  const canApply =
    typeof record.canInstall === "boolean"
      ? record.canInstall
      : typeof record.canApplyActivation === "boolean"
        ? record.canApplyActivation
        : typeof record.canApply === "boolean"
        ? record.canApply
        : null;
  return canApply === null ? status : `${status} · ${canApply ? "ready" : "blocked"}`;
}
function resolveActivationRuntimeRollout(
  item: EnterpriseInventoryConnectorActivationRequestDto,
  installReadiness?: EnterpriseInventoryConnectorActivationReadinessDto | null,
  rolloutReadiness?: EnterpriseInventoryConnectorRuntimeRolloutReadinessDto | null
) {
  const rollout = rolloutReadiness ?? item.runtimeRollout ?? null;
  const rolloutRecord = rollout?.runtimeRollout ?? installReadiness?.runtimeRollout ?? null;
  return { rollout, rolloutRecord };
}
function activationRolloutGovernance(
  item: EnterpriseInventoryConnectorActivationRequestDto,
  installReadiness?: EnterpriseInventoryConnectorActivationReadinessDto | null,
  rolloutReadiness?: EnterpriseInventoryConnectorRuntimeRolloutReadinessDto | null
) {
  const { rollout, rolloutRecord } = resolveActivationRuntimeRollout(item, installReadiness, rolloutReadiness);
  const health = String(
    rolloutRecord?.governanceStatus ??
      rollout?.status ??
      installReadiness?.status ??
      item.status ??
      "n/a"
  )
    .trim()
    .toUpperCase();
  const drift = String(rolloutRecord?.driftStatus ?? "UNKNOWN").trim().toUpperCase();
  const driftSummary = [drift];
  if ((rollout?.blockingIssues?.length ?? 0) > 0) {
    driftSummary.push(`blocking:${rollout?.blockingIssues.length ?? 0}`);
  }
  if ((rollout?.warnings?.length ?? 0) > 0) {
    driftSummary.push(`warnings:${rollout?.warnings.length ?? 0}`);
  }
  const action =
    drift === "DRIFTED" && rollout?.canReconcile
      ? "Reconcile runtime"
      : health === "BLOCKED" && rollout?.canApplyGovernance
        ? "Apply governance"
        : rollout?.canApplyGovernance
          ? "Refresh rollout"
          : "Install runtime first";
  return {
    health: health || "n/a",
    drift: driftSummary.join(" · "),
    action
  };
}
function resolveProviderRuntimePolicySnapshot(
  item: EnterpriseInventoryConnectorActivationRequestDto,
  installReadiness?: EnterpriseInventoryConnectorActivationReadinessDto | null,
  rolloutReadiness?: EnterpriseInventoryConnectorRuntimeRolloutReadinessDto | null
) {
  const readiness = installReadiness ?? item.activationReadiness ?? item.readiness ?? null;
  const providerPolicy =
    rolloutReadiness?.providerPolicy ??
    installReadiness?.providerPolicy ??
    item.providerPolicy ??
    null;
  const providerCompatibility =
    rolloutReadiness?.providerCompatibility ??
    installReadiness?.providerCompatibility ??
    item.providerCompatibility ??
    null;
  return { readiness, providerPolicy, providerCompatibility };
}
function providerRuntimePolicyCompatibility(
  item: EnterpriseInventoryConnectorActivationRequestDto,
  installReadiness?: EnterpriseInventoryConnectorActivationReadinessDto | null,
  rolloutReadiness?: EnterpriseInventoryConnectorRuntimeRolloutReadinessDto | null
) {
  const { readiness, providerPolicy, providerCompatibility } = resolveProviderRuntimePolicySnapshot(
    item,
    installReadiness,
    rolloutReadiness
  );
  const health = String(providerCompatibility?.status ?? readiness?.status ?? item.status ?? "n/a")
    .trim()
    .toUpperCase();
  const compatibility = providerPolicy?.key
    ? `${providerPolicy.key}${providerPolicy.riskLevel ? ` · ${String(providerPolicy.riskLevel).toUpperCase()}` : ""}`
    : "GENERIC";
  const readinessState = String(
    readiness?.status ??
      providerCompatibility?.status ??
      item.status ??
      "n/a"
  )
    .trim()
    .toUpperCase();
  return { health, compatibility, readiness: readinessState };
}

export default function EnterprisePage() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [tenantId, setTenantId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [overview, setOverview] = useState<BillingOverviewDto | null>(null);
  const [operationsOverview, setOperationsOverview] = useState<EnterpriseOperationsOverviewDto | null>(null);
  const [plans, setPlans] = useState<BillingPlanDto[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [identityProviders, setIdentityProviders] = useState<EnterpriseIdentityProviderDto[]>([]);
  const [federatedLinks, setFederatedLinks] = useState<FederatedIdentityLinkDto[]>([]);
  const [rolePolicies, setRolePolicies] = useState<AdvancedRolePolicyDto[]>([]);
  const [auditExports, setAuditExports] = useState<AuditExportJobDto[]>([]);
  const [compliancePacks, setCompliancePacks] = useState<CompliancePackDto[]>([]);
  const [secretEntries, setSecretEntries] = useState<SecretRegistryEntryDto[]>([]);
  const [deploymentVariants, setDeploymentVariants] = useState<DeploymentVariantDto[]>([]);
  const [registryEntries, setRegistryEntries] = useState<IntegrationRegistryEntryDto[]>([]);
  const [connectorTemplates, setConnectorTemplates] = useState<ConnectorTemplateDto[]>([]);
  const [partnerContracts, setPartnerContracts] = useState<PartnerSdkContractDto[]>([]);
  const [publications, setPublications] = useState<IntegrationPublicationDto[]>([]);
  const [publicationEvents, setPublicationEvents] = useState<IntegrationPublicationEventDto[]>([]);
  const [publicationReadiness, setPublicationReadiness] = useState<IntegrationPublicationReadinessDto | null>(null);
  const [publicationAnalytics, setPublicationAnalytics] = useState<IntegrationPublicationAnalyticsDto | null>(null);
  const [distributionOverview, setDistributionOverview] = useState<IntegrationDistributionOverviewDto | null>(null);
  const [publicationSigningReadiness, setPublicationSigningReadiness] = useState<IntegrationPublicationSigningReadinessDto | null>(null);
  const [publicationLifecycleReadiness, setPublicationLifecycleReadiness] = useState<IntegrationPublicationLifecycleReadinessDto | null>(null);
  const [distributionRequests, setDistributionRequests] = useState<IntegrationDistributionRequestDto[]>([]);
  const [distributionGovernanceReadiness, setDistributionGovernanceReadiness] = useState<Record<string, IntegrationDistributionRequestGovernanceReadinessDto>>({});
  const [distributionOnboardingReadiness, setDistributionOnboardingReadiness] = useState<Record<string, EnterpriseDistributionRequestOnboardingReadinessDto>>({});
  const [distributionOnboardingPackages, setDistributionOnboardingPackages] = useState<Record<string, EnterpriseDistributionRequestOnboardingPackageDto>>({});
  const [activationRequests, setActivationRequests] = useState<EnterpriseInventoryConnectorActivationRequestDto[]>([]);
  const [activationReadiness, setActivationReadiness] = useState<Record<string, EnterpriseInventoryConnectorActivationReadinessDto>>({});
  const [activationRuntimeRolloutReadiness, setActivationRuntimeRolloutReadiness] = useState<Record<string, EnterpriseInventoryConnectorRuntimeRolloutReadinessDto>>({});
  const [providerRuntimePolicies, setProviderRuntimePolicies] = useState<InventorySupplierProviderRuntimePolicyDto[]>([]);
  const [developerPackage, setDeveloperPackage] = useState<EnterpriseDeveloperPackageDto | null>(null);
  const [developerDocs, setDeveloperDocs] = useState<EnterpriseDeveloperDocsDto | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedIdentityProviderId, setSelectedIdentityProviderId] = useState("");
  const [selectedFederatedLinkId, setSelectedFederatedLinkId] = useState("");
  const [selectedRolePolicyId, setSelectedRolePolicyId] = useState("");
  const [selectedAuditExportId, setSelectedAuditExportId] = useState("");
  const [selectedCompliancePackId, setSelectedCompliancePackId] = useState("");
  const [selectedSecretEntryId, setSelectedSecretEntryId] = useState("");
  const [selectedDeploymentVariantId, setSelectedDeploymentVariantId] = useState("");
  const [selectedRegistryEntryId, setSelectedRegistryEntryId] = useState("");
  const [selectedPublicationId, setSelectedPublicationId] = useState("");
  const [selectedDistributionRequestId, setSelectedDistributionRequestId] = useState("");
  const [selectedActivationRequestId, setSelectedActivationRequestId] = useState("");
  const [selectedConnectorTemplateId, setSelectedConnectorTemplateId] = useState("");
  const [selectedPartnerContractId, setSelectedPartnerContractId] = useState("");
  const [planDraft, setPlanDraft] = useState({ code: "pro", name: "Pro", status: "ACTIVE", priceAmount: "99.00", currency: "RUB", intervalKey: "MONTHLY", entitlements: '{\n  "maxStores": 10\n}', quotas: '{\n  "apiCallsPerMonth": 50000\n}', metadata: "{}" });
  const [subscriptionDraft, setSubscriptionDraft] = useState({ planId: "", status: "TRIAL", metadata: "{}" });
  const [invoiceDraft, setInvoiceDraft] = useState({ billingAccountId: "", subscriptionId: "", number: "", status: "ISSUED", currency: "RUB", subtotalAmount: "99.00", totalAmount: "99.00", dueAt: "", lines: '[{\n  "label": "Subscription",\n  "amount": "99.00"\n}]', metadata: "{}" });
  const [idpDraft, setIdpDraft] = useState({ code: "google-workspace", type: "OIDC", status: "ACTIVE", config: '{\n  "issuer": "https://accounts.google.com"\n}' });
  const [federatedLinkDraft, setFederatedLinkDraft] = useState({ userId: "", externalSubject: "", email: "" });
  const [rolePolicyDraft, setRolePolicyDraft] = useState({ key: "rollout-precedence", rules: '{\n  "mode": "template-first"\n}' });
  const [auditExportDraft, setAuditExportDraft] = useState({ status: "PENDING", filter: '{\n  "source": "admin-console"\n}' });
  const [compliancePackDraft, setCompliancePackDraft] = useState({ code: "gdpr-core", name: "GDPR Core", status: "ACTIVE", controls: '{\n  "retention": "30d"\n}' });
  const [secretDraft, setSecretDraft] = useState({ scopeType: "TENANT", scopeId: "", key: "stripe-secret", value: "", metadata: "{}" });
  const [deploymentVariantDraft, setDeploymentVariantDraft] = useState({ code: "prod-us", name: "Production US", status: "ACTIVE", config: '{\n  "region": "us-central"\n}' });
  const [registryDraft, setRegistryDraft] = useState({ connectorKey: "pos-terminal", version: "1.0.0", status: "ACTIVE", manifest: '{\n  "supported": true\n}' });
  const [connectorTemplateDraft, setConnectorTemplateDraft] = useState({ connectorKey: "pos-terminal", version: "1.0.0", manifest: '{\n  "fields": []\n}' });
  const [partnerContractDraft, setPartnerContractDraft] = useState({ partnerAccountId: "", key: "pos-terminal", version: "1.0.0", status: "ACTIVE", schema: '{\n  "fields": []\n}' });
  const [activationDraft, setActivationDraft] = useState({
    connectorKey: "",
    version: "",
    targetTenantId: "",
    targetStoreId: "",
    status: "PENDING",
    notes: "",
    metadata: "{}"
  });

  const effectiveTenantId = session?.me?.claims.tenantId ?? tenantId.trim();
  const effectiveOrganizationId = organizationId.trim();
  const selectedPlan = plans.find((item) => item.id === selectedPlanId) ?? null;
  const selectedSubscription = subscriptions.find((item) => item.id === selectedSubscriptionId) ?? null;
  const selectedInvoice = invoices.find((item) => item.id === selectedInvoiceId) ?? null;
  const selectedIdentityProvider = identityProviders.find((item) => item.id === selectedIdentityProviderId) ?? null;
  const selectedFederatedLink = federatedLinks.find((item) => item.id === selectedFederatedLinkId) ?? null;
  const selectedRolePolicy = rolePolicies.find((item) => item.id === selectedRolePolicyId) ?? null;
  const selectedAuditExport = auditExports.find((item) => item.id === selectedAuditExportId) ?? null;
  const selectedCompliancePack = compliancePacks.find((item) => item.id === selectedCompliancePackId) ?? null;
  const selectedSecretEntry = secretEntries.find((item) => item.id === selectedSecretEntryId) ?? null;
  const selectedDeploymentVariant = deploymentVariants.find((item) => item.id === selectedDeploymentVariantId) ?? null;
  const selectedRegistryEntry = registryEntries.find((item) => item.id === selectedRegistryEntryId) ?? null;
  const selectedPublication = publications.find((item) => item.id === selectedPublicationId) ?? null;
  const selectedDistributionRequest = distributionRequests.find((item) => item.id === selectedDistributionRequestId) ?? null;
  const selectedDistributionRequestOnboardingReadiness = selectedDistributionRequestId ? distributionOnboardingReadiness[selectedDistributionRequestId] ?? null : null;
  const selectedDistributionRequestOnboardingPackage = selectedDistributionRequestId ? distributionOnboardingPackages[selectedDistributionRequestId] ?? null : null;
  const selectedActivationRequest = activationRequests.find((item) => item.id === selectedActivationRequestId) ?? null;
  const selectedActivationReadiness = selectedActivationRequestId ? activationReadiness[selectedActivationRequestId] ?? null : null;
  const selectedActivationRuntimeRolloutReadiness = selectedActivationRequestId ? activationRuntimeRolloutReadiness[selectedActivationRequestId] ?? null : null;
  const selectedConnectorTemplate = connectorTemplates.find((item) => item.id === selectedConnectorTemplateId) ?? null;
  const selectedPartnerContract = partnerContracts.find((item) => item.id === selectedPartnerContractId) ?? null;

  const loadFederatedLinks = useCallback(async (identityProviderId: string) => {
    if (!token || !identityProviderId) { setFederatedLinks([]); return; }
    const response = await apiRequest<ListResponse<FederatedIdentityLinkDto>>(`/enterprise/integrations/identity-providers/${identityProviderId}/federated-links`, token);
    setFederatedLinks(response.items ?? []);
  }, [token]);

  const loadPublicationEvents = useCallback(async (publicationId: string) => {
    if (!token || !publicationId) { setPublicationEvents([]); return; }
    const response = await apiRequest<ListResponse<IntegrationPublicationEventDto>>(`/enterprise/integrations/publications/${publicationId}/events`, token);
    setPublicationEvents(response.items ?? []);
  }, [token]);

  const loadPublicationAnalytics = useCallback(async (publicationId: string) => {
    if (!token || !publicationId) { setPublicationAnalytics(null); return; }
    const response = await apiRequest<IntegrationPublicationAnalyticsDto>(`/enterprise/integrations/publications/${publicationId}/analytics`, token);
    setPublicationAnalytics(response);
  }, [token]);

  const loadPublicationSigningReadiness = useCallback(async (publicationId: string) => {
    if (!token || !publicationId) { setPublicationSigningReadiness(null); return; }
    const response = await apiRequest<IntegrationPublicationSigningReadinessDto>(`/enterprise/integrations/publications/${publicationId}/signing-readiness`, token);
    setPublicationSigningReadiness(response);
  }, [token]);

  const loadPublicationLifecycleReadiness = useCallback(async (publicationId: string) => {
    if (!token || !publicationId) { setPublicationLifecycleReadiness(null); return; }
    const response = await apiRequest<IntegrationPublicationLifecycleReadinessDto>(`/enterprise/integrations/publications/${publicationId}/lifecycle-readiness`, token);
    setPublicationLifecycleReadiness(response);
  }, [token]);

  const loadDistributionRequests = useCallback(async (publicationId: string) => {
    if (!token || !publicationId) { setDistributionRequests([]); setDistributionGovernanceReadiness({}); setDistributionOnboardingReadiness({}); return; }
    const response = await apiRequest<ListResponse<IntegrationDistributionRequestDto>>(`/enterprise/integrations/publications/${publicationId}/access-requests`, token);
    const items = response.items ?? [];
    setDistributionRequests(items);
    if (!items.length) {
      setDistributionGovernanceReadiness({});
      setDistributionOnboardingReadiness({});
      return;
    }
    const [governanceEntries, onboardingEntries] = await Promise.all([
      Promise.all(items.map(async (item) => [
        item.id,
        await apiRequest<IntegrationDistributionRequestGovernanceReadinessDto>(
          `/enterprise/integrations/distribution-requests/${item.id}/governance-readiness`,
          token
        )
      ] as const)),
      Promise.all(items.map(async (item) => [
        item.id,
        await apiRequest<EnterpriseDistributionRequestOnboardingReadinessDto>(
          `/enterprise/integrations/distribution-requests/${item.id}/onboarding-readiness`,
          token
        )
      ] as const))
    ]);
    setDistributionGovernanceReadiness(Object.fromEntries(governanceEntries));
    setDistributionOnboardingReadiness(Object.fromEntries(onboardingEntries));
  }, [token]);

  const loadDistributionRequestOnboardingPackage = useCallback(async (requestId: string) => {
    if (!token || !requestId) return;
    try {
      const response = await apiRequest<EnterpriseDistributionRequestOnboardingPackageDto>(`/enterprise/integrations/distribution-requests/${requestId}/onboarding-package`, token);
      setDistributionOnboardingPackages((current) => ({ ...current, [requestId]: response }));
    } catch {
      setDistributionOnboardingPackages((current) => {
        if (!(requestId in current)) return current;
        const next = { ...current };
        delete next[requestId];
        return next;
      });
    }
  }, [token]);

  const loadActivationInstallReadiness = useCallback(async (requestId: string) => {
    if (!token || !requestId) return null;
    const response = await apiRequestOptional<EnterpriseInventoryConnectorActivationReadinessDto>(
      `/enterprise/inventory/activation-requests/${requestId}/install-readiness`,
      token
    );
    setActivationReadiness((current) => {
      if (!response) {
        if (!(requestId in current)) return current;
        const next = { ...current };
        delete next[requestId];
        return next;
      }
      return { ...current, [requestId]: response };
    });
    return response;
  }, [token]);

  const loadActivationRuntimeRollout = useCallback(async (requestId: string) => {
    if (!token || !requestId) return null;
    const response = await apiRequestOptional<EnterpriseInventoryConnectorRuntimeRolloutReadinessDto>(
      `/enterprise/inventory/activation-requests/${requestId}/runtime-rollout-readiness`,
      token
    );
    setActivationRuntimeRolloutReadiness((current) => {
      if (!response) {
        if (!(requestId in current)) return current;
        const next = { ...current };
        delete next[requestId];
        return next;
      }
      return { ...current, [requestId]: response };
    });
    return response;
  }, [token]);

  const refreshWorkspace = useCallback(async () => {
    if (!token) return;
    try {
      const billingOverviewPromise = effectiveTenantId ? apiRequest<BillingOverviewDto>(`/enterprise/billing/overview?tenantId=${encodeURIComponent(effectiveTenantId)}`, token) : Promise.resolve(null);
      const overviewQuery = new URLSearchParams();
      if (effectiveTenantId) overviewQuery.set("tenantId", effectiveTenantId);
      if (effectiveOrganizationId) overviewQuery.set("organizationId", effectiveOrganizationId);
      const [overviewResult, operationsOverviewResult, plansResult, subscriptionsResult, invoicesResult, idpsResult, policiesResult, auditResult, packsResult, secretsResult, deploymentResult, registryResult, publicationResult, distributionOverviewResult, activationRequestsResult, templateResult, partnerResult, providerPolicyResult] = await Promise.all([
        billingOverviewPromise,
        apiRequest<EnterpriseOperationsOverviewDto>(`/enterprise/overview${overviewQuery.toString() ? `?${overviewQuery.toString()}` : ""}`, token),
        apiRequest<ListResponse<BillingPlanDto>>("/enterprise/billing/plans", token),
        apiRequest<ListResponse<SubscriptionDto>>("/enterprise/billing/subscriptions", token),
        apiRequest<ListResponse<InvoiceDto>>("/enterprise/billing/invoices", token),
        apiRequest<ListResponse<EnterpriseIdentityProviderDto>>("/enterprise/integrations/identity-providers", token),
        apiRequest<ListResponse<AdvancedRolePolicyDto>>("/enterprise/security/advanced-role-policies", token),
        apiRequest<ListResponse<AuditExportJobDto>>("/enterprise/audit/exports", token),
        apiRequest<ListResponse<CompliancePackDto>>("/enterprise/compliance/packs", token),
        apiRequest<ListResponse<SecretRegistryEntryDto>>("/enterprise/security/secrets", token),
        apiRequest<ListResponse<DeploymentVariantDto>>("/enterprise/deployment-variants", token),
        apiRequest<ListResponse<IntegrationRegistryEntryDto>>("/enterprise/integrations/registry", token),
        apiRequest<ListResponse<IntegrationPublicationDto>>("/enterprise/integrations/publications", token),
        apiRequest<IntegrationDistributionOverviewDto>(`/enterprise/integrations/publications/distribution-overview${overviewQuery.toString() ? `?${overviewQuery.toString()}` : ""}`, token),
        apiRequestOptional<ListResponse<EnterpriseInventoryConnectorActivationRequestDto>>(`/enterprise/inventory/activation-requests${overviewQuery.toString() ? `?${overviewQuery.toString()}` : ""}`, token),
        apiRequest<ListResponse<ConnectorTemplateDto>>("/enterprise/integrations/connector-templates", token),
        apiRequest<ListResponse<PartnerSdkContractDto>>("/enterprise/integrations/partner-sdk-contracts", token),
        apiRequest<InventorySupplierProviderRuntimePolicyDto[]>("/enterprise/inventory/provider-runtime-policies", token)
      ]);
      setOverview(overviewResult);
      setOperationsOverview(operationsOverviewResult);
      setPlans(plansResult.items ?? []);
      setSubscriptions(subscriptionsResult.items ?? []);
      setInvoices(invoicesResult.items ?? []);
      setIdentityProviders(idpsResult.items ?? []);
      setRolePolicies(policiesResult.items ?? []);
      setAuditExports(auditResult.items ?? []);
      setCompliancePacks(packsResult.items ?? []);
      setSecretEntries(secretsResult.items ?? []);
      setDeploymentVariants(deploymentResult.items ?? []);
      setRegistryEntries(registryResult.items ?? []);
      setPublications(publicationResult.items ?? []);
      setDistributionOverview(distributionOverviewResult);
      const activationItems = activationRequestsResult?.items ?? [];
      setActivationRequests(activationItems);
      setProviderRuntimePolicies(providerPolicyResult);
      if (!activationItems.length) {
        setActivationReadiness({});
        setActivationRuntimeRolloutReadiness({});
      } else {
        const activationReadinessEntries = await Promise.all(
          activationItems.map(async (item) => {
            const key = item.id ?? `${item.connectorKey ?? "activation"}:${item.version ?? "n/a"}`;
            const installReadiness =
              item.activationReadiness ??
              item.readiness ??
              (await apiRequestOptional<EnterpriseInventoryConnectorActivationReadinessDto>(
                `/enterprise/inventory/activation-requests/${item.id}/install-readiness`,
                token
              ));
            const runtimeRollout =
              item.runtimeRollout ??
              (await apiRequestOptional<EnterpriseInventoryConnectorRuntimeRolloutReadinessDto>(
                `/enterprise/inventory/activation-requests/${item.id}/runtime-rollout-readiness`,
                token
              ));
            return [key, { installReadiness, runtimeRollout }] as const;
          })
        );
        setActivationReadiness(
          Object.fromEntries(
            activationReadinessEntries
              .filter(([, item]) => Boolean(item.installReadiness))
              .map(([key, item]) => [key, item.installReadiness])
          ) as Record<
            string,
            EnterpriseInventoryConnectorActivationReadinessDto
          >
        );
        setActivationRuntimeRolloutReadiness(
          Object.fromEntries(
            activationReadinessEntries
              .filter(([, item]) => Boolean(item.runtimeRollout))
              .map(([key, item]) => [key, item.runtimeRollout])
          ) as Record<string, EnterpriseInventoryConnectorRuntimeRolloutReadinessDto>
        );
      }
      setConnectorTemplates(templateResult.items ?? []);
      setPartnerContracts(partnerResult.items ?? []);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enterprise workspace load failed.");
    }
  }, [effectiveOrganizationId, effectiveTenantId, token]);

  const run = useCallback(async (action: () => Promise<unknown>, note: string, fallback = "Enterprise action failed.") => {
    if (!token) return;
    try {
      await action();
      setMessage(note);
      await refreshWorkspace();
      if (selectedIdentityProviderId) await loadFederatedLinks(selectedIdentityProviderId);
      if (selectedDistributionRequestId) await loadDistributionRequestOnboardingPackage(selectedDistributionRequestId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fallback);
    }
  }, [loadDistributionRequestOnboardingPackage, loadFederatedLinks, refreshWorkspace, selectedDistributionRequestId, selectedIdentityProviderId, token]);

  useEffect(() => { void refreshWorkspace(); }, [refreshWorkspace]);
  useEffect(() => { void loadFederatedLinks(selectedIdentityProviderId); }, [loadFederatedLinks, selectedIdentityProviderId]);
  useEffect(() => { void loadPublicationEvents(selectedPublicationId); }, [loadPublicationEvents, selectedPublicationId]);
  useEffect(() => { void loadPublicationAnalytics(selectedPublicationId); }, [loadPublicationAnalytics, selectedPublicationId]);
  useEffect(() => { void loadPublicationSigningReadiness(selectedPublicationId); }, [loadPublicationSigningReadiness, selectedPublicationId]);
  useEffect(() => { void loadPublicationLifecycleReadiness(selectedPublicationId); }, [loadPublicationLifecycleReadiness, selectedPublicationId]);
  useEffect(() => { void loadDistributionRequests(selectedPublicationId); }, [loadDistributionRequests, selectedPublicationId]);
  useEffect(() => { void loadDistributionRequestOnboardingPackage(selectedDistributionRequestId); }, [loadDistributionRequestOnboardingPackage, selectedDistributionRequestId]);

  return (
    <div className="stack-layout">
      <section className="panel">
        <div className="panel-header"><div><span className="eyebrow">PHASE 20</span><h2>Enterprise operator workspace</h2><p>Billing, identity, security, compliance and deployment surfaces in one view.</p></div><button className="ghost-button" onClick={() => void refreshWorkspace()}>Refresh</button></div>
        <div className="toolbar">
          <label className="field" style={{ minWidth: 280 }}><span>Tenant scope</span><input value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="tenant UUID" /></label>
          <label className="field" style={{ minWidth: 280 }}><span>Organization scope</span><input value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} placeholder="organization UUID" /></label>
        </div>
        {message ? <p className="error-banner">{message}</p> : null}
        <div className="summary-grid"><article className="summary-card"><span>Billing</span><strong>{plans.length}</strong><span>{subscriptions.length} subscriptions, {invoices.length} invoices</span></article><article className="summary-card"><span>Identity</span><strong>{identityProviders.length}</strong><span>{federatedLinks.length} federated links</span></article><article className="summary-card"><span>Security</span><strong>{rolePolicies.length}</strong><span>{secretEntries.length} secrets</span></article><article className="summary-card"><span>Platform</span><strong>{deploymentVariants.length}</strong><span>{registryEntries.length} registry entries, {publications.length} publications</span></article></div>
        {overview ? <div className="entity-card" style={{ marginTop: 16 }}><div className="entity-head"><div className="entity-title"><h3>Billing overview</h3><span className="entity-meta"><span className="code-chip">{overview.billingAccount.id}</span></span></div><span className={statusClass(overview.subscription?.status ?? overview.trial?.status)}>{overview.subscription?.status ?? overview.trial?.status ?? "NO_SUBSCRIPTION"}</span></div><div className="detail-grid">{detailRow("Billing account", overview.billingAccount.id)}{detailRow("Subscription", overview.subscription?.id ?? "none")}{detailRow("Trial", overview.trial?.status ?? "none")}{detailRow("Invoices", overview.invoices.length)}</div></div> : <p className="muted-copy" style={{ marginTop: 16 }}>Enter a tenant scope to load billing overview.</p>}
        {operationsOverview ? <div className="entity-card" style={{ marginTop: 16 }}><div className="entity-head"><div className="entity-title"><h3>Operations snapshot</h3><span className="entity-meta"><span className="code-chip">{operationsOverview.scope.tenantId ?? operationsOverview.scope.organizationId ?? "global"}</span></span></div><span className={statusClass(operationsOverview.latest.subscription?.status ?? operationsOverview.latest.identityProvider?.status ?? "ACTIVE")}>LIVE</span></div><div className="detail-grid">{detailRow("Subscription statuses", operationsOverview.statuses.subscriptions)}{detailRow("Invoice statuses", operationsOverview.statuses.invoices)}{detailRow("Identity statuses", operationsOverview.statuses.identityProviders)}{detailRow("Audit statuses", operationsOverview.statuses.auditExports)}{detailRow("Deployment statuses", operationsOverview.statuses.deploymentVariants)}{detailRow("Registry statuses", operationsOverview.statuses.integrationRegistryEntries)}</div><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Latest compliance pack", operationsOverview.latest.compliancePack?.code ?? "none")}{detailRow("Latest registry entry", operationsOverview.latest.integrationRegistryEntry?.connectorKey ?? "none")}{detailRow("Latest contract", operationsOverview.latest.partnerSdkContract?.key ?? "none")}{detailRow("Connector templates", operationsOverview.summary.connectorTemplateCount)}</div></div> : null}
      </section>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header"><div><span className="eyebrow">Billing</span><h2>Plans, subscriptions and invoices</h2></div></div>
          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<BillingPlanDto>("/enterprise/billing/plans", token!, { method: "POST", body: JSON.stringify({ code: planDraft.code, name: planDraft.name, status: planDraft.status, priceAmount: planDraft.priceAmount, currency: planDraft.currency, intervalKey: planDraft.intervalKey, entitlements: parseObjectJson(planDraft.entitlements), quotas: parseObjectJson(planDraft.quotas), metadata: parseObjectJson(planDraft.metadata) }) }).then((created) => setSelectedPlanId(created.id)), "Plan created."); }}>
              <h3 style={{ margin: 0 }}>Plan catalog</h3>
              <label className="field"><span>Code</span><input value={planDraft.code} onChange={(event) => setPlanDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={planDraft.name} onChange={(event) => setPlanDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <div className="split-grid"><label className="field"><span>Status</span><select value={planDraft.status} onChange={(event) => setPlanDraft((current) => ({ ...current, status: event.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label><label className="field"><span>Interval</span><select value={planDraft.intervalKey} onChange={(event) => setPlanDraft((current) => ({ ...current, intervalKey: event.target.value }))}><option value="MONTHLY">MONTHLY</option><option value="YEARLY">YEARLY</option></select></label></div>
              <label className="field"><span>Entitlements JSON</span><textarea rows={3} value={planDraft.entitlements} onChange={(event) => setPlanDraft((current) => ({ ...current, entitlements: event.target.value }))} /></label>
              <label className="field"><span>Quotas JSON</span><textarea rows={3} value={planDraft.quotas} onChange={(event) => setPlanDraft((current) => ({ ...current, quotas: event.target.value }))} /></label>
              <label className="field"><span>Metadata JSON</span><textarea rows={2} value={planDraft.metadata} onChange={(event) => setPlanDraft((current) => ({ ...current, metadata: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Create Plan</button><button className="ghost-button" type="button" disabled={!selectedPlan} onClick={() => void run(() => apiRequest(`/enterprise/billing/plans/${selectedPlanId}`, token!, { method: "PATCH", body: JSON.stringify({ code: planDraft.code, name: planDraft.name, status: planDraft.status, priceAmount: planDraft.priceAmount, currency: planDraft.currency, intervalKey: planDraft.intervalKey, entitlements: parseObjectJson(planDraft.entitlements), quotas: parseObjectJson(planDraft.quotas), metadata: parseObjectJson(planDraft.metadata) }) }), "Plan updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedPlan} onClick={() => void run(() => apiRequest(`/enterprise/billing/plans/${selectedPlanId}/archive`, token!, { method: "POST" }), "Plan archived.")}>Archive</button><button className="ghost-button" type="button" disabled={!selectedPlan} onClick={() => void run(() => apiRequest(`/enterprise/billing/plans/${selectedPlanId}/status`, token!, { method: "POST", body: JSON.stringify({ status: planDraft.status }) }), "Plan status updated.")}>Status</button></div>
            </form>
            <div className="entity-list">{plans.map((item) => (<article className={`entity-card ${selectedPlanId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.name}</h4><span className="entity-meta"><span className="code-chip">{item.code}</span> <span className="inline-code">{item.currency} {item.priceAmount}</span></span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedPlanId(item.id); setPlanDraft({ code: item.code, name: item.name, status: item.status, priceAmount: item.priceAmount, currency: item.currency, intervalKey: item.intervalKey, entitlements: pretty(item.entitlements), quotas: pretty(item.quotas), metadata: pretty(item.metadata ?? {}) }); }}>Select</button></div></article>))}{!plans.length ? <div className="empty-state">No plans yet.</div> : null}</div>
          </div>
          <div className="entity-card" style={{ marginTop: 16 }}><div className="entity-title"><h4>Selected plan</h4></div>{selectedPlan ? <div className="detail-grid">{detailRow("Code", selectedPlan.code)}{detailRow("Name", selectedPlan.name)}{detailRow("Status", selectedPlan.status)}{detailRow("Price", `${selectedPlan.currency} ${selectedPlan.priceAmount}`)}{detailRow("Entitlements", selectedPlan.entitlements)}{detailRow("Quotas", selectedPlan.quotas)}</div> : <div className="empty-state">Select a plan to inspect or update it.</div>}</div>
          <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-title"><h4>Subscriptions</h4></div><div className="entity-list">{subscriptions.map((item) => (<article className={`entity-card ${selectedSubscriptionId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.planId}</h4><span className="entity-meta">{item.tenantId}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedSubscriptionId(item.id); setSubscriptionDraft({ planId: item.planId, status: item.status, metadata: pretty(item.metadata ?? {}) }); }}>Select</button></div></article>))}{!subscriptions.length ? <div className="empty-state">No subscriptions yet.</div> : null}</div>{selectedSubscription ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Billing account", selectedSubscription.billingAccountId)}{detailRow("Plan", selectedSubscription.planId)}{detailRow("Status", selectedSubscription.status)}{detailRow("Period end", selectedSubscription.currentPeriodEnd)}</div> : null}</article>
            <article className="entity-card"><div className="entity-title"><h4>Invoices</h4></div><div className="entity-list">{invoices.map((item) => (<article className={`entity-card ${selectedInvoiceId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.number}</h4><span className="entity-meta"><span className="code-chip">{item.billingAccountId}</span></span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedInvoiceId(item.id); setInvoiceDraft({ billingAccountId: item.billingAccountId, subscriptionId: item.subscriptionId ?? "", number: item.number, status: item.status, currency: item.currency, subtotalAmount: item.subtotalAmount, totalAmount: item.totalAmount, dueAt: item.dueAt ?? "", lines: pretty(item.lines), metadata: pretty(item.metadata ?? {}) }); }}>Select</button></div></article>))}{!invoices.length ? <div className="empty-state">No invoices yet.</div> : null}</div>{selectedInvoice ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Number", selectedInvoice.number)}{detailRow("Total", `${selectedInvoice.currency} ${selectedInvoice.totalAmount}`)}{detailRow("Issued", selectedInvoice.issuedAt ?? "pending")}</div> : null}</article>
          </div>
          <div className="entity-card" style={{ marginTop: 16 }}>
            <div className="entity-title"><h4>Issue invoice</h4></div>
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<InvoiceDto>("/enterprise/billing/invoices", token!, { method: "POST", body: JSON.stringify({ tenantId: effectiveTenantId, billingAccountId: invoiceDraft.billingAccountId || overview?.billingAccount.id || "", subscriptionId: invoiceDraft.subscriptionId || null, number: invoiceDraft.number || undefined, status: invoiceDraft.status, currency: invoiceDraft.currency, subtotalAmount: invoiceDraft.subtotalAmount, totalAmount: invoiceDraft.totalAmount, dueAt: invoiceDraft.dueAt || null, lines: parseArrayJson(invoiceDraft.lines), metadata: parseObjectJson(invoiceDraft.metadata) }) }).then((created) => setSelectedInvoiceId(created.id)), "Invoice issued."); }}>
              <div className="split-grid"><label className="field"><span>Billing account ID</span><input value={invoiceDraft.billingAccountId} onChange={(event) => setInvoiceDraft((current) => ({ ...current, billingAccountId: event.target.value }))} placeholder={overview?.billingAccount.id ?? "required"} /></label><label className="field"><span>Subscription ID</span><input value={invoiceDraft.subscriptionId} onChange={(event) => setInvoiceDraft((current) => ({ ...current, subscriptionId: event.target.value }))} placeholder="optional" /></label></div>
              <div className="split-grid"><label className="field"><span>Number</span><input value={invoiceDraft.number} onChange={(event) => setInvoiceDraft((current) => ({ ...current, number: event.target.value }))} /></label><label className="field"><span>Status</span><select value={invoiceDraft.status} onChange={(event) => setInvoiceDraft((current) => ({ ...current, status: event.target.value }))}><option value="ISSUED">ISSUED</option><option value="PAID">PAID</option><option value="VOIDED">VOIDED</option><option value="ARCHIVED">ARCHIVED</option></select></label></div>
              <div className="split-grid"><label className="field"><span>Subtotal</span><input value={invoiceDraft.subtotalAmount} onChange={(event) => setInvoiceDraft((current) => ({ ...current, subtotalAmount: event.target.value }))} /></label><label className="field"><span>Total</span><input value={invoiceDraft.totalAmount} onChange={(event) => setInvoiceDraft((current) => ({ ...current, totalAmount: event.target.value }))} /></label></div>
              <label className="field"><span>Lines JSON</span><textarea rows={3} value={invoiceDraft.lines} onChange={(event) => setInvoiceDraft((current) => ({ ...current, lines: event.target.value }))} /></label>
              <label className="field"><span>Metadata JSON</span><textarea rows={2} value={invoiceDraft.metadata} onChange={(event) => setInvoiceDraft((current) => ({ ...current, metadata: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Issue Invoice</button><button className="ghost-button" type="button" disabled={!selectedInvoice} onClick={() => void run(() => apiRequest(`/enterprise/billing/invoices/${selectedInvoiceId}`, token!, { method: "PATCH", body: JSON.stringify({ number: invoiceDraft.number, status: invoiceDraft.status, currency: invoiceDraft.currency, subtotalAmount: invoiceDraft.subtotalAmount, totalAmount: invoiceDraft.totalAmount, dueAt: invoiceDraft.dueAt || null, lines: parseArrayJson(invoiceDraft.lines), metadata: parseObjectJson(invoiceDraft.metadata) }) }), "Invoice updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedInvoice} onClick={() => void run(() => apiRequest(`/enterprise/billing/invoices/${selectedInvoiceId}/archive`, token!, { method: "POST" }), "Invoice archived.")}>Archive</button><button className="ghost-button" type="button" disabled={!selectedInvoice} onClick={() => void run(() => apiRequest(`/enterprise/billing/invoices/${selectedInvoiceId}/status`, token!, { method: "POST", body: JSON.stringify({ status: invoiceDraft.status }) }), "Invoice status updated.")}>Status</button></div>
            </form>
          </div>
          {distributionRequests.length ? <div className="entity-card" style={{ marginTop: 16 }}>
            <div className="entity-title"><h4>Partner onboarding</h4></div>
            <div className="entity-list">
              {distributionRequests.map((item) => {
                const onboardingReadiness = distributionOnboardingReadiness[item.id];
                const onboardingReady = onboardingReadiness?.canIssueOnboarding ?? onboardingReadiness?.canIssue ?? onboardingReadiness?.status === "READY";
                return (
                  <article className="entity-card" key={`onboarding-${item.id}`}>
                    <div className="entity-head">
                      <div className="entity-title">
                        <h4>{item.companyName}</h4>
                        <span className="entity-meta">{item.contactEmail}</span>
                      </div>
                      <span className={statusClass(onboardingReadiness?.status ?? item.status)}>{onboardingReadiness?.status ?? item.status}</span>
                    </div>
                    <div className="detail-grid" style={{ marginTop: 12 }}>
                      {detailRow("Granted consumer", item.grantedConsumerKey ?? "unbound")}
                      {detailRow("Grant expires", item.grantExpiresAt ?? "none")}
                      {detailRow("Onboarding checks", onboardingReadiness?.checks ?? [])}
                      {detailRow("Blocking issues", onboardingReadiness?.blockingIssues ?? [])}
                      {detailRow("Warnings", onboardingReadiness?.warnings ?? [])}
                    </div>
                    <div className="action-row">
                      <button className="mini-button" type="button" onClick={() => { setSelectedDistributionRequestId(item.id); }}>Select</button>
                      <button className="mini-button" type="button" disabled={!onboardingReady} onClick={() => void run(() => apiRequest<EnterpriseDistributionRequestOnboardingPackageDto>(`/enterprise/integrations/distribution-requests/${item.id}/issue-onboarding`, token!, { method: "POST", body: JSON.stringify({}) }).then((result) => { setSelectedDistributionRequestId(item.id); setDistributionOnboardingPackages((current) => ({ ...current, [item.id]: result })); }), "Partner onboarding package issued.")}>Issue Onboarding</button>
                    </div>
                  </article>
                );
              })}
            </div>
            {selectedDistributionRequestOnboardingPackage ? <div className="entity-card" style={{ marginTop: 16 }}>
              <div className="entity-head">
                <div className="entity-title">
                  <h4>Onboarding package</h4>
                  <span className="entity-meta">
                    <span className="code-chip">{selectedDistributionRequestOnboardingPackage.connectorKey ?? selectedDistributionRequest?.companyName ?? "partner"}</span>
                    <span className="inline-code">{selectedDistributionRequestOnboardingPackage.version ?? "n/a"}</span>
                  </span>
                </div>
                <span className={statusClass(selectedDistributionRequestOnboardingReadiness?.status ?? "READY")}>{selectedDistributionRequestOnboardingReadiness?.status ?? "READY"}</span>
              </div>
              <div className="detail-grid">
                {detailRow("Issued at", selectedDistributionRequestOnboardingPackage.issuedAt ?? "pending")}
                {detailRow("Grant token", selectedDistributionRequestOnboardingPackage.grantToken ?? "pending")}
                {detailRow("Grant binding", selectedDistributionRequestOnboardingPackage.grantBinding ?? {})}
                {detailRow("Urls", selectedDistributionRequestOnboardingPackage.urls ?? {})}
                {detailRow("Summary", selectedDistributionRequestOnboardingPackage.summary ?? {})}
              </div>
              <div style={{ marginTop: 12 }}>
                <h5 style={{ margin: "0 0 8px" }}>Checklist</h5>
                <div className="entity-list">
                  {(selectedDistributionRequestOnboardingPackage.checklist ?? []).map((item, index) => {
                    const checklistItem = typeof item === "string" ? { label: item } : item;
                    return (
                      <article className="entity-card" key={`${checklistItem.label ?? "item"}-${index}`}>
                        <div className="entity-head">
                          <div className="entity-title">
                            <h4>{checklistItem.label ?? `Item ${index + 1}`}</h4>
                            <span className="entity-meta">{checklistItem.note ?? checklistItem.message ?? ""}</span>
                          </div>
                          <span className={statusClass(checklistItem.status ?? "READY")}>{checklistItem.status ?? "READY"}</span>
                        </div>
                        <div className="detail-grid" style={{ marginTop: 12 }}>
                          {detailRow("URL", checklistItem.url ?? "none")}
                          {detailRow("Details", checklistItem.details ?? {})}
                        </div>
                      </article>
                    );
                  })}
                  {!((selectedDistributionRequestOnboardingPackage.checklist ?? []).length) ? <div className="empty-state">No checklist items yet.</div> : null}
                </div>
              </div>
              <div className="detail-grid" style={{ marginTop: 12 }}>
                {detailRow("Package", selectedDistributionRequestOnboardingPackage.package ?? {})}
                {detailRow("Docs", selectedDistributionRequestOnboardingPackage.docs ?? {})}
              </div>
            </div> : null}
          </div> : null}
          <div className="entity-card" style={{ marginTop: 16 }}>
            <div className="entity-head">
              <div className="entity-title">
                <h4>Inventory connector activation governance</h4>
                <span className="entity-meta">Activation requests and readiness for downstream inventory connector rollout</span>
              </div>
              <span className="status-chip status-active">ACTIVATION</span>
            </div>
            <div className="split-grid">
              <form
                className="editor-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(
                    () =>
                      apiRequest<EnterpriseInventoryConnectorActivationRequestDto>(
                        "/enterprise/inventory/activation-requests",
                        token!,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            connectorKey: activationDraft.connectorKey,
                            version: activationDraft.version,
                            targetTenantId: activationDraft.targetTenantId || null,
                            targetStoreId: activationDraft.targetStoreId || null,
                            status: activationDraft.status,
                            notes: activationDraft.notes || null,
                            metadata: parseObjectJson(activationDraft.metadata)
                          })
                        }
                      ).then((created) => setSelectedActivationRequestId(created.id ?? "")),
                    "Inventory connector activation request created."
                  );
                }}
              >
                <h3 style={{ margin: 0 }}>Create activation request</h3>
                <div className="split-grid">
                  <label className="field">
                    <span>Connector key</span>
                    <input
                      value={activationDraft.connectorKey}
                      onChange={(event) => setActivationDraft((current) => ({ ...current, connectorKey: event.target.value }))}
                      placeholder={selectedRegistryEntry?.connectorKey ?? "inventory connector"}
                    />
                  </label>
                  <label className="field">
                    <span>Version</span>
                    <input
                      value={activationDraft.version}
                      onChange={(event) => setActivationDraft((current) => ({ ...current, version: event.target.value }))}
                      placeholder={selectedRegistryEntry?.version ?? "1.0.0"}
                    />
                  </label>
                </div>
                <div className="split-grid">
                  <label className="field">
                    <span>Target tenant ID</span>
                    <input
                      value={activationDraft.targetTenantId}
                      onChange={(event) => setActivationDraft((current) => ({ ...current, targetTenantId: event.target.value }))}
                      placeholder="optional"
                    />
                  </label>
                  <label className="field">
                    <span>Target store ID</span>
                    <input
                      value={activationDraft.targetStoreId}
                      onChange={(event) => setActivationDraft((current) => ({ ...current, targetStoreId: event.target.value }))}
                      placeholder="optional"
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Status</span>
                  <select value={activationDraft.status} onChange={(event) => setActivationDraft((current) => ({ ...current, status: event.target.value }))}>
                    <option value="PENDING">PENDING</option>
                    <option value="READY">READY</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="REVOKED">REVOKED</option>
                  </select>
                </label>
                <label className="field">
                  <span>Notes</span>
                  <textarea rows={2} value={activationDraft.notes} onChange={(event) => setActivationDraft((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Metadata JSON</span>
                  <textarea rows={3} value={activationDraft.metadata} onChange={(event) => setActivationDraft((current) => ({ ...current, metadata: event.target.value }))} />
                </label>
                <div className="action-row">
                  <button className="primary-button" type="submit">Create Activation Request</button>
                </div>
              </form>
              <div className="entity-card">
                <div className="entity-title"><h4>Activation requests</h4></div>
                <div className="summary-grid">
                  <article className="summary-card">
                    <span>Policies</span>
                    <strong>{providerRuntimePolicies.length}</strong>
                    <span>provider runtime baselines</span>
                  </article>
                  <article className="summary-card">
                    <span>Strict</span>
                    <strong>{providerRuntimePolicies.filter((item) => item.riskLevel === "STRICT").length}</strong>
                    <span>strict rollout governance</span>
                  </article>
                  <article className="summary-card">
                    <span>Signed release</span>
                    <strong>{providerRuntimePolicies.filter((item) => item.summary?.requireSignedPublication).length}</strong>
                    <span>publication signature required</span>
                  </article>
                  <article className="summary-card">
                    <span>Tenant install</span>
                    <strong>{providerRuntimePolicies.filter((item) => item.summary?.requireTenantInstall).length}</strong>
                    <span>tenant runtime required</span>
                  </article>
                </div>
                <div className="entity-list" style={{ marginTop: 16 }}>
                  {providerRuntimePolicies.map((item) => (
                    <article className="entity-card" key={item.key}>
                      <div className="entity-head">
                        <div className="entity-title">
                          <h4>{item.name}</h4>
                          <span className="entity-meta">
                            <span className="code-chip">{item.key}</span>
                            <span className="inline-code">{item.executionModel}</span>
                          </span>
                        </div>
                        <span className={statusClass(item.riskLevel)}>{item.riskLevel}</span>
                      </div>
                      <div className="detail-grid">
                        {detailRow("Adapters", item.adapterKeys)}
                        {detailRow("Profiles", item.profileKeys)}
                        {detailRow("Distribution", item.summary)}
                        {detailRow("Runtime", item.runtime)}
                      </div>
                    </article>
                  ))}
                  {!providerRuntimePolicies.length ? <div className="empty-state">No provider runtime policies exposed yet.</div> : null}
                </div>
                <div className="summary-grid">
                  <article className="summary-card">
                    <span>Total</span>
                    <strong>{activationRequests.length}</strong>
                    <span>requests tracked</span>
                  </article>
                  <article className="summary-card">
                    <span>Ready</span>
                    <strong>{activationRequests.filter((item) => {
                      const readiness = item.activationReadiness ?? item.readiness ?? activationReadiness[item.id ?? ""] ?? null;
                      return (
                        String(item.status ?? "").toUpperCase() === "READY" ||
                        Boolean(
                          (readiness as Record<string, unknown> | null)?.canInstall ??
                            (readiness as Record<string, unknown> | null)?.canApplyActivation ??
                            (readiness as Record<string, unknown> | null)?.canApply
                        )
                      );
                    }).length}</strong>
                    <span>ready to apply</span>
                  </article>
                  <article className="summary-card">
                    <span>Active</span>
                    <strong>{activationRequests.filter((item) => String(item.status ?? "").toUpperCase() === "ACTIVE").length}</strong>
                    <span>live activations</span>
                  </article>
                  <article className="summary-card">
                    <span>Blocked</span>
                    <strong>{activationRequests.filter((item) => String(item.status ?? "").toUpperCase() === "BLOCKED").length}</strong>
                    <span>policy issues</span>
                  </article>
                </div>
                <div className="entity-list" style={{ marginTop: 16 }}>
                  {activationRequests.map((item) => {
                    const readiness = item.activationReadiness ?? item.readiness ?? activationReadiness[item.id ?? ""] ?? null;
                    const runtimeRolloutReadiness = item.runtimeRollout ?? activationRuntimeRolloutReadiness[item.id ?? ""] ?? null;
                    const rollout = activationRolloutGovernance(item, readiness as EnterpriseInventoryConnectorActivationReadinessDto | null, runtimeRolloutReadiness);
                    const providerRuntime = providerRuntimePolicyCompatibility(
                      item,
                      readiness as EnterpriseInventoryConnectorActivationReadinessDto | null,
                      runtimeRolloutReadiness
                    );
                    const providerSnapshot = resolveProviderRuntimePolicySnapshot(
                      item,
                      readiness as EnterpriseInventoryConnectorActivationReadinessDto | null,
                      runtimeRolloutReadiness
                    );
                    const status = String((readiness as Record<string, unknown> | null)?.status ?? item.status ?? "PENDING").toUpperCase();
                    const checks = Array.isArray((readiness as Record<string, unknown> | null)?.checks) ? ((readiness as Record<string, unknown> | null)?.checks as Array<Record<string, unknown> | string>) : Array.isArray(item.checks) ? item.checks : [];
                    const blockingIssues = Array.isArray((readiness as Record<string, unknown> | null)?.blockingIssues)
                      ? ((readiness as Record<string, unknown> | null)?.blockingIssues as string[])
                      : Array.isArray(item.blockingIssues)
                        ? item.blockingIssues
                        : [];
                    const warnings = Array.isArray((readiness as Record<string, unknown> | null)?.warnings)
                      ? ((readiness as Record<string, unknown> | null)?.warnings as string[])
                      : Array.isArray(item.warnings)
                        ? item.warnings
                        : [];
                    const providerPolicyKey = item.providerPolicy?.key ?? null;
                    const policyCatalogEntry = providerPolicyKey ? providerRuntimePolicies.find((policy) => policy.key === providerPolicyKey) ?? null : null;
                    const executionPolicySnapshot = {
                      policyKey: providerPolicyKey ?? policyCatalogEntry?.key ?? "n/a",
                      policyName: item.providerPolicy?.name ?? policyCatalogEntry?.name ?? "n/a",
                      executionModel: item.providerPolicy?.executionModel ?? policyCatalogEntry?.executionModel ?? "n/a",
                      riskLevel: item.providerPolicy?.riskLevel ?? policyCatalogEntry?.riskLevel ?? "n/a",
                      requireSignedPublication: policyCatalogEntry?.summary?.requireSignedPublication ?? null,
                      requireTenantInstall: policyCatalogEntry?.summary?.requireTenantInstall ?? null,
                      providerPolicySummary: item.providerPolicy ?? {},
                      installReadiness: readiness ?? {},
                      runtimeRollout: runtimeRolloutReadiness ?? {},
                      governance: rollout
                    };
                    return (
                      <article className={`entity-card ${selectedActivationRequestId === item.id ? "active" : ""}`} key={item.id}>
                        <div className="entity-head">
                          <div className="entity-title">
                            <h4>{item.connectorKey ?? "activation request"}</h4>
                            <span className="entity-meta">
                              <span className="code-chip">{item.version ?? "n/a"}</span>
                              <span className="inline-code">{item.targetTenantId ?? item.targetStoreId ?? "global"}</span>
                            </span>
                          </div>
                          <span className={statusClass(status)}>{status}</span>
                        </div>
                        <div className="detail-grid" style={{ marginTop: 12 }}>
                          {detailRow("Install readiness", activationInstallReadiness(readiness as EnterpriseInventoryConnectorActivationReadinessDto | JsonRecord | null))}
                          {detailRow("Provider policy health", providerRuntime.health)}
                          {detailRow("Provider compatibility", providerRuntime.compatibility)}
                          {detailRow("Provider readiness", providerRuntime.readiness)}
                          {detailRow("Provider policy", providerSnapshot.providerPolicy ?? {})}
                          {detailRow("Provider compatibility detail", providerSnapshot.providerCompatibility ?? {})}
                          {detailRow("Execution policy snapshot", executionPolicySnapshot)}
                          {detailRow("Rollout governance", rollout.health)}
                          {detailRow("Drift", rollout.drift)}
                          {detailRow("Governance action", rollout.action)}
                          {detailRow("Install runtime", activationInstallRuntime(item))}
                          {detailRow("Install source", activationInstallSource(item))}
                          {detailRow("Runtime rollout", runtimeRolloutReadiness?.runtimeRollout ?? (readiness as EnterpriseInventoryConnectorActivationReadinessDto | null)?.runtimeRollout ?? {})}
                          {detailRow("Readiness", readiness ?? {})}
                          {detailRow("Checks", checks)}
                          {detailRow("Blocking issues", blockingIssues)}
                          {detailRow("Warnings", warnings)}
                        </div>
                        <div className="action-row">
                          <button className="mini-button" type="button" onClick={() => { setSelectedActivationRequestId(item.id ?? ""); }}>Select</button>
                          <button
                            className="mini-button"
                            type="button"
                            onClick={() => void run(
                              async () => {
                                await Promise.all([
                                  loadActivationInstallReadiness(item.id ?? ""),
                                  loadActivationRuntimeRollout(item.id ?? "")
                                ]);
                              },
                              "Activation rollout refreshed."
                            )}
                          >
                            Refresh Rollout
                          </button>
                          <button
                            className="mini-button"
                            type="button"
                            disabled={status !== "READY"}
                            onClick={() => void run(() => apiRequest(`/enterprise/inventory/activation-requests/${item.id}/install-runtime`, token!, { method: "POST", body: JSON.stringify({}) }), "Inventory connector runtime installed.")}
                          >
                            Run Install
                          </button>
                          <button
                            className="mini-button"
                            type="button"
                            disabled={!runtimeRolloutReadiness?.canReconcile}
                            onClick={() =>
                              void run(
                                () =>
                                  apiRequest(
                                    `/enterprise/inventory/activation-requests/${item.id}/reconcile-runtime-rollout`,
                                    token!,
                                    { method: "POST", body: JSON.stringify({}) }
                                  ),
                                "Installed runtime reconciled to current source artifact."
                              )
                            }
                          >
                            Reconcile Runtime
                          </button>
                          <button
                            className="mini-button"
                            type="button"
                            disabled={!runtimeRolloutReadiness?.canApplyGovernance}
                            onClick={() =>
                              void run(
                                () =>
                                  apiRequest(
                                    `/enterprise/inventory/activation-requests/${item.id}/apply-runtime-governance`,
                                    token!,
                                    { method: "POST", body: JSON.stringify({}) }
                                  ),
                                "Runtime governance evaluated."
                              )
                            }
                          >
                            Apply Governance
                          </button>
                          <button
                            className="mini-button"
                            type="button"
                            disabled={!runtimeRolloutReadiness?.canApplyGovernance || rollout.health !== "BLOCKED"}
                            onClick={() =>
                              void run(
                                () =>
                                  apiRequest(
                                    `/enterprise/inventory/activation-requests/${item.id}/apply-runtime-governance`,
                                    token!,
                                    {
                                      method: "POST",
                                      body: JSON.stringify({ deactivateRuntime: true })
                                    }
                                  ),
                                "Blocked runtime governance applied and runtime deactivated."
                              )
                            }
                          >
                            Deactivate Runtime
                          </button>
                          <span className="entity-meta">{rollout.action}</span>
                        </div>
                      </article>
                    );
                  })}
                  {!activationRequests.length ? <div className="empty-state">No activation requests yet.</div> : null}
                </div>
                {selectedActivationRequest ? <div className="detail-grid" style={{ marginTop: 12 }}>
                  {detailRow("Selected connector", selectedActivationRequest.connectorKey ?? "n/a")}
                  {detailRow("Selected version", selectedActivationRequest.version ?? "n/a")}
                  {detailRow("Selected status", selectedActivationRequest.status ?? "n/a")}
                  {detailRow("Selected readiness", selectedActivationReadiness ?? selectedActivationRequest.activationReadiness ?? selectedActivationRequest.readiness ?? {})}
                  {detailRow("Provider policy health", providerRuntimePolicyCompatibility(selectedActivationRequest, selectedActivationReadiness, selectedActivationRuntimeRolloutReadiness).health)}
                  {detailRow("Provider compatibility", providerRuntimePolicyCompatibility(selectedActivationRequest, selectedActivationReadiness, selectedActivationRuntimeRolloutReadiness).compatibility)}
                  {detailRow("Provider readiness", providerRuntimePolicyCompatibility(selectedActivationRequest, selectedActivationReadiness, selectedActivationRuntimeRolloutReadiness).readiness)}
                  {detailRow("Selected provider policy", resolveProviderRuntimePolicySnapshot(selectedActivationRequest, selectedActivationReadiness, selectedActivationRuntimeRolloutReadiness).providerPolicy ?? {})}
                  {detailRow("Selected provider compatibility", resolveProviderRuntimePolicySnapshot(selectedActivationRequest, selectedActivationReadiness, selectedActivationRuntimeRolloutReadiness).providerCompatibility ?? {})}
                  {detailRow("Selected execution policy snapshot", {
                    policyKey: selectedActivationRequest.providerPolicy?.key ?? "n/a",
                    policyName: selectedActivationRequest.providerPolicy?.name ?? "n/a",
                    executionModel: selectedActivationRequest.providerPolicy?.executionModel ?? "n/a",
                    riskLevel: selectedActivationRequest.providerPolicy?.riskLevel ?? "n/a",
                    requireSignedPublication: providerRuntimePolicies.find((policy) => policy.key === selectedActivationRequest.providerPolicy?.key)?.summary?.requireSignedPublication ?? null,
                    requireTenantInstall: providerRuntimePolicies.find((policy) => policy.key === selectedActivationRequest.providerPolicy?.key)?.summary?.requireTenantInstall ?? null,
                    providerPolicySummary: selectedActivationRequest.providerPolicy ?? {},
                    installReadiness: selectedActivationReadiness ?? {},
                    runtimeRollout: selectedActivationRuntimeRolloutReadiness ?? {},
                    governance: activationRolloutGovernance(selectedActivationRequest, selectedActivationReadiness, selectedActivationRuntimeRolloutReadiness)
                  })}
                  {detailRow("Selected runtime rollout", selectedActivationRuntimeRolloutReadiness ?? selectedActivationRequest.runtimeRollout ?? selectedActivationReadiness?.runtimeRollout ?? {})}
                  {detailRow("Selected publication", selectedActivationRequest.publication ?? {})}
                  {detailRow("Selected notes", selectedActivationRequest.notes ?? "n/a")}
                </div> : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header"><div><span className="eyebrow">Identity, security and compliance</span><h2>Federation, policies and secrets</h2></div></div>

          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<EnterpriseIdentityProviderDto>("/enterprise/integrations/identity-providers", token!, { method: "POST", body: JSON.stringify({ tenantId: effectiveTenantId || null, organizationId: effectiveOrganizationId || null, code: idpDraft.code, type: idpDraft.type, status: idpDraft.status, config: parseObjectJson(idpDraft.config) }) }).then((created) => setSelectedIdentityProviderId(created.id)), "Identity provider created."); }}>
              <h3 style={{ margin: 0 }}>Identity provider</h3>
              <label className="field"><span>Code</span><input value={idpDraft.code} onChange={(event) => setIdpDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <div className="split-grid"><label className="field"><span>Type</span><select value={idpDraft.type} onChange={(event) => setIdpDraft((current) => ({ ...current, type: event.target.value }))}><option value="OIDC">OIDC</option><option value="SAML">SAML</option></select></label><label className="field"><span>Status</span><select value={idpDraft.status} onChange={(event) => setIdpDraft((current) => ({ ...current, status: event.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="DISABLED">DISABLED</option><option value="ARCHIVED">ARCHIVED</option></select></label></div>
              <label className="field"><span>Config JSON</span><textarea rows={3} value={idpDraft.config} onChange={(event) => setIdpDraft((current) => ({ ...current, config: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Create IDP</button><button className="ghost-button" type="button" disabled={!selectedIdentityProvider} onClick={() => void run(() => apiRequest(`/enterprise/integrations/identity-providers/${selectedIdentityProviderId}`, token!, { method: "PATCH", body: JSON.stringify({ code: idpDraft.code, type: idpDraft.type, status: idpDraft.status, config: parseObjectJson(idpDraft.config) }) }), "Identity provider updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedIdentityProvider} onClick={() => void run(() => apiRequest(`/enterprise/integrations/identity-providers/${selectedIdentityProviderId}/archive`, token!, { method: "POST" }), "Identity provider archived.")}>Archive</button><button className="ghost-button" type="button" disabled={!selectedIdentityProvider} onClick={() => void run(() => apiRequest(`/enterprise/integrations/identity-providers/${selectedIdentityProviderId}/status`, token!, { method: "POST", body: JSON.stringify({ status: idpDraft.status }) }), "Identity provider status updated.")}>Status</button></div>
            </form>

            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<FederatedIdentityLinkDto>(`/enterprise/integrations/identity-providers/${selectedIdentityProviderId}/federated-links`, token!, { method: "POST", body: JSON.stringify({ userId: federatedLinkDraft.userId, externalSubject: federatedLinkDraft.externalSubject, email: federatedLinkDraft.email || null }) }).then((created) => setSelectedFederatedLinkId(created.id)), "Federated link saved."); }}>
              <h3 style={{ margin: 0 }}>Federated link</h3>
              <label className="field"><span>User ID</span><input value={federatedLinkDraft.userId} onChange={(event) => setFederatedLinkDraft((current) => ({ ...current, userId: event.target.value }))} /></label>
              <label className="field"><span>External subject</span><input value={federatedLinkDraft.externalSubject} onChange={(event) => setFederatedLinkDraft((current) => ({ ...current, externalSubject: event.target.value }))} /></label>
              <label className="field"><span>Email</span><input value={federatedLinkDraft.email} onChange={(event) => setFederatedLinkDraft((current) => ({ ...current, email: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit" disabled={!selectedIdentityProviderId}>Save Link</button><button className="ghost-button" type="button" disabled={!selectedFederatedLink} onClick={() => void run(() => apiRequest(`/enterprise/integrations/federated-links/${selectedFederatedLinkId}`, token!, { method: "PATCH", body: JSON.stringify({ userId: federatedLinkDraft.userId, externalSubject: federatedLinkDraft.externalSubject, email: federatedLinkDraft.email || null }) }), "Federated link updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedFederatedLink} onClick={() => void run(() => apiRequest(`/enterprise/integrations/federated-links/${selectedFederatedLinkId}/archive`, token!, { method: "POST" }), "Federated link archived.")}>Archive</button></div>
            </form>
          </div>

          <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-title"><h4>Identity providers</h4></div><div className="entity-list">{identityProviders.map((item) => (<article className={`entity-card ${selectedIdentityProviderId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.code}</h4><span className="entity-meta">{item.type}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedIdentityProviderId(item.id); setIdpDraft({ code: item.code, type: item.type, status: item.status, config: pretty(item.config) }); }}>Select</button></div></article>))}{!identityProviders.length ? <div className="empty-state">No identity providers yet.</div> : null}</div>{selectedIdentityProvider ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Tenant", selectedIdentityProvider.tenantId ?? "global")}{detailRow("Organization", selectedIdentityProvider.organizationId ?? "global")}{detailRow("Config", selectedIdentityProvider.config)}</div> : null}</article>

            <article className="entity-card"><div className="entity-title"><h4>Federated links</h4></div><div className="entity-list">{federatedLinks.map((item) => (<article className={`entity-card ${selectedFederatedLinkId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.externalSubject}</h4><span className="entity-meta">{item.email ?? "no email"}</span></div></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedFederatedLinkId(item.id); setFederatedLinkDraft({ userId: item.userId, externalSubject: item.externalSubject, email: item.email ?? "" }); }}>Select</button></div></article>))}{!federatedLinks.length ? <div className="empty-state">Select an IDP to load links.</div> : null}</div>{selectedFederatedLink ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("User", selectedFederatedLink.userId)}{detailRow("Subject", selectedFederatedLink.externalSubject)}{detailRow("Email", selectedFederatedLink.email ?? "none")}</div> : null}</article>
          </div>

          <div className="split-grid" style={{ marginTop: 16 }}>
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<AdvancedRolePolicyDto>("/enterprise/security/advanced-role-policies", token!, { method: "POST", body: JSON.stringify({ tenantId: effectiveTenantId || null, organizationId: effectiveOrganizationId || null, key: rolePolicyDraft.key, rules: parseObjectJson(rolePolicyDraft.rules) }) }).then((created) => setSelectedRolePolicyId(created.id)), "Role policy saved."); }}>
              <h3 style={{ margin: 0 }}>Advanced role policy</h3>
              <label className="field"><span>Key</span><input value={rolePolicyDraft.key} onChange={(event) => setRolePolicyDraft((current) => ({ ...current, key: event.target.value }))} /></label>
              <label className="field"><span>Rules JSON</span><textarea rows={4} value={rolePolicyDraft.rules} onChange={(event) => setRolePolicyDraft((current) => ({ ...current, rules: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save Policy</button><button className="ghost-button" type="button" disabled={!selectedRolePolicy} onClick={() => void run(() => apiRequest(`/enterprise/security/advanced-role-policies/${selectedRolePolicyId}`, token!, { method: "PATCH", body: JSON.stringify({ key: rolePolicyDraft.key, rules: parseObjectJson(rolePolicyDraft.rules) }) }), "Role policy updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedRolePolicy} onClick={() => void run(() => apiRequest(`/enterprise/security/advanced-role-policies/${selectedRolePolicyId}/archive`, token!, { method: "POST" }), "Role policy archived.")}>Archive</button></div>
            </form>

            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<AuditExportJobDto>("/enterprise/audit/exports", token!, { method: "POST", body: JSON.stringify({ tenantId: effectiveTenantId || null, organizationId: effectiveOrganizationId || null, status: auditExportDraft.status, filter: parseObjectJson(auditExportDraft.filter) }) }).then((created) => setSelectedAuditExportId(created.id)), "Audit export requested."); }}>
              <h3 style={{ margin: 0 }}>Audit export</h3>
              <label className="field"><span>Status</span><select value={auditExportDraft.status} onChange={(event) => setAuditExportDraft((current) => ({ ...current, status: event.target.value }))}><option value="PENDING">PENDING</option><option value="RUNNING">RUNNING</option><option value="COMPLETED">COMPLETED</option><option value="FAILED">FAILED</option><option value="ARCHIVED">ARCHIVED</option></select></label>
              <label className="field"><span>Filter JSON</span><textarea rows={4} value={auditExportDraft.filter} onChange={(event) => setAuditExportDraft((current) => ({ ...current, filter: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Create Export</button><button className="ghost-button" type="button" disabled={!selectedAuditExport} onClick={() => void run(() => apiRequest(`/enterprise/audit/exports/${selectedAuditExportId}`, token!, { method: "PATCH", body: JSON.stringify({ status: auditExportDraft.status, filter: parseObjectJson(auditExportDraft.filter) }) }), "Audit export updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedAuditExport} onClick={() => void run(() => apiRequest(`/enterprise/audit/exports/${selectedAuditExportId}/archive`, token!, { method: "POST" }), "Audit export archived.")}>Archive</button></div>
            </form>
          </div>

          <div className="split-grid" style={{ marginTop: 16 }}>
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<CompliancePackDto>("/enterprise/compliance/packs", token!, { method: "POST", body: JSON.stringify({ tenantId: effectiveTenantId || null, organizationId: effectiveOrganizationId || null, code: compliancePackDraft.code, name: compliancePackDraft.name, status: compliancePackDraft.status, controls: parseObjectJson(compliancePackDraft.controls) }) }).then((created) => setSelectedCompliancePackId(created.id)), "Compliance pack saved."); }}>
              <h3 style={{ margin: 0 }}>Compliance pack</h3>
              <label className="field"><span>Code</span><input value={compliancePackDraft.code} onChange={(event) => setCompliancePackDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={compliancePackDraft.name} onChange={(event) => setCompliancePackDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Status</span><select value={compliancePackDraft.status} onChange={(event) => setCompliancePackDraft((current) => ({ ...current, status: event.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
              <label className="field"><span>Controls JSON</span><textarea rows={4} value={compliancePackDraft.controls} onChange={(event) => setCompliancePackDraft((current) => ({ ...current, controls: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save Pack</button><button className="ghost-button" type="button" disabled={!selectedCompliancePack} onClick={() => void run(() => apiRequest(`/enterprise/compliance/packs/${selectedCompliancePackId}`, token!, { method: "PATCH", body: JSON.stringify({ code: compliancePackDraft.code, name: compliancePackDraft.name, status: compliancePackDraft.status, controls: parseObjectJson(compliancePackDraft.controls) }) }), "Compliance pack updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedCompliancePack} onClick={() => void run(() => apiRequest(`/enterprise/compliance/packs/${selectedCompliancePackId}/archive`, token!, { method: "POST" }), "Compliance pack archived.")}>Archive</button></div>
            </form>

            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<SecretRegistryEntryDto>("/enterprise/security/secrets", token!, { method: "POST", body: JSON.stringify({ tenantId: effectiveTenantId || null, organizationId: effectiveOrganizationId || null, scopeType: secretDraft.scopeType, scopeId: secretDraft.scopeId || null, key: secretDraft.key, value: secretDraft.value, metadata: parseObjectJson(secretDraft.metadata) }) }).then((created) => setSelectedSecretEntryId(created.id)), "Secret saved."); }}>
              <h3 style={{ margin: 0 }}>Secret registry</h3>
              <div className="split-grid"><label className="field"><span>Scope type</span><input value={secretDraft.scopeType} onChange={(event) => setSecretDraft((current) => ({ ...current, scopeType: event.target.value }))} /></label><label className="field"><span>Scope ID</span><input value={secretDraft.scopeId} onChange={(event) => setSecretDraft((current) => ({ ...current, scopeId: event.target.value }))} /></label></div>
              <label className="field"><span>Key</span><input value={secretDraft.key} onChange={(event) => setSecretDraft((current) => ({ ...current, key: event.target.value }))} /></label>
              <label className="field"><span>Value</span><textarea rows={3} value={secretDraft.value} onChange={(event) => setSecretDraft((current) => ({ ...current, value: event.target.value }))} /></label>
              <label className="field"><span>Metadata JSON</span><textarea rows={2} value={secretDraft.metadata} onChange={(event) => setSecretDraft((current) => ({ ...current, metadata: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save Secret</button><button className="ghost-button" type="button" disabled={!selectedSecretEntry} onClick={() => void run(() => apiRequest(`/enterprise/security/secrets/${selectedSecretEntryId}`, token!, { method: "PATCH", body: JSON.stringify({ scopeType: secretDraft.scopeType, scopeId: secretDraft.scopeId || null, key: secretDraft.key, metadata: parseObjectJson(secretDraft.metadata) }) }), "Secret updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedSecretEntry} onClick={() => void run(() => apiRequest(`/enterprise/security/secrets/${selectedSecretEntryId}/archive`, token!, { method: "POST" }), "Secret archived.")}>Archive</button></div>
            </form>
          </div>

          <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-title"><h4>Compliance packs</h4></div><div className="entity-list">{compliancePacks.map((item) => (<article className={`entity-card ${selectedCompliancePackId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.name}</h4><span className="entity-meta">{item.code}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedCompliancePackId(item.id); setCompliancePackDraft({ code: item.code, name: item.name, status: item.status, controls: pretty(item.controls) }); }}>Select</button></div></article>))}{!compliancePacks.length ? <div className="empty-state">No compliance packs yet.</div> : null}</div>{selectedCompliancePack ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Code", selectedCompliancePack.code)}{detailRow("Name", selectedCompliancePack.name)}{detailRow("Controls", selectedCompliancePack.controls)}</div> : null}</article>
            <article className="entity-card"><div className="entity-title"><h4>Security read model</h4></div><div className="entity-list">{rolePolicies.map((item) => (<article className={`entity-card ${selectedRolePolicyId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.key}</h4><span className="entity-meta">{item.organizationId ?? item.tenantId ?? "global"}</span></div></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedRolePolicyId(item.id); setRolePolicyDraft({ key: item.key, rules: pretty(item.rules) }); }}>Select policy</button></div></article>))}{!rolePolicies.length ? <div className="empty-state">No role policies yet.</div> : null}{auditExports.map((item) => (<article className={`entity-card ${selectedAuditExportId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.id}</h4><span className="entity-meta">{item.organizationId ?? item.tenantId ?? "global"}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedAuditExportId(item.id); setAuditExportDraft({ status: item.status, filter: pretty(item.filter ?? {}) }); }}>Select export</button></div></article>))}{!auditExports.length ? <div className="empty-state">No audit exports yet.</div> : null}{secretEntries.map((item) => (<article className={`entity-card ${selectedSecretEntryId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.key}</h4><span className="entity-meta">{item.scopeType}</span></div></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedSecretEntryId(item.id); setSecretDraft({ scopeType: item.scopeType, scopeId: item.scopeId ?? "", key: item.key, value: "", metadata: pretty(item.metadata ?? {}) }); }}>Select secret</button></div></article>))}{!secretEntries.length ? <div className="empty-state">No secrets yet.</div> : null}</div></article>
          </div>
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header"><div><span className="eyebrow">Deployment and contracts</span><h2>Variants, registry entries and SDK contracts</h2></div></div>
          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<DeploymentVariantDto>("/enterprise/deployment-variants", token!, { method: "POST", body: JSON.stringify({ tenantId: effectiveTenantId || null, organizationId: effectiveOrganizationId || null, code: deploymentVariantDraft.code, name: deploymentVariantDraft.name, status: deploymentVariantDraft.status, config: parseObjectJson(deploymentVariantDraft.config) }) }).then((created) => setSelectedDeploymentVariantId(created.id)), "Deployment variant created."); }}>
              <h3 style={{ margin: 0 }}>Deployment variant</h3>
              <label className="field"><span>Code</span><input value={deploymentVariantDraft.code} onChange={(event) => setDeploymentVariantDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={deploymentVariantDraft.name} onChange={(event) => setDeploymentVariantDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Status</span><select value={deploymentVariantDraft.status} onChange={(event) => setDeploymentVariantDraft((current) => ({ ...current, status: event.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
              <label className="field"><span>Config JSON</span><textarea rows={4} value={deploymentVariantDraft.config} onChange={(event) => setDeploymentVariantDraft((current) => ({ ...current, config: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save Variant</button><button className="ghost-button" type="button" disabled={!selectedDeploymentVariant} onClick={() => void run(() => apiRequest(`/enterprise/deployment-variants/${selectedDeploymentVariantId}`, token!, { method: "PATCH", body: JSON.stringify({ code: deploymentVariantDraft.code, name: deploymentVariantDraft.name, status: deploymentVariantDraft.status, config: parseObjectJson(deploymentVariantDraft.config) }) }), "Deployment variant updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedDeploymentVariant} onClick={() => void run(() => apiRequest(`/enterprise/deployment-variants/${selectedDeploymentVariantId}/archive`, token!, { method: "POST" }), "Deployment variant archived.")}>Archive</button><button className="ghost-button" type="button" disabled={!selectedDeploymentVariant} onClick={() => void run(() => apiRequest(`/enterprise/deployment-variants/${selectedDeploymentVariantId}/status`, token!, { method: "POST", body: JSON.stringify({ status: deploymentVariantDraft.status }) }), "Deployment variant status updated.")}>Status</button></div>
            </form>

            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<IntegrationRegistryEntryDto>("/enterprise/integrations/registry", token!, { method: "POST", body: JSON.stringify({ tenantId: effectiveTenantId || null, organizationId: effectiveOrganizationId || null, connectorKey: registryDraft.connectorKey, version: registryDraft.version, status: registryDraft.status, manifest: parseObjectJson(registryDraft.manifest) }) }).then((created) => setSelectedRegistryEntryId(created.id)), "Registry entry created."); }}>
              <h3 style={{ margin: 0 }}>Integration registry</h3>
              <div className="split-grid"><label className="field"><span>Connector key</span><input value={registryDraft.connectorKey} onChange={(event) => setRegistryDraft((current) => ({ ...current, connectorKey: event.target.value }))} /></label><label className="field"><span>Version</span><input value={registryDraft.version} onChange={(event) => setRegistryDraft((current) => ({ ...current, version: event.target.value }))} /></label></div>
              <label className="field"><span>Status</span><select value={registryDraft.status} onChange={(event) => setRegistryDraft((current) => ({ ...current, status: event.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
              <label className="field"><span>Manifest JSON</span><textarea rows={4} value={registryDraft.manifest} onChange={(event) => setRegistryDraft((current) => ({ ...current, manifest: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save Entry</button><button className="ghost-button" type="button" disabled={!selectedRegistryEntry} onClick={() => void run(() => apiRequest(`/enterprise/integrations/registry/${selectedRegistryEntryId}`, token!, { method: "PATCH", body: JSON.stringify({ connectorKey: registryDraft.connectorKey, version: registryDraft.version, status: registryDraft.status, manifest: parseObjectJson(registryDraft.manifest) }) }), "Registry entry updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedRegistryEntry} onClick={() => void run(() => apiRequest(`/enterprise/integrations/registry/${selectedRegistryEntryId}/archive`, token!, { method: "POST" }), "Registry entry archived.")}>Archive</button></div>
            </form>
          </div>

          <div className="split-grid" style={{ marginTop: 16 }}>
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<ConnectorTemplateDto>("/enterprise/integrations/connector-templates", token!, { method: "POST", body: JSON.stringify({ connectorKey: connectorTemplateDraft.connectorKey, version: connectorTemplateDraft.version, manifest: parseObjectJson(connectorTemplateDraft.manifest) }) }).then((created) => setSelectedConnectorTemplateId(created.id)), "Connector template created."); }}>
              <h3 style={{ margin: 0 }}>Connector template</h3>
              <div className="split-grid"><label className="field"><span>Connector key</span><input value={connectorTemplateDraft.connectorKey} onChange={(event) => setConnectorTemplateDraft((current) => ({ ...current, connectorKey: event.target.value }))} /></label><label className="field"><span>Version</span><input value={connectorTemplateDraft.version} onChange={(event) => setConnectorTemplateDraft((current) => ({ ...current, version: event.target.value }))} /></label></div>
              <label className="field"><span>Manifest JSON</span><textarea rows={4} value={connectorTemplateDraft.manifest} onChange={(event) => setConnectorTemplateDraft((current) => ({ ...current, manifest: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save Template</button><button className="ghost-button" type="button" disabled={!selectedConnectorTemplate} onClick={() => void run(() => apiRequest(`/enterprise/integrations/connector-templates/${selectedConnectorTemplateId}`, token!, { method: "PATCH", body: JSON.stringify({ connectorKey: connectorTemplateDraft.connectorKey, version: connectorTemplateDraft.version, manifest: parseObjectJson(connectorTemplateDraft.manifest) }) }), "Connector template updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedConnectorTemplate} onClick={() => void run(() => apiRequest(`/enterprise/integrations/connector-templates/${selectedConnectorTemplateId}/archive`, token!, { method: "POST" }), "Connector template archived.")}>Archive</button></div>
            </form>

            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void run(() => apiRequest<PartnerSdkContractDto>("/enterprise/integrations/partner-sdk-contracts", token!, { method: "POST", body: JSON.stringify({ partnerAccountId: partnerContractDraft.partnerAccountId || null, key: partnerContractDraft.key, version: partnerContractDraft.version, status: partnerContractDraft.status, schema: parseObjectJson(partnerContractDraft.schema) }) }).then((created) => setSelectedPartnerContractId(created.id)), "Partner contract created."); }}>
              <h3 style={{ margin: 0 }}>Partner SDK contract</h3>
              <label className="field"><span>Partner account ID</span><input value={partnerContractDraft.partnerAccountId} onChange={(event) => setPartnerContractDraft((current) => ({ ...current, partnerAccountId: event.target.value }))} /></label>
              <div className="split-grid"><label className="field"><span>Key</span><input value={partnerContractDraft.key} onChange={(event) => setPartnerContractDraft((current) => ({ ...current, key: event.target.value }))} /></label><label className="field"><span>Version</span><input value={partnerContractDraft.version} onChange={(event) => setPartnerContractDraft((current) => ({ ...current, version: event.target.value }))} /></label></div>
              <label className="field"><span>Status</span><select value={partnerContractDraft.status} onChange={(event) => setPartnerContractDraft((current) => ({ ...current, status: event.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="DEPRECATED">DEPRECATED</option><option value="ARCHIVED">ARCHIVED</option></select></label>
              <label className="field"><span>Schema JSON</span><textarea rows={4} value={partnerContractDraft.schema} onChange={(event) => setPartnerContractDraft((current) => ({ ...current, schema: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save Contract</button><button className="ghost-button" type="button" disabled={!selectedPartnerContract} onClick={() => void run(() => apiRequest(`/enterprise/integrations/partner-sdk-contracts/${selectedPartnerContractId}`, token!, { method: "PATCH", body: JSON.stringify({ partnerAccountId: partnerContractDraft.partnerAccountId || null, key: partnerContractDraft.key, version: partnerContractDraft.version, status: partnerContractDraft.status, schema: parseObjectJson(partnerContractDraft.schema) }) }), "Partner SDK contract updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!selectedPartnerContract} onClick={() => void run(() => apiRequest(`/enterprise/integrations/partner-sdk-contracts/${selectedPartnerContractId}/archive`, token!, { method: "POST" }), "Partner SDK contract archived.")}>Archive</button></div>
            </form>
          </div>

          <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-title"><h4>Deployment variants</h4></div><div className="entity-list">{deploymentVariants.map((item) => (<article className={`entity-card ${selectedDeploymentVariantId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.name}</h4><span className="entity-meta">{item.code}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedDeploymentVariantId(item.id); setDeploymentVariantDraft({ code: item.code, name: item.name, status: item.status, config: pretty(item.config) }); }}>Select</button></div></article>))}{!deploymentVariants.length ? <div className="empty-state">No deployment variants yet.</div> : null}</div>{selectedDeploymentVariant ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Code", selectedDeploymentVariant.code)}{detailRow("Name", selectedDeploymentVariant.name)}{detailRow("Config", selectedDeploymentVariant.config)}</div> : null}</article>
            <article className="entity-card"><div className="entity-title"><h4>Registry entries</h4></div><div className="entity-list">{registryEntries.map((item) => (<article className={`entity-card ${selectedRegistryEntryId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.connectorKey}</h4><span className="entity-meta">{item.version}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedRegistryEntryId(item.id); setRegistryDraft({ connectorKey: item.connectorKey, version: item.version, status: item.status, manifest: pretty(item.manifest) }); }}>Select</button><button className="mini-button" type="button" onClick={() => void apiRequest<EnterpriseDeveloperPackageDto>(`/enterprise/integrations/registry/${item.id}/developer-package`, token!).then((result) => { setDeveloperPackage(result); setMessage(`Developer package loaded: ${result.packageFileName}`); }).catch((error) => setMessage(error instanceof Error ? error.message : "Developer package load failed."))}>Package</button><button className="mini-button" type="button" onClick={() => void apiRequest<EnterpriseDeveloperDocsDto>(`/enterprise/integrations/registry/${item.id}/developer-docs`, token!).then((result) => { setDeveloperDocs(result); setMessage(`Developer docs loaded: ${result.connectorKey}@${result.version}`); }).catch((error) => setMessage(error instanceof Error ? error.message : "Developer docs load failed."))}>Docs</button><button className="mini-button" type="button" onClick={() => void apiRequest<IntegrationPublicationReadinessDto>(`/enterprise/integrations/registry/${item.id}/publication-readiness?visibility=PUBLIC`, token!).then((result) => { setPublicationReadiness(result); setMessage(`Publication readiness loaded: ${result.connectorKey}@${result.version}`); }).catch((error) => setMessage(error instanceof Error ? error.message : "Publication readiness load failed."))}>Readiness</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest<IntegrationPublicationDto>(`/enterprise/integrations/registry/${item.id}/publish`, token!, { method: "POST", body: JSON.stringify({ visibility: "PARTNER" }) }).then((published) => { setSelectedPublicationId(published.id); setDeveloperPackage(published.artifact.package); setDeveloperDocs(published.artifact.docs); }), `Registry entry published: ${item.connectorKey}@${item.version}`)}>Publish</button></div></article>))}{!registryEntries.length ? <div className="empty-state">No registry entries yet.</div> : null}</div>{selectedRegistryEntry ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Connector", selectedRegistryEntry.connectorKey)}{detailRow("Version", selectedRegistryEntry.version)}{detailRow("Manifest", selectedRegistryEntry.manifest)}</div> : null}</article>
          </div>

          <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-title"><h4>Connector templates</h4></div><div className="entity-list">{connectorTemplates.map((item) => (<article className={`entity-card ${selectedConnectorTemplateId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.connectorKey}</h4><span className="entity-meta">{item.version}</span></div></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedConnectorTemplateId(item.id); setConnectorTemplateDraft({ connectorKey: item.connectorKey, version: item.version, manifest: pretty(item.manifest) }); }}>Select</button></div></article>))}{!connectorTemplates.length ? <div className="empty-state">No connector templates yet.</div> : null}</div>{selectedConnectorTemplate ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Connector", selectedConnectorTemplate.connectorKey)}{detailRow("Version", selectedConnectorTemplate.version)}{detailRow("Manifest", selectedConnectorTemplate.manifest)}</div> : null}</article>
            <article className="entity-card"><div className="entity-title"><h4>Partner contracts</h4></div><div className="entity-list">{partnerContracts.map((item) => (<article className={`entity-card ${selectedPartnerContractId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.key}</h4><span className="entity-meta">{item.version}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedPartnerContractId(item.id); setPartnerContractDraft({ partnerAccountId: item.partnerAccountId ?? "", key: item.key, version: item.version, status: item.status, schema: pretty(item.schema) }); }}>Select</button></div></article>))}{!partnerContracts.length ? <div className="empty-state">No partner contracts yet.</div> : null}</div>{selectedPartnerContract ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Partner account", selectedPartnerContract.partnerAccountId ?? "none")}{detailRow("Key", selectedPartnerContract.key)}{detailRow("Schema", selectedPartnerContract.schema)}</div> : null}</article>
          </div>
          {(developerPackage || developerDocs || publications.length > 0) ? <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-title"><h4>Developer package</h4></div>{developerPackage ? <><div className="detail-grid">{detailRow("Connector", developerPackage.connectorKey)}{detailRow("Version", developerPackage.version)}{detailRow("Template version", developerPackage.compatibility.templateVersion ?? "n/a")}{detailRow("Rollout channel", developerPackage.compatibility.rolloutChannel)}{detailRow("Deprecation stage", developerPackage.lifecycle.deprecationStage)}{detailRow("Partner contract versions", developerPackage.compatibility.partnerContractVersions)}</div><textarea rows={12} value={developerPackage.content} readOnly style={{ width: "100%", marginTop: 12 }} /></> : <div className="empty-state">Select a registry entry and load a package.</div>}</article>
            <article className="entity-card"><div className="entity-title"><h4>Developer docs</h4></div>{developerDocs ? <><div className="detail-grid">{detailRow("Title", developerDocs.title)}{detailRow("Summary", developerDocs.summary)}</div><textarea rows={12} value={developerDocs.markdown} readOnly style={{ width: "100%", marginTop: 12 }} /></> : <div className="empty-state">Select a registry entry and load docs.</div>}</article>
            <article className="entity-card"><div className="entity-title"><h4>Publications</h4></div><div className="entity-list">{publications.map((item) => (<article className={`entity-card ${selectedPublicationId === item.id ? "active" : ""}`} key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.connectorKey}</h4><span className="entity-meta">{item.version}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Visibility", item.visibility)}{detailRow("Channel", item.channel)}{detailRow("Signature", item.attestation.signatureStatus)}</div><div className="action-row"><button className="mini-button" type="button" onClick={() => { setSelectedPublicationId(item.id); setDeveloperPackage(item.artifact.package); setDeveloperDocs(item.artifact.docs); }}>Select</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/publications/${item.id}/events`, token!, { method: "POST", body: JSON.stringify({ eventType: "PACKAGE_DOWNLOADED", actorType: "OPERATOR", actorKey: effectiveTenantId || "workspace" }) }), "Publication download event recorded.")}>Mark Download</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/publications/${item.id}/events`, token!, { method: "POST", body: JSON.stringify({ eventType: "DOCS_VIEWED", actorType: "OPERATOR", actorKey: effectiveTenantId || "workspace" }) }), "Publication docs view recorded.")}>Mark Docs View</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/publications/${item.id}/re-sign`, token!, { method: "POST", body: JSON.stringify({}) }), "Publication re-signed.")}>Re-sign</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/publications/${item.id}/apply-lifecycle`, token!, { method: "POST", body: JSON.stringify({}) }), "Lifecycle action applied.")}>Apply Lifecycle</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/publications/${item.id}/status`, token!, { method: "POST", body: JSON.stringify({ status: "REVOKED" }) }), "Publication revoked.")}>Revoke</button></div></article>))}{!publications.length ? <div className="empty-state">No publications yet.</div> : null}</div>{selectedPublication ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Artifact digest", selectedPublication.attestation.artifactDigest)}{detailRow("Key ref", selectedPublication.attestation.keyRef ?? "none")}{detailRow("Published at", selectedPublication.publishedAt)}</div> : null}<div className="action-row" style={{ marginTop: 12 }}><button className="ghost-button" type="button" onClick={() => void run(() => apiRequest<IntegrationPublicationLifecycleSweepDto>("/enterprise/integrations/publications/lifecycle-sweep", token!, { method: "POST", body: JSON.stringify({ dryRun: false }) }), "Lifecycle sweep completed.")}>Sweep Due Publications</button><button className="ghost-button" type="button" onClick={() => void run(() => apiRequest("/enterprise/integrations/distribution-requests/governance-sweep", token!, { method: "POST", body: JSON.stringify({ dryRun: false }) }), "Distribution grant sweep completed.")}>Sweep Expired Grants</button></div></article>
          </div> : null}
          {publicationReadiness ? <div className="entity-card" style={{ marginTop: 16 }}><div className="entity-title"><h4>Publication readiness</h4></div><div className="detail-grid">{detailRow("Connector", publicationReadiness.connectorKey)}{detailRow("Version", publicationReadiness.version)}{detailRow("Target visibility", publicationReadiness.targetVisibility)}{detailRow("Target channel", publicationReadiness.targetChannel)}{detailRow("Can publish", publicationReadiness.canPublish ? "yes" : "no")}{detailRow("Checks", publicationReadiness.checks)}</div><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Distribution policy", publicationReadiness.distributionPolicy)}{detailRow("Blocking issues", publicationReadiness.blockingIssues)}{detailRow("Warnings", publicationReadiness.warnings)}</div></div> : null}
          {distributionOverview ? <div className="entity-card" style={{ marginTop: 16 }}><div className="entity-title"><h4>Distribution overview</h4></div><div className="detail-grid">{detailRow("Scope", distributionOverview.scope)}{detailRow("Summary", distributionOverview.summary)}{detailRow("By visibility", distributionOverview.byVisibility)}{detailRow("By channel", distributionOverview.byChannel)}</div><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Last 7 days", distributionOverview.windows.last7Days)}{detailRow("Last 30 days", distributionOverview.windows.last30Days)}{detailRow("All time", distributionOverview.windows.allTime)}{detailRow("Latest portfolio signals", distributionOverview.latest)}</div><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Top publications", distributionOverview.topPublications)}</div></div> : null}
          {selectedPublication ? <div className="entity-card" style={{ marginTop: 16 }}><div className="entity-title"><h4>Publication telemetry</h4></div><div className="detail-grid">{detailRow("Connector", selectedPublication.connectorKey)}{detailRow("Version", selectedPublication.version)}{detailRow("Signature status", selectedPublication.attestation.signatureStatus)}{detailRow("Payload", selectedPublication.attestation.payload)}</div>{publicationSigningReadiness ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Current key ref", publicationSigningReadiness.signingKeyRef ?? "none")}{detailRow("Latest key ref", publicationSigningReadiness.latestAvailableKeyRef ?? "none")}{detailRow("Can re-sign", publicationSigningReadiness.canReSign ? "yes" : "no")}{detailRow("Requires rotation", publicationSigningReadiness.requiresRotation ? "yes" : "no")}{detailRow("Signing warnings", publicationSigningReadiness.warnings)}</div> : null}{publicationLifecycleReadiness ? <div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Lifecycle stage", publicationLifecycleReadiness.deprecationStage)}{detailRow("Sunset at", publicationLifecycleReadiness.sunsetAt ?? "none")}{detailRow("Action required", publicationLifecycleReadiness.actionRequired ? "yes" : "no")}{detailRow("Can auto revoke", publicationLifecycleReadiness.canAutoRevoke ? "yes" : "no")}{detailRow("Recommended status", publicationLifecycleReadiness.recommendedStatus ?? "none")}{detailRow("Lifecycle warnings", publicationLifecycleReadiness.warnings)}</div> : null}{publicationAnalytics ? <><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Total events", publicationAnalytics.totals.totalEvents)}{detailRow("Public metadata fetches", publicationAnalytics.totals.publicMetadataFetches)}{detailRow("Public package fetches", publicationAnalytics.totals.publicPackageFetches)}{detailRow("Public docs fetches", publicationAnalytics.totals.publicDocsFetches)}{detailRow("Partner metadata fetches", publicationAnalytics.totals.partnerMetadataFetches)}{detailRow("Partner package fetches", publicationAnalytics.totals.partnerPackageFetches)}{detailRow("Partner docs fetches", publicationAnalytics.totals.partnerDocsFetches)}{detailRow("Access funnel", publicationAnalytics.funnel)}{detailRow("Windows", publicationAnalytics.windows)}{detailRow("By event type", publicationAnalytics.byEventType)}</div><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Top actors", publicationAnalytics.topActors)}{detailRow("Top external actors", publicationAnalytics.topExternalActors)}{detailRow("Latest external signals", { publicMetadataFetch: publicationAnalytics.latest.publicMetadataFetch, publicPackageFetch: publicationAnalytics.latest.publicPackageFetch, publicDocsFetch: publicationAnalytics.latest.publicDocsFetch, partnerMetadataFetch: publicationAnalytics.latest.partnerMetadataFetch, partnerPackageFetch: publicationAnalytics.latest.partnerPackageFetch, partnerDocsFetch: publicationAnalytics.latest.partnerDocsFetch, accessRequest: publicationAnalytics.latest.accessRequest, approval: publicationAnalytics.latest.approval, rejection: publicationAnalytics.latest.rejection, revocation: publicationAnalytics.latest.revocation })}</div></> : null}<div className="entity-card" style={{ marginTop: 12 }}><div className="entity-title"><h4>Distribution requests</h4></div><div className="entity-list">{distributionRequests.map((item) => (<article className="entity-card" key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.companyName}</h4><span className="entity-meta">{item.contactEmail}</span></div><span className={statusClass(item.status)}>{item.status}</span></div><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Contact", item.contactName)}{detailRow("Requested channel", item.requestedChannel ?? "default")}{detailRow("Access token", item.accessToken ?? "pending")}{detailRow("Granted consumer", item.grantedConsumerKey ?? "unbound")}{detailRow("Grant expires", item.grantExpiresAt ?? "none")}{detailRow("Revoked at", item.revokedAt ?? "none")}{detailRow("Governance", distributionGovernanceReadiness[item.id] ?? { status: "loading" })}{detailRow("Intended use", item.intendedUse ?? {})}</div><div className="action-row"><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/distribution-requests/${item.id}/status`, token!, { method: "POST", body: JSON.stringify({ status: "APPROVED", grantTtlDays: 30 }) }), "Distribution request approved with 30-day grant.")}>Approve 30d</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/distribution-requests/${item.id}/status`, token!, { method: "POST", body: JSON.stringify({ status: "REJECTED" }) }), "Distribution request rejected.")}>Reject</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/distribution-requests/${item.id}/apply-governance`, token!, { method: "POST", body: JSON.stringify({}) }), "Distribution governance applied.")}>Apply Governance</button><button className="mini-button" type="button" onClick={() => void run(() => apiRequest(`/enterprise/integrations/distribution-requests/${item.id}/status`, token!, { method: "POST", body: JSON.stringify({ status: "REVOKED" }) }), "Distribution grant revoked.")}>Revoke Grant</button></div></article>))}{!distributionRequests.length ? <div className="empty-state">No distribution requests yet.</div> : null}</div></div><div className="entity-list" style={{ marginTop: 12 }}>{publicationEvents.map((item) => (<article className="entity-card" key={item.id}><div className="entity-head"><div className="entity-title"><h4>{item.eventType}</h4><span className="entity-meta">{item.actorType}</span></div><span className="entity-meta">{item.createdAt}</span></div><div className="detail-grid" style={{ marginTop: 12 }}>{detailRow("Actor key", item.actorKey ?? "none")}{detailRow("Metadata", item.metadata ?? {})}</div></article>))}{!publicationEvents.length ? <div className="empty-state">No publication events yet.</div> : null}</div></div> : null}
        </section>
      </div>

      <p className="muted-copy">Secrets are redacted in the read model. Select a resource from the list to fill the update form and apply archive or status actions.</p>
    </div>
  );
}
