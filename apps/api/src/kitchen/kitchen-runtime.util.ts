import type { KitchenBoardStatus, KitchenTicketStatus, OrderStatus } from "@exetron/types";

const ticketTransitionMap = new Map<KitchenTicketStatus, KitchenTicketStatus[]>([
  ["NEW", ["IN_PROGRESS", "CANCELLED"]],
  ["IN_PROGRESS", ["READY", "CANCELLED"]],
  ["READY", ["COMPLETED"]],
  ["COMPLETED", []],
  ["CANCELLED", []]
]);

export interface KitchenRoutingConfig {
  defaultStationKey: string;
  productCodeMap: Record<string, string>;
  categoryCodeMap: Record<string, string>;
}

export function normalizeStationKey(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "KITCHEN";
}

function normalizeRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).flatMap(([key, value]) =>
      typeof value === "string" && value.trim()
        ? [[key.trim().toLowerCase(), normalizeStationKey(value)]]
        : []
    )
  );
}

export function resolveKitchenRoutingConfig(value: unknown): KitchenRoutingConfig {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    defaultStationKey: normalizeStationKey(
      typeof record.defaultStationKey === "string" ? record.defaultStationKey : "KITCHEN"
    ),
    productCodeMap: normalizeRecord(record.productCodeMap),
    categoryCodeMap: normalizeRecord(record.categoryCodeMap)
  };
}

export function resolveKitchenStationKey(
  config: KitchenRoutingConfig,
  input: { productCode: string; categoryCode?: string | null }
): string {
  const productCode = input.productCode.trim().toLowerCase();
  const categoryCode = input.categoryCode?.trim().toLowerCase() ?? null;

  return (
    config.productCodeMap[productCode] ??
    (categoryCode ? config.categoryCodeMap[categoryCode] : undefined) ??
    config.defaultStationKey
  );
}

export function canTransitionKitchenTicket(
  fromStatus: KitchenTicketStatus,
  toStatus: KitchenTicketStatus
): boolean {
  return ticketTransitionMap.get(fromStatus)?.includes(toStatus) ?? false;
}

export function deriveBoardStatus(input: {
  orderStatus: OrderStatus;
  ticketStatuses: KitchenTicketStatus[];
}): KitchenBoardStatus {
  if (input.orderStatus === "CANCELLED") {
    return "CANCELLED";
  }

  if (!input.ticketStatuses.length) {
    return input.orderStatus === "COMPLETED" ? "COMPLETED" : "NEW";
  }

  if (input.ticketStatuses.every((status) => status === "COMPLETED")) {
    return "COMPLETED";
  }

  if (input.ticketStatuses.every((status) => status === "CANCELLED")) {
    return "CANCELLED";
  }

  if (
    input.ticketStatuses.every((status) => status === "READY" || status === "COMPLETED")
  ) {
    return "READY";
  }

  if (input.ticketStatuses.some((status) => status === "IN_PROGRESS")) {
    return "IN_PROGRESS";
  }

  return "NEW";
}
