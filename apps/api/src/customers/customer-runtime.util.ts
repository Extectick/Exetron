import type { PromotionType } from "@exetron/types";
import { formatCents, parseMoneyToCents } from "../pricing/money.util";

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function normalizeCustomerPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `+${digits}` : phone.trim();
}

export function deriveCustomerSegments(input: {
  orderCount: number;
  completedOrderCount: number;
  totalSpent: string;
  lastOrderAt: Date | null;
  pointsBalance: number;
}): string[] {
  const totalSpentCents = parseMoneyToCents(input.totalSpent) ?? 0;
  const now = Date.now();
  const lastOrderAtMs = input.lastOrderAt?.getTime() ?? null;
  const daysSinceLastOrder =
    lastOrderAtMs === null ? null : Math.floor((now - lastOrderAtMs) / (24 * 60 * 60 * 1000));
  const segments = new Set<string>();

  if (input.orderCount <= 1) {
    segments.add("NEW");
  }
  if (input.orderCount >= 2) {
    segments.add("REPEAT");
  }
  if (input.completedOrderCount >= 3 || totalSpentCents >= 15000) {
    segments.add("LOYAL");
  }
  if (totalSpentCents >= 30000 || input.pointsBalance >= 300) {
    segments.add("VIP");
  }
  if (daysSinceLastOrder !== null && daysSinceLastOrder >= 30) {
    segments.add("AT_RISK");
  }

  return [...segments].sort();
}

export function deriveRetentionState(input: {
  orderCount: number;
  segments: string[];
  lastOrderAt: Date | null;
}): {
  action: "WELCOME" | "NURTURE" | "WINBACK";
  templateKey: string;
  recommendedAt: string;
} {
  const now = new Date();
  const daysSinceLastOrder = input.lastOrderAt
    ? Math.floor((now.getTime() - input.lastOrderAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  if (daysSinceLastOrder !== null && daysSinceLastOrder >= 30) {
    return {
      action: "WINBACK",
      templateKey: "customer-winback-offer",
      recommendedAt: now.toISOString()
    };
  }

  if (input.orderCount <= 1) {
    return {
      action: "WELCOME",
      templateKey: "customer-welcome-series",
      recommendedAt: now.toISOString()
    };
  }

  return {
    action: input.segments.includes("LOYAL") ? "NURTURE" : "NURTURE",
    templateKey: input.segments.includes("VIP")
      ? "customer-vip-reward"
      : "customer-repeat-nurture",
    recommendedAt: now.toISOString()
  };
}

export function resolveEarnedLoyaltyPoints(orderTotal: string): number {
  const cents = parseMoneyToCents(orderTotal) ?? 0;
  return Math.max(0, Math.floor(cents / 100));
}

export function resolvePromotionDiscount(input: {
  type: PromotionType;
  value: string;
  orderTotal: string;
  maxDiscountAmount?: string | null;
}): string {
  const orderTotalCents = Math.max(0, parseMoneyToCents(input.orderTotal) ?? 0);
  const rawValueCents = Math.max(0, parseMoneyToCents(input.value) ?? 0);
  let discountCents = 0;

  if (input.type === "PERCENTAGE") {
    const percentage = rawValueCents / 100;
    discountCents = Math.floor(orderTotalCents * (percentage / 100));
  } else {
    discountCents = rawValueCents;
  }

  const maxDiscountCents =
    input.maxDiscountAmount == null
      ? null
      : Math.max(0, parseMoneyToCents(input.maxDiscountAmount) ?? 0);
  if (maxDiscountCents !== null) {
    discountCents = Math.min(discountCents, maxDiscountCents);
  }

  return formatCents(Math.min(orderTotalCents, discountCents));
}
