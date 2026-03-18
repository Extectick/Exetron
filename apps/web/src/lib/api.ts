import type {
  BrandingConfigDto,
  AnalyticsSnapshotDto,
  AuthMeResponse,
  AuthTokensResponse,
  CustomizationEvaluationDto,
  CustomizationRuleDto,
  FeatureFlagDto,
  KitchenBoardEntryDto,
  KioskBootstrapResponse,
  KioskCheckoutResponse,
  KitchenTicketDto,
  ListResponse,
  LoginRequest,
  OwnerCabinetDashboardDto,
  PaymentAttemptDto,
  PaymentIntentDto,
  PaymentIntentListItemDto,
  PaymentProviderConfigDto,
  PaymentReconciliationSummaryDto,
  RefreshRequest,
  StoreSettingDto,
  TenantSettingDto,
  UpsertFeatureFlagRequest,
  UpsertStoreSettingRequest,
  UpsertTenantSettingRequest
} from "@exetron/contracts";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

async function readBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function withSearchParams(
  path: string,
  params: Record<string, string | null | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorPayload = await readBody<{ message?: string }>(response);
    throw new ApiError(
      errorPayload.message ?? `Request failed with ${response.status}`,
      response.status
    );
  }

  return readBody<T>(response);
}

export function login(payload: LoginRequest): Promise<AuthTokensResponse> {
  return request<AuthTokensResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function refresh(payload: RefreshRequest): Promise<AuthTokensResponse> {
  return request<AuthTokensResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function me(accessToken: string): Promise<AuthMeResponse> {
  return request<AuthMeResponse>("/auth/me", {}, accessToken);
}

export function logout(refreshToken: string, accessToken: string): Promise<{ success: true }> {
  return request<{ success: true }>(
    "/auth/logout",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    },
    accessToken
  );
}

export function listResource<T>(
  endpoint: string,
  accessToken: string
): Promise<ListResponse<T>> {
  return request<ListResponse<T>>(endpoint, {}, accessToken);
}

export function createResource<T>(
  endpoint: string,
  payload: Record<string, unknown>,
  accessToken: string
): Promise<T> {
  return request<T>(
    endpoint,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function patchResource<T>(
  endpoint: string,
  id: string,
  payload: Record<string, unknown>,
  accessToken: string
): Promise<T> {
  return request<T>(
    `${endpoint}/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getTenantSettings(
  accessToken: string,
  tenantId?: string
): Promise<ListResponse<TenantSettingDto>> {
  return request<ListResponse<TenantSettingDto>>(
    withSearchParams("/settings/tenant", { tenantId }),
    {},
    accessToken
  );
}

export function upsertTenantSetting(
  payload: UpsertTenantSettingRequest,
  accessToken: string,
  tenantId?: string
): Promise<TenantSettingDto> {
  return request<TenantSettingDto>(
    withSearchParams("/settings/tenant", { tenantId }),
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getStoreSettings(
  storeId: string,
  accessToken: string
): Promise<ListResponse<StoreSettingDto>> {
  return request<ListResponse<StoreSettingDto>>(
    `/settings/stores/${storeId}`,
    {},
    accessToken
  );
}

export function upsertStoreSetting(
  payload: UpsertStoreSettingRequest,
  accessToken: string
): Promise<StoreSettingDto> {
  return request<StoreSettingDto>(
    "/settings/store",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getFeatureFlags(
  accessToken: string,
  tenantId?: string,
  storeId?: string
): Promise<ListResponse<FeatureFlagDto>> {
  return request<ListResponse<FeatureFlagDto>>(
    withSearchParams("/feature-flags", { tenantId, storeId }),
    {},
    accessToken
  );
}

export function upsertFeatureFlag(
  payload: UpsertFeatureFlagRequest,
  accessToken: string
): Promise<FeatureFlagDto> {
  return request<FeatureFlagDto>(
    "/feature-flags",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listBrandingConfigs(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    channel?: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE";
    pointKey?: string;
  }
): Promise<ListResponse<BrandingConfigDto>> {
  return request<ListResponse<BrandingConfigDto>>(
    withSearchParams("/customization/branding", params),
    {},
    accessToken
  );
}

export function createBrandingConfig(
  accessToken: string,
  payload: {
    tenantId: string;
    storeId?: string | null;
    channel: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE";
    pointKey?: string | null;
    config: Record<string, unknown>;
  }
): Promise<BrandingConfigDto> {
  return request<BrandingConfigDto>(
    "/customization/branding",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listCustomizationRules(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    channel?: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE";
    pointKey?: string;
    status?: "ACTIVE" | "ARCHIVED";
  }
): Promise<ListResponse<CustomizationRuleDto>> {
  return request<ListResponse<CustomizationRuleDto>>(
    withSearchParams("/customization/rules", params),
    {},
    accessToken
  );
}

export function createCustomizationRule(
  accessToken: string,
  payload: {
    tenantId: string;
    storeId?: string | null;
    channel?: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE" | null;
    pointKey?: string | null;
    key: string;
    description?: string | null;
    priority?: number;
    conditions?: Record<string, unknown> | null;
    actions: Record<string, unknown>;
  }
): Promise<CustomizationRuleDto> {
  return request<CustomizationRuleDto>(
    "/customization/rules",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function evaluateCustomization(
  accessToken: string,
  payload: {
    tenantId?: string;
    storeId?: string | null;
    channel: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE";
    pointKey?: string | null;
    inputs?: Record<string, unknown> | null;
  }
): Promise<CustomizationEvaluationDto> {
  return request<CustomizationEvaluationDto>(
    "/customization/evaluate",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listKitchenTickets(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    status?: string;
    stationKey?: string;
  }
): Promise<ListResponse<KitchenTicketDto>> {
  return request<ListResponse<KitchenTicketDto>>(
    withSearchParams("/kitchen/tickets", params),
    {},
    accessToken
  );
}

export function transitionKitchenTicket(
  accessToken: string,
  ticketId: string,
  payload: {
    toStatus: string;
    reason?: string | null;
  }
): Promise<KitchenTicketDto> {
  return request<KitchenTicketDto>(
    `/kitchen/tickets/${ticketId}/transition`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listBoardOrders(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    boardStatus?: string;
  }
): Promise<ListResponse<KitchenBoardEntryDto>> {
  return request<ListResponse<KitchenBoardEntryDto>>(
    withSearchParams("/board/orders", params),
    {},
    accessToken
  );
}

export function listPaymentProviderConfigs(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    method?: "CASH" | "CARD" | "QR";
  }
): Promise<ListResponse<PaymentProviderConfigDto>> {
  return request<ListResponse<PaymentProviderConfigDto>>(
    withSearchParams("/payments/provider-configs", params),
    {},
    accessToken
  );
}

export function createPaymentProviderConfig(
  accessToken: string,
  payload: {
    tenantId: string;
    storeId?: string | null;
    providerKey: string;
    providerType: "CASH_MANUAL" | "CARD_SIMULATED" | "QR_SIMULATED";
    method: "CASH" | "CARD" | "QR";
    enabled?: boolean;
    priority?: number;
    allowedChannels?: Array<"ADMIN" | "POS" | "KIOSK" | "DELIVERY">;
    autoConfirmOrderOnSuccess?: boolean;
    settings?: Record<string, unknown> | null;
  }
): Promise<PaymentProviderConfigDto> {
  return request<PaymentProviderConfigDto>(
    "/payments/provider-configs",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function patchPaymentProviderConfig(
  accessToken: string,
  configId: string,
  payload: {
    storeId?: string | null;
    providerKey?: string;
    providerType?: "CASH_MANUAL" | "CARD_SIMULATED" | "QR_SIMULATED";
    method?: "CASH" | "CARD" | "QR";
    enabled?: boolean;
    priority?: number;
    allowedChannels?: Array<"ADMIN" | "POS" | "KIOSK" | "DELIVERY">;
    autoConfirmOrderOnSuccess?: boolean;
    settings?: Record<string, unknown> | null;
  }
): Promise<PaymentProviderConfigDto> {
  return request<PaymentProviderConfigDto>(
    `/payments/provider-configs/${configId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listPaymentIntents(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    method?: "CASH" | "CARD" | "QR";
    status?: "PENDING" | "PARTIALLY_PAID" | "COMPLETED" | "FAILED" | "CANCELLED";
    channel?: "ADMIN" | "POS" | "KIOSK" | "DELIVERY";
  }
): Promise<ListResponse<PaymentIntentListItemDto>> {
  return request<ListResponse<PaymentIntentListItemDto>>(
    withSearchParams("/payments/intents", params),
    {},
    accessToken
  );
}

export function getPaymentIntent(
  accessToken: string,
  intentId: string
): Promise<PaymentIntentDto> {
  return request<PaymentIntentDto>(`/payments/intents/${intentId}`, {}, accessToken);
}

export function listPaymentAttempts(
  accessToken: string,
  intentId: string
): Promise<ListResponse<PaymentAttemptDto>> {
  return request<ListResponse<PaymentAttemptDto>>(
    `/payments/intents/${intentId}/attempts`,
    {},
    accessToken
  );
}

export function getPaymentReconciliationSummary(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
  }
): Promise<PaymentReconciliationSummaryDto> {
  return request<PaymentReconciliationSummaryDto>(
    withSearchParams("/payments/reconciliation/summary", params),
    {},
    accessToken
  );
}

export function getOwnerCabinetDashboard(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    periodStart?: string;
    periodEnd?: string;
  }
): Promise<OwnerCabinetDashboardDto> {
  return request<OwnerCabinetDashboardDto>(
    withSearchParams("/analytics/owner-cabinet", params),
    {},
    accessToken
  );
}

export function listAnalyticsSnapshots(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    periodStart?: string;
    periodEnd?: string;
  }
): Promise<ListResponse<AnalyticsSnapshotDto>> {
  return request<ListResponse<AnalyticsSnapshotDto>>(
    withSearchParams("/analytics/snapshots", params),
    {},
    accessToken
  );
}

export function createAnalyticsSnapshot(
  accessToken: string,
  payload: {
    tenantId?: string;
    storeId?: string | null;
    periodStart?: string;
    periodEnd?: string;
  }
): Promise<AnalyticsSnapshotDto> {
  return request<AnalyticsSnapshotDto>(
    "/analytics/snapshots",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getKioskBootstrap(deviceId: string): Promise<KioskBootstrapResponse> {
  return request<KioskBootstrapResponse>(
    withSearchParams("/kiosk/bootstrap", { deviceId })
  );
}

export function kioskCheckout(payload: {
  deviceId: string;
  customerName?: string | null;
  note?: string | null;
  paymentMethod: "CASH" | "CARD" | "QR";
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    priceListId?: string | null;
    modifierOptionIds?: string[];
  }>;
}): Promise<KioskCheckoutResponse> {
  return request<KioskCheckoutResponse>("/kiosk/checkout", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
