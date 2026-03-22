import type {
  AnalyticsSnapshotDto,
  AuthMeResponse,
  CustomerProfileDto,
  AuthTokensResponse,
  BrandingConfigDto,
  CountryProfileDto,
  CustomizationEvaluationDto,
  CustomizationRuleDto,
  FeatureFlagDto,
  FulfillmentDispatchBoardItemDto,
  FulfillmentOrderProjectionDto,
  KitchenBoardEntryDto,
  KitchenTicketDto,
  KioskAccessTokenDto,
  KioskBootstrapResponse,
  KioskCheckoutResponse,
  ListResponse,
  LocalizationContextDto,
  LocalizationLanguagePackDto,
  LocalizationPreferencesDto,
  LocalizationPreferencesStateDto,
  LocalizedContentDto,
  LocalizedTemplateDto,
  LoginRequest,
  ObservabilityStatusDto,
  OnboardingBootstrapRequest,
  OnboardingBootstrapResponse,
  OwnerCabinetDashboardDto,
  PaymentAttemptDto,
  PaymentIntentDto,
  PaymentIntentListItemDto,
  PaymentProviderConfigDto,
  PaymentReconciliationSummaryDto,
  PermissionDto,
  PromotionCampaignDto,
  RefreshRequest,
  RenderLocalizedTemplateResponse,
  StorefrontBootstrapResponse,
  StorefrontCartSessionDto,
  StorefrontCheckoutResponse,
  StorefrontCustomerSessionDto,
  StorefrontOrderTrackingResponse,
  StorefrontQrLinkDto,
  StorefrontQrResolutionDto,
  StoreFulfillmentConfigDto,
  StoreSettingDto,
  TenantSettingDto,
  CreateAnalyticsPrecomputeRequest,
  UpsertFeatureFlagRequest,
  UpsertStoreSettingRequest,
  UpsertTenantSettingRequest
} from "@exetron/contracts";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface HealthCheckResponse {
  status: string;
  service: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessResponse {
  status: string;
  service: string;
  dependencies: {
    database: string;
  };
  timestamp: string;
}

export class ApiError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

export async function readBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function withSearchParams(
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

export async function request<T>(
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

export async function requestText(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<string> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || `Request failed with ${response.status}`, response.status);
  }

  return response.text();
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

export function getResource<T>(
  endpoint: string,
  id: string,
  accessToken: string
): Promise<T> {
  return request<T>(`${endpoint}/${id}`, {}, accessToken);
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

export function putResource<T>(
  endpoint: string,
  payload: Record<string, unknown>,
  accessToken: string
): Promise<T> {
  return request<T>(
    endpoint,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getHealthStatus(): Promise<HealthCheckResponse> {
  return request<HealthCheckResponse>("/health");
}

export function getReadinessStatus(): Promise<ReadinessResponse> {
  return request<ReadinessResponse>("/health/readiness");
}

export function getMetricsText(): Promise<string> {
  return requestText("/health/metrics");
}

export function getObservabilityStatus(accessToken: string): Promise<ObservabilityStatusDto> {
  return request<ObservabilityStatusDto>("/health/observability", {}, accessToken);
}

export function listPermissions(accessToken: string): Promise<ListResponse<PermissionDto>> {
  return request<ListResponse<PermissionDto>>("/permissions", {}, accessToken);
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

export function getLocalizationPreferences(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
  }
): Promise<LocalizationPreferencesStateDto> {
  return request<LocalizationPreferencesStateDto>(
    withSearchParams("/localization/preferences", params),
    {},
    accessToken
  );
}

export function upsertTenantLocalizationPreferences(
  accessToken: string,
  payload: {
    defaultLocale: string;
    fallbackLocale?: string;
    supportedLocales?: string[];
    countryCode?: string | null;
    currency?: string | null;
    timezone?: string | null;
    channelLocales?: Partial<
      Record<"ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE", string>
    >;
  },
  tenantId?: string
): Promise<LocalizationPreferencesDto> {
  return request<LocalizationPreferencesDto>(
    withSearchParams("/localization/preferences/tenant", { tenantId }),
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function upsertStoreLocalizationPreferences(
  accessToken: string,
  payload: {
    storeId: string;
    defaultLocale: string;
    fallbackLocale?: string;
    supportedLocales?: string[];
    countryCode?: string | null;
    currency?: string | null;
    timezone?: string | null;
    channelLocales?: Partial<
      Record<"ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE", string>
    >;
  }
): Promise<LocalizationPreferencesDto> {
  return request<LocalizationPreferencesDto>(
    "/localization/preferences/store",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listCountryProfiles(
  accessToken: string,
  tenantId?: string
): Promise<ListResponse<CountryProfileDto>> {
  return request<ListResponse<CountryProfileDto>>(
    withSearchParams("/localization/country-profiles", { tenantId }),
    {},
    accessToken
  );
}

export function upsertCountryProfile(
  accessToken: string,
  countryCode: string,
  payload: {
    defaultLocale: string;
    supportedLocales?: string[];
    currency: string;
    tax?: {
      mode?: "NONE" | "INCLUSIVE" | "EXCLUSIVE";
      ratePercent?: number | null;
      label?: string | null;
    };
    complianceFlags?: string[];
    metadata?: Record<string, unknown>;
  },
  tenantId?: string
): Promise<CountryProfileDto> {
  return request<CountryProfileDto>(
    withSearchParams(`/localization/country-profiles/${countryCode}`, { tenantId }),
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listLocalizedContent(
  accessToken: string,
  params: {
    tenantId?: string;
    targetType?: "CATEGORY" | "PRODUCT" | "VARIANT" | "MODIFIER_GROUP" | "MODIFIER_OPTION" | "BRANDING";
    targetId?: string;
  }
): Promise<ListResponse<LocalizedContentDto>> {
  return request<ListResponse<LocalizedContentDto>>(
    withSearchParams("/localization/content", params),
    {},
    accessToken
  );
}

export function upsertLocalizedContent(
  accessToken: string,
  payload: {
    tenantId: string;
    targetType: "CATEGORY" | "PRODUCT" | "VARIANT" | "MODIFIER_GROUP" | "MODIFIER_OPTION" | "BRANDING";
    targetId: string;
    entries: Record<string, Record<string, string>>;
  }
): Promise<LocalizedContentDto> {
  return request<LocalizedContentDto>(
    "/localization/content",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listLocalizedTemplates(
  accessToken: string,
  params: {
    tenantId?: string;
    templateKey?: string;
    channel?: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE";
  }
): Promise<ListResponse<LocalizedTemplateDto>> {
  return request<ListResponse<LocalizedTemplateDto>>(
    withSearchParams("/localization/templates", params),
    {},
    accessToken
  );
}

export function upsertLocalizedTemplate(
  accessToken: string,
  payload: {
    tenantId: string;
    templateKey: string;
    channel?: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE" | null;
    description?: string | null;
    variables?: string[];
    entries: Record<
      string,
      {
        subject?: string;
        title?: string;
        body?: string;
        sms?: string;
        pushTitle?: string;
        pushBody?: string;
      }
    >;
  }
): Promise<LocalizedTemplateDto> {
  return request<LocalizedTemplateDto>(
    "/localization/templates",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getLocalizationContext(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    locale?: string;
    customerLocale?: string;
    countryCode?: string;
    channel?: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE";
    currency?: string;
  }
): Promise<LocalizationContextDto> {
  return request<LocalizationContextDto>(
    withSearchParams("/localization/context", params),
    {},
    accessToken
  );
}

export function exportLocalizationLanguagePack(
  accessToken: string,
  tenantId?: string
): Promise<LocalizationLanguagePackDto> {
  return request<LocalizationLanguagePackDto>(
    withSearchParams("/localization/language-pack", { tenantId }),
    {},
    accessToken
  );
}

export function importLocalizationLanguagePack(
  accessToken: string,
  payload: {
    tenantId?: string;
    pack: LocalizationLanguagePackDto;
  }
): Promise<LocalizationLanguagePackDto> {
  return request<LocalizationLanguagePackDto>(
    "/localization/language-pack/import",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function renderLocalizedTemplate(
  accessToken: string,
  payload: {
    tenantId?: string;
    storeId?: string | null;
    templateKey: string;
    channel?: "ADMIN" | "POS" | "KIOSK" | "DELIVERY" | "KITCHEN" | "BOARD" | "BACKOFFICE" | null;
    locale?: string;
    customerLocale?: string;
    countryCode?: string;
    variables?: Record<string, string | number | boolean | null>;
  }
): Promise<RenderLocalizedTemplateResponse> {
  return request<RenderLocalizedTemplateResponse>(
    "/localization/templates/render",
    {
      method: "POST",
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

export function issueKioskAccessToken(
  accessToken: string,
  deviceId: string
): Promise<KioskAccessTokenDto> {
  return request<KioskAccessTokenDto>(
    `/devices/${deviceId}/kiosk-access-token`,
    { method: "POST" },
    accessToken
  );
}

export function onboardingBootstrap(
  accessToken: string,
  payload: OnboardingBootstrapRequest
): Promise<OnboardingBootstrapResponse> {
  return request<OnboardingBootstrapResponse>(
    "/onboarding/bootstrap",
    {
      method: "POST",
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

export function patchBrandingConfig(
  accessToken: string,
  id: string,
  payload: Record<string, unknown>
): Promise<BrandingConfigDto> {
  return request<BrandingConfigDto>(
    `/customization/branding/${id}`,
    {
      method: "PATCH",
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

export function patchCustomizationRule(
  accessToken: string,
  id: string,
  payload: Record<string, unknown>
): Promise<CustomizationRuleDto> {
  return request<CustomizationRuleDto>(
    `/customization/rules/${id}`,
    {
      method: "PATCH",
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

export function listCustomerProfiles(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    phone?: string;
    status?: "ACTIVE" | "MERGED" | "ARCHIVED";
  }
): Promise<ListResponse<CustomerProfileDto>> {
  return request<ListResponse<CustomerProfileDto>>(
    withSearchParams("/customers/profiles", params),
    {},
    accessToken
  );
}

export function getCustomerProfile(
  accessToken: string,
  customerProfileId: string
): Promise<CustomerProfileDto> {
  return request<CustomerProfileDto>(`/customers/profiles/${customerProfileId}`, {}, accessToken);
}

export function adjustCustomerLoyalty(
  accessToken: string,
  customerProfileId: string,
  payload: {
    points: number;
    description?: string | null;
  }
): Promise<CustomerProfileDto> {
  return request<CustomerProfileDto>(
    `/customers/profiles/${customerProfileId}/loyalty/adjust`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listPromotions(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
  }
): Promise<ListResponse<PromotionCampaignDto>> {
  return request<ListResponse<PromotionCampaignDto>>(
    withSearchParams("/customers/promotions", params),
    {},
    accessToken
  );
}

export function createPromotionCampaign(
  accessToken: string,
  payload: {
    tenantId: string;
    storeId?: string | null;
    code: string;
    name: string;
    status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
    type: "PERCENTAGE" | "FIXED_AMOUNT" | "LOYALTY_REDEEM";
    value: string;
    minimumOrderTotal?: string;
    maxDiscountAmount?: string | null;
    pointsCost?: number | null;
    segmentKeys?: string[];
    usageLimit?: number | null;
    activeFrom?: string | null;
    activeTo?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<PromotionCampaignDto> {
  return request<PromotionCampaignDto>(
    "/customers/promotions",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function patchPromotionCampaign(
  accessToken: string,
  promotionId: string,
  payload: {
    storeId?: string | null;
    code?: string;
    name?: string;
    status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
    type?: "PERCENTAGE" | "FIXED_AMOUNT" | "LOYALTY_REDEEM";
    value?: string;
    minimumOrderTotal?: string;
    maxDiscountAmount?: string | null;
    pointsCost?: number | null;
    segmentKeys?: string[];
    usageLimit?: number | null;
    activeFrom?: string | null;
    activeTo?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<PromotionCampaignDto> {
  return request<PromotionCampaignDto>(
    `/customers/promotions/${promotionId}`,
    {
      method: "PATCH",
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

export function getKitchenTicket(
  accessToken: string,
  ticketId: string
): Promise<KitchenTicketDto> {
  return request<KitchenTicketDto>(`/kitchen/tickets/${ticketId}`, {}, accessToken);
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
    secrets?: Record<string, unknown> | null;
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
    secrets?: Record<string, unknown> | null;
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

export function processPaymentAllocation(
  accessToken: string,
  intentId: string,
  allocationId: string,
  payload: { providerKey?: string | null }
): Promise<PaymentIntentDto> {
  return request<PaymentIntentDto>(
    `/payments/intents/${intentId}/allocations/${allocationId}/process`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function cancelPaymentIntent(
  accessToken: string,
  intentId: string,
  payload: { reason?: string | null } = {}
): Promise<PaymentIntentDto> {
  return request<PaymentIntentDto>(
    `/payments/intents/${intentId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
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

export function getOwnerCabinetDashboardView(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    periodStart?: string;
    periodEnd?: string;
    mode?: "LIVE" | "PREFER_SNAPSHOT" | "SNAPSHOT_ONLY";
  }
): Promise<OwnerCabinetDashboardDto> {
  return request<OwnerCabinetDashboardDto>(
    withSearchParams("/analytics/owner-cabinet", params),
    {},
    accessToken
  );
}

export async function getOwnerCabinetDashboard(
  accessToken: string,
  params: {
    tenantId?: string;
    storeId?: string;
    periodStart?: string;
    periodEnd?: string;
    mode?: "LIVE" | "PREFER_SNAPSHOT" | "SNAPSHOT_ONLY";
  }
): Promise<OwnerCabinetDashboardDto> {
  return getOwnerCabinetDashboardView(accessToken, params);
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

export function createAnalyticsPrecomputeRun(
  accessToken: string,
  payload: {
    tenantId?: string;
    storeId?: string | null;
    periodStart?: string;
    periodEnd?: string;
    kind?: "OWNER_DASHBOARD";
  }
): Promise<{
  kind: "OWNER_DASHBOARD";
  executionMode: "INLINE";
  status: "COMPLETED";
  generatedAt: string;
  artifactKey: string;
  snapshot: AnalyticsSnapshotDto;
}> {
  return request(
    "/analytics/precompute",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export async function precomputeAnalyticsSnapshot(
  accessToken: string,
  payload: CreateAnalyticsPrecomputeRequest
): Promise<AnalyticsSnapshotDto> {
  const response = await createAnalyticsPrecomputeRun(accessToken, payload);
  return response.snapshot;
}

export function getKioskBootstrap(
  deviceId: string,
  accessToken: string
): Promise<KioskBootstrapResponse> {
  return request<KioskBootstrapResponse>(
    withSearchParams("/kiosk/bootstrap", { deviceId, accessToken })
  );
}

export function kioskCheckout(payload: {
  deviceId: string;
  accessToken: string;
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

export function getStorefrontBootstrap(params: {
  storeCode: string;
  qrAccessToken?: string;
  customerSessionToken?: string;
  locale?: string;
}): Promise<StorefrontBootstrapResponse> {
  return request<StorefrontBootstrapResponse>(
    withSearchParams("/storefront/bootstrap", {
      storeCode: params.storeCode,
      qrAccessToken: params.qrAccessToken,
      customerSessionToken: params.customerSessionToken,
      locale: params.locale
    })
  );
}

export function createStorefrontCustomerSession(payload: {
  storeCode: string;
  customerName?: string | null;
  customerPhone: string;
}): Promise<StorefrontCustomerSessionDto> {
  return request<StorefrontCustomerSessionDto>("/storefront/customer-sessions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listStorefrontCustomerOrders(
  accessToken: string
): Promise<ListResponse<{
  orderId: string;
  number: string;
  status: string;
  total: string;
  placedAt: string;
  canRepeatOrder: boolean;
  tracking: {
    orderId: string;
    accessToken: string;
    expiresAt: string;
    trackingPath: string;
  };
}>> {
  return request(
    withSearchParams("/storefront/customer-sessions/orders", { accessToken })
  );
}

export function repeatStorefrontCustomerOrder(
  orderId: string,
  accessToken: string
): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>(
    withSearchParams(`/storefront/customer-sessions/orders/${orderId}/repeat`, { accessToken }),
    {
      method: "POST"
    }
  );
}

export function createStorefrontCart(payload: {
  storeId: string;
  qrAccessToken?: string | null;
  customerSessionToken?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
}): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>("/storefront/carts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getStorefrontCart(
  cartId: string,
  accessToken: string
): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>(
    withSearchParams(`/storefront/carts/${cartId}`, { accessToken })
  );
}

export function updateStorefrontCart(
  cartId: string,
  payload: {
    accessToken: string;
    customerName?: string | null;
    customerPhone?: string | null;
    note?: string | null;
  }
): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>(`/storefront/carts/${cartId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function updateStorefrontCartFulfillment(
  cartId: string,
  payload: {
    accessToken: string;
    fulfillment: {
      mode: "DELIVERY" | "PICKUP" | "DINE_IN";
      zoneCode?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      postalCode?: string | null;
      contactless?: boolean;
      pickupSlotLabel?: string | null;
      tableCode?: string | null;
      guestCount?: number | null;
      instructions?: string | null;
    };
  }
): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>(`/storefront/carts/${cartId}/fulfillment`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function applyStorefrontPromotion(
  cartId: string,
  payload: {
    accessToken: string;
    code: string;
    customerSessionToken?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
  }
): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>(`/storefront/carts/${cartId}/promotion`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function addStorefrontCartItem(
  cartId: string,
  payload: {
    accessToken: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    priceListId?: string | null;
    modifierOptionIds?: string[];
  }
): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>(`/storefront/carts/${cartId}/items`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateStorefrontCartItem(
  cartId: string,
  itemId: string,
  payload: {
    accessToken: string;
    variantId?: string | null;
    quantity?: number;
    priceListId?: string | null;
    modifierOptionIds?: string[];
  }
): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>(`/storefront/carts/${cartId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteStorefrontCartItem(
  cartId: string,
  itemId: string,
  accessToken: string
): Promise<StorefrontCartSessionDto> {
  return request<StorefrontCartSessionDto>(
    withSearchParams(`/storefront/carts/${cartId}/items/${itemId}`, { accessToken }),
    {
      method: "DELETE"
    }
  );
}

export function storefrontCheckout(
  cartId: string,
  payload: {
    accessToken: string;
    customerSessionToken?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    note?: string | null;
    paymentMethod: "CASH" | "CARD" | "QR";
  }
): Promise<StorefrontCheckoutResponse> {
  return request<StorefrontCheckoutResponse>(`/storefront/carts/${cartId}/checkout`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getStorefrontOrderTracking(
  orderId: string,
  accessToken: string
): Promise<StorefrontOrderTrackingResponse> {
  return request<StorefrontOrderTrackingResponse>(
    withSearchParams(`/storefront/orders/${orderId}/tracking`, { accessToken })
  );
}

export function createStorefrontQrLink(
  accessToken: string,
  payload: {
    tenantId?: string;
    storeId: string;
    pointKey?: string | null;
    locale?: string | null;
  }
): Promise<StorefrontQrLinkDto> {
  return request<StorefrontQrLinkDto>(
    "/storefront/qr-links",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function resolveStorefrontQrToken(token: string): Promise<StorefrontQrResolutionDto> {
  return request<StorefrontQrResolutionDto>(`/storefront/qr/${token}`);
}

export function getFulfillmentConfig(
  accessToken: string,
  storeId: string
): Promise<StoreFulfillmentConfigDto> {
  return request<StoreFulfillmentConfigDto>(
    withSearchParams("/fulfillment/config", { storeId }),
    {},
    accessToken
  );
}

export function upsertStoreFulfillmentConfig(
  accessToken: string,
  payload: {
    storeId: string;
    enabledModes?: Array<"DELIVERY" | "PICKUP" | "DINE_IN">;
    defaultMode?: "DELIVERY" | "PICKUP" | "DINE_IN";
    deliveryZones?: Array<{
      code: string;
      name: string;
      postalCodes: string[];
      fee: string;
      etaMinMinutes: number;
      etaMaxMinutes: number;
      slaMinutes: number;
      isActive?: boolean;
    }>;
    pickup?: {
      enabled?: boolean;
      leadTimeMinutes?: number;
      promisedWindowMinutes?: number;
      instructions?: string | null;
    };
    dineIn?: {
      enabled?: boolean;
      leadTimeMinutes?: number;
      tables?: Array<{
        code: string;
        label: string;
        capacity: number;
        isActive?: boolean;
      }>;
    };
    providers?: Array<{
      providerKey: string;
      providerType?: "MANUAL" | "EXTERNAL_PLACEHOLDER";
      enabled?: boolean;
    }>;
  }
): Promise<StoreFulfillmentConfigDto> {
  return request<StoreFulfillmentConfigDto>(
    "/fulfillment/config/store",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function listFulfillmentDispatchBoard(
  accessToken: string,
  storeId: string
): Promise<ListResponse<FulfillmentDispatchBoardItemDto>> {
  return request<ListResponse<FulfillmentDispatchBoardItemDto>>(
    withSearchParams("/fulfillment/dispatch-board", { storeId }),
    {},
    accessToken
  );
}

export function getFulfillmentOrder(
  accessToken: string,
  orderId: string
): Promise<FulfillmentOrderProjectionDto> {
  return request<FulfillmentOrderProjectionDto>(`/fulfillment/orders/${orderId}`, {}, accessToken);
}

export function assignFulfillmentCourier(
  accessToken: string,
  orderId: string,
  payload: {
    courierName: string;
    courierPhone?: string | null;
    courierExternalId?: string | null;
  }
): Promise<FulfillmentOrderProjectionDto> {
  return request<FulfillmentOrderProjectionDto>(
    `/fulfillment/orders/${orderId}/assignment`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function updateFulfillmentEta(
  accessToken: string,
  orderId: string,
  payload: {
    etaAt?: string | null;
    promisedAt?: string | null;
  }
): Promise<FulfillmentOrderProjectionDto> {
  return request<FulfillmentOrderProjectionDto>(
    `/fulfillment/orders/${orderId}/eta`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function updateFulfillmentStatus(
  accessToken: string,
  orderId: string,
  payload: {
    status:
      | "PENDING"
      | "SCHEDULED"
      | "PREPARING"
      | "READY_FOR_PICKUP"
      | "OUT_FOR_DELIVERY"
      | "DELIVERED"
      | "PICKED_UP"
      | "TABLE_ASSIGNED"
      | "SERVED";
    note?: string | null;
  }
): Promise<FulfillmentOrderProjectionDto> {
  return request<FulfillmentOrderProjectionDto>(
    `/fulfillment/orders/${orderId}/status`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}
