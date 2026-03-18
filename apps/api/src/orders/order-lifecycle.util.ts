import type { OrderStatus, RefundStatus } from "@exetron/types";

const transitionMap = new Map<OrderStatus, OrderStatus[]>([
  ["PLACED", ["CONFIRMED", "CANCELLED"]],
  ["CONFIRMED", ["IN_PREPARATION", "CANCELLED"]],
  ["IN_PREPARATION", ["READY", "CANCELLED"]],
  ["READY", ["COMPLETED"]],
  ["COMPLETED", []],
  ["CANCELLED", []]
]);

export function canTransitionOrder(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean {
  return transitionMap.get(fromStatus)?.includes(toStatus) ?? false;
}

export function resolveRefundStatusOnCancel(
  hasExternalPayment?: boolean
): RefundStatus {
  return hasExternalPayment ? "PENDING_MANUAL" : "NOT_REQUIRED";
}
