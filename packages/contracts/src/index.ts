import type {
  AppScope,
  AnalyticsSnapshotKind,
  AuditExportStatus,
  AvailabilityTargetType,
  CartStatus,
  CatalogTargetType,
  ConnectorExecutionStatus,
  ConnectorKind,
  CustomerProfileStatus,
  CustomizationChannel,
  CustomizationRuleStatus,
  DeviceKind,
  FulfillmentMode,
  FulfillmentStatus,
  HardwareJobKind,
  HardwareJobStatus,
  IdentityProviderStatus,
  IdentityProviderType,
  InvoiceStatus,
  InventoryAdjustmentKind,
  InventoryLedgerKind,
  JwtClaims,
  KitchenBoardStatus,
  KioskPaymentHandoffStatus,
  LoyaltyLedgerEntryKind,
  OrganizationStatus,
  PaymentAllocationStatus,
  PaymentAttemptStatus,
  PaymentOperationKind,
  KitchenTicketStatus,
  ModifierSelectionMode,
  OrderChannel,
  OrderStatus,
  PaymentIntentStatus,
  PaymentMethodKind,
  PaymentProviderType,
  PaginationResult,
  PaymentOperationStatus,
  PaymentSettlementStatus,
  PaymentWebhookStatus,
  PlanStatus,
  PriceSource,
  PromotionStatus,
  PromotionType,
  PosSessionStatus,
  PosShiftStatus,
  ReceivingStatus,
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

export interface LoyaltyAccountDto {
  pointsBalance: number;
  totalEarnedPoints: number;
  totalRedeemedPoints: number;
  tierKey: string | null;
  updatedAt: string | null;
}

export interface CustomerRetentionStateDto {
  action: "WELCOME" | "NURTURE" | "WINBACK";
  templateKey: string;
  recommendedAt: string;
}

export interface CustomerProfileDto {
  id: string;
  tenantId: string;
  preferredStoreId: string | null;
  fullName: string | null;
  phone: string;
  status: CustomerProfileStatus;
  orderCount: number;
  completedOrderCount: number;
  totalSpent: string;
  lastOrderAt: string | null;
  lastSeenAt: string | null;
  segments: string[];
  loyalty: LoyaltyAccountDto | null;
  retention: CustomerRetentionStateDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPublicProfileDto {
  id: string;
  customerName: string | null;
  customerPhone: string;
  orderCount: number;
  totalSpent: string;
  lastOrderAt: string | null;
  segments: string[];
  loyalty: LoyaltyAccountDto | null;
  retention: CustomerRetentionStateDto | null;
}

export interface LoyaltyLedgerEntryDto {
  id: string;
  tenantId: string;
  customerProfileId: string;
  loyaltyAccountId: string;
  orderId: string | null;
  entryKind: LoyaltyLedgerEntryKind;
  points: number;
  amount: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PromotionCampaignDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  code: string;
  name: string;
  status: PromotionStatus;
  type: PromotionType;
  value: string;
  minimumOrderTotal: string;
  maxDiscountAmount: string | null;
  pointsCost: number | null;
  segmentKeys: string[];
  usageLimit: number | null;
  usedCount: number;
  activeFrom: string | null;
  activeTo: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppliedPromotionDto {
  code: string;
  name: string;
  type: PromotionType;
  discountTotal: string;
  pointsCost: number | null;
}

export interface CartDto {
  id: string;
  tenantId: string;
  storeId: string;
  customerProfileId: string | null;
  channel: OrderChannel;
  status: CartStatus;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
  subtotal: string;
  modifierTotal: string;
  fulfillmentFee: string;
  discountTotal: string;
  total: string;
  promotion: AppliedPromotionDto | null;
  fulfillment: FulfillmentSnapshotDto;
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
  customerProfileId: string | null;
  number: string;
  channel: OrderChannel;
  status: OrderStatus;
  refundStatus: RefundStatus;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
  subtotal: string;
  modifierTotal: string;
  fulfillmentFee: string;
  discountTotal: string;
  total: string;
  promotion: AppliedPromotionDto | null;
  fulfillment: FulfillmentSnapshotDto;
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

export interface DeliveryZoneDto {
  code: string;
  name: string;
  postalCodes: string[];
  fee: string;
  etaMinMinutes: number;
  etaMaxMinutes: number;
  slaMinutes: number;
  isActive: boolean;
}

export interface PickupConfigDto {
  enabled: boolean;
  leadTimeMinutes: number;
  promisedWindowMinutes: number;
  instructions: string | null;
}

export interface DineInTableDto {
  code: string;
  label: string;
  capacity: number;
  isActive: boolean;
}

export interface DineInConfigDto {
  enabled: boolean;
  leadTimeMinutes: number;
  tables: DineInTableDto[];
}

export interface FulfillmentProviderExtensionDto {
  providerKey: string;
  providerType: "MANUAL" | "EXTERNAL_PLACEHOLDER";
  enabled: boolean;
}

export interface StoreFulfillmentConfigDto {
  storeId: string;
  enabledModes: FulfillmentMode[];
  defaultMode: FulfillmentMode;
  deliveryZones: DeliveryZoneDto[];
  pickup: PickupConfigDto;
  dineIn: DineInConfigDto;
  providers: FulfillmentProviderExtensionDto[];
}

export interface FulfillmentSelectionDto {
  mode: FulfillmentMode;
  zoneCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  contactless: boolean;
  pickupSlotLabel: string | null;
  tableCode: string | null;
  guestCount: number | null;
  instructions: string | null;
}

export interface FulfillmentSnapshotDto {
  mode: FulfillmentMode | null;
  status: FulfillmentStatus | null;
  fee: string;
  promisedAt: string | null;
  etaAt: string | null;
  details: FulfillmentSelectionDto | null;
  courier: {
    courierName: string | null;
    courierPhone: string | null;
    courierExternalId: string | null;
  } | null;
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
  fulfillment: StoreFulfillmentConfigDto;
  catalog: CompiledCatalogResponse;
  customerSession: StorefrontCustomerSessionStateDto | null;
  customerProfile: CustomerPublicProfileDto | null;
  availablePromotions: PromotionCampaignDto[];
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
  fulfillment: FulfillmentSnapshotDto;
  events: OrderEventDto[];
  notifications: StorefrontTrackingNotificationDto[];
}

export interface FulfillmentDispatchBoardItemDto {
  orderId: string;
  number: string;
  storeId: string;
  customerName: string | null;
  customerPhone: string | null;
  orderStatus: OrderStatus;
  fulfillment: FulfillmentSnapshotDto;
  total: string;
  placedAt: string;
}

export interface FulfillmentOrderProjectionDto {
  order: OrderDto;
  fulfillment: FulfillmentSnapshotDto;
  events: OrderEventDto[];
}

export interface StorefrontCustomerOrderListItemDto {
  orderId: string;
  number: string;
  status: OrderStatus;
  total: string;
  placedAt: string;
  canRepeatOrder: boolean;
  tracking: StorefrontOrderTrackingTokenDto;
}

export type ListResponse<TItem> = PaginationResult<TItem>;

export interface OperatorListQuery {
  tenantId?: string;
  organizationId?: string;
  status?: string;
  search?: string;
  sort?: string;
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface OperatorListResponse<TItem> extends PaginationResult<TItem> {
  page: number;
  pageSize: number;
  sort: string | null;
  direction: "asc" | "desc" | null;
  filter: Record<string, unknown> | null;
}

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

export interface ApplyStorefrontPromotionRequest {
  accessToken: string;
  code: string;
  customerSessionToken?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

export interface UpdateStorefrontCartFulfillmentRequest {
  accessToken: string;
  fulfillment: FulfillmentSelectionDto;
}

export interface CreateStorefrontQrLinkRequest {
  tenantId?: string;
  storeId: string;
  pointKey?: string | null;
  locale?: string | null;
}

export interface UpdateStoreFulfillmentConfigRequest {
  storeId: string;
  enabledModes?: FulfillmentMode[];
  defaultMode?: FulfillmentMode;
  deliveryZones?: DeliveryZoneDto[];
  pickup?: PickupConfigDto;
  dineIn?: DineInConfigDto;
  providers?: FulfillmentProviderExtensionDto[];
}

export interface AssignFulfillmentCourierRequest {
  courierName: string;
  courierPhone?: string | null;
  courierExternalId?: string | null;
}

export interface UpdateFulfillmentEtaRequest {
  etaAt?: string | null;
  promisedAt?: string | null;
}

export interface UpdateFulfillmentStatusRequest {
  status: FulfillmentStatus;
  note?: string | null;
}

export interface CreatePromotionCampaignRequest {
  tenantId: string;
  storeId?: string | null;
  code: string;
  name: string;
  status?: PromotionStatus;
  type: PromotionType;
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

export interface UpdatePromotionCampaignRequest {
  storeId?: string | null;
  code?: string;
  name?: string;
  status?: PromotionStatus;
  type?: PromotionType;
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

export interface AdjustCustomerLoyaltyRequest {
  points: number;
  description?: string | null;
}

export interface AdminNavItem {
  href: string;
  label: string;
  requiredScope?: AppScope;
}

export interface PaymentOperationDto {
  id: string;
  tenantId: string;
  storeId: string;
  paymentIntentId: string;
  paymentAllocationId: string | null;
  orderId: string;
  kind: PaymentOperationKind;
  status: PaymentOperationStatus;
  amount: string;
  currency: string;
  providerKey: string;
  externalReference: string | null;
  reason: string | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSettlementDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  providerKey: string;
  status: PaymentSettlementStatus;
  currency: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: string;
  settledAmount: string;
  summary: Record<string, unknown> | null;
  importedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentWebhookEventDto {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  providerKey: string;
  deliveryId: string;
  eventType: string;
  status: PaymentWebhookStatus;
  signatureValid: boolean;
  payload: Record<string, unknown>;
  processedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface ConnectorExecutionLogDto {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  connectorKind: ConnectorKind;
  connectorKey: string;
  action: string;
  status: ConnectorExecutionStatus;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface HardwareJobDto {
  id: string;
  tenantId: string;
  storeId: string;
  orderId: string | null;
  deviceId: string | null;
  connectorKey: string;
  kind: HardwareJobKind;
  status: HardwareJobStatus;
  requestPayload: Record<string, unknown> | null;
  resultPayload: Record<string, unknown> | null;
  failureReason: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HardwareReceiptDto {
  id: string;
  tenantId: string;
  storeId: string;
  hardwareJobId: string | null;
  orderId: string | null;
  receiptType: string;
  externalReference: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface BillingPlanDto {
  id: string;
  code: string;
  name: string;
  status: PlanStatus;
  priceAmount: string;
  currency: string;
  intervalKey: string;
  entitlements: Record<string, unknown>;
  quotas: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingAccountDto {
  id: string;
  tenantId: string;
  resellerAccountId: string | null;
  status: string;
  defaultPaymentTerms: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDto {
  id: string;
  tenantId: string;
  billingAccountId: string;
  planId: string;
  status: "TRIAL" | "ACTIVE" | "GRACE" | "SUSPENDED" | "CANCELLED";
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDto {
  id: string;
  tenantId: string;
  billingAccountId: string;
  subscriptionId: string | null;
  number: string;
  status: InvoiceStatus;
  currency: string;
  subtotalAmount: string;
  totalAmount: string;
  dueAt: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  lines: Array<Record<string, unknown>>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementGrantDto {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  key: string;
  scopeType: string;
  scopeId: string | null;
  value: Record<string, unknown>;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaCounterDto {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  key: string;
  scopeType: string;
  scopeId: string | null;
  limitValue: number;
  usedValue: number;
  resetAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrialGrantDto {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  status: "ACTIVE" | "CONVERTED" | "EXPIRED";
  startedAt: string;
  endsAt: string;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResellerAccountDto {
  id: string;
  code: string;
  name: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingOverviewDto {
  billingAccount: BillingAccountDto;
  subscription: SubscriptionDto | null;
  trial: TrialGrantDto | null;
  invoices: InvoiceDto[];
  entitlements: EntitlementGrantDto[];
  quotas: QuotaCounterDto[];
}

export interface WarehouseDto {
  id: string;
  tenantId: string;
  storeId: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDto {
  id: string;
  tenantId: string;
  storeId: string;
  warehouseId: string;
  productId: string | null;
  variantId: string | null;
  ingredientId: string | null;
  unit: string;
  onHandQuantity: string;
  reservedQuantity: string;
  availableQuantity: string;
  reorderPointQuantity: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeBomDto {
  id: string;
  tenantId: string;
  productId: string | null;
  variantId: string | null;
  modifierOptionId: string | null;
  ingredientId: string;
  quantity: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivingRecordDto {
  id: string;
  tenantId: string;
  storeId: string;
  warehouseId: string;
  reference: string;
  status: ReceivingStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface InventoryAdjustmentDto {
  id: string;
  tenantId: string;
  storeId: string;
  warehouseId: string;
  kind: InventoryAdjustmentKind;
  status: string;
  reason: string;
  createdAt: string;
}

export interface StockReservationDto {
  id: string;
  tenantId: string;
  storeId: string;
  orderId: string;
  inventoryItemId: string;
  quantity: string;
  status: string;
  releasedAt: string | null;
  consumedAt: string | null;
  createdAt: string;
}

export interface StockLedgerEntryDto {
  id: string;
  tenantId: string;
  storeId: string;
  warehouseId: string;
  inventoryItemId: string;
  orderId: string | null;
  kind: InventoryLedgerKind;
  quantityDelta: string;
  balanceAfter: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface StopListRuleDto {
  id: string;
  tenantId: string;
  storeId: string;
  targetType: string;
  targetId: string;
  source: string;
  reason: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDto {
  id: string;
  code: string;
  name: string;
  status: OrganizationStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembershipDto {
  id: string;
  organizationId: string;
  userId: string;
  roleKey: string;
  createdAt: string;
}

export interface OrganizationTenantLinkDto {
  id: string;
  organizationId: string;
  tenantId: string;
  roleKey: string;
  createdAt: string;
}

export interface GovernancePolicyDto {
  id: string;
  organizationId: string;
  policyKey: string;
  rules: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RolloutTemplateDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  artifact: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateApplicationDto {
  id: string;
  templateId: string;
  tenantId: string | null;
  storeId: string | null;
  appliedVersion: number;
  resultSummary: Record<string, unknown> | null;
  createdAt: string;
}

export interface WhiteLabelPackDto {
  id: string;
  organizationId: string | null;
  tenantId: string | null;
  code: string;
  name: string;
  artifact: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerAccountDto {
  id: string;
  organizationId: string | null;
  tenantId: string | null;
  code: string;
  name: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationOverviewDto {
  organization: OrganizationDto;
  summary: {
    membershipCount: number;
    tenantLinkCount: number;
    governancePolicyCount: number;
    rolloutTemplateCount: number;
    templateApplicationCount: number;
    whiteLabelPackCount: number;
    partnerAccountCount: number;
  };
  statuses: {
    governancePolicies: Record<string, number>;
    rolloutTemplates: Record<string, number>;
    templateApplications: Record<string, number>;
    whiteLabelPacks: Record<string, number>;
    partnerAccounts: Record<string, number>;
  };
  latest: {
    governancePolicy: GovernancePolicyDto | null;
    rolloutTemplate: RolloutTemplateDto | null;
    templateApplication: TemplateApplicationDto | null;
    whiteLabelPack: WhiteLabelPackDto | null;
    partnerAccount: PartnerAccountDto | null;
  };
  coverage: {
    memberUserIds: string[];
    linkedTenantIds: string[];
    linkedStoreIds: string[];
  };
}

export interface EnterpriseIdentityProviderDto {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  code: string;
  type: IdentityProviderType;
  status: IdentityProviderStatus;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FederatedIdentityLinkDto {
  id: string;
  identityProviderId: string;
  userId: string;
  externalSubject: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdvancedRolePolicyDto {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  key: string;
  rules: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditExportJobDto {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  status: AuditExportStatus;
  filter: Record<string, unknown> | null;
  artifact: Record<string, unknown> | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompliancePackDto {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  code: string;
  name: string;
  status: string;
  controls: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceEvidenceArtifactDto {
  id: string;
  compliancePackId: string | null;
  tenantId: string | null;
  organizationId: string | null;
  key: string;
  artifact: Record<string, unknown>;
  createdAt: string;
}

export interface SecretRegistryEntryDto {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  scopeType: string;
  scopeId: string | null;
  key: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentVariantDto {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  code: string;
  name: string;
  status: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerSdkContractDto {
  id: string;
  partnerAccountId: string | null;
  key: string;
  version: string;
  status: string;
  schema: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationRegistryEntryDto {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  connectorKey: string;
  version: string;
  status: string;
  manifest: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorTemplateDto {
  id: string;
  connectorKey: string;
  version: string;
  manifest: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseDeveloperPackageDto {
  connectorKey: string;
  version: string;
  packageFileName: string;
  contentType: string;
  compatibility: {
    templateVersion: string | null;
    partnerContractVersions: string[];
    rolloutChannel: string;
    supportsBackwardCompatibility: boolean;
  };
  lifecycle: {
    status: string;
    deprecationStage: string;
    sunsetAt: string | null;
  };
  registryEntry: IntegrationRegistryEntryDto;
  connectorTemplate: ConnectorTemplateDto | null;
  partnerSdkContracts: PartnerSdkContractDto[];
  content: string;
}

export interface EnterpriseDeveloperDocsDto {
  connectorKey: string;
  version: string;
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  markdown: string;
}

export interface IntegrationPublicationDto {
  id: string;
  registryEntryId: string;
  tenantId: string | null;
  organizationId: string | null;
  connectorKey: string;
  version: string;
  visibility: string;
  channel: string;
  status: string;
  packageFileName: string;
  docsFileName: string;
  artifact: {
    package: EnterpriseDeveloperPackageDto;
    docs: EnterpriseDeveloperDocsDto;
  };
  attestation: {
    algorithm: string;
    artifactDigest: string;
    packageDigest: string;
    docsDigest: string;
    signatureAlgorithm: string | null;
    signature: string | null;
    signatureStatus: string;
    keyRef: string | null;
    payload: string;
    signedAt: string | null;
  };
  publishedByUserId: string | null;
  publishedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationPublicationEventDto {
  id: string;
  publicationId: string;
  eventType: string;
  actorType: string;
  actorKey: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface EnterprisePublicPublicationDto {
  connectorKey: string;
  version: string;
  visibility: string;
  channel: string;
  status: string;
  packageFileName: string;
  docsFileName: string;
  publishedAt: string;
  revokedAt: string | null;
  packageUrl: string;
  docsUrl: string;
  attestation: {
    algorithm: string;
    artifactDigest: string;
    packageDigest: string;
    docsDigest: string;
    signatureAlgorithm: string | null;
    signature: string | null;
    signatureStatus: string;
    keyRef: string | null;
    payload: string;
    signedAt: string | null;
  };
}

export interface IntegrationPublicationReadinessDto {
  registryEntryId: string;
  connectorKey: string;
  version: string;
  targetVisibility: string;
  targetChannel: string;
  canPublish: boolean;
  checks: {
    hasConnectorTemplate: boolean;
    hasVersionScopedPartnerContract: boolean;
    publicAccessAllowed: boolean;
    signatureAvailable: boolean;
    signatureRequired: boolean;
    channelAllowed: boolean;
  };
  distributionPolicy: {
    publicAccess: boolean;
    requireSignedPublications: boolean;
    allowedChannels: string[];
  };
  blockingIssues: string[];
  warnings: string[];
}

export interface IntegrationPublicationAnalyticsDto {
  publicationId: string;
  connectorKey: string;
  version: string;
  status: string;
  visibility: string;
  channel: string;
  totals: {
    totalEvents: number;
    publicMetadataFetches: number;
    publicPackageFetches: number;
    publicDocsFetches: number;
    partnerMetadataFetches: number;
    partnerPackageFetches: number;
    partnerDocsFetches: number;
    operatorDownloads: number;
    operatorDocsViews: number;
    accessRequests: number;
    pendingAccessRequests: number;
    approvedAccessRequests: number;
    rejectedAccessRequests: number;
    revokedAccessRequests: number;
    activeGrants: number;
  };
  funnel: {
    requestCount: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    revokedCount: number;
    activeGrantCount: number;
    publicMetadataReach: number;
    publicPackageReach: number;
    publicDocsReach: number;
    partnerMetadataReach: number;
    partnerPackageReach: number;
    partnerDocsReach: number;
    requestApprovalRate: number | null;
    grantActivationRate: number | null;
  };
  windows: {
    last24Hours: {
      eventCount: number;
      metadataFetches: number;
      packageFetches: number;
      docsFetches: number;
      accessRequests: number;
      approvals: number;
    };
    last7Days: {
      eventCount: number;
      metadataFetches: number;
      packageFetches: number;
      docsFetches: number;
      accessRequests: number;
      approvals: number;
    };
    last30Days: {
      eventCount: number;
      metadataFetches: number;
      packageFetches: number;
      docsFetches: number;
      accessRequests: number;
      approvals: number;
    };
    allTime: {
      eventCount: number;
      metadataFetches: number;
      packageFetches: number;
      docsFetches: number;
      accessRequests: number;
      approvals: number;
    };
  };
  byEventType: Record<string, number>;
  byActorType: Record<string, number>;
  topActors: Array<{
    actorType: string;
    actorKey: string | null;
    eventCount: number;
    lastEventAt: string;
  }>;
  topExternalActors: Array<{
    actorType: string;
    actorKey: string | null;
    eventCount: number;
    lastEventAt: string;
  }>;
  latest: {
    event: IntegrationPublicationEventDto | null;
    publicMetadataFetch: IntegrationPublicationEventDto | null;
    publicPackageFetch: IntegrationPublicationEventDto | null;
    publicDocsFetch: IntegrationPublicationEventDto | null;
    partnerMetadataFetch: IntegrationPublicationEventDto | null;
    partnerPackageFetch: IntegrationPublicationEventDto | null;
    partnerDocsFetch: IntegrationPublicationEventDto | null;
    accessRequest: IntegrationPublicationEventDto | null;
    approval: IntegrationPublicationEventDto | null;
    rejection: IntegrationPublicationEventDto | null;
    revocation: IntegrationPublicationEventDto | null;
  };
}

export interface IntegrationDistributionOverviewDto {
  scope: {
    tenantId: string | null;
    organizationId: string | null;
  };
  summary: {
    publicationCount: number;
    publishedCount: number;
    publicPublicationCount: number;
    partnerPublicationCount: number;
    pendingAccessRequests: number;
    approvedAccessRequests: number;
    rejectedAccessRequests: number;
    revokedAccessRequests: number;
    activeGrants: number;
    publicMetadataFetches: number;
    publicPackageFetches: number;
    publicDocsFetches: number;
    partnerMetadataFetches: number;
    partnerPackageFetches: number;
    partnerDocsFetches: number;
  };
  byVisibility: Record<string, number>;
  byChannel: Record<string, number>;
  windows: {
    last7Days: {
      eventCount: number;
      accessRequests: number;
      approvals: number;
      fetches: number;
    };
    last30Days: {
      eventCount: number;
      accessRequests: number;
      approvals: number;
      fetches: number;
    };
    allTime: {
      eventCount: number;
      accessRequests: number;
      approvals: number;
      fetches: number;
    };
  };
  topPublications: Array<{
    publicationId: string;
    connectorKey: string;
    version: string;
    visibility: string;
    channel: string;
    status: string;
    totalFetches: number;
    accessRequests: number;
    approvedRequests: number;
    activeGrants: number;
    lastEventAt: string | null;
    publishedAt: string;
  }>;
  latest: {
    publication: IntegrationPublicationDto | null;
    accessRequest: IntegrationDistributionRequestDto | null;
    event: IntegrationPublicationEventDto | null;
  };
}

export interface IntegrationPublicationSigningReadinessDto {
  publicationId: string;
  connectorKey: string;
  version: string;
  signingKeyRef: string | null;
  latestAvailableKeyRef: string | null;
  signatureStatus: string;
  canReSign: boolean;
  requiresRotation: boolean;
  blockingIssues: string[];
  warnings: string[];
}

export interface IntegrationPublicationLifecycleReadinessDto {
  publicationId: string;
  connectorKey: string;
  version: string;
  publicationStatus: string;
  deprecationStage: string;
  sunsetAt: string | null;
  isSunsetDue: boolean;
  actionRequired: boolean;
  canAutoRevoke: boolean;
  recommendedStatus: string | null;
  blockingIssues: string[];
  warnings: string[];
}

export interface IntegrationPublicationLifecycleSweepDto {
  scannedCount: number;
  affectedCount: number;
  dryRun: boolean;
  affected: Array<{
    publicationId: string;
    connectorKey: string;
    version: string;
    previousStatus: string;
    nextStatus: string;
    reason: string;
  }>;
}

export interface IntegrationDistributionRequestDto {
  id: string;
  publicationId: string;
  connectorKey: string;
  version: string;
  requestedChannel: string | null;
  companyName: string;
  contactName: string;
  contactEmail: string;
  intendedUse: Record<string, unknown> | null;
  status: string;
  decisionNotes: Record<string, unknown> | null;
  accessToken: string | null;
  grantedConsumerKey: string | null;
  grantExpiresAt: string | null;
  approvedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationDistributionRequestGovernanceReadinessDto {
  requestId: string;
  publicationId: string;
  connectorKey: string;
  version: string;
  status: string;
  grantedConsumerKey: string | null;
  grantExpiresAt: string | null;
  approvedAt: string | null;
  revokedAt: string | null;
  isExpired: boolean;
  actionRequired: boolean;
  canAutoRevoke: boolean;
  blockingIssues: string[];
  warnings: string[];
}

export interface IntegrationDistributionRequestGovernanceSweepDto {
  scannedCount: number;
  affectedCount: number;
  dryRun: boolean;
  affected: Array<{
    requestId: string;
    publicationId: string;
    connectorKey: string;
    version: string;
    previousStatus: string;
    nextStatus: string;
    reason: string;
  }>;
}

export interface IntegrationActivationRequestDto {
  id: string;
  publicationId: string | null;
  registryEntryId: string | null;
  tenantId: string | null;
  organizationId: string | null;
  targetKind: string;
  connectorKey: string;
  version: string;
  status: string;
  requestNotes: Record<string, unknown> | null;
  decisionNotes: Record<string, unknown> | null;
  activationArtifact: Record<string, unknown> | null;
  requestedByUserId: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  appliedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationActivationRequestReadinessDto {
  requestId: string;
  publicationId: string | null;
  registryEntryId: string | null;
  tenantId: string | null;
  organizationId: string | null;
  targetKind: string;
  connectorKey: string;
  version: string;
  requestStatus: string;
  status: string;
  publicationStatus: string | null;
  registryStatus: string | null;
  canApprove: boolean;
  canApply: boolean;
  canRevoke: boolean;
  blockingIssues: string[];
  warnings: string[];
  checks: Array<{
    code: string;
    status: "READY" | "BLOCKED" | "WARN";
    message: string;
  }>;
  providerPolicy?: {
    key: string | null;
    name: string | null;
    riskLevel: string | null;
    executionModel: string | null;
    preferredRetryExecution: string | null;
  } | null;
  providerCompatibility?: {
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
  } | null;
  activation: {
    requestedAt: string;
    approvedAt: string | null;
    appliedAt: string | null;
    revokedAt: string | null;
    rejectedAt: string | null;
  };
}

export interface IntegrationActivationInstallReadinessDto {
  requestId: string;
  publicationId: string | null;
  registryEntryId: string | null;
  tenantId: string | null;
  organizationId: string | null;
  targetKind: string;
  connectorKey: string;
  version: string;
  requestStatus: string;
  status: string;
  canInstall: boolean;
  blockingIssues: string[];
  warnings: string[];
  checks: Array<{
    code: string;
    status: "READY" | "BLOCKED" | "WARN";
    message: string;
  }>;
  providerPolicy?: {
    key: string | null;
    name: string | null;
    riskLevel: string | null;
    executionModel: string | null;
    preferredRetryExecution: string | null;
  } | null;
  providerCompatibility?: {
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
  } | null;
  install: {
    installMode: string;
    source: string;
    targetTenantId: string | null;
    targetStoreId: string | null;
    existingRuntimeEntryId: string | null;
    existingRuntimeStatus: string | null;
    connectorTemplateId: string | null;
    connectorTemplateVersion: string | null;
    transportMode: string;
    providerAdapterKey: string | null;
    providerProfileKey: string | null;
  };
  runtimeRollout?: {
    installedRegistryEntryId: string | null;
    source: string;
    connectorTemplateId: string | null;
    connectorTemplateVersion: string | null;
    driftStatus: string;
    sourceDigestCurrent: string;
    sourceDigestInstalled: string | null;
    governanceStatus: string;
    governanceReason: string | null;
    lastGovernanceEvaluationAt: string | null;
    publicationLifecycle: {
      actionRequired: boolean;
      canAutoRevoke: boolean;
      recommendedStatus: string | null;
      blockingIssues: string[];
      warnings: string[];
    } | null;
  } | null;
}

export interface IntegrationActivationRuntimeRolloutReadinessDto {
  requestId: string;
  connectorKey: string;
  version: string;
  tenantId: string | null;
  targetTenantId: string | null;
  targetStoreId: string | null;
  status: string;
  canReconcile: boolean;
  canApplyGovernance: boolean;
  requestStatus: string;
  runtimeStatus: string | null;
  blockingIssues: string[];
  warnings: string[];
  checks: Array<{
    code: string;
    status: "READY" | "BLOCKED" | "WARN";
    message: string;
  }>;
  providerPolicy?: {
    key: string | null;
    name: string | null;
    riskLevel: string | null;
    executionModel: string | null;
    preferredRetryExecution: string | null;
  } | null;
  providerCompatibility?: {
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
  } | null;
  runtimeRollout: {
    installedRegistryEntryId: string | null;
    source: string;
    connectorTemplateId: string | null;
    connectorTemplateVersion: string | null;
    driftStatus: string;
    sourceDigestCurrent: string;
    sourceDigestInstalled: string | null;
    governanceStatus: string;
    governanceReason: string | null;
    lastGovernanceEvaluationAt: string | null;
    publicationLifecycle: {
      actionRequired: boolean;
      canAutoRevoke: boolean;
      recommendedStatus: string | null;
      blockingIssues: string[];
      warnings: string[];
    } | null;
  };
}

export interface IntegrationActivationExecutionPolicyDto {
  requestId: string;
  connectorKey: string;
  version: string;
  tenantId: string | null;
  targetTenantId: string | null;
  targetStoreId: string | null;
  status: "READY" | "WARN" | "BLOCKED" | "SUSPENDED";
  state: "READY" | "WARN" | "BLOCKED" | "SUSPENDED";
  canApplyExecutionPolicy: boolean;
  runtimeStatus: string | null;
  blockingIssues: string[];
  warnings: string[];
  checks: Array<{
    code: string;
    status: "READY" | "WARN" | "BLOCKED" | "SUSPENDED";
    message: string;
  }>;
  providerPolicy?: {
    key: string | null;
    name: string | null;
    riskLevel: string | null;
    executionModel: string | null;
    preferredRetryExecution: string | null;
  } | null;
  providerCompatibility?: {
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
  } | null;
  executionPolicy: {
    state: "READY" | "WARN" | "BLOCKED" | "SUSPENDED";
    reason: string | null;
    evaluatedAt: string | null;
    requestStatus: string | null;
    runtimeStatus: string | null;
    providerPolicy?: {
      key: string | null;
      name: string | null;
      riskLevel: string | null;
      executionModel: string | null;
      preferredRetryExecution: string | null;
    } | null;
    providerCompatibility?: Record<string, unknown> | null;
    runtimeRollout?: Record<string, unknown> | null;
    secretResolution?: {
      requiredSecrets: string[];
      resolvedSecrets: string[];
      missingSecrets: string[];
      resolved: boolean;
    } | null;
    deployment?: Record<string, unknown> | null;
  };
}

export interface InventorySupplierProviderRuntimePolicyDto {
  key: string;
  name: string;
  description: string;
  riskLevel: "STANDARD" | "ELEVATED" | "STRICT";
  executionModel: "INLINE_PUSH" | "FILE_EXCHANGE" | "SIGNED_CALLBACK";
  adapterKeys: string[];
  profileKeys: string[];
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
  summary: {
    allowedVisibility: Array<"PUBLIC" | "PARTNER">;
    allowedChannels: string[];
    requirePublicationSnapshot: boolean;
    requireSignedPublication: boolean;
    requireApproval: boolean;
    requireAppliedActivation: boolean;
    requireTenantInstall: boolean;
    requireCurrentGovernance: boolean;
    requireCurrentSourceDigest: boolean;
    requireResolvedSecrets: boolean;
    allowGlobalFallback: boolean;
    preferredRetryExecution: "INLINE" | "WORKER";
  };
}

export interface InventorySupplierProviderRuntimeOverviewDto {
  tenantId: string;
  storeId: string | null;
  summary: {
    connectorCount: number;
    runtimeGroupCount: number;
    supplierJobCount: number;
    readyExecutionCount: number;
    warnExecutionCount: number;
    blockedExecutionCount: number;
    suspendedExecutionCount: number;
    retryableFailureCount: number;
    terminalFailureCount: number;
  };
  items: Array<{
    providerAdapterKey: string | null;
    providerAdapterName: string | null;
    providerProfileKey: string | null;
    providerPolicyKey: string | null;
    transportMode: string;
    executionPolicyStatus: string | null;
    connectorCount: number;
    supplierJobCount: number;
    successCount: number;
    failedCount: number;
    retryableFailureCount: number;
    terminalFailureCount: number;
    latestExecutionAt: string | null;
    failureClasses: Record<string, number>;
    retryClasses: Record<string, number>;
    executionPhases: Record<string, number>;
  }>;
}

export interface InventorySupplierExecutionReadinessDto {
  jobId: string;
  tenantId: string;
  storeId: string | null;
  connectorKey: string | null;
  transportMode: string | null;
  status: "READY" | "WARN" | "BLOCKED" | "SUSPENDED";
  canExecute: boolean;
  providerAdapterKey: string | null;
  providerAdapterName: string | null;
  providerProfileKey: string | null;
  providerPolicyKey: string | null;
  providerPolicy: Record<string, unknown> | null;
  providerCompatibility: Record<string, unknown> | null;
  executionPolicy: Record<string, unknown> | null;
  blockingIssues: string[];
  warnings: string[];
  checks: Array<{
    code: string;
    status: "READY" | "WARN" | "BLOCKED" | "SUSPENDED";
    message: string;
  }>;
  failure: {
    providerErrorClass: string | null;
    retryClass: string | null;
    providerExecutionPhase: string | null;
    deadLetterReasonCode: string | null;
  };
  staging: Record<string, unknown> | null;
}

export interface EnterpriseOperationsOverviewDto {
  scope: {
    tenantId: string | null;
    organizationId: string | null;
  };
  summary: {
    billingPlanCount: number;
    billingSubscriptionCount: number;
    billingInvoiceCount: number;
    identityProviderCount: number;
    federatedLinkCount: number;
    advancedRolePolicyCount: number;
    auditExportCount: number;
    compliancePackCount: number;
    complianceEvidenceArtifactCount: number;
    secretRegistryEntryCount: number;
    deploymentVariantCount: number;
    integrationRegistryEntryCount: number;
    connectorTemplateCount: number;
    partnerSdkContractCount: number;
  };
  statuses: {
    subscriptions: Record<string, number>;
    invoices: Record<string, number>;
    identityProviders: Record<string, number>;
    auditExports: Record<string, number>;
    compliancePacks: Record<string, number>;
    deploymentVariants: Record<string, number>;
    integrationRegistryEntries: Record<string, number>;
    partnerSdkContracts: Record<string, number>;
  };
  latest: {
    subscription: SubscriptionDto | null;
    invoice: InvoiceDto | null;
    identityProvider: EnterpriseIdentityProviderDto | null;
    auditExport: AuditExportJobDto | null;
    compliancePack: CompliancePackDto | null;
    deploymentVariant: DeploymentVariantDto | null;
    integrationRegistryEntry: IntegrationRegistryEntryDto | null;
    connectorTemplate: ConnectorTemplateDto | null;
    partnerSdkContract: PartnerSdkContractDto | null;
  };
}

export interface CreatePaymentOperationRequest {
  paymentIntentId: string;
  paymentAllocationId?: string | null;
  kind: PaymentOperationKind;
  amount: string;
  reason?: string | null;
}

export interface CreatePaymentSettlementRequest {
  tenantId?: string;
  storeId?: string | null;
  providerKey: string;
  periodStart: string;
  periodEnd: string;
  totalAmount?: string;
  settledAmount?: string;
  summary?: Record<string, unknown> | null;
}

export interface ReceivePaymentWebhookRequest {
  tenantId?: string | null;
  storeId?: string | null;
  deliveryId: string;
  eventType: string;
  signature?: string | null;
  payload: Record<string, unknown>;
}

export interface CreateHardwareJobRequest {
  tenantId?: string;
  storeId: string;
  orderId?: string | null;
  deviceId?: string | null;
  connectorKey: string;
  kind: HardwareJobKind;
  requestPayload?: Record<string, unknown> | null;
}

export interface CreateBillingPlanRequest {
  code: string;
  name: string;
  priceAmount?: string;
  currency?: string;
  intervalKey?: string;
  entitlements?: Record<string, unknown>;
  quotas?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

export interface CreateSubscriptionRequest {
  tenantId: string;
  planId: string;
  billingAccountId?: string;
  status?: "TRIAL" | "ACTIVE" | "GRACE" | "SUSPENDED" | "CANCELLED";
  currentPeriodDays?: number;
}

export interface IssueInvoiceRequest {
  tenantId: string;
  billingAccountId: string;
  subscriptionId?: string | null;
  subtotalAmount: string;
  totalAmount: string;
  lines: Array<Record<string, unknown>>;
  dueAt?: string | null;
}

export interface UpsertEntitlementGrantRequest {
  tenantId: string;
  subscriptionId?: string | null;
  key: string;
  scopeType?: string;
  scopeId?: string | null;
  value: Record<string, unknown>;
  source?: string;
}

export interface UpsertQuotaCounterRequest {
  tenantId: string;
  subscriptionId?: string | null;
  key: string;
  scopeType?: string;
  scopeId?: string | null;
  limitValue: number;
  usedValue?: number;
  resetAt?: string | null;
}

export interface CreateWarehouseRequest {
  tenantId: string;
  storeId: string;
  code: string;
  name: string;
}

export interface CreateIngredientRequest {
  tenantId: string;
  code: string;
  name: string;
  unit: string;
}

export interface CreateInventoryItemRequest {
  tenantId: string;
  storeId: string;
  warehouseId: string;
  productId?: string | null;
  variantId?: string | null;
  ingredientId?: string | null;
  unit?: string;
  onHandQuantity?: string;
  reorderPointQuantity?: string;
  metadata?: Record<string, unknown> | null;
}

export interface CreateRecipeBomRequest {
  tenantId: string;
  productId?: string | null;
  variantId?: string | null;
  modifierOptionId?: string | null;
  ingredientId: string;
  quantity: string;
}

export interface CreateReceivingRecordRequest {
  tenantId: string;
  storeId: string;
  warehouseId: string;
  reference: string;
  notes?: string | null;
  lines: Array<{
    inventoryItemId?: string | null;
    ingredientId?: string | null;
    productId?: string | null;
    variantId?: string | null;
    quantity: string;
    unitCost?: string | null;
  }>;
}

export interface CreateInventoryAdjustmentRequest {
  tenantId: string;
  storeId: string;
  warehouseId: string;
  inventoryItemId: string;
  kind: InventoryAdjustmentKind;
  quantity: string;
  reason: string;
}

export interface CreateStopListRuleRequest {
  tenantId: string;
  storeId: string;
  targetType: string;
  targetId: string;
  source?: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateOrganizationRequest {
  code: string;
  name: string;
  metadata?: Record<string, unknown> | null;
}

export interface LinkOrganizationTenantRequest {
  tenantId: string;
  roleKey?: string;
}

export interface AddOrganizationMembershipRequest {
  userId: string;
  roleKey: string;
}

export interface UpsertGovernancePolicyRequest {
  policyKey: string;
  rules: Record<string, unknown>;
}

export interface CreateRolloutTemplateRequest {
  organizationId: string;
  code: string;
  name: string;
  artifact: Record<string, unknown>;
}

export interface ApplyRolloutTemplateRequest {
  tenantId?: string | null;
  storeId?: string | null;
}

export interface CreateWhiteLabelPackRequest {
  organizationId?: string | null;
  tenantId?: string | null;
  code: string;
  name: string;
  artifact: Record<string, unknown>;
}

export interface CreatePartnerAccountRequest {
  organizationId?: string | null;
  tenantId?: string | null;
  code: string;
  name: string;
  metadata?: Record<string, unknown> | null;
}

export interface CreateEnterpriseIdentityProviderRequest {
  tenantId?: string | null;
  organizationId?: string | null;
  code: string;
  type: IdentityProviderType;
  config: Record<string, unknown>;
}

export interface CreateFederatedIdentityLinkRequest {
  identityProviderId: string;
  userId: string;
  externalSubject: string;
  email?: string | null;
}

export interface CreateAuditExportJobRequest {
  tenantId?: string | null;
  organizationId?: string | null;
  filter?: Record<string, unknown> | null;
}

export interface CreateAdvancedRolePolicyRequest {
  tenantId?: string | null;
  organizationId?: string | null;
  key: string;
  rules: Record<string, unknown>;
}

export interface CreateCompliancePackRequest {
  tenantId?: string | null;
  organizationId?: string | null;
  code: string;
  name: string;
  controls: Record<string, unknown>;
}

export interface CreateComplianceEvidenceArtifactRequest {
  compliancePackId?: string | null;
  tenantId?: string | null;
  organizationId?: string | null;
  key: string;
  artifact: Record<string, unknown>;
}

export interface CreateSecretRegistryEntryRequest {
  tenantId?: string | null;
  organizationId?: string | null;
  scopeType: string;
  scopeId?: string | null;
  key: string;
  value: string;
  metadata?: Record<string, unknown> | null;
}

export interface CreateDeploymentVariantRequest {
  tenantId?: string | null;
  organizationId?: string | null;
  code: string;
  name: string;
  config: Record<string, unknown>;
}

export interface CreatePartnerSdkContractRequest {
  partnerAccountId?: string | null;
  key: string;
  version: string;
  schema: Record<string, unknown>;
}

export interface CreateIntegrationRegistryEntryRequest {
  tenantId?: string | null;
  organizationId?: string | null;
  connectorKey: string;
  version: string;
  manifest: Record<string, unknown>;
}

export interface CreateConnectorTemplateRequest {
  connectorKey: string;
  version: string;
  manifest: Record<string, unknown>;
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
