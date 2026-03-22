import {
  resolveInventorySupplierProviderAdapter,
  type InventorySupplierProviderAdapterKey
} from "./inventory-supplier-provider-adapter.util";
import {
  resolveInventorySupplierProviderProfile,
  type InventorySupplierProviderProfileKey
} from "./inventory-supplier-provider-profile.util";

export type InventorySupplierProviderRuntimePolicyKey =
  | "FRESHLANE_CONTROLLED_RUNTIME"
  | "WAREDROP_MANAGED_FILE_RUNTIME"
  | "SIGNAL_SIGNED_WEBHOOK_RUNTIME";

export type InventorySupplierProviderRuntimePolicy = {
  key: InventorySupplierProviderRuntimePolicyKey;
  name: string;
  description: string;
  riskLevel: "STANDARD" | "ELEVATED" | "STRICT";
  executionModel: "INLINE_PUSH" | "FILE_EXCHANGE" | "SIGNED_CALLBACK";
  adapterKeys: InventorySupplierProviderAdapterKey[];
  profileKeys: InventorySupplierProviderProfileKey[];
  distribution: {
    requirePublicationSnapshot: boolean;
    requireSignedPublication: boolean;
    allowedVisibility: Array<"PUBLIC" | "PARTNER">;
    allowedChannels: string[];
  };
  activation: {
    requireApproval: boolean;
    requireAppliedActivation: boolean;
    requireTenantInstall: boolean;
  };
  runtime: {
    requireCurrentGovernance: boolean;
    requireCurrentSourceDigest: boolean;
    requireResolvedSecrets: boolean;
    allowGlobalFallback: boolean;
    preferredRetryExecution: "INLINE" | "WORKER";
  };
};

export type InventorySupplierProviderRuntimeCompatibility = {
  status: "READY" | "BLOCKED" | "WARN";
  blockingIssues: string[];
  warnings: string[];
  checks: Array<{
    code: string;
    status: "READY" | "BLOCKED" | "WARN";
    message: string;
  }>;
  policy: {
    key: string | null;
    name: string | null;
    riskLevel: string | null;
    executionModel: string | null;
    preferredRetryExecution: string | null;
  } | null;
};

type CompatibilityInput = {
  enforcementMode?: "STRICT" | "WARN_ONLY";
  allowApprovedActivation?: boolean;
  providerAdapterKey?: string | null;
  providerProfileKey?: string | null;
  connectorTenantId?: string | null;
  targetTenantId?: string | null;
  publicationId?: string | null;
  publicationVisibility?: string | null;
  publicationChannel?: string | null;
  publicationStatus?: string | null;
  publicationSignatureStatus?: string | null;
  requestStatus?: string | null;
  activationStatus?: string | null;
  installationSource?: string | null;
  installationPublicationId?: string | null;
  installationGovernanceStatus?: string | null;
  installationDriftStatus?: string | null;
};

const PROVIDER_RUNTIME_POLICIES: InventorySupplierProviderRuntimePolicy[] = [
  {
    key: "FRESHLANE_CONTROLLED_RUNTIME",
    name: "Freshlane Controlled Runtime",
    description:
      "Freshlane HTTP runtime expects publication-backed rollout, signed artifacts and current runtime governance.",
    riskLevel: "STRICT",
    executionModel: "INLINE_PUSH",
    adapterKeys: ["FRESHLANE_HTTP_V1"],
    profileKeys: ["HTTP_PUSH_STANDARD"],
    distribution: {
      requirePublicationSnapshot: true,
      requireSignedPublication: true,
      allowedVisibility: ["PARTNER", "PUBLIC"],
      allowedChannels: ["partner-preview", "general"]
    },
    activation: {
      requireApproval: true,
      requireAppliedActivation: true,
      requireTenantInstall: true
    },
    runtime: {
      requireCurrentGovernance: true,
      requireCurrentSourceDigest: true,
      requireResolvedSecrets: true,
      allowGlobalFallback: false,
      preferredRetryExecution: "WORKER"
    }
  },
  {
    key: "WAREDROP_MANAGED_FILE_RUNTIME",
    name: "Waredrop Managed File Runtime",
    description:
      "Waredrop file exchange should be publication-backed and tenant-installed so pickup/drop paths stay traceable.",
    riskLevel: "ELEVATED",
    executionModel: "FILE_EXCHANGE",
    adapterKeys: ["WAREDROP_FILE_V1"],
    profileKeys: ["FILE_DROP_STANDARD"],
    distribution: {
      requirePublicationSnapshot: true,
      requireSignedPublication: false,
      allowedVisibility: ["PARTNER", "PUBLIC"],
      allowedChannels: ["partner-preview", "general"]
    },
    activation: {
      requireApproval: true,
      requireAppliedActivation: true,
      requireTenantInstall: true
    },
    runtime: {
      requireCurrentGovernance: true,
      requireCurrentSourceDigest: true,
      requireResolvedSecrets: false,
      allowGlobalFallback: false,
      preferredRetryExecution: "INLINE"
    }
  },
  {
    key: "SIGNAL_SIGNED_WEBHOOK_RUNTIME",
    name: "Signal Signed Webhook Runtime",
    description:
      "Signal webhook runtime requires signed rollout artifacts and a tenant-installed callback boundary.",
    riskLevel: "STRICT",
    executionModel: "SIGNED_CALLBACK",
    adapterKeys: ["SIGNAL_WEBHOOK_V1"],
    profileKeys: ["WEBHOOK_SIGNED_STANDARD"],
    distribution: {
      requirePublicationSnapshot: true,
      requireSignedPublication: true,
      allowedVisibility: ["PARTNER", "PUBLIC"],
      allowedChannels: ["partner-preview", "general"]
    },
    activation: {
      requireApproval: true,
      requireAppliedActivation: true,
      requireTenantInstall: true
    },
    runtime: {
      requireCurrentGovernance: true,
      requireCurrentSourceDigest: true,
      requireResolvedSecrets: true,
      allowGlobalFallback: false,
      preferredRetryExecution: "INLINE"
    }
  }
];

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return value.trim().toUpperCase();
}

function normalizeChannel(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return value.trim().toLowerCase();
}

export function listInventorySupplierProviderRuntimePolicies(): InventorySupplierProviderRuntimePolicy[] {
  return PROVIDER_RUNTIME_POLICIES.map((item) => ({
    ...item,
    adapterKeys: item.adapterKeys.slice(),
    profileKeys: item.profileKeys.slice(),
    distribution: {
      ...item.distribution,
      allowedVisibility: item.distribution.allowedVisibility.slice(),
      allowedChannels: item.distribution.allowedChannels.slice()
    },
    activation: { ...item.activation },
    runtime: { ...item.runtime }
  }));
}

export function resolveInventorySupplierProviderRuntimePolicy(
  key: string | null | undefined
): InventorySupplierProviderRuntimePolicy | null {
  const normalized = typeof key === "string" ? key.trim().toUpperCase() : "";
  if (!normalized) {
    return null;
  }
  return PROVIDER_RUNTIME_POLICIES.find((item) => item.key === normalized) ?? null;
}

export function resolveInventorySupplierProviderRuntimePolicyForRuntime(input: {
  providerAdapterKey?: string | null;
  providerProfileKey?: string | null;
}): InventorySupplierProviderRuntimePolicy | null {
  const adapterKey =
    typeof input.providerAdapterKey === "string" && input.providerAdapterKey.trim()
      ? input.providerAdapterKey.trim().toUpperCase()
      : null;
  if (adapterKey) {
    const policyByAdapter =
      PROVIDER_RUNTIME_POLICIES.find((item) => item.adapterKeys.includes(adapterKey as InventorySupplierProviderAdapterKey)) ??
      null;
    if (policyByAdapter) {
      return policyByAdapter;
    }
    const adapter = resolveInventorySupplierProviderAdapter(adapterKey);
    if (adapter?.providerProfileKey) {
      return (
        PROVIDER_RUNTIME_POLICIES.find((item) => item.profileKeys.includes(adapter.providerProfileKey)) ?? null
      );
    }
  }
  const profileKey =
    typeof input.providerProfileKey === "string" && input.providerProfileKey.trim()
      ? input.providerProfileKey.trim().toUpperCase()
      : null;
  if (!profileKey) {
    return null;
  }
  const policyByProfile =
    PROVIDER_RUNTIME_POLICIES.find((item) => item.profileKeys.includes(profileKey as InventorySupplierProviderProfileKey)) ??
    null;
  if (policyByProfile) {
    return policyByProfile;
  }
  const profile = resolveInventorySupplierProviderProfile(profileKey);
  if (!profile) {
    return null;
  }
  return (
    PROVIDER_RUNTIME_POLICIES.find((item) => item.profileKeys.includes(profile.key)) ?? null
  );
}

export function evaluateInventorySupplierProviderRuntimeCompatibility(
  input: CompatibilityInput
): InventorySupplierProviderRuntimeCompatibility {
  const checks: InventorySupplierProviderRuntimeCompatibility["checks"] = [];
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const addCheck = (
    code: string,
    status: "READY" | "BLOCKED" | "WARN",
    message: string
  ) => checks.push({ code, status, message });

  const policy = resolveInventorySupplierProviderRuntimePolicyForRuntime(input);
  const enforcementMode = input.enforcementMode ?? "STRICT";
  const addPolicyIssue = (
    code: string,
    message: string,
    preferredStatus: "BLOCKED" | "WARN" = "BLOCKED"
  ) => {
    const status =
      preferredStatus === "BLOCKED" && enforcementMode === "WARN_ONLY" ? "WARN" : preferredStatus;
    if (status === "BLOCKED") {
      blockingIssues.push(message);
    } else {
      warnings.push(message);
    }
    addCheck(code, status, message);
  };
  if (!policy) {
    const hasProviderRuntime = Boolean(input.providerAdapterKey || input.providerProfileKey);
    if (hasProviderRuntime) {
      warnings.push("Provider runtime is not mapped to a managed rollout policy yet.");
      addCheck(
        "PROVIDER_POLICY_UNMANAGED",
        "WARN",
        "Provider runtime is not mapped to a managed rollout policy yet."
      );
      return {
        status: "WARN",
        blockingIssues,
        warnings,
        checks,
        policy: null
      };
    }
    return {
      status: "READY",
      blockingIssues,
      warnings,
      checks,
      policy: null
    };
  }

  addCheck("PROVIDER_POLICY_READY", "READY", `Provider policy '${policy.key}' is active.`);

  const publicationVisibility = normalizeStatus(input.publicationVisibility);
  const publicationStatus = normalizeStatus(input.publicationStatus);
  const publicationSignatureStatus = normalizeStatus(input.publicationSignatureStatus);
  const publicationChannel = normalizeChannel(input.publicationChannel);
  const activationStatus = normalizeStatus(input.activationStatus ?? input.requestStatus);
  const governanceStatus = normalizeStatus(input.installationGovernanceStatus);
  const driftStatus = normalizeStatus(input.installationDriftStatus);
  const hasTenantInstallContext = Boolean(input.connectorTenantId || input.targetTenantId);
  const hasPublicationSnapshot = Boolean(input.publicationId || input.installationPublicationId);

  if (policy.distribution.requirePublicationSnapshot) {
    if (!hasPublicationSnapshot) {
      addPolicyIssue(
        "PROVIDER_POLICY_PUBLICATION_REQUIRED",
        "Provider policy requires publication-backed rollout artifacts."
      );
    } else {
      addCheck(
        "PROVIDER_POLICY_PUBLICATION_READY",
        "READY",
        "Publication-backed rollout artifacts are available."
      );
    }
  }

  if (publicationVisibility && !policy.distribution.allowedVisibility.includes(publicationVisibility as "PUBLIC" | "PARTNER")) {
    addPolicyIssue(
      "PROVIDER_POLICY_VISIBILITY_BLOCKED",
      `Provider policy does not allow publication visibility '${publicationVisibility}'.`
    );
  } else if (publicationVisibility) {
    addCheck(
      "PROVIDER_POLICY_VISIBILITY_READY",
      "READY",
      `Publication visibility '${publicationVisibility}' is allowed.`
    );
  }

  if (publicationChannel && !policy.distribution.allowedChannels.includes(publicationChannel)) {
    addPolicyIssue(
      "PROVIDER_POLICY_CHANNEL_BLOCKED",
      `Provider policy does not allow publication channel '${publicationChannel}'.`
    );
  } else if (publicationChannel) {
    addCheck(
      "PROVIDER_POLICY_CHANNEL_READY",
      "READY",
      `Publication channel '${publicationChannel}' is allowed.`
    );
  }

  if (publicationStatus && publicationStatus !== "PUBLISHED") {
    addPolicyIssue(
      "PROVIDER_POLICY_PUBLICATION_STATUS_BLOCKED",
      "Provider policy requires an actively PUBLISHED source artifact."
    );
  } else if (hasPublicationSnapshot) {
    addCheck(
      "PROVIDER_POLICY_PUBLICATION_STATUS_READY",
      "READY",
      "Source publication status is compatible."
    );
  }

  if (policy.distribution.requireSignedPublication) {
    if (publicationSignatureStatus !== "SIGNED" && publicationSignatureStatus !== "VERIFIED") {
      addPolicyIssue(
        "PROVIDER_POLICY_SIGNATURE_BLOCKED",
        "Provider policy requires a signed or verified publication artifact."
      );
    } else {
      addCheck(
        "PROVIDER_POLICY_SIGNATURE_READY",
        "READY",
        "Publication signature status is compatible."
      );
    }
  }

  if (policy.activation.requireAppliedActivation) {
    const activationSatisfied =
      activationStatus === "APPLIED" ||
      (input.allowApprovedActivation === true && activationStatus === "APPROVED");
    if (activationStatus && !activationSatisfied) {
      addPolicyIssue(
        "PROVIDER_POLICY_ACTIVATION_BLOCKED",
        "Provider policy requires applied activation before runtime execution."
      );
    } else if (activationSatisfied) {
      addCheck(
        "PROVIDER_POLICY_ACTIVATION_READY",
        "READY",
        input.allowApprovedActivation === true && activationStatus === "APPROVED"
          ? "Activation has been approved for runtime install."
          : "Activation has been applied."
      );
    }
  } else if (policy.activation.requireApproval) {
    if (activationStatus && activationStatus !== "APPROVED" && activationStatus !== "APPLIED") {
      addPolicyIssue(
        "PROVIDER_POLICY_APPROVAL_BLOCKED",
        "Provider policy requires approved activation before rollout."
      );
    }
  }

  if (policy.activation.requireTenantInstall) {
    if (!hasTenantInstallContext) {
      warnings.push("Provider policy expects tenant-installed runtime instead of global fallback.");
      addCheck(
        "PROVIDER_POLICY_TENANT_INSTALL_RECOMMENDED",
        "WARN",
        "Provider policy expects tenant-installed runtime instead of global fallback."
      );
    } else {
      addCheck(
        "PROVIDER_POLICY_TENANT_INSTALL_READY",
        "READY",
        "Tenant-scoped rollout context is available."
      );
    }
  }

  if (input.installationSource) {
    if (policy.runtime.requireCurrentGovernance) {
      if (governanceStatus === "BLOCKED") {
        addPolicyIssue(
          "PROVIDER_POLICY_GOVERNANCE_BLOCKED",
          "Provider policy requires healthy runtime governance."
        );
      } else if (governanceStatus === "WARN" || governanceStatus === "UNKNOWN" || governanceStatus === null) {
        warnings.push("Provider policy recommends reviewing runtime governance before execution.");
        addCheck(
          "PROVIDER_POLICY_GOVERNANCE_WARN",
          "WARN",
          "Provider policy recommends reviewing runtime governance before execution."
        );
      } else {
        addCheck(
          "PROVIDER_POLICY_GOVERNANCE_READY",
          "READY",
          "Runtime governance is healthy."
        );
      }
    }

    if (policy.runtime.requireCurrentSourceDigest) {
      if (driftStatus === "DRIFTED") {
        addPolicyIssue(
          "PROVIDER_POLICY_DRIFT_BLOCKED",
          "Provider policy does not allow source-drifted runtime installs."
        );
      } else if (!driftStatus || driftStatus === "UNKNOWN") {
        warnings.push("Provider policy recommends reconciling runtime source digest before execution.");
        addCheck(
          "PROVIDER_POLICY_DRIFT_WARN",
          "WARN",
          "Provider policy recommends reconciling runtime source digest before execution."
        );
      } else {
        addCheck(
          "PROVIDER_POLICY_DRIFT_READY",
          "READY",
          "Runtime source digest matches current source artifact."
        );
      }
    }
  } else if (!policy.runtime.allowGlobalFallback) {
    warnings.push("Provider policy prefers tenant-installed runtime over direct global runtime reuse.");
    addCheck(
      "PROVIDER_POLICY_GLOBAL_FALLBACK_WARN",
      "WARN",
      "Provider policy prefers tenant-installed runtime over direct global runtime reuse."
    );
  }

  const status = checks.some((item) => item.status === "BLOCKED")
    ? "BLOCKED"
    : checks.some((item) => item.status === "WARN")
      ? "WARN"
      : "READY";
  return {
    status,
    blockingIssues,
    warnings,
    checks,
    policy: {
      key: policy.key,
      name: policy.name,
      riskLevel: policy.riskLevel,
      executionModel: policy.executionModel,
      preferredRetryExecution: policy.runtime.preferredRetryExecution
    }
  };
}
