import type {
  AppScope,
  AvailabilityTargetType,
  CatalogTargetType,
  DeviceKind,
  JwtClaims,
  ModifierSelectionMode,
  PaginationResult,
  PriceSource
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

export interface UpsertTenantSettingRequest {
  key: string;
  value: Record<string, unknown>;
}

export interface UpsertStoreSettingRequest {
  storeId: string;
  key: string;
  value: Record<string, unknown>;
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

export interface AdminNavItem {
  href: string;
  label: string;
  requiredScope?: AppScope;
}
