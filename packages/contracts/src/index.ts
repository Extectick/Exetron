import type {
  AppScope,
  AnalyticsSnapshotKind,
  AvailabilityTargetType,
  CartStatus,
  CatalogTargetType,
  CustomizationChannel,
  CustomizationRuleStatus,
  DeviceKind,
  JwtClaims,
  KitchenBoardStatus,
  KioskPaymentHandoffStatus,
  PaymentAllocationStatus,
  PaymentAttemptStatus,
  KitchenTicketStatus,
  ModifierSelectionMode,
  OrderChannel,
  OrderStatus,
  PaymentIntentStatus,
  PaymentMethodKind,
  PaymentProviderType,
  PaginationResult,
  PriceSource,
  PosSessionStatus,
  PosShiftStatus,
  RefundStatus
} from "@exetron/types";

export interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface AuthMeResponse {
  user: UserDto;
  claims: JwtClaims;
  permissions: string[];
}

export interface TenantDto {
  id: string;
  slug: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface BrandDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface StoreDto {
  id: string;
  tenantId: string;
  brandId: string | null;
  code: string;
  name: string;
  timezone: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface UserDto {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  isPlatformAdmin: boolean;
  roleIds: string[];
  storeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleDto {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description: string | null;
  permissionKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

export interface DeviceDto {
  id: string;
  tenantId: string;
  storeId: string;
  code: string;
  name: string;
  type: DeviceKind;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "RETIRED";
  createdAt: string;
  updatedAt: string;
}

export interface KioskAccessTokenDto {
  deviceId: string;
  accessToken: string;
  expiresAt: string;
  kioskPath: string;
}

export interface OnboardingBootstrapDeviceDto {
  device: DeviceDto;
  bootstrapSecret: string;
  kioskAccessToken: KioskAccessTokenDto | null;
}

export interface OnboardingBootstrapResponse {
  tenant: TenantDto;
  store: StoreDto;
  devices: OnboardingBootstrapDeviceDto[];
}

export interface AuditLogDto {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  actorType: "USER" | "SYSTEM" | "DEVICE";
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface TenantSettingDto {
  id: string;
  tenantId: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettingDto {
  id: string;
  tenantId: string;
  storeId: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LocalizationPreferencesDto {
  scope: "TENANT" | "STORE";
  tenantId: string;
  storeId: string | null;
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: string[];
  countryCode: string | null;
  currency: string | null;
  timezone: string | null;
  channelLocales: Partial<Record<CustomizationChannel, string>>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LocalizationPreferencesStateDto {
  tenant: LocalizationPreferencesDto | null;
  store: LocalizationPreferencesDto | null;
}

export interface CountryProfileTaxPolicyDto {
  mode: "NONE" | "INCLUSIVE" | "EXCLUSIVE";
  ratePercent: number | null;
  label: string | null;
}

export interface CountryProfileDto {
  tenantId: string;
  countryCode: string;
  defaultLocale: string;
  supportedLocales: string[];
  currency: string;
  tax: CountryProfileTaxPolicyDto;
  complianceFlags: string[];
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LocalizedContentDto {
  tenantId: string;
  targetType:
    | "CATEGORY"
    | "PRODUCT"
    | "VARIANT"
    | "MODIFIER_GROUP"
    | "MODIFIER_OPTION"
    | "BRANDING";
  targetId: string;
  entries: Record<string, Record<string, string>>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LocalizedTemplateEntryDto {
  subject?: string;
  title?: string;
  body?: string;
  sms?: string;
  pushTitle?: string;
  pushBody?: string;
}

export interface LocalizedTemplateDto {
  tenantId: string;
  templateKey: string;
  channel: CustomizationChannel | null;
  description: string | null;
  variables: string[];
  entries: Record<string, LocalizedTemplateEntryDto>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LocalizationFormattingPreviewDto {
  moneyExample: string;
  dateExample: string;
  addressExample: string;
  phoneExample: string;
}

export interface LocalizationContextDto {
  tenantId: string;
  storeId: string | null;
  locale: string;
  fallbackLocale: string;
  resolvedBy: string[];
  countryCode: string | null;
  supportedLocales: string[];
  currency: string;
  tax: CountryProfileTaxPolicyDto;
  complianceFlags: string[];
  formatting: LocalizationFormattingPreviewDto;
}

export interface LocalizationLanguagePackDto {
  tenantId: string;
  generatedAt: string;
  preferences: {
    tenant: LocalizationPreferencesDto | null;
    stores: LocalizationPreferencesDto[];
  };
  countryProfiles: CountryProfileDto[];
  content: LocalizedContentDto[];
  templates: LocalizedTemplateDto[];
}

export interface RenderLocalizedTemplateResponse {
  tenantId: string;
  storeId: string | null;
  templateKey: string;
  channel: CustomizationChannel | null;
  locale: string;
  fallbackLocale: string;
  rendered: LocalizedTemplateEntryDto;
}

export interface FeatureFlagDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  scopeKey: string;
  key: string;
  enabled: boolean;
  kind: "BOOLEAN" | "PERCENTAGE";
  rolloutPercentage: number | null;
  rules: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingConfigDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  channel: CustomizationChannel;
  pointKey: string | null;
  scopeKey: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomizationRuleDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  channel: CustomizationChannel | null;
  pointKey: string | null;
  key: string;
  description: string | null;
  status: CustomizationRuleStatus;
  priority: number;
  conditions: Record<string, unknown> | null;
  actions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomizationEvaluationDto {
  tenantId: string;
  storeId: string | null;
  channel: CustomizationChannel;
  pointKey: string | null;
  settings: Record<string, Record<string, unknown>>;
  featureFlags: Record<string, boolean>;
  branding: Record<string, unknown> | null;
  appliedRules: Array<{
    id: string;
    key: string;
    description: string | null;
    priority: number;
  }>;
}

export interface AvailabilityWindowDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  targetType: AvailabilityTargetType;
  targetId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  tenantId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantDto {
  id: string;
  tenantId: string;
  productId: string;
  code: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isVisible: boolean;
  isAvailable: boolean;
  isOutOfStock: boolean;
  basePrice: string | null;
  availabilityWindows: AvailabilityWindowDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductDto {
  id: string;
  tenantId: string;
  categoryId: string | null;
  brandId: string | null;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isVisible: boolean;
  isAvailable: boolean;
  isOutOfStock: boolean;
  basePrice: string | null;
  modifierGroupIds: string[];
  availabilityWindows: AvailabilityWindowDto[];
  variants: ProductVariantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ModifierOptionDto {
  id: string;
  tenantId: string;
  groupId: string;
  code: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  priceDelta: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModifierGroupDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  selectionMode: ModifierSelectionMode;
  minSelection: number;
  maxSelection: number | null;
  required: boolean;
  status: "ACTIVE" | "ARCHIVED";
  options: ModifierOptionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceListItemDto {
  id: string;
  tenantId: string;
  priceListId: string;
  targetType: CatalogTargetType;
  targetId: string;
  price: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceListDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  currency: string;
  status: "ACTIVE" | "ARCHIVED";
  items: PriceListItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreCatalogOverrideDto {
  id: string;
  tenantId: string;
  storeId: string;
  targetType: CatalogTargetType;
  targetId: string;
  isVisible: boolean | null;
  isAvailable: boolean | null;
  isOutOfStock: boolean | null;
  priceOverride: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompiledCatalogModifierOptionDto {
  id: string;
  code: string;
  name: string;
  priceDelta: string;
}

export interface CompiledCatalogModifierGroupDto {
  id: string;
  code: string;
  name: string;
  selectionMode: ModifierSelectionMode;
  minSelection: number;
  maxSelection: number | null;
  required: boolean;
  options: CompiledCatalogModifierOptionDto[];
}

export interface CompiledCatalogVariantDto {
  id: string;
  code: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  effectivePrice: string | null;
  priceSource: PriceSource;
}

export interface CompiledCatalogProductDto {
  id: string;
  brandId: string | null;
  code: string;
  name: string;
  description: string | null;
  effectivePrice: string | null;
  priceSource: PriceSource;
  variants: CompiledCatalogVariantDto[];
  modifierGroups: CompiledCatalogModifierGroupDto[];
}

export interface CompiledCatalogCategoryDto {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  sortOrder: number;
  products: CompiledCatalogProductDto[];
}

export interface CompiledCatalogResponse {
  tenantId: string;
  storeId: string;
  generatedAt: string;
  localization: {
    locale: string;
    fallbackLocale: string;
    countryCode: string | null;
    currency: string;
    tax: CountryProfileTaxPolicyDto;
  };
  categories: CompiledCatalogCategoryDto[];
  uncategorizedProducts: CompiledCatalogProductDto[];
}

export interface PricePreviewRequest {
  tenantId?: string;
  storeId: string;
  productId: string;
  variantId?: string | null;
  priceListId?: string | null;
  modifierOptionIds?: string[];
}

export interface PricePreviewResponse {
  tenantId: string;
  storeId: string;
  productId: string;
  variantId: string | null;
  priceListId: string | null;
  basePrice: string | null;
  modifierTotal: string;
  finalPrice: string;
  source: PriceSource;
  modifierBreakdown: Array<{
    optionId: string;
    priceDelta: string;
  }>;
}

export interface CartItemDto {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  priceListId: string | null;
  unitBasePrice: string | null;
  modifierTotal: string;
  lineTotal: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  modifiers: Array<{
    id: string;
    modifierGroupId: string;
    modifierOptionId: string;
    nameSnapshot: string;
    priceDelta: string;
  }>;
}

export interface CartDto {
  id: string;
  tenantId: string;
  storeId: string;
  channel: OrderChannel;
  status: CartStatus;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
  subtotal: string;
  modifierTotal: string;
  total: string;
  deviceId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  items: CartItemDto[];
}

export interface OrderItemDto {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitBasePrice: string | null;
  modifierTotal: string;
  lineTotal: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
  modifiers: Array<{
    id: string;
    modifierGroupId: string;
    modifierOptionId: string;
    nameSnapshot: string;
    priceDelta: string;
  }>;
}

export interface OrderDto {
  id: string;
  tenantId: string;
  storeId: string;
  cartId: string | null;
  number: string;
  channel: OrderChannel;
  status: OrderStatus;
  refundStatus: RefundStatus;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
  subtotal: string;
  modifierTotal: string;
  total: string;
  cancelReason: string | null;
  deviceId: string | null;
  createdByUserId: string | null;
  placedAt: string;
  confirmedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDto[];
}

export interface OrderEventDto {
  id: string;
  orderId: string;
  tenantId: string;
  storeId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PosShiftDto {
  id: string;
  tenantId: string;
  storeId: string;
  deviceId: string;
  openedByUserId: string;
  status: PosShiftStatus;
  openingCashAmount: string | null;
  closingCashAmount: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PosSessionDto {
  id: string;
  tenantId: string;
  storeId: string;
  deviceId: string;
  shiftId: string;
  userId: string;
  status: PosSessionStatus;
  startedAt: string;
  endedAt: string | null;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocationDto {
  id: string;
  paymentIntentId: string;
  method: PaymentMethodKind;
  amount: string;
  status: PaymentAllocationStatus;
  providerKey: string | null;
  externalReference: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface PaymentIntentDto {
  id: string;
  tenantId: string;
  storeId: string;
  orderId: string;
  channel: OrderChannel;
  deviceId: string | null;
  posSessionId: string | null;
  shiftId: string | null;
  status: PaymentIntentStatus;
  totalAmount: string;
  paidAmount: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  allocations: PaymentAllocationDto[];
}

export interface PaymentAttemptDto {
  id: string;
  paymentIntentId: string;
  paymentAllocationId: string;
  tenantId: string;
  storeId: string;
  orderId: string;
  providerKey: string;
  providerType: PaymentProviderType;
  method: PaymentMethodKind;
  status: PaymentAttemptStatus;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  externalReference: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}

export interface PaymentProviderConfigDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  providerKey: string;
  providerType: PaymentProviderType;
  method: PaymentMethodKind;
  enabled: boolean;
  priority: number;
  allowedChannels: OrderChannel[];
  autoConfirmOrderOnSuccess: boolean;
  settings: Record<string, unknown> | null;
  secrets: PaymentProviderConfigSecretsStateDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProviderConfigSecretsStateDto {
  hasSecrets: boolean;
  keys: string[];
  updatedAt: string | null;
}

export interface PaymentIntentListItemDto {
  id: string;
  tenantId: string;
  storeId: string;
  orderId: string;
  orderNumber: string;
  channel: OrderChannel;
  status: PaymentIntentStatus;
  totalAmount: string;
  paidAmount: string;
  customerName: string | null;
  allocationStatuses: PaymentAllocationStatus[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReconciliationSummaryDto {
  tenantId: string | null;
  storeId: string | null;
  generatedAt: string;
  intentsByStatus: Array<{
    status: PaymentIntentStatus;
    count: number;
    totalAmount: string;
    paidAmount: string;
  }>;
  allocationsByMethod: Array<{
    method: PaymentMethodKind;
    status: PaymentAllocationStatus;
    count: number;
    amount: string;
  }>;
  failedAttempts: {
    count: number;
  };
}

export interface PosBootstrapResponse {
  tenantId: string;
  storeId: string;
  deviceId: string;
  activeShift: PosShiftDto | null;
  activeSession: PosSessionDto | null;
  catalog: CompiledCatalogResponse;
  featureFlags: FeatureFlagDto[];
  tenantSettings: TenantSettingDto[];
  storeSettings: StoreSettingDto[];
}

export interface KitchenTicketItemDto {
  id: string;
  ticketId: string;
  orderItemId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  lineTotal: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface KitchenTicketDto {
  id: string;
  orderId: string;
  tenantId: string;
  storeId: string;
  stationKey: string;
  status: KitchenTicketStatus;
  sourceChannel: OrderChannel;
  displayNumber: string;
  note: string | null;
  itemCount: number;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: KitchenTicketItemDto[];
}

export interface KitchenBoardEntryDto {
  orderId: string;
  tenantId: string;
  storeId: string;
  number: string;
  channel: OrderChannel;
  orderStatus: OrderStatus;
  boardStatus: KitchenBoardStatus;
  customerName: string | null;
  note: string | null;
  placedAt: string;
  readyAt: string | null;
  completedAt: string | null;
  ticketStatuses: Array<{
    ticketId: string;
    stationKey: string;
    status: KitchenTicketStatus;
  }>;
}

export interface RealtimeEventEnvelope<TPayload = Record<string, unknown>> {
  type: string;
  tenantId: string;
  storeId: string;
  payload: TPayload;
  emittedAt: string;
}

export interface KioskBrandingDto {
  themeName: string;
  logoText: string;
  heroTitle: string;
  heroSubtitle: string;
  accentColor: string;
  surfaceColor: string;
}

export interface KioskRulesDto {
  allowNotes: boolean;
  requireCustomerName: boolean;
  allowedPaymentMethods: PaymentMethodKind[];
  autoConfirmPaidOrders: boolean;
}

export interface KioskBootstrapResponse {
  tenantId: string;
  storeId: string;
  deviceId: string;
  storeName: string;
  deviceName: string;
  branding: KioskBrandingDto;
  rules: KioskRulesDto;
  catalog: CompiledCatalogResponse;
}

export interface KioskPaymentHandoffDto {
  id: string;
  orderId: string;
  tenantId: string;
  storeId: string;
  deviceId: string;
  method: PaymentMethodKind;
  status: KioskPaymentHandoffStatus;
  amount: string;
  provider: string;
  externalReference: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface StorefrontBrandingDto {
  themeName: string;
  logoText: string;
  heroTitle: string;
  heroSubtitle: string;
  accentColor: string;
  surfaceColor: string;
  bannerImageUrl: string | null;
}

export interface StorefrontRulesDto {
  allowGuestCheckout: boolean;
  allowCustomerSessions: boolean;
  requireCustomerName: boolean;
  requireCustomerPhone: boolean;
  allowNotes: boolean;
  autoConfirmPaidOrders: boolean;
  allowedPaymentMethods: PaymentMethodKind[];
}

export interface StorefrontCustomerSessionStateDto {
  mode: "CUSTOMER";
  customerName: string | null;
  customerPhone: string;
}

export interface StorefrontCustomerSessionDto {
  tenantId: string;
  storeId: string;
  customerName: string | null;
  customerPhone: string;
  accessToken: string;
  expiresAt: string;
  storefrontPath: string;
}

export interface StorefrontCartAccessTokenDto {
  cartId: string;
  accessToken: string;
  expiresAt: string;
}

export interface StorefrontOrderTrackingTokenDto {
  orderId: string;
  accessToken: string;
  expiresAt: string;
  trackingPath: string;
}

export interface StorefrontQrLinkDto {
  storeId: string;
  pointKey: string | null;
  accessToken: string;
  expiresAt: string;
  storefrontPath: string;
}

export interface StorefrontQrResolutionDto {
  tenantId: string;
  storeId: string;
  storeCode: string;
  pointKey: string | null;
  locale: string | null;
  storefrontPath: string;
}

export interface StorefrontBootstrapResponse {
  tenantId: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  pointKey: string | null;
  branding: StorefrontBrandingDto;
  rules: StorefrontRulesDto;
  catalog: CompiledCatalogResponse;
  customerSession: StorefrontCustomerSessionStateDto | null;
}

export interface StorefrontCartSessionDto {
  cart: CartDto;
  access: StorefrontCartAccessTokenDto;
  customerSession: StorefrontCustomerSessionStateDto | null;
}

export interface StorefrontCheckoutResponse {
  order: OrderDto;
  paymentIntent: PaymentIntentDto;
  tracking: StorefrontOrderTrackingTokenDto;
}

export interface StorefrontTrackingNotificationDto {
  type: string;
  templateKey: string | null;
  status: "QUEUED";
  createdAt: string;
}

export interface StorefrontOrderTrackingResponse {
  order: OrderDto;
  events: OrderEventDto[];
  notifications: StorefrontTrackingNotificationDto[];
}

export interface StorefrontCustomerOrderListItemDto {
  orderId: string;
  number: string;
  status: OrderStatus;
  total: string;
  placedAt: string;
  tracking: StorefrontOrderTrackingTokenDto;
}

export type ListResponse<TItem> = PaginationResult<TItem>;

export interface CreateTenantRequest {
  slug: string;
  name: string;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
}

export interface CreateBrandRequest {
  tenantId: string;
  code: string;
  name: string;
}

export interface UpdateBrandRequest {
  code?: string;
  name?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

export interface CreateStoreRequest {
  tenantId: string;
  brandId?: string | null;
  code: string;
  name: string;
  timezone: string;
}

export interface UpdateStoreRequest {
  brandId?: string | null;
  code?: string;
  name?: string;
  timezone?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export interface CreateUserRequest {
  tenantId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  isPlatformAdmin?: boolean;
  roleIds?: string[];
  storeIds?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  password?: string;
  status?: "ACTIVE" | "INVITED" | "DISABLED";
  roleIds?: string[];
  storeIds?: string[];
}

export interface CreateRoleRequest {
  tenantId: string;
  key: string;
  name: string;
  description?: string | null;
  permissionKeys: string[];
}

export interface UpdateRoleRequest {
  key?: string;
  name?: string;
  description?: string | null;
  permissionKeys?: string[];
}

export interface CreateDeviceRequest {
  tenantId: string;
  storeId: string;
  code: string;
  name: string;
  type: DeviceKind;
}

export interface UpdateDeviceRequest {
  storeId?: string;
  code?: string;
  name?: string;
  type?: DeviceKind;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "RETIRED";
}

export interface OnboardingBootstrapRequest {
  tenant: CreateTenantRequest;
  store: Pick<CreateStoreRequest, "code" | "name" | "timezone">;
  devices?: Array<{
    code: string;
    name: string;
    type: DeviceKind;
    issueKioskAccessToken?: boolean;
  }>;
}

export interface UpsertTenantSettingRequest {
  key: string;
  value: Record<string, unknown>;
}

export interface UpsertStoreSettingRequest {
  storeId: string;
  key: string;
  value: Record<string, unknown>;
}

export interface UpsertLocalizationPreferencesRequest {
  defaultLocale: string;
  fallbackLocale?: string;
  supportedLocales?: string[];
  countryCode?: string | null;
  currency?: string | null;
  timezone?: string | null;
  channelLocales?: Partial<Record<CustomizationChannel, string>>;
}

export interface UpsertCountryProfileRequest {
  defaultLocale: string;
  supportedLocales?: string[];
  currency: string;
  tax?: Partial<CountryProfileTaxPolicyDto>;
  complianceFlags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpsertLocalizedContentRequest {
  tenantId: string;
  targetType:
    | "CATEGORY"
    | "PRODUCT"
    | "VARIANT"
    | "MODIFIER_GROUP"
    | "MODIFIER_OPTION"
    | "BRANDING";
  targetId: string;
  entries: Record<string, Record<string, string>>;
}

export interface UpsertLocalizedTemplateRequest {
  tenantId: string;
  templateKey: string;
  channel?: CustomizationChannel | null;
  description?: string | null;
  variables?: string[];
  entries: Record<string, LocalizedTemplateEntryDto>;
}

export interface ImportLocalizationLanguagePackRequest {
  tenantId?: string;
  pack: LocalizationLanguagePackDto;
}

export interface RenderLocalizedTemplateRequest {
  tenantId?: string;
  storeId?: string | null;
  templateKey: string;
  channel?: CustomizationChannel | null;
  locale?: string;
  customerLocale?: string;
  countryCode?: string;
  variables?: Record<string, string | number | boolean | null>;
}

export interface UpsertFeatureFlagRequest {
  tenantId: string;
  storeId?: string | null;
  key: string;
  enabled: boolean;
  kind?: "BOOLEAN" | "PERCENTAGE";
  rolloutPercentage?: number | null;
  rules?: Record<string, unknown> | null;
}

export interface CreateBrandingConfigRequest {
  tenantId: string;
  storeId?: string | null;
  channel: CustomizationChannel;
  pointKey?: string | null;
  config: Record<string, unknown>;
}

export interface UpdateBrandingConfigRequest {
  storeId?: string | null;
  channel?: CustomizationChannel;
  pointKey?: string | null;
  config?: Record<string, unknown>;
}

export interface CreateCustomizationRuleRequest {
  tenantId: string;
  storeId?: string | null;
  channel?: CustomizationChannel | null;
  pointKey?: string | null;
  key: string;
  description?: string | null;
  priority?: number;
  conditions?: Record<string, unknown> | null;
  actions: Record<string, unknown>;
}

export interface UpdateCustomizationRuleRequest {
  storeId?: string | null;
  channel?: CustomizationChannel | null;
  pointKey?: string | null;
  key?: string;
  description?: string | null;
  status?: CustomizationRuleStatus;
  priority?: number;
  conditions?: Record<string, unknown> | null;
  actions?: Record<string, unknown>;
}

export interface EvaluateCustomizationRequest {
  tenantId?: string;
  storeId?: string | null;
  channel: CustomizationChannel;
  pointKey?: string | null;
  inputs?: Record<string, unknown> | null;
}

export interface AvailabilityWindowInput {
  storeId?: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface CreateCategoryRequest {
  tenantId: string;
  parentId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  parentId?: string | null;
  code?: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
  status?: "ACTIVE" | "ARCHIVED";
}

export interface CreateProductRequest {
  tenantId: string;
  categoryId?: string | null;
  brandId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  basePrice?: string | null;
  isVisible?: boolean;
  isAvailable?: boolean;
  isOutOfStock?: boolean;
  modifierGroupIds?: string[];
  availabilityWindows?: AvailabilityWindowInput[];
}

export interface UpdateProductRequest {
  categoryId?: string | null;
  brandId?: string | null;
  code?: string;
  name?: string;
  description?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  basePrice?: string | null;
  isVisible?: boolean;
  isAvailable?: boolean;
  isOutOfStock?: boolean;
  modifierGroupIds?: string[];
  availabilityWindows?: AvailabilityWindowInput[];
}

export interface CreateProductVariantRequest {
  code: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  basePrice?: string | null;
  isVisible?: boolean;
  isAvailable?: boolean;
  isOutOfStock?: boolean;
  availabilityWindows?: AvailabilityWindowInput[];
}

export interface UpdateProductVariantRequest {
  code?: string;
  name?: string;
  sku?: string | null;
  barcode?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  basePrice?: string | null;
  isVisible?: boolean;
  isAvailable?: boolean;
  isOutOfStock?: boolean;
  availabilityWindows?: AvailabilityWindowInput[];
}

export interface CreateModifierGroupRequest {
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  selectionMode?: ModifierSelectionMode;
  minSelection?: number;
  maxSelection?: number | null;
  required?: boolean;
}

export interface UpdateModifierGroupRequest {
  code?: string;
  name?: string;
  description?: string | null;
  selectionMode?: ModifierSelectionMode;
  minSelection?: number;
  maxSelection?: number | null;
  required?: boolean;
  status?: "ACTIVE" | "ARCHIVED";
}

export interface CreateModifierOptionRequest {
  code: string;
  name: string;
  priceDelta?: string;
}

export interface UpdateModifierOptionRequest {
  code?: string;
  name?: string;
  priceDelta?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

export interface UpsertPriceListItemRequest {
  targetType: CatalogTargetType;
  targetId: string;
  price: string;
}

export interface CreatePriceListRequest {
  tenantId: string;
  code: string;
  name: string;
  currency: string;
  items?: UpsertPriceListItemRequest[];
}

export interface UpdatePriceListRequest {
  code?: string;
  name?: string;
  currency?: string;
  status?: "ACTIVE" | "ARCHIVED";
  items?: UpsertPriceListItemRequest[];
}

export interface CreateStoreCatalogOverrideRequest {
  tenantId: string;
  storeId: string;
  targetType: CatalogTargetType;
  targetId: string;
  isVisible?: boolean | null;
  isAvailable?: boolean | null;
  isOutOfStock?: boolean | null;
  priceOverride?: string | null;
}

export interface UpdateStoreCatalogOverrideRequest {
  isVisible?: boolean | null;
  isAvailable?: boolean | null;
  isOutOfStock?: boolean | null;
  priceOverride?: string | null;
}

export interface CreateCartRequest {
  tenantId?: string;
  storeId: string;
  channel?: OrderChannel;
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
  deviceId?: string | null;
}

export interface UpdateCartRequest {
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
}

export interface AddCartItemRequest {
  productId: string;
  variantId?: string | null;
  quantity: number;
  priceListId?: string | null;
  modifierOptionIds?: string[];
}

export interface UpdateCartItemRequest {
  variantId?: string | null;
  quantity?: number;
  priceListId?: string | null;
  modifierOptionIds?: string[];
}

export interface CheckoutCartRequest {
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
}

export interface TransitionOrderRequest {
  toStatus: OrderStatus;
  reason?: string | null;
  hasExternalPayment?: boolean;
}

export interface OpenPosShiftRequest {
  tenantId?: string;
  storeId: string;
  deviceId: string;
  openingCashAmount?: string | null;
}

export interface ClosePosShiftRequest {
  closingCashAmount?: string | null;
}

export interface StartPosSessionRequest {
  tenantId?: string;
  storeId: string;
  deviceId: string;
  shiftId: string;
}

export interface EndPosSessionRequest {
  reason?: string | null;
}

export interface RecordPaymentIntentRequest {
  tenantId?: string;
  storeId: string;
  orderId: string;
  posSessionId: string;
  allocations: Array<{
    method: PaymentMethodKind;
    amount: string;
  }>;
}

export interface CreatePaymentIntentRequest {
  tenantId?: string;
  storeId: string;
  orderId: string;
  channel?: OrderChannel;
  deviceId?: string | null;
  posSessionId?: string | null;
  shiftId?: string | null;
  allocations: Array<{
    method: PaymentMethodKind;
    amount: string;
  }>;
}

export interface ProcessPaymentAllocationRequest {
  providerKey?: string | null;
}

export interface CancelPaymentIntentRequest {
  reason?: string | null;
}

export interface CreatePaymentProviderConfigRequest {
  tenantId: string;
  storeId?: string | null;
  providerKey: string;
  providerType: PaymentProviderType;
  method: PaymentMethodKind;
  enabled?: boolean;
  priority?: number;
  allowedChannels?: OrderChannel[];
  autoConfirmOrderOnSuccess?: boolean;
  settings?: Record<string, unknown> | null;
  secrets?: Record<string, string> | null;
}

export interface UpdatePaymentProviderConfigRequest {
  storeId?: string | null;
  providerKey?: string;
  providerType?: PaymentProviderType;
  method?: PaymentMethodKind;
  enabled?: boolean;
  priority?: number;
  allowedChannels?: OrderChannel[];
  autoConfirmOrderOnSuccess?: boolean;
  settings?: Record<string, unknown> | null;
  secrets?: Record<string, string> | null;
}

export interface TransitionKitchenTicketRequest {
  toStatus: KitchenTicketStatus;
  reason?: string | null;
}

export interface KioskCheckoutItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  priceListId?: string | null;
  modifierOptionIds?: string[];
}

export interface KioskCheckoutRequest {
  deviceId: string;
  accessToken: string;
  customerName?: string | null;
  note?: string | null;
  paymentMethod: PaymentMethodKind;
  items: KioskCheckoutItemInput[];
}

export interface KioskCheckoutResponse {
  order: OrderDto;
  paymentHandoff: KioskPaymentHandoffDto;
}

export interface CreateStorefrontCustomerSessionRequest {
  storeCode: string;
  customerName?: string | null;
  customerPhone: string;
}

export interface CreateStorefrontCartRequest {
  storeId: string;
  qrAccessToken?: string | null;
  customerSessionToken?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
}

export interface UpdateStorefrontCartRequest {
  accessToken: string;
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
}

export interface AddStorefrontCartItemRequest extends AddCartItemRequest {
  accessToken: string;
}

export interface UpdateStorefrontCartItemRequest extends UpdateCartItemRequest {
  accessToken: string;
}

export interface StorefrontCheckoutRequest {
  accessToken: string;
  customerSessionToken?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
  paymentMethod: PaymentMethodKind;
}

export interface CreateStorefrontQrLinkRequest {
  tenantId?: string;
  storeId: string;
  pointKey?: string | null;
  locale?: string | null;
}

export interface AdminNavItem {
  href: string;
  label: string;
  requiredScope?: AppScope;
}

export interface AnalyticsTopProductDto {
  productId: string;
  productCode: string | null;
  productName: string;
  quantity: number;
  revenue: string;
}

export interface AnalyticsRevenueByStoreDto {
  storeId: string;
  storeCode: string;
  storeName: string;
  paidOrders: number;
  revenue: string;
  averageOrderValue: string;
}

export interface AnalyticsChannelSummaryDto {
  channel: OrderChannel;
  paidOrders: number;
  revenue: string;
}

export interface AnalyticsRefundCancellationSummaryDto {
  cancelledOrders: number;
  cancelledRevenue: string;
  pendingManualRefunds: number;
  pendingManualRefundAmount: string;
}

export interface OwnerCabinetDashboardDto {
  tenantId: string;
  storeId: string | null;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  dataSource: "LIVE" | "SNAPSHOT";
  snapshotId: string | null;
  currency: string;
  totalOrders: number;
  paidOrders: number;
  revenue: string;
  averageOrderValue: string;
  topProducts: AnalyticsTopProductDto[];
  revenueByStore: AnalyticsRevenueByStoreDto[];
  channelSummary: AnalyticsChannelSummaryDto[];
  refundsAndCancellations: AnalyticsRefundCancellationSummaryDto;
}

export interface AnalyticsSnapshotDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  kind: AnalyticsSnapshotKind;
  artifactKey: string;
  artifactStatus: "READY";
  periodStart: string;
  periodEnd: string;
  payload: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
}

export interface CreateAnalyticsSnapshotRequest {
  tenantId?: string;
  storeId?: string | null;
  periodStart?: string;
  periodEnd?: string;
}

export interface CreateAnalyticsPrecomputeRequest extends CreateAnalyticsSnapshotRequest {
  kind?: AnalyticsSnapshotKind;
}

export interface AnalyticsPrecomputeRunDto {
  kind: AnalyticsSnapshotKind;
  executionMode: "INLINE";
  status: "COMPLETED";
  generatedAt: string;
  artifactKey: string;
  snapshot: AnalyticsSnapshotDto;
}

export interface ObservabilityStatusDto {
  service: string;
  serviceName: string;
  generatedAt: string;
  exporterMode: "internal" | "otlp_http";
  metrics: {
    internalPrometheusEndpoint: string;
    externalExportEnabled: boolean;
    endpoint: string | null;
  };
  tracing: {
    enabled: boolean;
    transport: "none" | "otlp_http";
    endpoint: string | null;
  };
  alerts: {
    enabled: boolean;
    channel: "none" | "webhook";
    targetPresent: boolean;
  };
}
