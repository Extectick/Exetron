export const appScopes = ["platform_admin", "tenant_member", "device"] as const;
export type AppScope = (typeof appScopes)[number];

export const deviceKinds = [
  "POS",
  "KIOSK",
  "KITCHEN",
  "BOARD",
  "BACKOFFICE"
] as const;
export type DeviceKind = (typeof deviceKinds)[number];

export const catalogTargetTypes = [
  "PRODUCT",
  "VARIANT",
  "MODIFIER_OPTION"
] as const;
export type CatalogTargetType = (typeof catalogTargetTypes)[number];

export const availabilityTargetTypes = ["PRODUCT", "VARIANT"] as const;
export type AvailabilityTargetType = (typeof availabilityTargetTypes)[number];

export const modifierSelectionModes = ["SINGLE", "MULTIPLE"] as const;
export type ModifierSelectionMode = (typeof modifierSelectionModes)[number];

export const priceSources = [
  "store_override",
  "price_list",
  "variant_base",
  "product_base",
  "none"
] as const;
export type PriceSource = (typeof priceSources)[number];

export interface JwtClaims {
  sub: string;
  tenantId: string | null;
  scope: AppScope;
  roleIds: string[];
  storeIds: string[];
  deviceId?: string;
}

export interface RequestContext {
  userId: string;
  tenantId: string | null;
  scope: AppScope;
  roleIds: string[];
  permissions: string[];
  storeIds: string[];
  deviceId?: string;
}

export interface PaginationResult<TItem> {
  items: TItem[];
  total: number;
}

export interface SelectOption {
  value: string;
  label: string;
}
