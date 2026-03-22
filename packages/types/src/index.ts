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

export const orderChannels = ["ADMIN", "POS", "KIOSK", "DELIVERY"] as const;
export type OrderChannel = (typeof orderChannels)[number];

export const cartStatuses = ["OPEN", "CONVERTED"] as const;
export type CartStatus = (typeof cartStatuses)[number];

export const orderStatuses = [
  "PLACED",
  "CONFIRMED",
  "IN_PREPARATION",
  "READY",
  "COMPLETED",
  "CANCELLED"
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const refundStatuses = ["NONE", "NOT_REQUIRED", "PENDING_MANUAL"] as const;
export type RefundStatus = (typeof refundStatuses)[number];

export const customerProfileStatuses = ["ACTIVE", "MERGED", "ARCHIVED"] as const;
export type CustomerProfileStatus = (typeof customerProfileStatuses)[number];

export const loyaltyLedgerEntryKinds = ["EARN", "REDEEM", "ADJUST"] as const;
export type LoyaltyLedgerEntryKind = (typeof loyaltyLedgerEntryKinds)[number];

export const promotionStatuses = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type PromotionStatus = (typeof promotionStatuses)[number];

export const promotionTypes = ["PERCENTAGE", "FIXED_AMOUNT", "LOYALTY_REDEEM"] as const;
export type PromotionType = (typeof promotionTypes)[number];

export const posShiftStatuses = ["OPEN", "CLOSED"] as const;
export type PosShiftStatus = (typeof posShiftStatuses)[number];

export const posSessionStatuses = ["ACTIVE", "ENDED"] as const;
export type PosSessionStatus = (typeof posSessionStatuses)[number];

export const paymentMethodKinds = ["CASH", "CARD", "QR"] as const;
export type PaymentMethodKind = (typeof paymentMethodKinds)[number];

export const fulfillmentModes = ["DELIVERY", "PICKUP", "DINE_IN"] as const;
export type FulfillmentMode = (typeof fulfillmentModes)[number];

export const fulfillmentStatuses = [
  "PENDING",
  "SCHEDULED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "PICKED_UP",
  "TABLE_ASSIGNED",
  "SERVED"
] as const;
export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];

export const paymentIntentStatuses = [
  "PENDING",
  "PARTIALLY_PAID",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
] as const;
export type PaymentIntentStatus = (typeof paymentIntentStatuses)[number];

export const paymentAllocationStatuses = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
] as const;
export type PaymentAllocationStatus = (typeof paymentAllocationStatuses)[number];

export const paymentAttemptStatuses = [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED"
] as const;
export type PaymentAttemptStatus = (typeof paymentAttemptStatuses)[number];

export const paymentProviderTypes = [
  "CASH_MANUAL",
  "CARD_SIMULATED",
  "QR_SIMULATED"
] as const;
export type PaymentProviderType = (typeof paymentProviderTypes)[number];

export const paymentOperationKinds = ["REFUND", "VOID"] as const;
export type PaymentOperationKind = (typeof paymentOperationKinds)[number];

export const paymentOperationStatuses = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
] as const;
export type PaymentOperationStatus = (typeof paymentOperationStatuses)[number];

export const paymentSettlementStatuses = [
  "OPEN",
  "IMPORTED",
  "RECONCILED",
  "FAILED"
] as const;
export type PaymentSettlementStatus = (typeof paymentSettlementStatuses)[number];

export const paymentWebhookStatuses = [
  "RECEIVED",
  "PROCESSED",
  "DUPLICATE",
  "FAILED"
] as const;
export type PaymentWebhookStatus = (typeof paymentWebhookStatuses)[number];

export const connectorKinds = [
  "PAYMENT_PROVIDER",
  "FISCAL_ADAPTER",
  "PRINTER_ADAPTER",
  "TERMINAL_BRIDGE",
  "SCANNER_BRIDGE",
  "SUPPLIER_ADAPTER"
] as const;
export type ConnectorKind = (typeof connectorKinds)[number];

export const connectorExecutionStatuses = ["PENDING", "COMPLETED", "FAILED"] as const;
export type ConnectorExecutionStatus = (typeof connectorExecutionStatuses)[number];

export const hardwareJobKinds = [
  "FISCAL_RECEIPT",
  "PRINT_RECEIPT",
  "TERMINAL_CAPTURE",
  "SCANNER_SYNC"
] as const;
export type HardwareJobKind = (typeof hardwareJobKinds)[number];

export const hardwareJobStatuses = ["PENDING", "COMPLETED", "FAILED", "CANCELLED"] as const;
export type HardwareJobStatus = (typeof hardwareJobStatuses)[number];

export const planStatuses = ["ACTIVE", "ARCHIVED"] as const;
export type PlanStatus = (typeof planStatuses)[number];

export const subscriptionStatuses = [
  "TRIAL",
  "ACTIVE",
  "GRACE",
  "SUSPENDED",
  "CANCELLED"
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const invoiceStatuses = ["DRAFT", "ISSUED", "PAID", "VOID"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const trialStatuses = ["ACTIVE", "CONVERTED", "EXPIRED"] as const;
export type TrialStatus = (typeof trialStatuses)[number];

export const inventoryLedgerKinds = [
  "RECEIPT",
  "RESERVE",
  "RELEASE",
  "CONSUME",
  "ADJUST"
] as const;
export type InventoryLedgerKind = (typeof inventoryLedgerKinds)[number];

export const receivingStatuses = ["PENDING", "COMPLETED", "CANCELLED"] as const;
export type ReceivingStatus = (typeof receivingStatuses)[number];

export const inventoryAdjustmentKinds = ["INCREASE", "DECREASE", "SET"] as const;
export type InventoryAdjustmentKind = (typeof inventoryAdjustmentKinds)[number];

export const organizationStatuses = ["ACTIVE", "ARCHIVED"] as const;
export type OrganizationStatus = (typeof organizationStatuses)[number];

export const identityProviderTypes = ["OIDC", "SAML"] as const;
export type IdentityProviderType = (typeof identityProviderTypes)[number];

export const identityProviderStatuses = ["ACTIVE", "DISABLED"] as const;
export type IdentityProviderStatus = (typeof identityProviderStatuses)[number];

export const auditExportStatuses = ["PENDING", "COMPLETED", "FAILED"] as const;
export type AuditExportStatus = (typeof auditExportStatuses)[number];

export const kitchenTicketStatuses = [
  "NEW",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELLED"
] as const;
export type KitchenTicketStatus = (typeof kitchenTicketStatuses)[number];

export const kitchenBoardStatuses = [
  "NEW",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELLED"
] as const;
export type KitchenBoardStatus = (typeof kitchenBoardStatuses)[number];

export const kioskPaymentHandoffStatuses = [
  "INITIATED",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
] as const;
export type KioskPaymentHandoffStatus = (typeof kioskPaymentHandoffStatuses)[number];

export const analyticsSnapshotKinds = ["OWNER_DASHBOARD"] as const;
export type AnalyticsSnapshotKind = (typeof analyticsSnapshotKinds)[number];

export const customizationChannels = [
  "ADMIN",
  "POS",
  "KIOSK",
  "DELIVERY",
  "KITCHEN",
  "BOARD",
  "BACKOFFICE"
] as const;
export type CustomizationChannel = (typeof customizationChannels)[number];

export const customizationRuleStatuses = ["ACTIVE", "ARCHIVED"] as const;
export type CustomizationRuleStatus = (typeof customizationRuleStatuses)[number];

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
