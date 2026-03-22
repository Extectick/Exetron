import type { InventorySupplierProviderProfileKey } from "./inventory-supplier-provider-profile.util";

export type InventorySupplierProviderAdapterKey =
  | "FRESHLANE_HTTP_V1"
  | "WAREDROP_FILE_V1"
  | "SIGNAL_WEBHOOK_V1";

export type InventorySupplierProviderAdapter = {
  key: InventorySupplierProviderAdapterKey;
  name: string;
  description: string;
  version: string;
  visibility: "VISIBLE" | "INTERNAL";
  defaultPolicyVisible: boolean;
  providerProfileKey: InventorySupplierProviderProfileKey;
  transport?: {
    mode?: "HTTP_PUSH" | "WEBHOOK" | "FILE_IMPORT";
    method?: string;
    callbackPath?: string;
    importFormat?: "json" | "csv";
    pickupPath?: string;
    dropPath?: string;
    requireSignature?: boolean;
    requireChecksum?: boolean;
    timeoutMs?: number;
    acceptedStatusCodes?: number[];
    responseStatusField?: string;
    responseStatusMap?: Record<string, string>;
    allowsPolling?: boolean;
    auth?: {
      kind: "BEARER" | "HEADER";
      headerName?: string;
      prefix?: string | null;
    };
    retryPolicy?: {
      enabled: boolean;
      strategy: "FIXED" | "EXPONENTIAL";
      initialDelayMs: number;
      maxDelayMs: number;
      maxAttempts: number;
      retryableHttpStatusCodes: number[];
      retryOnNetworkError: boolean;
      deadLetterStatus: string;
    };
  };
  execution: {
    payloadVariant:
      | "DEFAULT"
      | "ORDER_ENVELOPE"
      | "FILE_BATCH"
      | "FRESHLANE_ORDER"
      | "WAREDROP_BATCH"
      | "SIGNAL_EVENT";
    externalReferencePrefix?: string;
    fileNamePrefix?: string;
  };
};

const PROVIDER_ADAPTERS: InventorySupplierProviderAdapter[] = [
  {
    key: "FRESHLANE_HTTP_V1",
    name: "Freshlane HTTP Adapter",
    description: "Freshlane-style HTTP supplier API with bearer auth and adapter-specific response mapping.",
    version: "1",
    visibility: "VISIBLE",
    defaultPolicyVisible: true,
    providerProfileKey: "HTTP_PUSH_STANDARD",
    transport: {
      method: "POST",
      timeoutMs: 7000,
      acceptedStatusCodes: [200, 202],
      responseStatusField: "freshlaneStatus",
      responseStatusMap: {
        QUEUED: "ACKNOWLEDGED",
        ACKNOWLEDGED: "ACKNOWLEDGED",
        IN_TRANSIT: "IN_TRANSIT",
        DELIVERED: "DELIVERED"
      },
      auth: {
        kind: "BEARER",
        prefix: "Bearer"
      },
      retryPolicy: {
        enabled: true,
        strategy: "FIXED",
        initialDelayMs: 15000,
        maxDelayMs: 30000,
        maxAttempts: 4,
        retryableHttpStatusCodes: [408, 425, 429, 500, 502, 503, 504],
        retryOnNetworkError: true,
        deadLetterStatus: "DEAD_LETTERED"
      }
    },
    execution: {
      payloadVariant: "FRESHLANE_ORDER",
      externalReferencePrefix: "freshlane",
      fileNamePrefix: "freshlane-order"
    }
  },
  {
    key: "WAREDROP_FILE_V1",
    name: "Waredrop File Adapter",
    description: "Waredrop-style pickup/drop exchange with adapter-specific batch payload and file naming.",
    version: "1",
    visibility: "VISIBLE",
    defaultPolicyVisible: true,
    providerProfileKey: "FILE_DROP_STANDARD",
    transport: {
      importFormat: "json",
      pickupPath: "/inventory/replenishment-jobs/:jobId/provider-files/waredrop/pickup",
      dropPath: "/inventory/replenishment-jobs/:jobId/provider-files/waredrop/drop",
      requireChecksum: true,
      allowsPolling: false
    },
    execution: {
      payloadVariant: "WAREDROP_BATCH",
      externalReferencePrefix: "waredrop",
      fileNamePrefix: "waredrop-batch"
    }
  },
  {
    key: "SIGNAL_WEBHOOK_V1",
    name: "Signal Webhook Adapter",
    description: "Signal-style signed webhook callback with adapter-specific callback path and event envelope.",
    version: "1",
    visibility: "VISIBLE",
    defaultPolicyVisible: true,
    providerProfileKey: "WEBHOOK_SIGNED_STANDARD",
    transport: {
      callbackPath: "/inventory/replenishment-jobs/:jobId/provider-webhooks/signal",
      requireSignature: true,
      allowsPolling: false
    },
    execution: {
      payloadVariant: "SIGNAL_EVENT",
      externalReferencePrefix: "signal"
    }
  }
];

export function listInventorySupplierProviderAdapters(): InventorySupplierProviderAdapter[] {
  return PROVIDER_ADAPTERS.map((item) => ({
    ...item,
    transport: item.transport
      ? {
          ...item.transport,
          acceptedStatusCodes: item.transport.acceptedStatusCodes?.slice() ?? [],
          responseStatusMap: item.transport.responseStatusMap ? { ...item.transport.responseStatusMap } : undefined,
          auth: item.transport.auth ? { ...item.transport.auth } : undefined,
          retryPolicy: item.transport.retryPolicy ? { ...item.transport.retryPolicy } : undefined
        }
      : undefined,
    execution: { ...item.execution }
  }));
}

export function resolveInventorySupplierProviderAdapter(
  key: string | null | undefined
): InventorySupplierProviderAdapter | null {
  const normalized = typeof key === "string" ? key.trim().toUpperCase() : "";
  if (!normalized) {
    return null;
  }
  return PROVIDER_ADAPTERS.find((item) => item.key === normalized) ?? null;
}
