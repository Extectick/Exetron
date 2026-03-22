export type ExecuteInventorySupplierHandoffInput = {
  connectorKey: string;
  supplierName: string;
  supplierReference: string | null;
  channel: string;
  recommendationCount: number;
  totalRecommendedOrderQuantity: number;
};

export type ExecuteInventorySupplierStatusSyncInput = {
  connectorKey: string;
  supplierName: string;
  supplierReference: string | null;
  currentSupplierStatus: string;
};

export type InventorySupplierTransportMode = "SIMULATED" | "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH";

export type InventorySupplierProviderErrorClass =
  | "NETWORK"
  | "AUTH"
  | "SIGNATURE"
  | "CHECKSUM"
  | "REFERENCE"
  | "PROVIDER_REJECTED"
  | "CONFIGURATION"
  | "REPLAY"
  | "GOVERNANCE"
  | "STATE"
  | "UNKNOWN";

export type InventorySupplierProviderRetryClass = "NONE" | "RETRYABLE" | "TERMINAL";

export type InventorySupplierProviderExecutionPhase =
  | "HANDOFF"
  | "SYNC"
  | "WEBHOOK"
  | "FILE_STAGE"
  | "FILE_PICKUP"
  | "FILE_DROP"
  | "RETRY";

export type ExecuteInventorySupplierTransportHandoffInput = {
  replenishmentJobId: string;
  connectorKey: string;
  supplierName: string;
  supplierReference: string | null;
  channel: string;
  recommendationCount: number;
  totalRecommendedOrderQuantity: number;
  transportMode: InventorySupplierTransportMode;
  callbackPath?: string | null;
  importFormat?: string | null;
  pickupPath?: string | null;
  dropPath?: string | null;
  endpoint?: string | null;
  method?: string | null;
  timeoutMs?: number | null;
  acceptedStatusCodes?: number[] | null;
  responseStatusField?: string | null;
  responseStatusMap?: Record<string, string> | null;
  authKind?: "BEARER" | "HEADER" | null;
  authHeaderName?: string | null;
  providerProfileKey?: string | null;
  providerAdapterKey?: string | null;
  payloadShape?: "DEFAULT" | "ORDER_ENVELOPE" | "FILE_BATCH" | null;
  payloadVariant?:
    | "DEFAULT"
    | "ORDER_ENVELOPE"
    | "FILE_BATCH"
    | "FRESHLANE_ORDER"
    | "WAREDROP_BATCH"
    | "SIGNAL_EVENT"
    | null;
  externalReferencePrefix?: string | null;
  fileNamePrefix?: string | null;
};

export type InventorySupplierConnectorExecution = {
  status: "COMPLETED" | "FAILED";
  responsePayload: Record<string, unknown>;
  errorMessage: string | null;
  externalReference: string | null;
  supplierStatus: "SUBMITTED" | "ACKNOWLEDGED" | "IN_TRANSIT" | "DELIVERED";
};

export type InventorySupplierTransportHandoffExecution = InventorySupplierConnectorExecution & {
  transportMode: InventorySupplierTransportMode;
  deliveryArtifact: Record<string, unknown> | null;
};

export type InventorySupplierProviderHttpPushResult = {
  supplierStatus: "SUBMITTED" | "ACKNOWLEDGED" | "IN_TRANSIT" | "DELIVERED" | null;
  providerErrorClass: InventorySupplierProviderErrorClass;
  retryClass: InventorySupplierProviderRetryClass;
  deadLetterReasonCode: string | null;
  providerExecutionPhase: InventorySupplierProviderExecutionPhase;
};

function shouldFail(connectorKey: string, channelOrStatus: string) {
  const normalized = `${connectorKey} ${channelOrStatus}`.toLowerCase();
  return normalized.includes("fail");
}

function buildProviderPayload(input: ExecuteInventorySupplierTransportHandoffInput, externalReference: string) {
  if (input.payloadVariant === "FRESHLANE_ORDER") {
    return {
      purchaseOrder: {
        reference: externalReference,
        replenishmentJobId: input.replenishmentJobId,
        connectorKey: input.connectorKey
      },
      supplier: {
        name: input.supplierName,
        channel: input.channel
      },
      totals: {
        recommendationCount: input.recommendationCount,
        totalRecommendedOrderQuantity: input.totalRecommendedOrderQuantity
      },
      adapter: {
        providerAdapterKey: input.providerAdapterKey ?? null,
        providerProfileKey: input.providerProfileKey ?? null
      }
    };
  }

  if (input.payloadVariant === "WAREDROP_BATCH") {
    return {
      exportBatch: {
        id: externalReference,
        replenishmentJobId: input.replenishmentJobId,
        connectorKey: input.connectorKey
      },
      metrics: {
        recommendationCount: input.recommendationCount,
        totalRecommendedOrderQuantity: input.totalRecommendedOrderQuantity
      },
      supplier: {
        name: input.supplierName,
        channel: input.channel
      },
      policy: {
        providerAdapterKey: input.providerAdapterKey ?? null,
        providerProfileKey: input.providerProfileKey ?? null
      }
    };
  }

  if (input.payloadVariant === "SIGNAL_EVENT") {
    return {
      eventType: "replenishment.submitted",
      connectorKey: input.connectorKey,
      replenishment: {
        jobId: input.replenishmentJobId,
        externalReference,
        supplierName: input.supplierName,
        channel: input.channel
      },
      payload: {
        recommendationCount: input.recommendationCount,
        totalRecommendedOrderQuantity: input.totalRecommendedOrderQuantity
      }
    };
  }

  const basePayload = {
    replenishmentJobId: input.replenishmentJobId,
    connectorKey: input.connectorKey,
    supplierName: input.supplierName,
    externalReference,
    channel: input.channel,
    recommendationCount: input.recommendationCount,
    totalRecommendedOrderQuantity: input.totalRecommendedOrderQuantity,
    providerProfileKey: input.providerProfileKey ?? null,
    providerAdapterKey: input.providerAdapterKey ?? null
  };

  if (input.payloadShape === "ORDER_ENVELOPE") {
    return {
      order: {
        jobId: input.replenishmentJobId,
        externalReference,
        supplier: input.supplierName,
        channel: input.channel
      },
      totals: {
        recommendationCount: input.recommendationCount,
        totalRecommendedOrderQuantity: input.totalRecommendedOrderQuantity
      },
      metadata: {
        connectorKey: input.connectorKey,
        providerProfileKey: input.providerProfileKey ?? null,
        providerAdapterKey: input.providerAdapterKey ?? null
      }
    };
  }

  if (input.payloadShape === "FILE_BATCH") {
    return {
      batch: {
        replenishmentJobId: input.replenishmentJobId,
        externalReference,
        connectorKey: input.connectorKey
      },
      supplier: {
        name: input.supplierName,
        channel: input.channel
      },
      recommendations: [
        {
          count: input.recommendationCount,
          totalRecommendedOrderQuantity: input.totalRecommendedOrderQuantity
        }
      ]
    };
  }

  return basePayload;
}

export function buildInventorySupplierProviderStageMetadata(input: {
  connectorKey: string;
  providerAdapterKey?: string | null;
  replenishmentJobId: string;
  fileName: string;
  contentType: string;
  pickupPath?: string | null;
  dropPath?: string | null;
  content: string;
  externalReference: string | null;
}) {
  const adapterKey = input.providerAdapterKey?.trim().toUpperCase() || null;
  const stageId = `${input.connectorKey}:${input.replenishmentJobId}:${
    adapterKey?.toLowerCase() ?? "default"
  }`.replaceAll(/[^a-z0-9:.-]+/gi, "-");
  return {
    stageId,
    providerAdapterKey: adapterKey,
    fileName: input.fileName,
    contentType: input.contentType,
    pickupPath: input.pickupPath ?? null,
    dropPath: input.dropPath ?? null,
    virtualPath: `/inventory/provider-runtime-staging/${encodeURIComponent(stageId)}/${encodeURIComponent(input.fileName)}`,
    contentSize: Buffer.byteLength(input.content, "utf8"),
    externalReference: input.externalReference
  };
}

export function resolveInventorySupplierProviderSyncStatus(input: {
  providerAdapterKey?: string | null;
  currentSupplierStatus: string;
}): "SUBMITTED" | "ACKNOWLEDGED" | "IN_TRANSIT" | "DELIVERED" {
  const current = input.currentSupplierStatus.trim().toUpperCase();
  const adapterKey = input.providerAdapterKey?.trim().toUpperCase() || null;
  if (adapterKey === "FRESHLANE_HTTP_V1") {
    if (current === "SUBMITTED") {
      return "ACKNOWLEDGED";
    }
    if (current === "ACKNOWLEDGED") {
      return "IN_TRANSIT";
    }
    return "DELIVERED";
  }
  if (current === "SUBMITTED") {
    return "ACKNOWLEDGED";
  }
  if (current === "ACKNOWLEDGED") {
    return "IN_TRANSIT";
  }
  return "DELIVERED";
}

export function resolveInventorySupplierProviderWebhookPayload(input: {
  providerAdapterKey?: string | null;
  supplierStatus: string;
  eventType?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  const adapterKey = input.providerAdapterKey?.trim().toUpperCase() || null;
  const payload = input.payload ?? null;
  if (adapterKey === "SIGNAL_WEBHOOK_V1" && payload && typeof payload === "object") {
    const signal = payload.signal && typeof payload.signal === "object" ? (payload.signal as Record<string, unknown>) : {};
    const event = payload.event && typeof payload.event === "object" ? (payload.event as Record<string, unknown>) : {};
    const statusCandidate =
      typeof signal.status === "string"
        ? signal.status
        : typeof event.status === "string"
          ? event.status
          : typeof payload.status === "string"
            ? payload.status
            : input.supplierStatus;
    const normalized = String(statusCandidate).trim().toUpperCase();
    const supplierStatus =
      normalized === "SUBMITTED" ||
      normalized === "ACKNOWLEDGED" ||
      normalized === "IN_TRANSIT" ||
      normalized === "DELIVERED" ||
      normalized === "CANCELLED"
        ? normalized
        : input.supplierStatus;
    return {
      supplierStatus,
      eventType:
        typeof event.type === "string"
          ? event.type
          : typeof payload.eventType === "string"
            ? payload.eventType
            : input.eventType ?? null
    };
  }
  return {
    supplierStatus: input.supplierStatus,
    eventType: input.eventType ?? null
  };
}

export function resolveInventorySupplierProviderImportPayload(input: {
  providerAdapterKey?: string | null;
  supplierStatus: string;
  payload?: Record<string, unknown> | null;
  fileName?: string | null;
}) {
  const adapterKey = input.providerAdapterKey?.trim().toUpperCase() || null;
  const payload = input.payload ?? null;
  if (adapterKey === "WAREDROP_FILE_V1" && payload && typeof payload === "object") {
    const receipt =
      payload.receipt && typeof payload.receipt === "object" ? (payload.receipt as Record<string, unknown>) : {};
    const batch = payload.batch && typeof payload.batch === "object" ? (payload.batch as Record<string, unknown>) : {};
    const statusCandidate =
      typeof receipt.status === "string"
        ? receipt.status
        : typeof batch.status === "string"
          ? batch.status
          : typeof payload.status === "string"
            ? payload.status
            : input.supplierStatus;
    const normalized = String(statusCandidate).trim().toUpperCase();
    const supplierStatus =
      normalized === "SUBMITTED" ||
      normalized === "ACKNOWLEDGED" ||
      normalized === "IN_TRANSIT" ||
      normalized === "DELIVERED" ||
      normalized === "CANCELLED"
        ? normalized
        : input.supplierStatus;
    return {
      supplierStatus,
      fileName:
        input.fileName ??
        (typeof receipt.fileName === "string"
          ? receipt.fileName
          : typeof batch.fileName === "string"
            ? batch.fileName
            : null)
    };
  }
  return {
    supplierStatus: input.supplierStatus,
    fileName: input.fileName ?? null
  };
}

export function classifyInventorySupplierProviderHttpPushResult(input: {
  providerAdapterKey?: string | null;
  httpStatus?: number | null;
  accepted: boolean;
  responseBody?: Record<string, unknown> | string | null;
  networkError?: boolean;
  supplierStatus?: string | null;
}): InventorySupplierProviderHttpPushResult {
  const adapterKey = input.providerAdapterKey?.trim().toUpperCase() || null;
  const httpStatus = Number.isInteger(input.httpStatus) ? Number(input.httpStatus) : null;
  const responseRecord =
    input.responseBody && typeof input.responseBody === "object"
      ? (input.responseBody as Record<string, unknown>)
      : null;
  const supplierStatusCandidate =
    responseRecord
      ? responseRecord.supplierStatus
      : null;
  const providerCode =
    responseRecord && typeof responseRecord.code === "string" && responseRecord.code.trim()
      ? responseRecord.code.trim().toUpperCase()
      : null;
  const supplierStatusRaw =
    typeof input.supplierStatus === "string" && input.supplierStatus.trim()
      ? input.supplierStatus
      : typeof supplierStatusCandidate === "string"
        ? supplierStatusCandidate
        : null;
  const normalizedSupplierStatus =
    typeof supplierStatusRaw === "string"
      ? (() => {
          const normalized = supplierStatusRaw.trim().toUpperCase();
          return normalized === "SUBMITTED" ||
            normalized === "ACKNOWLEDGED" ||
            normalized === "IN_TRANSIT" ||
            normalized === "DELIVERED"
            ? normalized
            : null;
        })()
      : null;

  if (input.accepted) {
    return {
      supplierStatus: normalizedSupplierStatus ?? "ACKNOWLEDGED",
      providerErrorClass: "UNKNOWN",
      retryClass: "NONE",
      deadLetterReasonCode: null,
      providerExecutionPhase: "HANDOFF"
    };
  }

  if (input.networkError) {
    return {
      supplierStatus: normalizedSupplierStatus,
      providerErrorClass: "NETWORK",
      retryClass: "RETRYABLE",
      deadLetterReasonCode: `${adapterKey ?? "HTTP_PUSH"}_NETWORK_ERROR`,
      providerExecutionPhase: "HANDOFF"
    };
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return {
      supplierStatus: normalizedSupplierStatus,
      providerErrorClass: "AUTH",
      retryClass: "TERMINAL",
      deadLetterReasonCode: `${adapterKey ?? "HTTP_PUSH"}_AUTH_REJECTED`,
      providerExecutionPhase: "HANDOFF"
    };
  }

  if (httpStatus === 408 || httpStatus === 425 || httpStatus === 429 || (httpStatus !== null && httpStatus >= 500)) {
    return {
      supplierStatus: normalizedSupplierStatus,
      providerErrorClass: "NETWORK",
      retryClass: "RETRYABLE",
      deadLetterReasonCode: `${adapterKey ?? "HTTP_PUSH"}_RETRYABLE_HTTP_${httpStatus ?? "UNKNOWN"}`,
      providerExecutionPhase: "HANDOFF"
    };
  }

  if (adapterKey === "FRESHLANE_HTTP_V1") {
    return {
      supplierStatus: normalizedSupplierStatus,
      providerErrorClass: "PROVIDER_REJECTED",
      retryClass: "TERMINAL",
      deadLetterReasonCode: providerCode ?? "FRESHLANE_HTTP_REJECTED",
      providerExecutionPhase: "HANDOFF"
    };
  }

  return {
    supplierStatus: normalizedSupplierStatus,
    providerErrorClass: "PROVIDER_REJECTED",
    retryClass: "TERMINAL",
    deadLetterReasonCode: providerCode ?? `${adapterKey ?? "HTTP_PUSH"}_REJECTED`,
    providerExecutionPhase: "HANDOFF"
  };
}

export function executeInventorySupplierHandoff(
  input: ExecuteInventorySupplierHandoffInput
): InventorySupplierConnectorExecution {
  if (shouldFail(input.connectorKey, input.channel)) {
    return {
      status: "FAILED",
      responsePayload: {
        accepted: false,
        supplierName: input.supplierName,
        channel: input.channel
      },
      errorMessage: "Supplier connector simulated handoff failure.",
      externalReference: null,
      supplierStatus: "SUBMITTED"
    };
  }

  const externalReference =
    input.supplierReference ??
    `${input.connectorKey.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}-${input.recommendationCount}-${input.totalRecommendedOrderQuantity}`;

  return {
    status: "COMPLETED",
    responsePayload: {
      accepted: true,
      supplierName: input.supplierName,
      channel: input.channel,
      externalReference,
      recommendationCount: input.recommendationCount,
      totalRecommendedOrderQuantity: input.totalRecommendedOrderQuantity
    },
    errorMessage: null,
    externalReference,
    supplierStatus: input.channel.toUpperCase() === "API" ? "ACKNOWLEDGED" : "SUBMITTED"
  };
}

export function executeInventorySupplierStatusSync(
  input: ExecuteInventorySupplierStatusSyncInput
): InventorySupplierConnectorExecution {
  if (shouldFail(input.connectorKey, input.currentSupplierStatus)) {
    return {
      status: "FAILED",
      responsePayload: {
        synced: false,
        supplierName: input.supplierName,
        currentSupplierStatus: input.currentSupplierStatus
      },
      errorMessage: "Supplier connector simulated sync failure.",
      externalReference: input.supplierReference,
      supplierStatus: "SUBMITTED"
    };
  }

  const current = input.currentSupplierStatus.toUpperCase();
  const supplierStatus =
    current === "SUBMITTED"
      ? "ACKNOWLEDGED"
      : current === "ACKNOWLEDGED"
        ? "IN_TRANSIT"
        : current === "IN_TRANSIT"
          ? "DELIVERED"
          : "DELIVERED";

  return {
    status: "COMPLETED",
    responsePayload: {
      synced: true,
      supplierName: input.supplierName,
      previousStatus: current,
      supplierStatus,
      externalReference: input.supplierReference
    },
    errorMessage: null,
    externalReference: input.supplierReference,
    supplierStatus
  };
}

export function executeInventorySupplierTransportHandoff(
  input: ExecuteInventorySupplierTransportHandoffInput
): InventorySupplierTransportHandoffExecution {
  if (input.transportMode === "SIMULATED") {
    return {
      ...executeInventorySupplierHandoff({
        connectorKey: input.connectorKey,
        supplierName: input.supplierName,
        supplierReference: input.supplierReference,
        channel: input.channel,
        recommendationCount: input.recommendationCount,
        totalRecommendedOrderQuantity: input.totalRecommendedOrderQuantity
      }),
      transportMode: "SIMULATED",
      deliveryArtifact: null
    };
  }

  if (shouldFail(input.connectorKey, input.transportMode)) {
    return {
      status: "FAILED",
      responsePayload: {
        accepted: false,
        supplierName: input.supplierName,
        channel: input.channel,
        transportMode: input.transportMode
      },
      errorMessage: "Supplier connector transport preparation failed.",
      externalReference: null,
      supplierStatus: "SUBMITTED",
      transportMode: input.transportMode,
      deliveryArtifact: null
    };
  }

  const externalReference =
    input.supplierReference ??
    `${input.externalReferencePrefix ?? input.connectorKey.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}-${input.replenishmentJobId.slice(0, 8)}`;

  if (input.transportMode === "WEBHOOK") {
    return {
      status: "COMPLETED",
      responsePayload: {
        accepted: true,
        supplierName: input.supplierName,
        channel: input.channel,
        transportMode: input.transportMode,
        callbackPath: input.callbackPath ?? null,
        externalReference
      },
      errorMessage: null,
      externalReference,
      supplierStatus: "SUBMITTED",
      transportMode: "WEBHOOK",
      deliveryArtifact: null
    };
  }

  if (input.transportMode === "HTTP_PUSH") {
    const requestMethod = (input.method ?? "POST").trim().toUpperCase();
    const payload = buildProviderPayload(input, externalReference);
    const requestBody = JSON.stringify(
      payload,
      null,
      2
    );

    return {
      status: "COMPLETED",
      responsePayload: {
        accepted: true,
        supplierName: input.supplierName,
        channel: input.channel,
        transportMode: "HTTP_PUSH",
        endpoint: input.endpoint ?? null,
        method: requestMethod,
        timeoutMs: input.timeoutMs ?? null,
        acceptedStatusCodes: input.acceptedStatusCodes ?? null,
        responseStatusField: input.responseStatusField ?? "supplierStatus",
        responseStatusMap: input.responseStatusMap ?? null,
        authKind: input.authKind ?? null,
        authHeaderName: input.authHeaderName ?? null,
        providerProfileKey: input.providerProfileKey ?? null,
        providerAdapterKey: input.providerAdapterKey ?? null,
        payloadShape: input.payloadShape ?? "DEFAULT",
        payloadVariant: input.payloadVariant ?? input.payloadShape ?? "DEFAULT",
        externalReference
      },
      errorMessage: null,
      externalReference,
      supplierStatus: "SUBMITTED",
      transportMode: "HTTP_PUSH",
      deliveryArtifact: {
        endpoint: input.endpoint ?? null,
        method: requestMethod,
        contentType: "application/json",
        body: requestBody,
        timeoutMs: input.timeoutMs ?? null,
        acceptedStatusCodes: input.acceptedStatusCodes ?? null,
        responseStatusField: input.responseStatusField ?? "supplierStatus",
        responseStatusMap: input.responseStatusMap ?? null,
        authKind: input.authKind ?? null,
        authHeaderName: input.authHeaderName ?? null,
        providerProfileKey: input.providerProfileKey ?? null,
        providerAdapterKey: input.providerAdapterKey ?? null,
        payloadShape: input.payloadShape ?? "DEFAULT",
        payloadVariant: input.payloadVariant ?? input.payloadShape ?? "DEFAULT"
      }
    };
  }

  const filePayload = buildProviderPayload(input, externalReference);
  const fileNamePrefix =
    input.fileNamePrefix?.trim() || input.connectorKey.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase();
  const artifact = {
    format: input.importFormat ?? "json",
    fileName: `${fileNamePrefix}-${input.replenishmentJobId.slice(0, 8)}.${input.importFormat ?? "json"}`,
    contentType: input.importFormat === "csv" ? "text/csv" : "application/json",
    pickupPath: input.pickupPath ?? null,
    dropPath: input.dropPath ?? null,
    content:
      input.importFormat === "csv"
        ? [
            "externalReference,supplierName,channel,recommendationCount,totalRecommendedOrderQuantity",
            `${externalReference},${input.supplierName},${input.channel},${input.recommendationCount},${input.totalRecommendedOrderQuantity}`
          ].join("\n")
        : JSON.stringify(filePayload, null, 2)
  };
  const staging = buildInventorySupplierProviderStageMetadata({
    connectorKey: input.connectorKey,
    providerAdapterKey: input.providerAdapterKey ?? null,
    replenishmentJobId: input.replenishmentJobId,
    fileName: artifact.fileName,
    contentType: artifact.contentType,
    pickupPath: artifact.pickupPath,
    dropPath: artifact.dropPath,
    content: artifact.content,
    externalReference
  });

  return {
    status: "COMPLETED",
    responsePayload: {
      accepted: true,
      supplierName: input.supplierName,
      channel: input.channel,
      transportMode: "FILE_IMPORT",
      externalReference,
      deliveryArtifact: {
        fileName: artifact.fileName,
        contentType: artifact.contentType,
        pickupPath: artifact.pickupPath,
        dropPath: artifact.dropPath,
        staging,
        providerProfileKey: input.providerProfileKey ?? null,
        providerAdapterKey: input.providerAdapterKey ?? null,
        payloadShape: input.payloadShape ?? "DEFAULT",
        payloadVariant: input.payloadVariant ?? input.payloadShape ?? "DEFAULT"
      }
    },
    errorMessage: null,
    externalReference,
      supplierStatus: "SUBMITTED",
      transportMode: "FILE_IMPORT",
    deliveryArtifact: {
      ...artifact,
      staging
    }
  };
}
