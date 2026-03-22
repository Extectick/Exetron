"use client";

import type { InventorySupplierProviderRuntimePolicyDto } from "@exetron/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl } from "../../../lib/api";

type InventoryOverview = {
  warehouses: Array<Record<string, any>>;
  ingredients: Array<Record<string, any>>;
  items: Array<Record<string, any>>;
  reservations: Array<Record<string, any>>;
  stopListRules: Array<Record<string, any>>;
  receivingRecords: Array<Record<string, any>>;
  lowStockItems: Array<Record<string, any>>;
};

type InventoryOperationsOverview = {
  summary: Record<string, number>;
  quantities: {
    onHand: number;
    reserved: number;
    available: number;
  };
  statuses: {
    reservations: Record<string, number>;
    receivings: Record<string, number>;
  };
  latest: {
    receiving: Record<string, any> | null;
    reservation: Record<string, any> | null;
    lowStockItem: Record<string, any> | null;
    stopListRule: Record<string, any> | null;
    ledgerEntry: Record<string, any> | null;
  };
  coverage: {
    warehouseIds: string[];
    ingredientIds: string[];
    skuList: string[];
  };
};

type InventoryReplenishmentReport = {
  generatedAt: string;
  summary: {
    recommendationCount: number;
    totalRecommendedOrderQuantity: number;
    blockedByStopListCount: number;
  };
  recommendations: Array<Record<string, any>>;
};

type InventoryLedgerDrilldown = {
  totals: {
    entryCount: number;
    inboundQuantity: number;
    outboundQuantity: number;
    netQuantity: number;
  };
  byEntryType: Record<string, { count: number; quantity: number }>;
  entries: Array<Record<string, any>>;
};

type InventoryReplenishmentJob = {
  id: string;
  status: string;
  summary: {
    recommendationCount: number;
    totalRecommendedOrderQuantity: number;
    blockedByStopListCount: number;
  };
  artifact?: {
    workflow?: {
      receivingReference?: string;
      receivingStatus?: string;
      supplier?: {
        supplierName?: string;
        supplierReference?: string;
        supplierStatus?: string;
        connectorKey?: string;
        transportMode?: string;
        requireSignature?: boolean;
        requireChecksum?: boolean;
        pendingCallback?: boolean;
        pendingImport?: boolean;
        callbackPath?: string;
        callbackDeliveryId?: string;
        callbackSignatureVerified?: boolean;
        callbackSignatureKeyRef?: string;
        lastDuplicateDeliveryId?: string;
        importFormat?: string;
        pickupPath?: string;
        dropPath?: string;
        endpoint?: string;
        method?: string;
        timeoutMs?: number;
        acceptedStatusCodes?: number[];
        responseStatusField?: string;
        authKind?: string;
        authHeaderName?: string;
        authKeyRef?: string;
        providerProfileKey?: string;
        providerProfileName?: string;
        providerProfileVersion?: string;
        providerProfileVisibility?: string;
        providerProfileDefaultPolicyVisible?: boolean;
        providerProfile?: Record<string, any>;
        providerAdapterKey?: string;
        providerAdapterName?: string;
        providerAdapterVersion?: string;
        providerAdapterVisibility?: string;
        providerAdapterDefaultPolicyVisible?: boolean;
        providerAdapter?: Record<string, any>;
        importId?: string;
        importChecksumVerified?: boolean;
        lastDuplicateImportId?: string;
        lastFailureAt?: string;
        lastFailureSource?: string;
        lastFailureReason?: string;
        lastFailureCode?: string;
        lastReplayAt?: string;
        lastReplaySource?: string;
        replayCount?: number;
        lastRetryQueuedAt?: string;
        lastRetryQueuedSource?: string;
        nextRetryAt?: string;
        retryAttemptCount?: number;
        lastRetryProcessedAt?: string;
        lastRetryProcessedSource?: string;
        retryProcessedCount?: number;
        retryState?: string;
        retryPolicy?: Record<string, any>;
        deadLetterAt?: string;
        deadLetterReason?: string;
        deadLetterCode?: string;
        terminalAt?: string;
        terminalReason?: string;
        terminalCode?: string;
        reconciliation?: Record<string, any>;
        deliveryArtifact?: {
          fileName?: string;
          contentType?: string;
          endpoint?: string;
          method?: string;
          timeoutMs?: number;
          acceptedStatusCodes?: number[];
          responseStatusField?: string;
          authKind?: string;
          authHeaderName?: string;
          authKeyRef?: string;
        };
      };
    };
  };
  createdAt: string;
  updatedAt: string;
};

type InventoryReplenishmentExport = {
  jobId: string;
  status: string;
  generatedAt: string;
  filename: string;
  contentType: string;
  rowCount: number;
  content: string;
};

type InventorySupplierFilePickup = {
  jobId: string;
  connectorKey: string;
  transportMode: "FILE_IMPORT";
  externalReference: string | null;
  fileName: string;
  contentType: string;
  pickupPath: string | null;
  dropPath: string | null;
  content: string;
};

type InventorySupplierConnector = {
  id: string;
  connectorKey: string;
  version: string;
  status: string;
  manifest?: Record<string, any>;
  providerPolicyKey?: string | null;
  providerPolicy?: Record<string, any> | null;
  providerPolicySummary?: Record<string, any> | null;
  providerAdapterKey?: string;
  providerAdapterName?: string;
  providerAdapterVersion?: string;
  providerAdapterVisibility?: string;
  providerAdapterDefaultPolicyVisible?: boolean;
  providerAdapter?: Record<string, any>;
  providerProfileKey?: string;
  providerProfileName?: string;
  providerProfileVersion?: string;
  providerProfileVisibility?: string;
  providerProfileDefaultPolicyVisible?: boolean;
  providerProfile?: Record<string, any>;
};

type InventorySupplierConnectorExecution = {
  id: string;
  action: string;
  status: string;
  createdAt: string;
  connectorKey: string;
};

type InventorySupplierProviderProfile = {
  id: string;
  providerProfileKey: string;
  providerProfileName?: string | null;
  providerProfileVersion?: string | null;
  providerProfileVisibility?: string | null;
  providerProfileDefaultPolicyVisible?: boolean | null;
  status?: string | null;
  connectorCount?: number | null;
  jobCount?: number | null;
  defaultPolicy?: Record<string, any> | null;
  defaultPolicySummary?: Record<string, any> | null;
};

type InventorySupplierProviderAdapter = {
  id: string;
  providerAdapterKey: string;
  providerAdapterName?: string | null;
  providerAdapterVersion?: string | null;
  providerAdapterVisibility?: string | null;
  providerAdapterDefaultPolicyVisible?: boolean | null;
  transportMode?: string | null;
  providerProfileKey?: string | null;
  providerProfileName?: string | null;
  providerProfileVersion?: string | null;
  status?: string | null;
  connectorCount?: number | null;
  jobCount?: number | null;
  defaultPolicy?: Record<string, any> | null;
  defaultPolicySummary?: Record<string, any> | null;
};

type InventorySupplierConnectorReadinessCheck = {
  key: string;
  label: string;
  status: "READY" | "BLOCKED" | "WARN";
  reason: string | null;
  details: string | null;
};

type InventorySupplierConnectorReadinessItem = {
  id: string;
  connectorKey: string;
  status: "READY" | "BLOCKED" | "WARN";
  transportMode: string | null;
  providerPolicyKey?: string | null;
  providerPolicy?: Record<string, any> | null;
  providerPolicySummary?: Record<string, any> | null;
  providerAdapterKey?: string | null;
  providerAdapterName?: string | null;
  providerAdapterVersion?: string | null;
  providerAdapterVisibility?: string | null;
  providerAdapterDefaultPolicyVisible?: boolean | null;
  providerAdapter?: Record<string, any> | null;
  providerProfileKey?: string | null;
  providerProfileName?: string | null;
  providerProfileVersion?: string | null;
  providerProfileVisibility?: string | null;
  providerProfileDefaultPolicyVisible?: boolean | null;
  providerProfile?: Record<string, any> | null;
  checks: InventorySupplierConnectorReadinessCheck[];
  reasons: string[];
  reason: string | null;
  ready: boolean;
  activationState?: string | null;
  activationStatus?: string | null;
  activationReadiness?: Record<string, any> | null;
  activationRequestId?: string | null;
  activationPublicationId?: string | null;
  activationAppliedAt?: string | null;
  activationRequestedAt?: string | null;
  activationWarnings?: string[] | null;
  activationBlockingIssues?: string[] | null;
};

type InventorySupplierConnectorReadinessSummary = {
  totalCount: number;
  readyCount: number;
  blockedCount: number;
  warnCount: number;
};

type InventorySupplierConnectorReadiness = {
  summary: InventorySupplierConnectorReadinessSummary & Record<string, any>;
  items: InventorySupplierConnectorReadinessItem[];
};

type InventorySupplierDeadLetter = {
  id: string;
  jobId: string;
  connectorKey: string | null;
  supplierName: string | null;
  supplierReference: string | null;
  providerAdapterKey?: string | null;
  providerAdapterName?: string | null;
  providerAdapterVersion?: string | null;
  providerAdapterVisibility?: string | null;
  providerAdapterDefaultPolicyVisible?: boolean | null;
  providerAdapter?: Record<string, any> | null;
  providerProfileKey?: string | null;
  providerProfileName?: string | null;
  providerProfileVersion?: string | null;
  providerProfileVisibility?: string | null;
  providerProfileDefaultPolicyVisible?: boolean | null;
  providerProfile?: Record<string, any> | null;
  transportMode: string | null;
  retryState: string | null;
  retryAttemptCount: number | null;
  deadLetterAt: string | null;
  deadLetterCode: string | null;
  deadLetterReason: string | null;
  lastFailureAt: string | null;
  lastFailureCode: string | null;
  lastFailureReason: string | null;
  retryPolicy: Record<string, any> | null;
  terminal: boolean;
  createdAt: string;
  updatedAt: string;
};

type InventorySupplierOperationsOverview = {
  tenantId: string;
  storeId: string | null;
  summary: {
    connectorCount: number;
    activeConnectorCount: number;
    httpPushConnectorCount: number;
    retryQueuedJobCount: number;
    deadLetterJobCount: number;
    terminalJobCount: number;
    retryWorkerRunningCount: number;
  };
  transport: Record<string, number>;
  lifecycle: Record<string, number>;
  latest: {
    deadLetterJob: Record<string, any> | null;
    workerStatus: InventorySupplierRetryWorkerStatus | null;
  };
  coverage: {
    connectorKeys: string[];
    deadLetterJobIds: string[];
  };
};

type InventorySupplierConnectorActivationState = {
  id: string;
  connectorKey: string;
  version?: string | null;
  status: string;
  readiness?: string | null;
  providerPolicyKey?: string | null;
  providerPolicySummary?: Record<string, any> | null;
  requestId?: string | null;
  publicationId?: string | null;
  activationState?: string | null;
  transportMode?: string | null;
  providerAdapterKey?: string | null;
  providerProfileKey?: string | null;
  requestedAt?: string | null;
  appliedAt?: string | null;
  blockedAt?: string | null;
  reason?: string | null;
  checks?: Array<Record<string, any> | string>;
  blockingIssues?: string[];
  warnings?: string[];
};

type InventorySupplierRetryWorkerStatus = {
  enabled: boolean;
  running: boolean;
  tenantId: string | null;
  storeId: string | null;
  source: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH" | null;
  intervalMs: number;
  limit: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastResult: Record<string, number> | null;
  lastError: string | null;
  paused?: boolean;
  lastPausedAt?: string | null;
  lastResumedAt?: string | null;
  lastControlAction?: string | null;
  lastControlAt?: string | null;
};

type InventorySupplierRetryPolicy = {
  enabled: boolean;
  maxAttempts: number | null;
  initialDelayMs: number | null;
  backoffMultiplier: number | null;
  retryableStatuses: string[];
  retryableFailureCodes: string[];
  deadLetterStatus: string | null;
  deadLetterReason: string | null;
};

async function apiRequest<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed with ${response.status}`);
  }
  return payload as T;
}

async function apiRequestOptionalOld<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
  if (response.status === 404) {
    return null;
  }
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed with ${response.status}`);
  }
  return payload as T;
}

async function apiRequestOptional<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
  if (response.status === 404) {
    return null;
  }
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed with ${response.status}`);
  }
  return payload as T;
}

function fmt(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "n/a";
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function connectorTransportMode(connector: InventorySupplierConnector | null | undefined) {
  const runtime = connector?.manifest?.runtime;
  const transport = runtime?.transport;
  return String(transport?.mode ?? runtime?.mode ?? "SIMULATED").toUpperCase();
}

type InventorySupplierProviderProfileIdentity = {
  key: string | null;
  name: string | null;
  version: string | null;
  visibility: string | null;
  defaultPolicyVisible: boolean | null;
};

type InventorySupplierProviderAdapterIdentity = {
  key: string | null;
  name: string | null;
  version: string | null;
  visibility: string | null;
  defaultPolicyVisible: boolean | null;
};

function providerProfileIdentity(source: Record<string, any> | null | undefined): InventorySupplierProviderProfileIdentity {
  const record = asRecord(source);
  const nested = asRecord(record.providerProfile ?? record.providerProfileIdentity ?? record.profile);
  const key = String(record.providerProfileKey ?? nested.providerProfileKey ?? nested.key ?? nested.id ?? "").trim() || null;
  const name = String(record.providerProfileName ?? nested.providerProfileName ?? nested.name ?? nested.displayName ?? "").trim() || null;
  const version =
    String(record.providerProfileVersion ?? nested.providerProfileVersion ?? nested.version ?? nested.profileVersion ?? "").trim() || null;
  const visibilityRaw =
    record.providerProfileVisibility ??
    nested.providerProfileVisibility ??
    nested.visibility ??
    nested.policyVisibility ??
    nested.defaultPolicyVisibility ??
    null;
  const defaultPolicyVisibleRaw =
    record.providerProfileDefaultPolicyVisible ?? nested.providerProfileDefaultPolicyVisible ?? nested.defaultPolicyVisible ?? null;
  const defaultPolicyVisible =
    typeof defaultPolicyVisibleRaw === "boolean"
      ? defaultPolicyVisibleRaw
      : typeof visibilityRaw === "string"
        ? !["HIDDEN", "PRIVATE", "INTERNAL_ONLY"].includes(visibilityRaw.trim().toUpperCase())
        : null;
  const visibility =
    typeof visibilityRaw === "string" && visibilityRaw.trim()
      ? visibilityRaw.trim().toUpperCase()
      : defaultPolicyVisible === null
        ? null
        : defaultPolicyVisible
          ? "VISIBLE"
          : "HIDDEN";
  return { key, name, version, visibility, defaultPolicyVisible };
}

function providerAdapterIdentity(source: Record<string, any> | null | undefined): InventorySupplierProviderAdapterIdentity {
  const record = asRecord(source);
  const nested = asRecord(record.providerAdapter ?? record.providerAdapterIdentity ?? record.adapter);
  const key = String(record.providerAdapterKey ?? nested.providerAdapterKey ?? nested.key ?? nested.id ?? "").trim() || null;
  const name = String(record.providerAdapterName ?? nested.providerAdapterName ?? nested.name ?? nested.displayName ?? "").trim() || null;
  const version =
    String(record.providerAdapterVersion ?? nested.providerAdapterVersion ?? nested.version ?? nested.adapterVersion ?? "").trim() || null;
  const visibilityRaw =
    record.providerAdapterVisibility ??
    nested.providerAdapterVisibility ??
    nested.visibility ??
    nested.policyVisibility ??
    nested.defaultPolicyVisibility ??
    null;
  const defaultPolicyVisibleRaw =
    record.providerAdapterDefaultPolicyVisible ?? nested.providerAdapterDefaultPolicyVisible ?? nested.defaultPolicyVisible ?? null;
  const defaultPolicyVisible =
    typeof defaultPolicyVisibleRaw === "boolean"
      ? defaultPolicyVisibleRaw
      : typeof visibilityRaw === "string"
        ? !["HIDDEN", "PRIVATE", "INTERNAL_ONLY"].includes(visibilityRaw.trim().toUpperCase())
        : null;
  const visibility =
    typeof visibilityRaw === "string" && visibilityRaw.trim()
      ? visibilityRaw.trim().toUpperCase()
      : defaultPolicyVisible === null
        ? null
        : defaultPolicyVisible
          ? "VISIBLE"
          : "HIDDEN";
  return { key, name, version, visibility, defaultPolicyVisible };
}

function connectorReadinessStatus(value: unknown): "READY" | "BLOCKED" | "WARN" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "READY" || normalized === "BLOCKED" || normalized === "WARN" ? normalized : "WARN";
}

function statusClass(status?: string) {
  return `status-chip status-${String(status ?? "active").toLowerCase()}`;
}

function connectorReadinessTone(status: "READY" | "BLOCKED" | "WARN") {
  return status === "READY" ? "status-active" : status === "BLOCKED" ? "status-failed" : "status-archived";
}

function activationTone(status: string) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "READY" || normalized === "APPROVED") {
    return "status-active";
  }
  if (normalized === "BLOCKED" || normalized === "REVOKED" || normalized === "FAILED") {
    return "status-failed";
  }
  return "status-archived";
}

function activationInstallSource(item: { activationPublicationId?: string | null; activationRequestId?: string | null; publicationId?: string | null; requestId?: string | null }) {
  return item.activationPublicationId ?? item.publicationId ?? item.activationRequestId ?? item.requestId ?? "manual";
}

function activationInstallRuntime(item: { activationState?: string | null; activationStatus?: string | null; readiness?: string | null; status?: string | null }) {
  return item.activationState ?? item.activationStatus ?? item.readiness ?? item.status ?? "n/a";
}
function rolloutGovernanceSummary(item: {
  activationState?: string | null;
  activationStatus?: string | null;
  readiness?: string | null;
  status?: string | null;
  activationReadiness?: Record<string, any> | null;
  activationWarnings?: string[] | null;
  activationBlockingIssues?: string[] | null;
  warnings?: string[] | null;
  blockingIssues?: string[] | null;
}) {
  const readiness = asRecord(item.activationReadiness);
  const health = String(item.activationState ?? item.activationStatus ?? item.readiness ?? item.status ?? readiness.status ?? "n/a").trim().toUpperCase();
  const drift: string[] = [];
  const sourceState = String(item.activationState ?? item.activationStatus ?? "").trim().toUpperCase();
  const readinessState = String(item.readiness ?? readiness.status ?? "").trim().toUpperCase();
  if (sourceState && readinessState && sourceState !== readinessState) {
    drift.push(`${sourceState}→${readinessState}`);
  }
  const blockingCount =
    (Array.isArray(item.activationBlockingIssues) ? item.activationBlockingIssues.length : 0) +
    (Array.isArray(item.blockingIssues) ? item.blockingIssues.length : 0) +
    (Array.isArray(readiness.blockingIssues) ? readiness.blockingIssues.length : 0);
  const warningCount =
    (Array.isArray(item.activationWarnings) ? item.activationWarnings.length : 0) +
    (Array.isArray(item.warnings) ? item.warnings.length : 0) +
    (Array.isArray(readiness.warnings) ? readiness.warnings.length : 0);
  if (blockingCount) {
    drift.push(`blocking:${blockingCount}`);
  }
  if (warningCount) {
    drift.push(`warnings:${warningCount}`);
  }
  return {
    health,
    drift: drift.length ? drift.join(" · ") : "none",
    action: health === "BLOCKED" ? "Review drift" : health === "READY" ? "Apply install runtime" : "Refresh readiness"
  };
}
function providerRuntimePolicyCompatibility(item: {
  activationState?: string | null;
  activationStatus?: string | null;
  readiness?: string | null;
  status?: string | null;
  activationReadiness?: Record<string, any> | null;
  runtimeInstall?: Record<string, any> | null;
  providerPolicyKey?: string | null;
  providerPolicy?: Record<string, any> | null;
  providerPolicySummary?: Record<string, any> | null;
  providerAdapter?: Record<string, any> | null;
  providerProfile?: Record<string, any> | null;
}) {
  const readiness = asRecord(item.activationReadiness);
  const runtimeInstall = asRecord(item.runtimeInstall);
  const policy = asRecord(
    item.providerPolicy ??
      runtimeInstall.runtimePolicy ??
      runtimeInstall.providerRuntimePolicy ??
      readiness.providerPolicy ??
      readiness.runtimePolicy ??
      readiness.providerRuntimePolicy
  );
  const policySummary = asRecord(item.providerPolicySummary ?? readiness.providerPolicySummary);
  const health = String(policySummary.status ?? policy.status ?? readiness.status ?? item.status ?? "n/a").trim().toUpperCase();
  const compatibility = String(
    item.providerPolicyKey ??
      policy.key ??
      policySummary.policyKey ??
      item.providerProfile?.compatibility ??
      item.providerAdapter?.compatibility ??
      "GENERIC"
  ).trim().toUpperCase();
  const readinessState = String(
    policy.readiness ??
      readiness.readiness ??
      readiness.canInstall ??
      readiness.canApplyActivation ??
      readiness.canApply ??
      item.activationState ??
      item.activationStatus ??
      item.readiness ??
      item.status ??
      "n/a"
  ).trim().toUpperCase();
  return { health, compatibility, readiness: readinessState };
}

function parseConnectorReadinessCheck(value: unknown): InventorySupplierConnectorReadinessCheck {
  const record = asRecord(value);
  return {
    key: String(record.key ?? record.code ?? record.id ?? "").trim() || "check",
    label: String(record.label ?? record.name ?? record.title ?? record.key ?? "Check").trim() || "Check",
    status: connectorReadinessStatus(record.status ?? record.state ?? record.tone),
    reason:
      typeof record.reason === "string" && record.reason.trim()
        ? record.reason.trim()
        : typeof record.message === "string" && record.message.trim()
          ? record.message.trim()
          : null,
    details:
      typeof record.details === "string" && record.details.trim()
        ? record.details.trim()
        : typeof record.description === "string" && record.description.trim()
          ? record.description.trim()
          : null
  };
}

function parseConnectorReadinessItem(value: unknown): InventorySupplierConnectorReadinessItem {
  const record = asRecord(value);
  const checks = Array.isArray(record.checks) ? record.checks.map(parseConnectorReadinessCheck) : [];
  const reasons = Array.isArray(record.reasons)
    ? record.reasons.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const connectorKey = String(record.connectorKey ?? record.key ?? record.id ?? "").trim() || "n/a";
  const reason =
    typeof record.reason === "string" && record.reason.trim()
      ? record.reason.trim()
      : reasons[0] ?? checks.find((check) => check.status !== "READY")?.reason ?? null;
  return {
    id: String(record.id ?? connectorKey).trim() || connectorKey,
    connectorKey,
    status: connectorReadinessStatus(record.status ?? record.state ?? record.tone),
    transportMode:
      typeof record.transportMode === "string" && record.transportMode.trim()
        ? record.transportMode.trim().toUpperCase()
        : null,
    providerAdapterKey:
      typeof record.providerAdapterKey === "string" && record.providerAdapterKey.trim()
        ? record.providerAdapterKey.trim()
        : null,
    providerAdapterName:
      typeof record.providerAdapterName === "string" && record.providerAdapterName.trim()
        ? record.providerAdapterName.trim()
        : null,
    providerAdapterVersion:
      typeof record.providerAdapterVersion === "string" && record.providerAdapterVersion.trim()
        ? record.providerAdapterVersion.trim()
        : null,
    providerAdapterVisibility:
      typeof record.providerAdapterVisibility === "string" && record.providerAdapterVisibility.trim()
        ? record.providerAdapterVisibility.trim()
        : null,
    providerAdapterDefaultPolicyVisible:
      typeof record.providerAdapterDefaultPolicyVisible === "boolean"
        ? record.providerAdapterDefaultPolicyVisible
        : null,
    providerAdapter: asRecord(record.providerAdapter),
    providerProfileKey:
      typeof record.providerProfileKey === "string" && record.providerProfileKey.trim()
        ? record.providerProfileKey.trim()
        : null,
    providerProfileName:
      typeof record.providerProfileName === "string" && record.providerProfileName.trim()
        ? record.providerProfileName.trim()
        : null,
    providerProfileVersion:
      typeof record.providerProfileVersion === "string" && record.providerProfileVersion.trim()
        ? record.providerProfileVersion.trim()
        : null,
    providerProfileVisibility:
      typeof record.providerProfileVisibility === "string" && record.providerProfileVisibility.trim()
        ? record.providerProfileVisibility.trim()
        : null,
    providerProfileDefaultPolicyVisible:
      typeof record.providerProfileDefaultPolicyVisible === "boolean"
        ? record.providerProfileDefaultPolicyVisible
        : null,
    providerProfile: asRecord(record.providerProfile),
    providerPolicyKey:
      typeof record.providerPolicyKey === "string" && record.providerPolicyKey.trim()
        ? record.providerPolicyKey.trim()
        : null,
    providerPolicy: asRecord(record.providerPolicy),
    providerPolicySummary: asRecord(record.providerPolicySummary),
    checks,
    reasons,
    reason,
    ready: String(record.ready ?? record.isReady ?? "").toLowerCase() === "true" || connectorReadinessStatus(record.status) === "READY"
  };
}

function parseConnectorReadiness(value: unknown): InventorySupplierConnectorReadiness | null {
  if (!value) {
    return null;
  }
  const record = asRecord(value);
  const summary = asRecord(record.summary);
  return {
    summary: {
      ...summary,
      totalCount: Number(summary.totalCount ?? summary.total ?? 0),
      readyCount: Number(summary.readyCount ?? summary.ready ?? 0),
      blockedCount: Number(summary.blockedCount ?? summary.blocked ?? 0),
      warnCount: Number(summary.warnCount ?? summary.warn ?? 0)
    },
    items: Array.isArray(record.items) ? record.items.map(parseConnectorReadinessItem) : []
  };
}

function readinessSummaryLabel(readiness: InventorySupplierConnectorReadiness | null | undefined) {
  if (!readiness) {
    return "n/a";
  }
  const { readyCount, blockedCount, warnCount, totalCount } = readiness.summary;
  return `${readyCount} ready · ${blockedCount} blocked · ${warnCount} warn · ${totalCount} total`;
}

function readinessItemLabel(item: InventorySupplierConnectorReadinessItem | null | undefined) {
  if (!item) {
    return "n/a";
  }
  const parts: string[] = [item.status];
  if (item.reasons.length) {
    parts.push(item.reasons[0]);
  }
  return parts.join(" · ");
}

function formatProviderProfileIdentity(identity: InventorySupplierProviderProfileIdentity) {
  const parts = [identity.name ?? identity.key ?? "n/a"];
  if (identity.version) {
    parts.push(`v${identity.version}`);
  }
  if (identity.visibility) {
    parts.push(identity.visibility);
  }
  if (identity.defaultPolicyVisible !== null) {
    parts.push(identity.defaultPolicyVisible ? "policy visible" : "policy hidden");
  }
  return parts.join(" · ");
}

function formatProviderAdapterIdentity(identity: InventorySupplierProviderAdapterIdentity) {
  const parts = [identity.name ?? identity.key ?? "n/a"];
  if (identity.version) {
    parts.push(`v${identity.version}`);
  }
  if (identity.visibility) {
    parts.push(identity.visibility);
  }
  if (identity.defaultPolicyVisible !== null) {
    parts.push(identity.defaultPolicyVisible ? "policy visible" : "policy hidden");
  }
  return parts.join(" · ");
}

function retryPolicyFromRecord(retrySource: Record<string, any> | null | undefined): InventorySupplierRetryPolicy {
  const retry = asRecord(retrySource);
  const maxAttemptsValue = Number(retry.maxAttempts ?? retry.attempts ?? retry.retryLimit ?? retry.maxRetryAttempts);
  const initialDelayValue = Number(retry.initialDelayMs ?? retry.delayMs ?? retry.backoffInitialDelayMs);
  const backoffMultiplierValue = Number(retry.backoffMultiplier ?? retry.multiplier ?? retry.backoffFactor);
  const retryableStatuses = Array.isArray(retry.retryableStatuses)
    ? retry.retryableStatuses.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const retryableFailureCodes = Array.isArray(retry.retryableFailureCodes)
    ? retry.retryableFailureCodes.map((item) => String(item).trim()).filter(Boolean)
    : [];
  return {
    enabled: retry.enabled !== false && Boolean(Object.keys(retry).length),
    maxAttempts: Number.isFinite(maxAttemptsValue) && maxAttemptsValue > 0 ? maxAttemptsValue : null,
    initialDelayMs: Number.isFinite(initialDelayValue) && initialDelayValue >= 0 ? initialDelayValue : null,
    backoffMultiplier: Number.isFinite(backoffMultiplierValue) && backoffMultiplierValue > 0 ? backoffMultiplierValue : null,
    retryableStatuses,
    retryableFailureCodes,
    deadLetterStatus:
      typeof retry.deadLetterStatus === "string" && retry.deadLetterStatus.trim()
        ? retry.deadLetterStatus.trim().toUpperCase()
        : typeof retry.terminalStatus === "string" && retry.terminalStatus.trim()
          ? retry.terminalStatus.trim().toUpperCase()
          : null,
    deadLetterReason:
      typeof retry.deadLetterReason === "string" && retry.deadLetterReason.trim()
        ? retry.deadLetterReason.trim()
        : null
  };
}

function connectorRetryPolicy(connector: InventorySupplierConnector | null | undefined): InventorySupplierRetryPolicy {
  const runtime = asRecord(connector?.manifest?.runtime);
  const transport = asRecord(runtime.transport);
  return retryPolicyFromRecord(transport.retryPolicy ?? transport.retry ?? runtime.retryPolicy ?? runtime.retry);
}

function formatRetryPolicy(policy: InventorySupplierRetryPolicy): string {
  if (!policy.enabled) {
    return "off";
  }
  const parts = [
    policy.maxAttempts ? `${policy.maxAttempts} attempts` : "attempts n/a",
    policy.initialDelayMs != null ? `${policy.initialDelayMs}ms initial delay` : "delay n/a",
    policy.backoffMultiplier != null ? `${policy.backoffMultiplier}x backoff` : "backoff n/a"
  ];
  return parts.join(" · ");
}

function supplierRetryLifecycle(job: InventoryReplenishmentJob) {
  const supplier = job.artifact?.workflow?.supplier ?? {};
  const reconciliation = asRecord(supplier.reconciliation);
  const retryPolicy = asRecord(supplier.retryPolicy);
  const retryStateRaw = String(
    reconciliation.status ?? supplier.retryState ?? supplier.reconciliation?.retryState ?? "n/a"
  )
    .trim()
    .toUpperCase();
  const deadLetterReason =
    supplier.deadLetterReason ?? reconciliation.deadLetterReason ?? supplier.lastFailureReason ?? null;
  const deadLetterCode =
    supplier.deadLetterCode ?? reconciliation.deadLetterCode ?? supplier.lastFailureCode ?? null;
  const terminal =
    retryStateRaw === "DEAD_LETTER" ||
    retryStateRaw === "TERMINAL" ||
    retryStateRaw === "EXHAUSTED" ||
    retryStateRaw === "ABANDONED" ||
    String(supplier.deadLetterAt ?? reconciliation.deadLetterAt ?? "").trim().length > 0;
  const queued = retryStateRaw === "RETRY_QUEUED" || retryStateRaw === "QUEUED";
  const retrying = retryStateRaw === "RETRY_DISPATCHED" || retryStateRaw === "RETRYING";
  const failed = retryStateRaw === "FAILED";
  const label = terminal
    ? "DEAD LETTER"
    : queued
      ? "RETRY QUEUED"
      : retrying
        ? "RETRYING"
        : failed
          ? "FAILED"
          : retryStateRaw === "REPLAYED"
            ? "REPLAYED"
            : retryStateRaw;
  const tone = terminal ? "status-failed" : queued || retrying ? "status-active" : failed ? "status-failed" : "status-archived";
  const policy = retryPolicyFromRecord(retryPolicy);

  return {
    label,
    tone,
    terminal,
    retryState: retryStateRaw,
    retryPolicy: policy,
    deadLetterCode,
    deadLetterReason,
    retryCount: Number(supplier.retryAttemptCount ?? 0),
    retryProcessedCount: Number(supplier.retryProcessedCount ?? 0)
  };
}

function supplierExecutionClass(source: Record<string, any> | null | undefined, lifecycleHint?: ReturnType<typeof supplierRetryLifecycle>) {
  const record = asRecord(source);
  const supplier = asRecord(record.supplier ?? record.workflow?.supplier ?? record.artifact?.workflow?.supplier ?? record);
  const transportMode = String(record.transportMode ?? supplier.transportMode ?? "MANUAL").trim().toUpperCase();
  const retryState = String(record.retryState ?? supplier.retryState ?? lifecycleHint?.retryState ?? "n/a").trim().toUpperCase();
  const deadLetterCode = String(record.deadLetterCode ?? supplier.deadLetterCode ?? lifecycleHint?.deadLetterCode ?? "").trim().toUpperCase();
  const deadLetterReason = String(record.deadLetterReason ?? supplier.deadLetterReason ?? lifecycleHint?.deadLetterReason ?? "").trim();
  const terminal =
    Boolean(record.terminal ?? lifecycleHint?.terminal) ||
    retryState === "DEAD_LETTER" ||
    retryState === "TERMINAL" ||
    retryState === "EXHAUSTED" ||
    retryState === "ABANDONED";
  const requireSignature = Boolean(record.requireSignature ?? supplier.requireSignature);
  const callbackSignatureVerified = Boolean(record.callbackSignatureVerified ?? supplier.callbackSignatureVerified);
  const requireChecksum = Boolean(record.requireChecksum ?? supplier.requireChecksum);
  const importChecksumVerified = Boolean(record.importChecksumVerified ?? supplier.importChecksumVerified);

  if (terminal) {
    return {
      label: "DEAD LETTER",
      tone: "status-failed",
      className: deadLetterCode.startsWith("POLICY") ? "POLICY_DEAD_LETTER" : "DEAD_LETTER",
      readiness: "BLOCKED",
      reason: deadLetterReason || deadLetterCode || "terminal"
    };
  }

  if (requireSignature && !callbackSignatureVerified) {
    return {
      label: "WEBHOOK SIGNATURE BLOCKED",
      tone: "status-failed",
      className: "SIGNATURE_REQUIRED",
      readiness: "BLOCKED",
      reason: deadLetterReason || "Webhook callback signature verification required"
    };
  }

  if (requireChecksum && !importChecksumVerified) {
    return {
      label: "FILE CHECKSUM BLOCKED",
      tone: "status-failed",
      className: "CHECKSUM_REQUIRED",
      readiness: "BLOCKED",
      reason: deadLetterReason || "File import checksum verification required"
    };
  }

  if (retryState === "RETRY_QUEUED") {
    return {
      label: "RETRY QUEUED",
      tone: "status-active",
      className: "RETRY_QUEUED",
      readiness: "RETRYABLE",
      reason: deadLetterReason || "Retry queued for execution"
    };
  }

  if (retryState === "RETRY_DISPATCHED" || retryState === "RETRYING") {
    return {
      label: "RETRYING",
      tone: "status-active",
      className: "RETRYING",
      readiness: "RETRYING",
      reason: deadLetterReason || "Retry in progress"
    };
  }

  if (deadLetterCode.startsWith("POLICY") || deadLetterCode.startsWith("CONFIG")) {
    return {
      label: "POLICY BLOCKED",
      tone: "status-failed",
      className: "POLICY_BLOCKED",
      readiness: "BLOCKED",
      reason: deadLetterReason || deadLetterCode || "Policy blocked"
    };
  }

  if (deadLetterCode.startsWith("SIGNATURE")) {
    return {
      label: "SIGNATURE FAILURE",
      tone: "status-failed",
      className: "SIGNATURE_FAILURE",
      readiness: "RETRYABLE",
      reason: deadLetterReason || deadLetterCode || "Signature failure"
    };
  }

  if (deadLetterCode.startsWith("CHECKSUM")) {
    return {
      label: "CHECKSUM FAILURE",
      tone: "status-failed",
      className: "CHECKSUM_FAILURE",
      readiness: "RETRYABLE",
      reason: deadLetterReason || deadLetterCode || "Checksum failure"
    };
  }

  if (deadLetterCode.startsWith("NETWORK") || deadLetterCode.startsWith("TIMEOUT") || deadLetterCode.startsWith("HTTP") || transportMode === "HTTP_PUSH") {
    return {
      label: "RETRYABLE",
      tone: "status-active",
      className: "RETRYABLE",
      readiness: "READY",
      reason: deadLetterReason || deadLetterCode || "Provider retry may recover"
    };
  }

  return {
    label: "READY",
    tone: "status-active",
    className: "READY",
    readiness: "READY",
    reason: deadLetterReason || "Ready for supplier execution"
  };
}

export default function InventoryPage() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [tenantId, setTenantId] = useState(session?.me?.claims.tenantId ?? "");
  const [storeId, setStoreId] = useState("");
  const [workspace, setWorkspace] = useState<InventoryOverview | null>(null);
  const [operationsOverview, setOperationsOverview] = useState<InventoryOperationsOverview | null>(null);
  const [supplierOperationsOverview, setSupplierOperationsOverview] = useState<InventorySupplierOperationsOverview | null>(null);
  const [replenishmentReport, setReplenishmentReport] = useState<InventoryReplenishmentReport | null>(null);
  const [replenishmentJobs, setReplenishmentJobs] = useState<InventoryReplenishmentJob[]>([]);
  const [supplierProviderPolicies, setSupplierProviderPolicies] = useState<InventorySupplierProviderRuntimePolicyDto[]>([]);
  const [supplierProviderAdapters, setSupplierProviderAdapters] = useState<InventorySupplierProviderAdapter[]>([]);
  const [supplierProviderProfiles, setSupplierProviderProfiles] = useState<InventorySupplierProviderProfile[]>([]);
  const [supplierConnectorReadiness, setSupplierConnectorReadiness] = useState<InventorySupplierConnectorReadiness | null>(null);
  const [supplierConnectorActivationState, setSupplierConnectorActivationState] = useState<InventorySupplierConnectorActivationState[]>([]);
  const [supplierConnectors, setSupplierConnectors] = useState<InventorySupplierConnector[]>([]);
  const [supplierDeadLetters, setSupplierDeadLetters] = useState<InventorySupplierDeadLetter[]>([]);
  const [supplierExecutions, setSupplierExecutions] = useState<InventorySupplierConnectorExecution[]>([]);
  const [supplierExecutionJobId, setSupplierExecutionJobId] = useState("");
  const [replenishmentExport, setReplenishmentExport] = useState<InventoryReplenishmentExport | null>(null);
  const [supplierFilePickup, setSupplierFilePickup] = useState<InventorySupplierFilePickup | null>(null);
  const [retryWorkerStatus, setRetryWorkerStatus] = useState<InventorySupplierRetryWorkerStatus | null>(null);
  const [ledgerDrilldown, setLedgerDrilldown] = useState<InventoryLedgerDrilldown | null>(null);
  const [availability, setAvailability] = useState<Record<string, any> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [receivingId, setReceivingId] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [warehouseDraft, setWarehouseDraft] = useState({ code: "main", name: "Main Warehouse", kind: "STORAGE", notes: "Primary cold storage" });
  const [ingredientDraft, setIngredientDraft] = useState({ code: "salmon", name: "Salmon Fillet", unit: "GRAM", lowStockThreshold: "2" });
  const [itemDraft, setItemDraft] = useState({ sku: "SALMON-001", onHand: "4", reserved: "0", reorderPoint: "5" });
  const [receivingDraft, setReceivingDraft] = useState({ reference: "RCV-1001", receivedBy: "Warehouse Lead", quantity: "6", unitCost: "5.50" });
  const [adjustmentDraft, setAdjustmentDraft] = useState({ adjustmentType: "ADD", quantity: "1", reason: "Counting correction" });
  const [reservationDraft, setReservationDraft] = useState({ sourceType: "order", sourceId: "order-demo-1", quantity: "2" });
  const [stopRuleDraft, setStopRuleDraft] = useState({ sku: "SALMON-001", ruleType: "LOW_STOCK", threshold: "4", isActive: true });
  const [availabilityDraft, setAvailabilityDraft] = useState({ productId: "", variantId: "" });
  const [selectedSupplierConnectorKey, setSelectedSupplierConnectorKey] = useState("");

  const canWork = Boolean(token && tenantId.trim());
  const supplierConnectorReadinessItems = supplierConnectorReadiness?.items ?? [];
  const supplierRuntimeOverview = {
    connectors: supplierConnectors.length,
    profiles: supplierProviderProfiles.length,
    adapters: supplierProviderAdapters.length,
    policies: supplierProviderPolicies.length,
    ready: supplierConnectorReadiness?.summary?.readyCount ?? supplierConnectorReadinessItems.filter((item) => item.status === "READY").length,
    blocked: supplierConnectorReadiness?.summary?.blockedCount ?? supplierConnectorReadinessItems.filter((item) => item.status === "BLOCKED").length,
    warn: supplierConnectorReadiness?.summary?.warnCount ?? supplierConnectorReadinessItems.filter((item) => item.status === "WARN").length,
    retryableJobs: replenishmentJobs.filter((job) => {
      const classInfo = supplierExecutionClass(job.artifact?.workflow?.supplier ?? null, supplierRetryLifecycle(job));
      return classInfo.className === "RETRYABLE" || classInfo.className === "RETRY_QUEUED" || classInfo.className === "RETRYING";
    }).length,
    policyBlockedJobs: replenishmentJobs.filter((job) => {
      const classInfo = supplierExecutionClass(job.artifact?.workflow?.supplier ?? null, supplierRetryLifecycle(job));
      return classInfo.className === "POLICY_BLOCKED" || classInfo.className === "SIGNATURE_REQUIRED" || classInfo.className === "CHECKSUM_REQUIRED";
    }).length,
    terminalJobs: replenishmentJobs.filter((job) => supplierRetryLifecycle(job).terminal).length,
    deadLetters: supplierDeadLetters.length
  };

  const loadWorkspace = useCallback(async () => {
    if (!token || !tenantId.trim()) {
      return;
    }
    const query = new URLSearchParams({ tenantId: tenantId.trim() });
    if (storeId.trim()) {
      query.set("storeId", storeId.trim());
    }
    const [
      data,
      operations,
      supplierOperations,
      replenishment,
      replenishmentJobList,
      providerPolicies,
      providerAdapters,
      providerProfiles,
      connectorReadiness,
      connectorActivationState,
      connectors,
      deadLetters,
      ledger,
      retryWorker
    ] = await Promise.all([
      apiRequest<InventoryOverview>(`/inventory/overview?${query.toString()}`, token),
      apiRequest<InventoryOperationsOverview>(`/inventory/operations-overview?${query.toString()}`, token),
      apiRequest<InventorySupplierOperationsOverview>(`/inventory/supplier-operations-overview?${query.toString()}`, token),
      apiRequest<InventoryReplenishmentReport>(`/inventory/replenishment-report?${query.toString()}${warehouseId ? `&warehouseId=${encodeURIComponent(warehouseId)}` : ""}`, token),
      apiRequest<InventoryReplenishmentJob[]>(`/inventory/replenishment-jobs?${query.toString()}${warehouseId ? `&warehouseId=${encodeURIComponent(warehouseId)}` : ""}`, token),
      apiRequest<InventorySupplierProviderRuntimePolicyDto[]>(`/inventory/supplier-provider-policies?${query.toString()}`, token),
      apiRequest<InventorySupplierProviderAdapter[]>(`/inventory/supplier-provider-adapters?${query.toString()}`, token),
      apiRequest<InventorySupplierProviderProfile[]>(`/inventory/supplier-provider-profiles?${query.toString()}`, token),
      apiRequestOptional<InventorySupplierConnectorReadiness>(`/inventory/supplier-connector-readiness?${query.toString()}`, token),
      apiRequestOptional<Array<InventorySupplierConnectorActivationState>>(`/inventory/supplier-connector-activation-state?${query.toString()}`, token),
      apiRequest<InventorySupplierConnector[]>(`/inventory/supplier-connectors?${query.toString()}`, token),
      apiRequest<InventorySupplierDeadLetter[]>(`/inventory/supplier-dead-letters?${query.toString()}`, token),
      apiRequest<InventoryLedgerDrilldown>(`/inventory/ledger-drilldown?${query.toString()}${warehouseId ? `&warehouseId=${encodeURIComponent(warehouseId)}` : ""}${ingredientId ? `&ingredientId=${encodeURIComponent(ingredientId)}` : ""}&limit=25`, token),
      apiRequest<InventorySupplierRetryWorkerStatus>(`/inventory/supplier-retry-worker-status`, token)
    ]);
    setWorkspace(data);
    setOperationsOverview(operations);
    setSupplierOperationsOverview(supplierOperations);
    setReplenishmentReport(replenishment);
    setReplenishmentJobs(replenishmentJobList);
    setSupplierProviderPolicies(providerPolicies);
    setSupplierProviderAdapters(providerAdapters);
    setSupplierProviderProfiles(providerProfiles);
    setSupplierConnectorReadiness(parseConnectorReadiness(connectorReadiness));
    setSupplierConnectorActivationState(Array.isArray(connectorActivationState) ? connectorActivationState : []);
    setSupplierConnectors(connectors);
    setSupplierDeadLetters(deadLetters);
    setLedgerDrilldown(ledger);
    setRetryWorkerStatus(retryWorker);
    setMessage(null);
    if (!warehouseId && data.warehouses[0]) {
      setWarehouseId(data.warehouses[0].id);
    }
    if (!ingredientId && data.ingredients[0]) {
      setIngredientId(data.ingredients[0].id);
    }
    if (!selectedSupplierConnectorKey && connectors[0]) {
      setSelectedSupplierConnectorKey(connectors[0].connectorKey);
    }
  }, [ingredientId, selectedSupplierConnectorKey, storeId, tenantId, token, warehouseId]);

  useEffect(() => {
    if (!canWork) {
      return;
    }
    void loadWorkspace().catch((error) => setMessage(error instanceof Error ? error.message : "Inventory load failed."));
  }, [canWork, loadWorkspace]);

  const selectedWarehouse = useMemo(() => workspace?.warehouses.find((item) => item.id === warehouseId) ?? null, [warehouseId, workspace?.warehouses]);
  const selectedIngredient = useMemo(() => workspace?.ingredients.find((item) => item.id === ingredientId) ?? null, [ingredientId, workspace?.ingredients]);
  const selectedSupplierConnector = useMemo(
    () => supplierConnectors.find((item) => item.connectorKey === selectedSupplierConnectorKey) ?? null,
    [selectedSupplierConnectorKey, supplierConnectors]
  );
  const selectedSupplierConnectorReadiness = useMemo(
    () => supplierConnectorReadiness?.items.find((item) => item.connectorKey === selectedSupplierConnectorKey) ?? null,
    [selectedSupplierConnectorKey, supplierConnectorReadiness?.items]
  );

  async function run(action: () => Promise<unknown>, note: string) {
    try {
      await action();
      setMessage(note);
      await loadWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Inventory action failed.");
    }
  }

  async function loadSupplierExecutions(jobId: string) {
    if (!token) {
      return;
    }
    try {
      const result = await apiRequest<InventorySupplierConnectorExecution[]>(
        `/inventory/replenishment-jobs/${jobId}/connector-executions`,
        token
      );
      setSupplierExecutionJobId(jobId);
      setSupplierExecutions(result);
      setMessage("Connector execution history loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution history load failed.");
    }
  }

  async function controlSupplierRetryWorker(action: "run-now" | "pause" | "resume") {
    if (!token) {
      return;
    }
    const labels: Record<"run-now" | "pause" | "resume", string> = {
      "run-now": "Supplier retry worker run requested.",
      pause: "Supplier retry worker paused.",
      resume: "Supplier retry worker resumed."
    };
    await run(
      () =>
        apiRequest(`/inventory/supplier-retry-worker/${action}`, token, {
          method: "POST"
        }),
      labels[action]
    );
  }

  async function reopenSupplierDeadLetter(jobId: string) {
    if (!token) {
      return;
    }
    await run(
      () =>
        apiRequest(`/inventory/replenishment-jobs/${jobId}/supplier-dead-letter-reopen`, token, {
          method: "POST",
          body: JSON.stringify({
            note: "Operator reopened dead-letter supplier artifact."
          })
        }),
      "Supplier dead-letter artifact reopened."
    );
  }

  return (
    <div className="stack-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PHASE 18</span>
            <h2>Inventory operations</h2>
            <p>Use selected warehouse and ingredient context instead of posting raw JSON blobs.</p>
          </div>
          <button className="ghost-button" disabled={!canWork} onClick={() => void loadWorkspace()}>
            Refresh
          </button>
        </div>
        {message ? <p className="error-banner">{message}</p> : null}
        {retryWorkerStatus ? (
          <div className="detail-grid" style={{ marginBottom: 16 }}>
            <div><strong>Retry worker</strong><span>{retryWorkerStatus.enabled ? "enabled" : "disabled"}</span></div>
            <div><strong>Running</strong><span>{retryWorkerStatus.running ? "yes" : "no"}</span></div>
            <div><strong>Paused</strong><span>{retryWorkerStatus.paused ? "yes" : "no"}</span></div>
            <div><strong>Interval</strong><span>{retryWorkerStatus.intervalMs} ms</span></div>
            <div><strong>Scope</strong><span>{retryWorkerStatus.tenantId ?? "n/a"}{retryWorkerStatus.storeId ? ` · ${retryWorkerStatus.storeId}` : ""}</span></div>
            <div><strong>Last run</strong><span>{fmt(retryWorkerStatus.lastRunAt)}</span></div>
            <div><strong>Last success</strong><span>{fmt(retryWorkerStatus.lastSuccessAt)}</span></div>
            <div><strong>Last control</strong><span>{retryWorkerStatus.lastControlAction ? `${retryWorkerStatus.lastControlAction} · ${fmt(retryWorkerStatus.lastControlAt)}` : "n/a"}</span></div>
          </div>
        ) : null}
        {retryWorkerStatus ? (
          <div className="action-row" style={{ marginBottom: 16 }}>
            <button
              className="ghost-button"
              type="button"
              disabled={!token || retryWorkerStatus.running}
              onClick={() => void controlSupplierRetryWorker("run-now")}
            >
              Run Now
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={!token || retryWorkerStatus.paused === true}
              onClick={() => void controlSupplierRetryWorker("pause")}
            >
              Pause Worker
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={!token || retryWorkerStatus.paused !== true}
              onClick={() => void controlSupplierRetryWorker("resume")}
            >
              Resume Worker
            </button>
          </div>
        ) : null}
        <div className="summary-grid" style={{ marginBottom: 16 }}>
          <article className="summary-card">
            <span>Provider runtime</span>
            <strong>{supplierRuntimeOverview.connectors}</strong>
            <span>{supplierRuntimeOverview.adapters} adapters · {supplierRuntimeOverview.profiles} profiles</span>
          </article>
          <article className="summary-card">
            <span>Readiness</span>
            <strong>{supplierRuntimeOverview.ready}</strong>
            <span>{supplierRuntimeOverview.blocked} blocked · {supplierRuntimeOverview.warn} warnings</span>
          </article>
          <article className="summary-card">
            <span>Execution classes</span>
            <strong>{supplierRuntimeOverview.retryableJobs}</strong>
            <span>{supplierRuntimeOverview.policyBlockedJobs} policy-blocked · {supplierRuntimeOverview.terminalJobs} terminal</span>
          </article>
          <article className="summary-card">
            <span>Dead letters</span>
            <strong>{supplierRuntimeOverview.deadLetters}</strong>
            <span>{supplierRuntimeOverview.policies} policy baselines</span>
          </article>
        </div>
        <div className="toolbar">
          <label className="field" style={{ minWidth: 260 }}>
            <span>Tenant ID</span>
            <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
          </label>
          <label className="field" style={{ minWidth: 260 }}>
            <span>Store ID</span>
            <input value={storeId} onChange={(event) => setStoreId(event.target.value)} />
          </label>
          <label className="field" style={{ minWidth: 260 }}>
            <span>Warehouse</span>
            <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
              <option value="">Select warehouse</option>
              {(workspace?.warehouses ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.code} · {item.name}</option>
              ))}
            </select>
          </label>
          <label className="field" style={{ minWidth: 260 }}>
            <span>Ingredient</span>
            <select value={ingredientId} onChange={(event) => setIngredientId(event.target.value)}>
              <option value="">Select ingredient</option>
              {(workspace?.ingredients ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.code} · {item.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="summary-grid">
          <article className="summary-card"><span>Warehouses</span><strong>{workspace?.warehouses.length ?? 0}</strong><span>{workspace?.warehouses.filter((item) => item.isActive).length ?? 0} active</span></article>
          <article className="summary-card"><span>Ingredients</span><strong>{workspace?.ingredients.length ?? 0}</strong><span>Catalog inputs</span></article>
          <article className="summary-card"><span>Stock Items</span><strong>{workspace?.items.length ?? 0}</strong><span>{workspace?.lowStockItems.length ?? 0} low stock</span></article>
          <article className="summary-card"><span>Reservations</span><strong>{workspace?.reservations.length ?? 0}</strong><span>{workspace?.reservations.filter((item) => item.status === "ACTIVE").length ?? 0} active</span></article>
        </div>
        {operationsOverview ? (
          <article className="entity-card" style={{ marginTop: 16 }}>
            <div className="entity-head">
              <div className="entity-title">
                <h3 style={{ margin: 0 }}>Operations Snapshot</h3>
                <span className="entity-meta inline-code">{operationsOverview.coverage.skuList.join(", ") || "No SKUs yet"}</span>
              </div>
              <span className="status-chip status-active">LIVE</span>
            </div>
            <div className="detail-grid">
              <div><strong>On hand</strong><span>{operationsOverview.quantities.onHand}</span></div>
              <div><strong>Reserved</strong><span>{operationsOverview.quantities.reserved}</span></div>
              <div><strong>Available</strong><span>{operationsOverview.quantities.available}</span></div>
              <div><strong>Low-stock items</strong><span>{operationsOverview.summary.lowStockItemCount}</span></div>
              <div><strong>Open receivings</strong><span>{operationsOverview.summary.openReceivingCount}</span></div>
              <div><strong>Active stop-rules</strong><span>{operationsOverview.summary.activeStopListRuleCount}</span></div>
            </div>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <div><strong>Receiving statuses</strong><span className="inline-code">{JSON.stringify(operationsOverview.statuses.receivings)}</span></div>
              <div><strong>Reservation statuses</strong><span className="inline-code">{JSON.stringify(operationsOverview.statuses.reservations)}</span></div>
              <div><strong>Latest receiving</strong><span>{operationsOverview.latest.receiving?.reference ?? "n/a"}</span></div>
              <div><strong>Latest reservation</strong><span>{operationsOverview.latest.reservation?.sourceId ?? "n/a"}</span></div>
              <div><strong>Latest low-stock SKU</strong><span>{operationsOverview.latest.lowStockItem?.sku ?? "n/a"}</span></div>
              <div><strong>Latest stop rule</strong><span>{operationsOverview.latest.stopListRule?.ruleType ?? "n/a"}</span></div>
            </div>
          </article>
        ) : null}
        {supplierOperationsOverview ? (
          <article className="entity-card" style={{ marginTop: 16 }}>
            <div className="entity-head">
              <div className="entity-title">
                <h3 style={{ margin: 0 }}>Supplier control plane</h3>
                <span className="entity-meta inline-code">
                  {supplierOperationsOverview.coverage.connectorKeys.join(", ") || "No connector coverage yet"}
                </span>
              </div>
              <span className="status-chip status-active">CONTROL PLANE</span>
            </div>
            <div className="summary-grid">
              <article className="summary-card">
                <span>Connectors</span>
                <strong>{supplierOperationsOverview.summary.connectorCount}</strong>
                <span>{supplierOperationsOverview.summary.activeConnectorCount} active</span>
              </article>
              <article className="summary-card">
                <span>HTTP push</span>
                <strong>{supplierOperationsOverview.summary.httpPushConnectorCount}</strong>
                <span>push-capable</span>
              </article>
              <article className="summary-card">
                <span>Retry queued</span>
                <strong>{supplierOperationsOverview.summary.retryQueuedJobCount}</strong>
                <span>queued for worker</span>
              </article>
              <article className="summary-card">
                <span>Dead letters</span>
                <strong>{supplierOperationsOverview.summary.deadLetterJobCount}</strong>
                <span>terminal artifacts</span>
              </article>
            </div>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <div><strong>Transport mix</strong><span className="inline-code">{JSON.stringify(supplierOperationsOverview.transport)}</span></div>
              <div><strong>Lifecycle mix</strong><span className="inline-code">{JSON.stringify(supplierOperationsOverview.lifecycle)}</span></div>
              <div><strong>Latest dead letter</strong><span>{supplierOperationsOverview.latest.deadLetterJob?.connectorKey ?? "n/a"}</span></div>
              <div><strong>Worker status</strong><span>{supplierOperationsOverview.latest.workerStatus?.paused ? "paused" : supplierOperationsOverview.latest.workerStatus?.running ? "running" : "idle"}</span></div>
            </div>
          </article>
        ) : null}
        <article className="entity-card" style={{ marginTop: 16 }}>
          <div className="entity-head">
            <div className="entity-title">
              <h3 style={{ margin: 0 }}>Connector onboarding readiness</h3>
              <span className="entity-meta">Adapter, profile and secret checks before supplier handoff</span>
            </div>
            <span className="status-chip status-active">READINESS</span>
          </div>
          {supplierConnectorReadiness ? (
            <>
              <div className="summary-grid">
                <article className="summary-card">
                  <span>Total</span>
                  <strong>{supplierConnectorReadiness.summary.totalCount}</strong>
                  <span>connectors evaluated</span>
                </article>
                <article className="summary-card">
                  <span>Ready</span>
                  <strong>{supplierConnectorReadiness.summary.readyCount}</strong>
                  <span>good to onboard</span>
                </article>
                <article className="summary-card">
                  <span>Blocked</span>
                  <strong>{supplierConnectorReadiness.summary.blockedCount}</strong>
                  <span>missing required config</span>
                </article>
                <article className="summary-card">
                  <span>Warn</span>
                  <strong>{supplierConnectorReadiness.summary.warnCount}</strong>
                  <span>needs operator review</span>
                </article>
              </div>
              <div className="detail-grid" style={{ marginTop: 12 }}>
                <div><strong>Selected connector readiness</strong><span>{readinessItemLabel(selectedSupplierConnectorReadiness)}</span></div>
                <div><strong>Selected reasons</strong><span>{selectedSupplierConnectorReadiness?.reasons.length ? selectedSupplierConnectorReadiness.reasons.join(" · ") : "n/a"}</span></div>
                <div><strong>Selected checks</strong><span>{selectedSupplierConnectorReadiness?.checks.length ? selectedSupplierConnectorReadiness.checks.map((check) => `${check.label}: ${check.status}`).join(" · ") : "n/a"}</span></div>
                <div><strong>Readiness scope</strong><span>{readinessSummaryLabel(supplierConnectorReadiness)}</span></div>
              </div>
              <div className="entity-list" style={{ marginTop: 16 }}>
                {supplierConnectorReadiness.items.map((item) => {
                  const adapterIdentity = providerAdapterIdentity(item);
                  const profileIdentity = providerProfileIdentity(item);
                  return (
                    <article className="entity-card" key={item.id}>
                      <div className="entity-head">
                        <div className="entity-title">
                          <h4>{item.connectorKey}</h4>
                          <span className="entity-meta">
                            {readinessItemLabel(item)} · {formatProviderAdapterIdentity(adapterIdentity)} · {formatProviderProfileIdentity(profileIdentity)}
                          </span>
                        </div>
                        <div className="action-row" style={{ gap: 8 }}>
                          <span className={`status-chip ${connectorReadinessTone(item.status)}`}>{item.status}</span>
                          <span className="status-chip status-archived">{item.transportMode ?? "n/a"}</span>
                        </div>
                      </div>
                      <div className="detail-grid">
                        <div><strong>Provider adapter</strong><span>{formatProviderAdapterIdentity(adapterIdentity)}</span></div>
                        <div><strong>Provider profile</strong><span>{formatProviderProfileIdentity(profileIdentity)}</span></div>
                        <div><strong>Provider policy health</strong><span>{providerRuntimePolicyCompatibility(item).health}</span></div>
                        <div><strong>Provider compatibility</strong><span>{providerRuntimePolicyCompatibility(item).compatibility}</span></div>
                        <div><strong>Provider readiness</strong><span>{providerRuntimePolicyCompatibility(item).readiness}</span></div>
                        <div><strong>Provider policy</strong><span>{item.providerPolicyKey ?? "n/a"}</span></div>
                        <div><strong>Policy detail</strong><span className="inline-code">{JSON.stringify(item.providerPolicy ?? {})}</span></div>
                        <div><strong>Install source</strong><span>{activationInstallSource(item)}</span></div>
                        <div><strong>Installed runtime</strong><span>{activationInstallRuntime(item)}</span></div>
                        <div><strong>Rollout governance</strong><span>{rolloutGovernanceSummary(item).health}</span></div>
                        <div><strong>Governance drift</strong><span>{rolloutGovernanceSummary(item).drift}</span></div>
                        <div><strong>Governance action</strong><span>{rolloutGovernanceSummary(item).action}</span></div>
                        <div><strong>Activation state</strong><span>{item.activationState ?? item.activationStatus ?? "n/a"}</span></div>
                        <div><strong>Activation request</strong><span>{item.activationRequestId ?? "n/a"}</span></div>
                        <div><strong>Activation publication</strong><span>{item.activationPublicationId ?? "n/a"}</span></div>
                        <div><strong>Reason</strong><span>{item.reason ?? "n/a"}</span></div>
                        <div><strong>Checks</strong><span>{item.checks.length ? item.checks.map((check) => `${check.label}: ${check.status}`).join(" · ") : "n/a"}</span></div>
                        <div><strong>Blocked reasons</strong><span>{item.reasons.length ? item.reasons.join(" · ") : "n/a"}</span></div>
                        <div><strong>Ready</strong><span>{item.ready ? "yes" : "no"}</span></div>
                      </div>
                    </article>
                  );
                })}
                {!supplierConnectorReadiness.items.length ? <div className="empty-state">No connector readiness items available yet.</div> : null}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ marginTop: 16 }}>
              Connector readiness read model is not available yet.
            </div>
          )}
        </article>
        <article className="entity-card" style={{ marginTop: 16 }}>
          <div className="entity-head">
            <div className="entity-title">
              <h3 style={{ margin: 0 }}>Connector activation state</h3>
              <span className="entity-meta">Activation state derived from enterprise governance and connector readiness</span>
            </div>
            <span className="status-chip status-active">ACTIVATION STATE</span>
          </div>
          <div className="summary-grid">
            <article className="summary-card">
              <span>Total</span>
              <strong>{supplierConnectorActivationState.length}</strong>
              <span>connector activations</span>
            </article>
            <article className="summary-card">
              <span>Active</span>
              <strong>{supplierConnectorActivationState.filter((item) => String(item.status ?? "").toUpperCase() === "ACTIVE").length}</strong>
              <span>ready in runtime</span>
            </article>
            <article className="summary-card">
              <span>Ready</span>
              <strong>{supplierConnectorActivationState.filter((item) => String(item.readiness ?? item.status ?? "").toUpperCase() === "READY").length}</strong>
              <span>awaiting apply</span>
            </article>
            <article className="summary-card">
              <span>Blocked</span>
              <strong>{supplierConnectorActivationState.filter((item) => String(item.status ?? "").toUpperCase() === "BLOCKED").length}</strong>
              <span>policy or policy mismatch</span>
            </article>
          </div>
          <div className="entity-list" style={{ marginTop: 16 }}>
            {supplierConnectorActivationState.map((item) => {
              const checks = Array.isArray(item.checks) ? item.checks : [];
              const blockingIssues = Array.isArray(item.blockingIssues) ? item.blockingIssues : [];
              const warnings = Array.isArray(item.warnings) ? item.warnings : [];
              return (
                <article className="entity-card" key={item.id}>
                  <div className="entity-head">
                    <div className="entity-title">
                      <h4>{item.connectorKey}</h4>
                      <span className="entity-meta">
                        <span className="code-chip">{item.version ?? "n/a"}</span>
                        <span className="inline-code">{item.requestId ?? item.publicationId ?? "unbound"}</span>
                      </span>
                    </div>
                    <span className={activationTone(item.status)}>{item.status}</span>
                  </div>
                  <div className="detail-grid">
                    <div><strong>Activation readiness</strong><span>{item.readiness ?? "n/a"}</span></div>
                    <div><strong>Install source</strong><span>{activationInstallSource(item)}</span></div>
                    <div><strong>Installed runtime</strong><span>{activationInstallRuntime(item)}</span></div>
                    <div><strong>Transport mode</strong><span>{item.transportMode ?? "n/a"}</span></div>
                    <div><strong>Provider adapter</strong><span>{item.providerAdapterKey ?? "n/a"}</span></div>
                    <div><strong>Provider profile</strong><span>{item.providerProfileKey ?? "n/a"}</span></div>
                    <div><strong>Activated at</strong><span>{fmt(item.appliedAt ?? null)}</span></div>
                    <div><strong>Requested at</strong><span>{fmt(item.requestedAt ?? null)}</span></div>
                    <div><strong>Reason</strong><span>{item.reason ?? "n/a"}</span></div>
                    <div><strong>Blocking issues</strong><span>{blockingIssues.length ? blockingIssues.join(" · ") : "n/a"}</span></div>
                    <div><strong>Warnings</strong><span>{warnings.length ? warnings.join(" · ") : "n/a"}</span></div>
                    <div><strong>Checks</strong><span>{checks.length ? checks.map((check) => typeof check === "string" ? check : `${check.label ?? check.key ?? "check"}: ${String(check.status ?? "n/a")}`).join(" · ") : "n/a"}</span></div>
                  </div>
                </article>
              );
            })}
            {!supplierConnectorActivationState.length ? <div className="empty-state">No activation state available yet.</div> : null}
          </div>
        </article>
        <article className="entity-card" style={{ marginTop: 16 }}>
          <div className="entity-head">
            <div className="entity-title">
              <h3 style={{ margin: 0 }}>Provider runtime policies</h3>
              <span className="entity-meta inline-code">
                {supplierProviderPolicies.map((policy) => policy.key).join(", ") || "No provider policies"}
              </span>
            </div>
            <span className="status-chip status-active">POLICY CATALOG</span>
          </div>
          <div className="summary-grid">
            <article className="summary-card">
              <span>Policies</span>
              <strong>{supplierProviderPolicies.length}</strong>
              <span>runtime baselines</span>
            </article>
            <article className="summary-card">
              <span>Strict</span>
              <strong>{supplierProviderPolicies.filter((item) => item.riskLevel === "STRICT").length}</strong>
              <span>strict governance</span>
            </article>
            <article className="summary-card">
              <span>Signed publication</span>
              <strong>{supplierProviderPolicies.filter((item) => item.summary.requireSignedPublication).length}</strong>
              <span>signature required</span>
            </article>
            <article className="summary-card">
              <span>Worker preferred</span>
              <strong>{supplierProviderPolicies.filter((item) => item.summary.preferredRetryExecution === "WORKER").length}</strong>
              <span>background retry preference</span>
            </article>
          </div>
          <div className="entity-list" style={{ marginTop: 16 }}>
            {supplierProviderPolicies.map((policy) => (
              <article className="entity-card" key={policy.key}>
                <div className="entity-head">
                  <div className="entity-title">
                    <h4>{policy.name}</h4>
                    <span className="entity-meta">
                      <span className="code-chip">{policy.key}</span>
                      <span className="inline-code">{policy.executionModel}</span>
                    </span>
                  </div>
                  <span className={statusClass(policy.riskLevel)}>{policy.riskLevel}</span>
                </div>
                <div className="detail-grid">
                  <div><strong>Adapters</strong><span>{policy.adapterKeys.join(", ") || "n/a"}</span></div>
                  <div><strong>Profiles</strong><span>{policy.profileKeys.join(", ") || "n/a"}</span></div>
                  <div><strong>Distribution</strong><span className="inline-code">{JSON.stringify(policy.summary)}</span></div>
                  <div><strong>Runtime</strong><span className="inline-code">{JSON.stringify(policy.runtime)}</span></div>
                </div>
              </article>
            ))}
            {!supplierProviderPolicies.length ? <div className="empty-state">No provider runtime policies exposed yet.</div> : null}
          </div>
        </article>
        <article className="entity-card" style={{ marginTop: 16 }}>
          <div className="entity-head">
            <div className="entity-title">
              <h3 style={{ margin: 0 }}>Provider adapters</h3>
              <span className="entity-meta inline-code">
                {supplierProviderAdapters.map((adapter) => adapter.providerAdapterKey).join(", ") || "No provider adapters"}
              </span>
            </div>
            <span className="status-chip status-active">ADAPTER CATALOG</span>
          </div>
          <div className="summary-grid">
            <article className="summary-card">
              <span>Adapters</span>
              <strong>{supplierProviderAdapters.length}</strong>
              <span>available execution defaults</span>
            </article>
            <article className="summary-card">
              <span>Visible defaults</span>
              <strong>{supplierProviderAdapters.filter((adapter) => adapter.providerAdapterDefaultPolicyVisible !== false).length}</strong>
              <span>policy-visible adapters</span>
            </article>
            <article className="summary-card">
              <span>Bound connectors</span>
              <strong>{supplierProviderAdapters.reduce((count, adapter) => count + Number(adapter.connectorCount ?? 0), 0)}</strong>
              <span>registry bindings</span>
            </article>
            <article className="summary-card">
              <span>Bound jobs</span>
              <strong>{supplierProviderAdapters.reduce((count, adapter) => count + Number(adapter.jobCount ?? 0), 0)}</strong>
              <span>workflow references</span>
            </article>
          </div>
          <div className="entity-list" style={{ marginTop: 16 }}>
            {supplierProviderAdapters.map((adapter) => {
              const identity = providerAdapterIdentity(adapter);
              return (
                <article className="entity-card" key={adapter.id}>
                  <div className="entity-head">
                    <div className="entity-title">
                      <h4>{adapter.providerAdapterName ?? adapter.providerAdapterKey}</h4>
                      <span className="entity-meta">{formatProviderAdapterIdentity(identity)}</span>
                    </div>
                    <span className={`status-chip ${adapter.status === "ACTIVE" ? "status-active" : "status-archived"}`}>
                      {adapter.status ?? "n/a"}
                    </span>
                  </div>
                  <div className="detail-grid">
                    <div><strong>Adapter key</strong><span>{adapter.providerAdapterKey}</span></div>
                    <div><strong>Version</strong><span>{adapter.providerAdapterVersion ?? "n/a"}</span></div>
                    <div><strong>Transport</strong><span>{adapter.transportMode ?? "n/a"}</span></div>
                    <div><strong>Profile binding</strong><span>{adapter.providerProfileKey ?? "n/a"}</span></div>
                    <div><strong>Visibility</strong><span>{identity.visibility ?? "n/a"}</span></div>
                    <div><strong>Default policy</strong><span>{identity.defaultPolicyVisible === null ? "n/a" : identity.defaultPolicyVisible ? "visible" : "hidden"}</span></div>
                    <div><strong>Connector bindings</strong><span>{adapter.connectorCount ?? 0}</span></div>
                    <div><strong>Workflow refs</strong><span>{adapter.jobCount ?? 0}</span></div>
                  </div>
                  <div className="detail-grid" style={{ marginTop: 12 }}>
                    <div><strong>Default policy summary</strong><span className="inline-code">{JSON.stringify(adapter.defaultPolicySummary ?? adapter.defaultPolicy ?? {})}</span></div>
                  </div>
                </article>
              );
            })}
            {!supplierProviderAdapters.length ? <div className="empty-state">No provider adapters available yet.</div> : null}
          </div>
        </article>
        <article className="entity-card" style={{ marginTop: 16 }}>
          <div className="entity-head">
            <div className="entity-title">
              <h3 style={{ margin: 0 }}>Provider profiles</h3>
              <span className="entity-meta inline-code">
                {supplierProviderProfiles.map((profile) => profile.providerProfileKey).join(", ") || "No provider profiles"}
              </span>
            </div>
            <span className="status-chip status-active">PROFILE CATALOG</span>
          </div>
          <div className="summary-grid">
            <article className="summary-card">
              <span>Profiles</span>
              <strong>{supplierProviderProfiles.length}</strong>
              <span>available provider defaults</span>
            </article>
            <article className="summary-card">
              <span>Visible defaults</span>
              <strong>{supplierProviderProfiles.filter((profile) => profile.providerProfileDefaultPolicyVisible !== false).length}</strong>
              <span>policy-visible profiles</span>
            </article>
            <article className="summary-card">
              <span>Bound connectors</span>
              <strong>{supplierProviderProfiles.reduce((count, profile) => count + Number(profile.connectorCount ?? 0), 0)}</strong>
              <span>registry bindings</span>
            </article>
            <article className="summary-card">
              <span>Bound jobs</span>
              <strong>{supplierProviderProfiles.reduce((count, profile) => count + Number(profile.jobCount ?? 0), 0)}</strong>
              <span>workflow references</span>
            </article>
          </div>
          <div className="entity-list" style={{ marginTop: 16 }}>
            {supplierProviderProfiles.map((profile) => {
              const identity = providerProfileIdentity(profile);
              return (
                <article className="entity-card" key={profile.id}>
                  <div className="entity-head">
                    <div className="entity-title">
                      <h4>{profile.providerProfileName ?? profile.providerProfileKey}</h4>
                      <span className="entity-meta">{formatProviderProfileIdentity(identity)}</span>
                    </div>
                    <span className={`status-chip ${profile.status === "ACTIVE" ? "status-active" : "status-archived"}`}>
                      {profile.status ?? "n/a"}
                    </span>
                  </div>
                  <div className="detail-grid">
                    <div><strong>Profile key</strong><span>{profile.providerProfileKey}</span></div>
                    <div><strong>Version</strong><span>{profile.providerProfileVersion ?? "n/a"}</span></div>
                    <div><strong>Visibility</strong><span>{identity.visibility ?? "n/a"}</span></div>
                    <div><strong>Default policy</strong><span>{identity.defaultPolicyVisible === null ? "n/a" : identity.defaultPolicyVisible ? "visible" : "hidden"}</span></div>
                    <div><strong>Connector bindings</strong><span>{profile.connectorCount ?? 0}</span></div>
                    <div><strong>Workflow refs</strong><span>{profile.jobCount ?? 0}</span></div>
                  </div>
                  <div className="detail-grid" style={{ marginTop: 12 }}>
                    <div><strong>Default policy summary</strong><span className="inline-code">{JSON.stringify(profile.defaultPolicySummary ?? profile.defaultPolicy ?? {})}</span></div>
                  </div>
                </article>
              );
            })}
            {!supplierProviderProfiles.length ? <div className="empty-state">No provider profiles available yet.</div> : null}
          </div>
        </article>
        <div className="split-grid" style={{ marginTop: 16 }}>
          <article className="entity-card">
            <div className="entity-head">
              <div className="entity-title">
                <h3 style={{ margin: 0 }}>Retry worker controls</h3>
                <span className="entity-meta">Background execution and manual fallbacks</span>
              </div>
            </div>
            <div className="detail-grid">
              <div><strong>Enabled</strong><span>{retryWorkerStatus?.enabled ? "yes" : "no"}</span></div>
              <div><strong>Paused</strong><span>{retryWorkerStatus?.paused ? "yes" : "no"}</span></div>
              <div><strong>Running</strong><span>{retryWorkerStatus?.running ? "yes" : "no"}</span></div>
              <div><strong>Limit</strong><span>{retryWorkerStatus?.limit ?? 0}</span></div>
            </div>
            <div className="action-row" style={{ marginTop: 12 }}>
              <button
                className="ghost-button"
                type="button"
                disabled={!token || retryWorkerStatus?.running}
                onClick={() => void controlSupplierRetryWorker("run-now")}
              >
                Run now
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!token || retryWorkerStatus?.paused === true}
                onClick={() => void controlSupplierRetryWorker("pause")}
              >
                Pause
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!token || retryWorkerStatus?.paused !== true}
                onClick={() => void controlSupplierRetryWorker("resume")}
              >
                Resume
              </button>
            </div>
          </article>
          <article className="entity-card">
            <div className="entity-head">
              <div className="entity-title">
                <h3 style={{ margin: 0 }}>Dead-letter queue</h3>
                <span className="entity-meta">
                  {supplierDeadLetters.length} blocked supplier artifacts
                </span>
              </div>
              <span className="status-chip status-failed">
                {supplierOperationsOverview?.summary.deadLetterJobCount ?? supplierDeadLetters.length}
              </span>
            </div>
            <div className="entity-list" style={{ marginTop: 12 }}>
              {supplierDeadLetters.map((job) => (
                <article className="entity-card" key={job.id}>
                  <div className="entity-head">
                    <div className="entity-title">
                      <h4>{job.connectorKey ?? job.jobId.slice(0, 8)}</h4>
                      <span className="entity-meta">
                        {job.transportMode ?? "HTTP_PUSH"} · {fmt(job.deadLetterAt ?? job.updatedAt)}
                      </span>
                    </div>
                    <div className="action-row" style={{ gap: 8 }}>
                      <span className="status-chip status-failed">{job.retryState ?? "DEAD_LETTER"}</span>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={!token}
                        onClick={() => void reopenSupplierDeadLetter(job.jobId)}
                      >
                        Reopen
                      </button>
                    </div>
                  </div>
                    <div className="detail-grid">
                      <div><strong>Supplier</strong><span>{job.supplierName ?? "n/a"}</span></div>
                      <div><strong>Failure</strong><span>{job.deadLetterCode ?? job.lastFailureCode ?? "n/a"}</span></div>
                      <div><strong>Reason</strong><span>{job.deadLetterReason ?? job.lastFailureReason ?? "n/a"}</span></div>
                      <div><strong>Execution readiness</strong><span>{supplierExecutionClass(job).label}</span></div>
                      <div><strong>Failure class</strong><span>{supplierExecutionClass(job).className}</span></div>
                      <div><strong>Retry class</strong><span>{supplierExecutionClass(job).readiness}</span></div>
                      <div><strong>Provider adapter</strong><span>{formatProviderAdapterIdentity(providerAdapterIdentity(job))}</span></div>
                      <div><strong>Provider profile</strong><span>{formatProviderProfileIdentity(providerProfileIdentity(job))}</span></div>
                      <div><strong>Attempts</strong><span>{job.retryAttemptCount ?? 0}</span></div>
                    <div><strong>Policy</strong><span>{job.retryPolicy ? formatRetryPolicy(retryPolicyFromRecord(job.retryPolicy)) : "n/a"}</span></div>
                    <div><strong>Terminal</strong><span>{job.terminal ? "yes" : "no"}</span></div>
                  </div>
                </article>
              ))}
              {!supplierDeadLetters.length ? <div className="empty-state">No dead-letter supplier artifacts right now.</div> : null}
            </div>
          </article>
        </div>
      </section>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Setup</span>
              <h2>Topology and stock control</h2>
            </div>
          </div>
          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !tenantId.trim()) return;
              void run(async () => {
                const created = await apiRequest<Record<string, any>>("/inventory/warehouses", token, { method: "POST", body: JSON.stringify({ tenantId: tenantId.trim(), storeId: storeId.trim() || null, ...warehouseDraft, isActive: true }) });
                setWarehouseId(created.id);
              }, "Warehouse saved.");
            }}>
              <h3 style={{ margin: 0 }}>Warehouse setup</h3>
              <label className="field"><span>Code</span><input value={warehouseDraft.code} onChange={(event) => setWarehouseDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={warehouseDraft.name} onChange={(event) => setWarehouseDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Kind</span><input value={warehouseDraft.kind} onChange={(event) => setWarehouseDraft((current) => ({ ...current, kind: event.target.value }))} /></label>
              <label className="field"><span>Notes</span><textarea rows={3} value={warehouseDraft.notes} onChange={(event) => setWarehouseDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="primary-button" type="submit">Save Warehouse</button>
            </form>
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !tenantId.trim()) return;
              void run(async () => {
                const created = await apiRequest<Record<string, any>>("/inventory/ingredients", token, { method: "POST", body: JSON.stringify({ tenantId: tenantId.trim(), code: ingredientDraft.code, name: ingredientDraft.name, unit: ingredientDraft.unit, lowStockThreshold: Number(ingredientDraft.lowStockThreshold) }) });
                setIngredientId(created.id);
              }, "Ingredient saved.");
            }}>
              <h3 style={{ margin: 0 }}>Ingredient setup</h3>
              <label className="field"><span>Code</span><input value={ingredientDraft.code} onChange={(event) => setIngredientDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={ingredientDraft.name} onChange={(event) => setIngredientDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Unit</span><input value={ingredientDraft.unit} onChange={(event) => setIngredientDraft((current) => ({ ...current, unit: event.target.value }))} /></label>
              <label className="field"><span>Low-stock threshold</span><input value={ingredientDraft.lowStockThreshold} onChange={(event) => setIngredientDraft((current) => ({ ...current, lowStockThreshold: event.target.value }))} /></label>
              <button className="primary-button" type="submit">Save Ingredient</button>
            </form>
          </div>
          <div className="split-grid" style={{ marginTop: 16 }}>
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !tenantId.trim() || !warehouseId || !ingredientId) { setMessage("Select warehouse and ingredient first."); return; }
              void run(() => apiRequest("/inventory/items", token, { method: "POST", body: JSON.stringify({ tenantId: tenantId.trim(), warehouseId, ingredientId, sku: itemDraft.sku || null, onHand: Number(itemDraft.onHand), reserved: Number(itemDraft.reserved), reorderPoint: Number(itemDraft.reorderPoint) }) }), "Stock item saved.");
            }}>
              <h3 style={{ margin: 0 }}>Stock item baseline</h3>
              <label className="field"><span>SKU</span><input value={itemDraft.sku} onChange={(event) => setItemDraft((current) => ({ ...current, sku: event.target.value }))} /></label>
              <label className="field"><span>On hand</span><input value={itemDraft.onHand} onChange={(event) => setItemDraft((current) => ({ ...current, onHand: event.target.value }))} /></label>
              <label className="field"><span>Reserved</span><input value={itemDraft.reserved} onChange={(event) => setItemDraft((current) => ({ ...current, reserved: event.target.value }))} /></label>
              <label className="field"><span>Reorder point</span><input value={itemDraft.reorderPoint} onChange={(event) => setItemDraft((current) => ({ ...current, reorderPoint: event.target.value }))} /></label>
              <button className="primary-button" type="submit">Save Stock Item</button>
            </form>
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !tenantId.trim() || !warehouseId || !ingredientId) { setMessage("Select warehouse and ingredient first."); return; }
              void run(() => apiRequest("/inventory/adjustments", token, { method: "POST", body: JSON.stringify({ tenantId: tenantId.trim(), warehouseId, ingredientId, adjustmentType: adjustmentDraft.adjustmentType, quantity: Number(adjustmentDraft.quantity), reason: adjustmentDraft.reason || null }) }), "Adjustment applied.");
            }}>
              <h3 style={{ margin: 0 }}>Manual adjustment</h3>
              <label className="field"><span>Adjustment type</span><select value={adjustmentDraft.adjustmentType} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, adjustmentType: event.target.value }))}><option value="ADD">ADD</option><option value="REMOVE">REMOVE</option><option value="SET">SET</option></select></label>
              <label className="field"><span>Quantity</span><input value={adjustmentDraft.quantity} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <label className="field"><span>Reason</span><textarea rows={3} value={adjustmentDraft.reason} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, reason: event.target.value }))} /></label>
              <button className="primary-button" type="submit">Apply Adjustment</button>
            </form>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Execution</span>
              <h2>Receiving, reservations, stop-list</h2>
            </div>
          </div>
          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !tenantId.trim() || !warehouseId || !ingredientId) { setMessage("Select warehouse and ingredient first."); return; }
              void run(async () => {
                const created = await apiRequest<Record<string, any>>("/inventory/receivings", token, { method: "POST", body: JSON.stringify({ tenantId: tenantId.trim(), warehouseId, reference: receivingDraft.reference, receivedBy: receivingDraft.receivedBy || null, lines: [{ ingredientId, quantity: Number(receivingDraft.quantity), unitCost: receivingDraft.unitCost || null }] }) });
                setReceivingId(created.id);
              }, "Receiving created.");
            }}>
              <h3 style={{ margin: 0 }}>Receiving</h3>
              <label className="field"><span>Reference</span><input value={receivingDraft.reference} onChange={(event) => setReceivingDraft((current) => ({ ...current, reference: event.target.value }))} /></label>
              <label className="field"><span>Received by</span><input value={receivingDraft.receivedBy} onChange={(event) => setReceivingDraft((current) => ({ ...current, receivedBy: event.target.value }))} /></label>
              <label className="field"><span>Quantity</span><input value={receivingDraft.quantity} onChange={(event) => setReceivingDraft((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <label className="field"><span>Unit cost</span><input value={receivingDraft.unitCost} onChange={(event) => setReceivingDraft((current) => ({ ...current, unitCost: event.target.value }))} /></label>
              <div className="action-row">
                <button className="primary-button" type="submit">Create Receiving</button>
                <button className="ghost-button" type="button" disabled={!receivingId} onClick={() => void run(() => apiRequest(`/inventory/receivings/${receivingId}/complete`, token!, { method: "POST", body: JSON.stringify({ receivedBy: receivingDraft.receivedBy || null }) }), "Receiving completed.")}>Complete Selected</button>
              </div>
            </form>
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !tenantId.trim() || !warehouseId || !ingredientId) { setMessage("Select warehouse and ingredient first."); return; }
              void run(async () => {
                const created = await apiRequest<Record<string, any>>("/inventory/reservations", token, { method: "POST", body: JSON.stringify({ tenantId: tenantId.trim(), warehouseId, ingredientId, sourceType: reservationDraft.sourceType, sourceId: reservationDraft.sourceId, quantity: Number(reservationDraft.quantity) }) });
                setReservationId(created.id);
              }, "Reservation created.");
            }}>
              <h3 style={{ margin: 0 }}>Reservation lifecycle</h3>
              <label className="field"><span>Source type</span><input value={reservationDraft.sourceType} onChange={(event) => setReservationDraft((current) => ({ ...current, sourceType: event.target.value }))} /></label>
              <label className="field"><span>Source ID</span><input value={reservationDraft.sourceId} onChange={(event) => setReservationDraft((current) => ({ ...current, sourceId: event.target.value }))} /></label>
              <label className="field"><span>Quantity</span><input value={reservationDraft.quantity} onChange={(event) => setReservationDraft((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <div className="action-row">
                <button className="primary-button" type="submit">Reserve Stock</button>
                <button className="ghost-button" type="button" disabled={!reservationId} onClick={() => void run(() => apiRequest(`/inventory/reservations/${reservationId}/release`, token!, { method: "POST" }), "Reservation released.")}>Release</button>
                <button className="ghost-button" type="button" disabled={!reservationId} onClick={() => void run(() => apiRequest(`/inventory/reservations/${reservationId}/consume`, token!, { method: "POST" }), "Reservation consumed.")}>Consume</button>
              </div>
            </form>
          </div>
          <div className="split-grid" style={{ marginTop: 16 }}>
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !tenantId.trim()) return;
              void run(() => apiRequest("/inventory/stop-list-rules", token, { method: "POST", body: JSON.stringify({ tenantId: tenantId.trim(), storeId: storeId.trim() || null, warehouseId: warehouseId || null, ingredientId: ingredientId || null, sku: stopRuleDraft.sku || null, ruleType: stopRuleDraft.ruleType, threshold: Number(stopRuleDraft.threshold), isActive: stopRuleDraft.isActive }) }), "Stop-list rule saved.");
            }}>
              <h3 style={{ margin: 0 }}>Stop-list guardrail</h3>
              <label className="field"><span>Rule type</span><input value={stopRuleDraft.ruleType} onChange={(event) => setStopRuleDraft((current) => ({ ...current, ruleType: event.target.value }))} /></label>
              <label className="field"><span>Threshold</span><input value={stopRuleDraft.threshold} onChange={(event) => setStopRuleDraft((current) => ({ ...current, threshold: event.target.value }))} /></label>
              <label className="field"><span>SKU</span><input value={stopRuleDraft.sku} onChange={(event) => setStopRuleDraft((current) => ({ ...current, sku: event.target.value }))} /></label>
              <button className="primary-button" type="submit">Save Rule</button>
            </form>
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !warehouseId || !availabilityDraft.productId.trim()) { setMessage("Warehouse and productId are required."); return; }
              const params = new URLSearchParams({ tenantId: tenantId.trim(), warehouseId, productId: availabilityDraft.productId.trim(), ...(availabilityDraft.variantId.trim() ? { variantId: availabilityDraft.variantId.trim() } : {}) });
              void apiRequest<Record<string, any>>(`/inventory/availability?${params.toString()}`, token)
                .then((result) => { setAvailability(result); setMessage("Availability calculated."); })
                .catch((error) => setMessage(error instanceof Error ? error.message : "Availability failed."));
            }}>
              <h3 style={{ margin: 0 }}>Availability check</h3>
              <label className="field"><span>Product ID</span><input value={availabilityDraft.productId} onChange={(event) => setAvailabilityDraft((current) => ({ ...current, productId: event.target.value }))} /></label>
              <label className="field"><span>Variant ID</span><input value={availabilityDraft.variantId} onChange={(event) => setAvailabilityDraft((current) => ({ ...current, variantId: event.target.value }))} /></label>
              <button className="primary-button" type="submit">Check Availability</button>
            </form>
          </div>
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Replenishment</span>
              <h2>Recommended restock actions</h2>
            </div>
          </div>
          {replenishmentReport ? (
            <>
              <div className="summary-grid">
                <article className="summary-card"><span>Recommendations</span><strong>{replenishmentReport.summary.recommendationCount}</strong><span>{replenishmentReport.summary.totalRecommendedOrderQuantity} units suggested</span></article>
                <article className="summary-card"><span>Blocked</span><strong>{replenishmentReport.summary.blockedByStopListCount}</strong><span>active stop-list overlaps</span></article>
                <article className="summary-card"><span>Generated</span><strong>{fmt(replenishmentReport.generatedAt)}</strong><span>report artifact</span></article>
              </div>
              <div className="action-row" style={{ marginTop: 16 }}>
                <label className="field" style={{ minWidth: 260 }}>
                  <span>Supplier connector</span>
                  <select
                    value={selectedSupplierConnectorKey}
                    onChange={(event) => setSelectedSupplierConnectorKey(event.target.value)}
                  >
                    <option value="">Manual handoff</option>
                    {supplierConnectors.map((item) => (
                      <option key={item.id} value={item.connectorKey}>
                        {item.connectorKey} · {item.version} · {connectorTransportMode(item)} · {readinessItemLabel(supplierConnectorReadiness?.items.find((entry) => entry.connectorKey === item.connectorKey) ?? null)} · {formatProviderAdapterIdentity(providerAdapterIdentity(item))} · {formatProviderProfileIdentity(providerProfileIdentity(item))} · {formatRetryPolicy(connectorRetryPolicy(item))}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary-button"
                  type="button"
                  disabled={!token || !tenantId.trim()}
                  onClick={() =>
                    void run(
                      () =>
                        apiRequest("/inventory/replenishment-jobs", token!, {
                          method: "POST",
                          body: JSON.stringify({
                            tenantId: tenantId.trim(),
                            storeId: storeId.trim() || null,
                            warehouseId: warehouseId || null
                          })
                        }),
                      "Replenishment job created."
                    )
                  }
                  >
                  Create Replenishment Job
                </button>
              </div>
              {selectedSupplierConnector ? (
                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <div><strong>Selected connector</strong><span>{selectedSupplierConnector.connectorKey} · {connectorTransportMode(selectedSupplierConnector)} · {formatProviderAdapterIdentity(providerAdapterIdentity(selectedSupplierConnector))}</span></div>
                  <div><strong>Readiness</strong><span>{readinessItemLabel(selectedSupplierConnectorReadiness)}</span></div>
                  <div><strong>Provider policy health</strong><span>{providerRuntimePolicyCompatibility(selectedSupplierConnector as unknown as { activationState?: string | null; activationStatus?: string | null; readiness?: string | null; status?: string | null; activationReadiness?: Record<string, any> | null; runtimeInstall?: Record<string, any> | null; providerAdapter?: Record<string, any> | null; providerProfile?: Record<string, any> | null; }).health}</span></div>
                  <div><strong>Provider compatibility</strong><span>{providerRuntimePolicyCompatibility(selectedSupplierConnector as unknown as { activationState?: string | null; activationStatus?: string | null; readiness?: string | null; status?: string | null; activationReadiness?: Record<string, any> | null; runtimeInstall?: Record<string, any> | null; providerAdapter?: Record<string, any> | null; providerProfile?: Record<string, any> | null; }).compatibility}</span></div>
                  <div><strong>Provider readiness</strong><span>{providerRuntimePolicyCompatibility(selectedSupplierConnector as unknown as { activationState?: string | null; activationStatus?: string | null; readiness?: string | null; status?: string | null; activationReadiness?: Record<string, any> | null; runtimeInstall?: Record<string, any> | null; providerAdapter?: Record<string, any> | null; providerProfile?: Record<string, any> | null; }).readiness}</span></div>
                  <div><strong>Provider policy</strong><span>{selectedSupplierConnector.providerPolicyKey ?? "n/a"}</span></div>
                  <div><strong>Policy detail</strong><span className="inline-code">{JSON.stringify(selectedSupplierConnector.providerPolicy ?? {})}</span></div>
                  <div><strong>Install source</strong><span>{activationInstallSource(selectedSupplierConnector as unknown as { activationPublicationId?: string | null; activationRequestId?: string | null; publicationId?: string | null; requestId?: string | null })}</span></div>
                  <div><strong>Installed runtime</strong><span>{activationInstallRuntime(selectedSupplierConnector as unknown as { activationState?: string | null; activationStatus?: string | null; readiness?: string | null; status?: string | null })}</span></div>
                  <div><strong>Rollout governance</strong><span>{rolloutGovernanceSummary(selectedSupplierConnector as unknown as { activationState?: string | null; activationStatus?: string | null; readiness?: string | null; status?: string | null; activationReadiness?: Record<string, any> | null; activationWarnings?: string[] | null; activationBlockingIssues?: string[] | null; warnings?: string[] | null; blockingIssues?: string[] | null; }).health}</span></div>
                  <div><strong>Governance drift</strong><span>{rolloutGovernanceSummary(selectedSupplierConnector as unknown as { activationState?: string | null; activationStatus?: string | null; readiness?: string | null; status?: string | null; activationReadiness?: Record<string, any> | null; activationWarnings?: string[] | null; activationBlockingIssues?: string[] | null; warnings?: string[] | null; blockingIssues?: string[] | null; }).drift}</span></div>
                  <div><strong>Governance action</strong><span>{rolloutGovernanceSummary(selectedSupplierConnector as unknown as { activationState?: string | null; activationStatus?: string | null; readiness?: string | null; status?: string | null; activationReadiness?: Record<string, any> | null; activationWarnings?: string[] | null; activationBlockingIssues?: string[] | null; warnings?: string[] | null; blockingIssues?: string[] | null; }).action}</span></div>
                  <div><strong>Provider adapter</strong><span>{formatProviderAdapterIdentity(providerAdapterIdentity(selectedSupplierConnector))}</span></div>
                  <div><strong>Provider profile</strong><span>{formatProviderProfileIdentity(providerProfileIdentity(selectedSupplierConnector))}</span></div>
                  <div><strong>Blocked reasons</strong><span>{selectedSupplierConnectorReadiness?.reasons.length ? selectedSupplierConnectorReadiness.reasons.join(" · ") : "n/a"}</span></div>
                  <div><strong>Checks</strong><span>{selectedSupplierConnectorReadiness?.checks.length ? selectedSupplierConnectorReadiness.checks.map((check) => `${check.label}: ${check.status}`).join(" · ") : "n/a"}</span></div>
                  <div><strong>Retry policy</strong><span>{formatRetryPolicy(connectorRetryPolicy(selectedSupplierConnector))}</span></div>
                  <div><strong>HTTP auth</strong><span>{selectedSupplierConnector.manifest?.runtime?.transport?.auth?.kind ?? "n/a"}</span></div>
                  <div><strong>Dead-letter</strong><span>{connectorRetryPolicy(selectedSupplierConnector).deadLetterStatus ?? "n/a"}</span></div>
                </div>
              ) : null}
              <div className="entity-list" style={{ marginTop: 16 }}>
                {supplierConnectors.map((item) => {
                  const policy = connectorRetryPolicy(item);
                  const transport = String(item.manifest?.runtime?.transport?.mode ?? item.manifest?.runtime?.mode ?? "SIMULATED").toUpperCase();
                  const readiness = supplierConnectorReadiness?.items.find((entry) => entry.connectorKey === item.connectorKey) ?? null;
                  return (
                    <article className="entity-card" key={item.id}>
                      <div className="entity-head">
                        <div className="entity-title">
                          <h4>{item.connectorKey}</h4>
                          <span className="entity-meta">
                            {item.version} · {transport} · {readinessItemLabel(readiness)} · {formatProviderAdapterIdentity(providerAdapterIdentity(item))} · {formatProviderProfileIdentity(providerProfileIdentity(item))}
                          </span>
                        </div>
                        <div className="action-row" style={{ gap: 8 }}>
                          <span className={`status-chip ${connectorReadinessTone(readiness?.status ?? "WARN")}`}>{readiness?.status ?? "WARN"}</span>
                          <span className={`status-chip ${policy.enabled ? "status-active" : "status-archived"}`}>
                            {policy.enabled ? "RETRY POLICY ON" : "RETRY POLICY OFF"}
                          </span>
                        </div>
                      </div>
                      <div className="detail-grid">
                        <div><strong>Retry policy</strong><span>{formatRetryPolicy(policy)}</span></div>
                        <div><strong>Retryable statuses</strong><span>{policy.retryableStatuses.length ? policy.retryableStatuses.join(", ") : "n/a"}</span></div>
                        <div><strong>Failure codes</strong><span>{policy.retryableFailureCodes.length ? policy.retryableFailureCodes.join(", ") : "n/a"}</span></div>
                        <div><strong>Dead-letter</strong><span>{policy.deadLetterStatus ?? "n/a"}{policy.deadLetterReason ? ` · ${policy.deadLetterReason}` : ""}</span></div>
                        <div><strong>Provider adapter</strong><span>{formatProviderAdapterIdentity(providerAdapterIdentity(item))}</span></div>
                        <div><strong>Provider profile</strong><span>{formatProviderProfileIdentity(providerProfileIdentity(item))}</span></div>
                        <div><strong>Provider policy health</strong><span>{providerRuntimePolicyCompatibility(item).health}</span></div>
                        <div><strong>Provider compatibility</strong><span>{providerRuntimePolicyCompatibility(item).compatibility}</span></div>
                        <div><strong>Provider readiness</strong><span>{providerRuntimePolicyCompatibility(item).readiness}</span></div>
                        <div><strong>Provider policy</strong><span>{item.providerPolicyKey ?? "n/a"}</span></div>
                        <div><strong>Policy detail</strong><span className="inline-code">{JSON.stringify(item.providerPolicy ?? {})}</span></div>
                        <div><strong>Readiness</strong><span>{readinessItemLabel(readiness)}</span></div>
                        <div><strong>Default policy</strong><span>{providerProfileIdentity(item).defaultPolicyVisible === null ? "n/a" : providerProfileIdentity(item).defaultPolicyVisible ? "visible" : "hidden"}</span></div>
                        <div><strong>HTTP endpoint</strong><span>{item.manifest?.runtime?.transport?.endpoint ?? "n/a"}</span></div>
                        <div><strong>HTTP timeout</strong><span>{item.manifest?.runtime?.transport?.timeoutMs ? `${item.manifest.runtime.transport.timeoutMs} ms` : "n/a"}</span></div>
                      </div>
                    </article>
                  );
                })}
                {!supplierConnectors.length ? <div className="empty-state">No supplier connectors available.</div> : null}
              </div>
              <div className="entity-list" style={{ marginTop: 16 }}>
                {replenishmentReport.recommendations.map((item) => (
                  <article className="entity-card" key={`${item.warehouseId}-${item.ingredientId}`}>
                    <div className="entity-head">
                      <div className="entity-title">
                        <h4>{item.ingredientName}</h4>
                        <span className="entity-meta">{item.warehouseCode} · {item.sku ?? "no-sku"}</span>
                      </div>
                      <span className={`status-chip ${item.activeStopListRuleCount ? "status-archived" : "status-active"}`}>{item.recommendedOrderQuantity}</span>
                    </div>
                    <div className="detail-grid">
                      <div><strong>Available</strong><span>{item.available}</span></div>
                      <div><strong>Target</strong><span>{item.targetQuantity}</span></div>
                      <div><strong>Order</strong><span>{item.recommendedOrderQuantity}</span></div>
                      <div><strong>Last cost</strong><span>{item.lastUnitCost ?? "n/a"}</span></div>
                    </div>
                  </article>
                ))}
                {!replenishmentReport.recommendations.length ? <div className="empty-state">No replenishment needed for the current scope.</div> : null}
              </div>
              <article className="entity-card" style={{ marginTop: 16 }}>
              <div className="entity-title">
                <h4>Saved jobs</h4>
              </div>
              <div className="action-row" style={{ marginTop: 12 }}>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={!token || !tenantId.trim()}
                  onClick={() =>
                    void run(
                      () =>
                        apiRequest("/inventory/replenishment-jobs/supplier-retry-sweep", token!, {
                          method: "POST",
                          body: JSON.stringify({
                            tenantId: tenantId.trim(),
                            storeId: storeId.trim() || undefined,
                            note: "Operator-triggered retry sweep."
                          })
                        }),
                      "Supplier retry sweep queued."
                    )
                  }
                >
                  Queue Failed Retries
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={!token || !tenantId.trim()}
                  onClick={() =>
                    void run(
                      () =>
                        apiRequest("/inventory/replenishment-jobs/supplier-retry-run-due", token!, {
                          method: "POST",
                          body: JSON.stringify({
                            tenantId: tenantId.trim(),
                            storeId: storeId.trim() || undefined,
                            note: "Operator-triggered due retry run."
                          })
                        }),
                      "Due supplier retries processed."
                    )
                  }
                >
                  Run Due Retries
                </button>
              </div>
              <div className="entity-list">
                {replenishmentJobs.map((job) => (
                    <article className="entity-card" key={job.id}>
                      {(() => {
                        const lifecycle = supplierRetryLifecycle(job);
                        const executionClass = supplierExecutionClass(job.artifact?.workflow?.supplier ?? null, lifecycle);
                        return (
                          <>
                      <div className="entity-head">
                        <div className="entity-title">
                          <h4>{job.id.slice(0, 8)}</h4>
                          <span className="entity-meta">{fmt(job.createdAt)}</span>
                        </div>
                        <div className="action-row" style={{ gap: 8 }}>
                          <span className={`status-chip status-${job.status.toLowerCase()}`}>{job.status}</span>
                          <span className={`status-chip ${lifecycle.tone}`}>{lifecycle.label}</span>
                        </div>
                      </div>
                      <div className="detail-grid">
                        <div><strong>Recommendations</strong><span>{job.summary.recommendationCount}</span></div>
                        <div><strong>Total order</strong><span>{job.summary.totalRecommendedOrderQuantity}</span></div>
                        <div><strong>Receiving</strong><span>{job.artifact?.workflow?.receivingReference ?? "n/a"}</span></div>
                        <div><strong>Receipt status</strong><span>{job.artifact?.workflow?.receivingStatus ?? "n/a"}</span></div>
                        <div><strong>Supplier</strong><span>{job.artifact?.workflow?.supplier?.supplierName ?? "n/a"}</span></div>
                        <div><strong>Supplier status</strong><span>{job.artifact?.workflow?.supplier?.supplierStatus ?? "n/a"}</span></div>
                        <div><strong>Connector</strong><span>{job.artifact?.workflow?.supplier?.connectorKey ?? "manual"}</span></div>
                        <div><strong>Provider adapter</strong><span>{formatProviderAdapterIdentity(providerAdapterIdentity(job.artifact?.workflow?.supplier))}</span></div>
                        <div><strong>Provider profile</strong><span>{formatProviderProfileIdentity(providerProfileIdentity(job.artifact?.workflow?.supplier))}</span></div>
                        <div><strong>Default policy</strong><span>{providerProfileIdentity(job.artifact?.workflow?.supplier).defaultPolicyVisible === null ? "n/a" : providerProfileIdentity(job.artifact?.workflow?.supplier).defaultPolicyVisible ? "visible" : "hidden"}</span></div>
                        <div><strong>Transport</strong><span>{job.artifact?.workflow?.supplier?.transportMode ?? "MANUAL"}</span></div>
                        <div><strong>Callback</strong><span>{job.artifact?.workflow?.supplier?.pendingCallback ? "pending" : job.artifact?.workflow?.supplier?.callbackPath ?? "n/a"}</span></div>
                        <div><strong>Import</strong><span>{job.artifact?.workflow?.supplier?.pendingImport ? job.artifact?.workflow?.supplier?.deliveryArtifact?.fileName ?? "pending" : job.artifact?.workflow?.supplier?.importFormat ?? "n/a"}</span></div>
                        <div><strong>Pickup path</strong><span>{job.artifact?.workflow?.supplier?.pickupPath ?? "n/a"}</span></div>
                        <div><strong>Drop path</strong><span>{job.artifact?.workflow?.supplier?.dropPath ?? "n/a"}</span></div>
                        <div><strong>Endpoint</strong><span>{job.artifact?.workflow?.supplier?.endpoint ?? job.artifact?.workflow?.supplier?.deliveryArtifact?.endpoint ?? "n/a"}</span></div>
                        <div><strong>Method</strong><span>{job.artifact?.workflow?.supplier?.method ?? job.artifact?.workflow?.supplier?.deliveryArtifact?.method ?? "n/a"}</span></div>
                        <div><strong>HTTP auth</strong><span>{job.artifact?.workflow?.supplier?.authKind ? `${job.artifact?.workflow?.supplier?.authKind}${job.artifact?.workflow?.supplier?.authHeaderName ? ` via ${job.artifact?.workflow?.supplier?.authHeaderName}` : ""}` : "n/a"}</span></div>
                        <div><strong>HTTP policy</strong><span>{job.artifact?.workflow?.supplier?.timeoutMs ? `${job.artifact?.workflow?.supplier?.timeoutMs}ms / ${(job.artifact?.workflow?.supplier?.acceptedStatusCodes ?? []).join(",") || "default"}` : "n/a"}</span></div>
                        <div><strong>Retry policy</strong><span>{job.artifact?.workflow?.supplier?.retryPolicy ? formatRetryPolicy(retryPolicyFromRecord(job.artifact.workflow.supplier.retryPolicy)) : "n/a"}</span></div>
                        <div><strong>Execution readiness</strong><span>{executionClass.label}</span></div>
                        <div><strong>Failure class</strong><span>{executionClass.className}</span></div>
                        <div><strong>Failure reason</strong><span>{executionClass.reason}</span></div>
                        <div><strong>Retry state</strong><span>{lifecycle.retryState}</span></div>
                        <div><strong>Delivery ID</strong><span>{job.artifact?.workflow?.supplier?.callbackDeliveryId ?? job.artifact?.workflow?.supplier?.lastDuplicateDeliveryId ?? "n/a"}</span></div>
                        <div><strong>Signature</strong><span>{job.artifact?.workflow?.supplier?.requireSignature ? (job.artifact?.workflow?.supplier?.callbackSignatureVerified ? "verified" : "required") : "not-required"}</span></div>
                        <div><strong>Import ID</strong><span>{job.artifact?.workflow?.supplier?.importId ?? job.artifact?.workflow?.supplier?.lastDuplicateImportId ?? "n/a"}</span></div>
                        <div><strong>Checksum</strong><span>{job.artifact?.workflow?.supplier?.requireChecksum ? (job.artifact?.workflow?.supplier?.importChecksumVerified ? "verified" : "required") : "not-required"}</span></div>
                        <div><strong>Reconciliation</strong><span>{job.artifact?.workflow?.supplier?.reconciliation?.status ?? "n/a"}</span></div>
                        <div><strong>Terminal</strong><span>{lifecycle.terminal ? "yes" : "no"}</span></div>
                        <div><strong>Dead-letter</strong><span>{job.artifact?.workflow?.supplier?.deadLetterAt ? `${fmt(job.artifact.workflow.supplier.deadLetterAt)}${lifecycle.deadLetterCode ? ` · ${lifecycle.deadLetterCode}` : ""}` : "n/a"}</span></div>
                        <div><strong>Failure</strong><span>{job.artifact?.workflow?.supplier?.lastFailureCode ?? "n/a"}</span></div>
                        <div><strong>Failure reason</strong><span>{job.artifact?.workflow?.supplier?.lastFailureReason ?? "n/a"}</span></div>
                        <div><strong>Next retry</strong><span>{fmt(job.artifact?.workflow?.supplier?.nextRetryAt)}</span></div>
                        <div><strong>Retry attempts</strong><span>{job.artifact?.workflow?.supplier?.retryAttemptCount ?? 0}</span></div>
                        <div><strong>Retry processed</strong><span>{job.artifact?.workflow?.supplier?.lastRetryProcessedSource ? `${job.artifact?.workflow?.supplier?.lastRetryProcessedSource} · ${fmt(job.artifact?.workflow?.supplier?.lastRetryProcessedAt)}` : "n/a"}</span></div>
                        <div><strong>Retry runs</strong><span>{job.artifact?.workflow?.supplier?.retryProcessedCount ?? 0}</span></div>
                        <div><strong>Replay</strong><span>{job.artifact?.workflow?.supplier?.lastReplaySource ? `${job.artifact?.workflow?.supplier?.lastReplaySource} · ${fmt(job.artifact?.workflow?.supplier?.lastReplayAt)}` : "n/a"}</span></div>
                        <div><strong>Replay count</strong><span>{job.artifact?.workflow?.supplier?.replayCount ?? 0}</span></div>
                      </div>
                      <div className="action-row">
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={job.status !== "GENERATED" || !token}
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/approve`, token!, {
                                  method: "POST"
                                }),
                              "Replenishment job approved."
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={job.status !== "APPROVED" || !token}
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/dispatch`, token!, {
                                  method: "POST"
                                }),
                              "Replenishment job dispatched."
                            )
                          }
                        >
                          Dispatch
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={job.status !== "DISPATCHED" || !token}
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/handoff`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    supplierName: "Default Supplier",
                                    supplierReference: `SUP-${job.id.slice(0, 8)}`,
                                    channel: "EMAIL",
                                    connectorKey: selectedSupplierConnectorKey || undefined
                                  })
                                }),
                              "Supplier handoff recorded."
                            )
                          }
                        >
                          Handoff
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!job.artifact?.workflow?.supplier || !token}
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/supplier-status`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    supplierStatus: "ACKNOWLEDGED",
                                    note: "Supplier confirmed order."
                                  })
                                }),
                              "Supplier marked as acknowledged."
                            )
                          }
                        >
                          Acknowledge
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!job.artifact?.workflow?.supplier || !token}
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/supplier-status`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    supplierStatus: "DELIVERED",
                                    note: "Supplier marked delivery completed."
                                  })
                                }),
                              "Supplier marked as delivered."
                            )
                          }
                        >
                          Delivered
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={
                            !job.artifact?.workflow?.supplier?.connectorKey ||
                            job.artifact?.workflow?.supplier?.transportMode === "WEBHOOK" ||
                            job.artifact?.workflow?.supplier?.transportMode === "FILE_IMPORT" ||
                            !token
                          }
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/supplier-sync`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    note: "Operator-triggered connector sync."
                                  })
                                }),
                              "Supplier connector sync completed."
                            )
                          }
                        >
                          Sync
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={
                            job.artifact?.workflow?.supplier?.transportMode !== "WEBHOOK" ||
                            job.artifact?.workflow?.supplier?.requireSignature === true ||
                            !token
                          }
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/supplier-webhook`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    deliveryId: `ui-delivery-${job.id}-${Date.now()}`,
                                    supplierStatus: "DELIVERED",
                                    externalReference: job.artifact?.workflow?.supplier?.supplierReference,
                                    eventType: "delivery.confirmed",
                                    note: "Operator-triggered webhook callback.",
                                    payload: {
                                      delivered: true
                                    }
                                  })
                                }),
                              "Supplier webhook callback processed."
                            )
                          }
                        >
                          Webhook Delivered
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={job.artifact?.workflow?.supplier?.transportMode !== "FILE_IMPORT" || !token}
                          onClick={() =>
                            void apiRequest<InventorySupplierFilePickup>(
                              `/inventory/replenishment-jobs/${job.id}/supplier-file-pickup`,
                              token!
                            )
                              .then((result) => {
                                setSupplierFilePickup(result);
                                setMessage(`Supplier file ready: ${result.fileName}`);
                              })
                              .catch((error) =>
                                setMessage(
                                  error instanceof Error ? error.message : "Supplier file pickup failed."
                                )
                              )
                          }
                        >
                          Pickup File
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={job.artifact?.workflow?.supplier?.transportMode !== "FILE_IMPORT" || !token}
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/supplier-file-drop`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    importId: `ui-import-${job.id}-${Date.now()}`,
                                    supplierStatus: "DELIVERED",
                                    externalReference: job.artifact?.workflow?.supplier?.supplierReference,
                                    fileName: "supplier-update.json",
                                    contentType: "application/json",
                                    content: JSON.stringify(
                                      {
                                        externalReference:
                                          job.artifact?.workflow?.supplier?.supplierReference ?? null,
                                        delivered: true,
                                        receivedAt: new Date().toISOString()
                                      },
                                      null,
                                      2
                                    ),
                                    note: "Operator-triggered file drop reconciliation."
                                  })
                                }),
                              "Supplier file drop processed."
                            )
                          }
                        >
                          Drop File
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!token || !job.artifact?.workflow?.supplier?.lastFailureSource || lifecycle.terminal}
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/supplier-retry-queue`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    source: job.artifact?.workflow?.supplier?.lastFailureSource,
                                    note: "Operator-triggered retry queue."
                                  })
                                }),
                              "Supplier retry queued."
                            )
                          }
                          >
                          Queue Retry
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={
                            !token ||
                            (job.artifact?.workflow?.supplier?.transportMode !== "WEBHOOK" &&
                              job.artifact?.workflow?.supplier?.transportMode !== "FILE_IMPORT")
                          }
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/supplier-replay`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    source:
                                      job.artifact?.workflow?.supplier?.transportMode === "WEBHOOK"
                                        ? "WEBHOOK"
                                        : "FILE_IMPORT",
                                    note: "Operator-triggered replay."
                                  })
                                }),
                              "Supplier reconciliation replayed."
                            )
                          }
                        >
                          Replay
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={job.status !== "DISPATCHED" || !token}
                          onClick={() =>
                            void run(
                              () =>
                                apiRequest(`/inventory/replenishment-jobs/${job.id}/receive`, token!, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    receivedBy: "Inventory Operator",
                                    autoComplete: true
                                  })
                                }),
                              "Replenishment job received."
                            )
                          }
                        >
                          Receive
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!token}
                          onClick={() =>
                            void apiRequest<InventoryReplenishmentExport>(
                              `/inventory/replenishment-jobs/${job.id}/export`,
                              token!
                            )
                              .then((result) => {
                                setReplenishmentExport(result);
                                setMessage(`Export prepared: ${result.filename}`);
                              })
                              .catch((error) =>
                                setMessage(
                                  error instanceof Error ? error.message : "Replenishment export failed."
                                )
                              )
                          }
                        >
                          Export
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!token}
                          onClick={() =>
                            void apiRequest<InventoryReplenishmentExport>(
                              `/inventory/replenishment-jobs/${job.id}/export?format=json`,
                              token!
                            )
                              .then((result) => {
                                setReplenishmentExport(result);
                                setMessage(`Export prepared: ${result.filename}`);
                              })
                              .catch((error) =>
                                setMessage(
                                  error instanceof Error ? error.message : "Replenishment export failed."
                                )
                              )
                          }
                        >
                          Export JSON
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!job.artifact?.workflow?.supplier?.connectorKey || !token}
                          onClick={() => void loadSupplierExecutions(job.id)}
                        >
                          Executions
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={job.status === "ARCHIVED" || !token}
                          onClick={() => void run(() => apiRequest(`/inventory/replenishment-jobs/${job.id}/archive`, token!, { method: "POST" }), "Replenishment job archived.")}
                        >
                          Archive
                        </button>
                      </div>
                          </>
                        );
                      })()}
                    </article>
                  ))}
                  {!replenishmentJobs.length ? <div className="empty-state">No saved replenishment jobs yet.</div> : null}
                </div>
              </article>
              {supplierFilePickup ? (
                <article className="entity-card" style={{ marginTop: 16 }}>
                  <div className="entity-head">
                    <div className="entity-title">
                      <h4>Supplier file pickup</h4>
                      <span className="entity-meta">{supplierFilePickup.fileName}</span>
                    </div>
                    <span className="status-chip status-active">{supplierFilePickup.contentType}</span>
                  </div>
                  <div className="detail-grid">
                    <div><strong>Job</strong><span>{supplierFilePickup.jobId.slice(0, 8)}</span></div>
                    <div><strong>Connector</strong><span>{supplierFilePickup.connectorKey}</span></div>
                    <div><strong>Pickup</strong><span>{supplierFilePickup.pickupPath ?? "n/a"}</span></div>
                    <div><strong>Drop</strong><span>{supplierFilePickup.dropPath ?? "n/a"}</span></div>
                  </div>
                  <textarea
                    readOnly
                    rows={10}
                    value={supplierFilePickup.content}
                    style={{ width: "100%", marginTop: 12 }}
                  />
                </article>
              ) : null}
              {replenishmentExport ? (
                <article className="entity-card" style={{ marginTop: 16 }}>
                  <div className="entity-head">
                    <div className="entity-title">
                      <h4>Export artifact</h4>
                      <span className="entity-meta">
                        {replenishmentExport.filename} · {fmt(replenishmentExport.generatedAt)}
                      </span>
                    </div>
                    <span className="status-chip status-active">{replenishmentExport.rowCount} rows</span>
                  </div>
                  <textarea
                    readOnly
                    rows={10}
                    value={replenishmentExport.content}
                    style={{ width: "100%", marginTop: 12 }}
                  />
                </article>
              ) : null}
              {supplierExecutionJobId ? (
                <article className="entity-card" style={{ marginTop: 16 }}>
                  <div className="entity-head">
                    <div className="entity-title">
                      <h4>Connector executions</h4>
                      <span className="entity-meta">{supplierExecutionJobId.slice(0, 8)}</span>
                    </div>
                    <span className="status-chip status-active">{supplierExecutions.length} logs</span>
                  </div>
                  <div className="entity-list" style={{ marginTop: 12 }}>
                    {supplierExecutions.map((item) => (
                      <article className="entity-card" key={item.id}>
                        <div className="entity-head">
                          <div className="entity-title">
                            <h4>{item.action}</h4>
                            <span className="entity-meta">
                              {item.connectorKey} · {fmt(item.createdAt)}
                            </span>
                          </div>
                          <span className={`status-chip status-${item.status.toLowerCase()}`}>{item.status}</span>
                        </div>
                      </article>
                    ))}
                    {!supplierExecutions.length ? <div className="empty-state">No connector executions yet.</div> : null}
                  </div>
                </article>
              ) : null}
            </>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Ledger</span>
              <h2>Movement drill-down</h2>
            </div>
          </div>
          {ledgerDrilldown ? (
            <>
              <div className="summary-grid">
                <article className="summary-card"><span>Entries</span><strong>{ledgerDrilldown.totals.entryCount}</strong><span>current filter</span></article>
                <article className="summary-card"><span>Inbound</span><strong>{ledgerDrilldown.totals.inboundQuantity}</strong><span>positive movement</span></article>
                <article className="summary-card"><span>Outbound</span><strong>{ledgerDrilldown.totals.outboundQuantity}</strong><span>negative movement</span></article>
                <article className="summary-card"><span>Net</span><strong>{ledgerDrilldown.totals.netQuantity}</strong><span>inbound - outbound</span></article>
              </div>
              <article className="entity-card" style={{ marginTop: 16 }}>
                <div className="entity-title">
                  <h4>By entry type</h4>
                </div>
                <div className="detail-grid">
                  {Object.entries(ledgerDrilldown.byEntryType).map(([entryType, stats]) => (
                    <div key={entryType}><strong>{entryType}</strong><span>{stats.count} / {stats.quantity}</span></div>
                  ))}
                </div>
              </article>
              <div className="entity-list" style={{ marginTop: 16 }}>
                {ledgerDrilldown.entries.map((entry) => (
                  <article className="entity-card" key={entry.id}>
                    <div className="entity-head">
                      <div className="entity-title">
                        <h4>{entry.entryType}</h4>
                        <span className="entity-meta">{entry.sourceType} · {entry.sourceId}</span>
                      </div>
                      <span className="code-chip">{entry.quantity}</span>
                    </div>
                    <div className="detail-grid">
                      <div><strong>Balance after</strong><span>{entry.balanceAfter}</span></div>
                      <div><strong>Created</strong><span>{fmt(entry.createdAt)}</span></div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Selection</span>
              <h2>Current inventory picture</h2>
            </div>
          </div>
          <div className="entity-grid">
            <article className="entity-card">
              <div className="entity-title">
                <span className="eyebrow">Selected Warehouse</span>
                <h3>{selectedWarehouse?.name ?? "Not selected"}</h3>
                <span className="entity-meta inline-code">{selectedWarehouse?.id ?? "Pick from selector above"}</span>
              </div>
            </article>
            <article className="entity-card">
              <div className="entity-title">
                <span className="eyebrow">Selected Ingredient</span>
                <h3>{selectedIngredient?.name ?? "Not selected"}</h3>
                <span className="entity-meta inline-code">{selectedIngredient?.id ?? "Pick from selector above"}</span>
              </div>
            </article>
          </div>
          <div className="entity-list" style={{ marginTop: 16 }}>
            {(workspace?.items ?? []).map((item) => (
              <article className="entity-card" key={item.id}>
                <div className="entity-head">
                  <div className="entity-title">
                    <h4>{item.sku ?? "Uncoded stock item"}</h4>
                    <span className="entity-meta inline-code">{item.warehouseId} · {item.ingredientId}</span>
                  </div>
                  <span className={`status-chip ${item.available <= item.reorderPoint ? "status-failed" : "status-active"}`}>{item.available <= item.reorderPoint ? "LOW STOCK" : "HEALTHY"}</span>
                </div>
                <div className="detail-grid">
                  <div><strong>Available</strong><span>{item.available}</span></div>
                  <div><strong>On hand</strong><span>{item.onHand}</span></div>
                  <div><strong>Reserved</strong><span>{item.reserved}</span></div>
                  <div><strong>Reorder point</strong><span>{item.reorderPoint}</span></div>
                </div>
              </article>
            ))}
            {!workspace?.items.length ? <div className="empty-state">No stock items yet.</div> : null}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Queues</span>
              <h2>Receivings, reservations, stop-list</h2>
            </div>
          </div>
          <div className="entity-list">
            {(workspace?.receivingRecords ?? []).map((item) => (
              <article className={`entity-card ${receivingId === item.id ? "active" : ""}`} key={item.id}>
                <div className="entity-head">
                  <div className="entity-title"><h4>{item.reference}</h4><span className="entity-meta">{item.receivedBy ?? "unassigned"} · {item.lines.length} lines</span></div>
                  <span className={`status-chip status-${String(item.status).toLowerCase()}`}>{item.status}</span>
                </div>
                <div className="detail-grid">
                  <div><strong>Warehouse</strong><span className="inline-code">{item.warehouseId}</span></div>
                  <div><strong>Completed</strong><span>{fmt(item.completedAt)}</span></div>
                </div>
                <div className="action-row"><button className="mini-button" type="button" onClick={() => setReceivingId(item.id)}>Select</button></div>
              </article>
            ))}
            {!workspace?.receivingRecords.length ? <div className="empty-state">No receivings yet.</div> : null}
            {(workspace?.reservations ?? []).map((item) => (
              <article className={`entity-card ${reservationId === item.id ? "active" : ""}`} key={item.id}>
                <div className="entity-head">
                  <div className="entity-title"><h4>{item.sourceType}</h4><span className="entity-meta">{item.sourceId} · qty {item.quantity}</span></div>
                  <span className={`status-chip status-${String(item.status).toLowerCase()}`}>{item.status}</span>
                </div>
                <div className="action-row"><button className="mini-button" type="button" onClick={() => setReservationId(item.id)}>Select</button></div>
              </article>
            ))}
            {!workspace?.reservations.length ? <div className="empty-state">No reservations yet.</div> : null}
            {(workspace?.stopListRules ?? []).map((item) => (
              <article className="entity-card" key={item.id}>
                <div className="entity-head">
                  <div className="entity-title"><h4>{item.ruleType}</h4><span className="entity-meta">{item.sku ?? item.ingredientId ?? "inventory rule"}</span></div>
                  <span className={`status-chip ${item.isActive ? "status-active" : "status-archived"}`}>{item.isActive ? "ACTIVE" : "INACTIVE"}</span>
                </div>
                <div className="detail-grid">
                  <div><strong>Threshold</strong><span>{item.threshold}</span></div>
                  <div><strong>Warehouse</strong><span className="inline-code">{item.warehouseId ?? "any"}</span></div>
                </div>
              </article>
            ))}
            {!workspace?.stopListRules.length ? <div className="empty-state">No stop-list rules yet.</div> : null}
            {availability ? (
              <article className="entity-card">
                <div className="entity-head">
                  <div className="entity-title"><h4>Availability result</h4><span className="entity-meta">product {availability.productId}</span></div>
                  <span className={`status-chip ${availability.availableUnits > 0 ? "status-active" : "status-failed"}`}>{availability.availableUnits} units</span>
                </div>
                <div className="entity-list">
                  {(availability.ingredientBreakdown ?? []).map((item: Record<string, any>) => (
                    <div className="detail-grid" key={item.ingredientId}>
                      <div><strong>Ingredient</strong><span>{item.ingredientCode}</span></div>
                      <div><strong>Required</strong><span>{item.requiredQuantity}</span></div>
                      <div><strong>Available</strong><span>{item.available}</span></div>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
