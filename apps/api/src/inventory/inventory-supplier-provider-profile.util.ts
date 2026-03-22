export type InventorySupplierProviderProfileKey =
  | "HTTP_PUSH_STANDARD"
  | "WEBHOOK_SIGNED_STANDARD"
  | "FILE_DROP_STANDARD";

export type InventorySupplierProviderProfile = {
  key: InventorySupplierProviderProfileKey;
  name: string;
  description: string;
  transport: {
    mode: "HTTP_PUSH" | "WEBHOOK" | "FILE_IMPORT";
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
  payloadShape: "DEFAULT" | "ORDER_ENVELOPE" | "FILE_BATCH";
};

const PROVIDER_PROFILES: InventorySupplierProviderProfile[] = [
  {
    key: "HTTP_PUSH_STANDARD",
    name: "HTTP Push Standard",
    description: "Provider-style push API with envelope payload, auth header defaults and retry policy.",
    transport: {
      mode: "HTTP_PUSH",
      method: "POST",
      timeoutMs: 5000,
      acceptedStatusCodes: [200, 201, 202],
      responseStatusField: "state",
      responseStatusMap: {
        "200": "ACKNOWLEDGED",
        "201": "ACKNOWLEDGED",
        "202": "ACKNOWLEDGED"
      },
      allowsPolling: true,
      auth: {
        kind: "HEADER",
        headerName: "x-supplier-auth",
        prefix: "Token"
      },
      retryPolicy: {
        enabled: true,
        strategy: "FIXED",
        initialDelayMs: 30000,
        maxDelayMs: 30000,
        maxAttempts: 3,
        retryableHttpStatusCodes: [408, 425, 429, 500, 502, 503, 504],
        retryOnNetworkError: true,
        deadLetterStatus: "DEAD_LETTERED"
      }
    },
    payloadShape: "ORDER_ENVELOPE"
  },
  {
    key: "FILE_DROP_STANDARD",
    name: "File Drop Standard",
    description: "Pickup/drop supplier exchange with checksum validation and batch-style payload artifact.",
    transport: {
      mode: "FILE_IMPORT",
      importFormat: "json",
      pickupPath: "/inventory/replenishment-jobs/:jobId/supplier-file-pickup",
      dropPath: "/inventory/replenishment-jobs/:jobId/supplier-file-drop",
      requireChecksum: true,
      allowsPolling: false
    },
    payloadShape: "FILE_BATCH"
  },
  {
    key: "WEBHOOK_SIGNED_STANDARD",
    name: "Signed Webhook Standard",
    description: "Webhook callback profile with HMAC verification and polling disabled by default.",
    transport: {
      mode: "WEBHOOK",
      callbackPath: "/inventory/replenishment-jobs/:jobId/supplier-webhook",
      requireSignature: true,
      allowsPolling: false
    },
    payloadShape: "DEFAULT"
  }
];

export function listInventorySupplierProviderProfiles(): InventorySupplierProviderProfile[] {
  return PROVIDER_PROFILES.map((item) => ({
    ...item,
    transport: {
      ...item.transport,
      acceptedStatusCodes: item.transport.acceptedStatusCodes?.slice() ?? [],
      responseStatusMap: item.transport.responseStatusMap ? { ...item.transport.responseStatusMap } : undefined,
      auth: item.transport.auth ? { ...item.transport.auth } : undefined,
      retryPolicy: item.transport.retryPolicy ? { ...item.transport.retryPolicy } : undefined
    }
  }));
}

export function resolveInventorySupplierProviderProfile(
  key: string | null | undefined
): InventorySupplierProviderProfile | null {
  const normalized = typeof key === "string" ? key.trim().toUpperCase() : "";
  if (!normalized) {
    return null;
  }
  return (
    PROVIDER_PROFILES.find((item) => item.key === normalized) ?? null
  );
}
