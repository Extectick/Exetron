import type {
  StorefrontBrandingDto,
  StorefrontRulesDto
} from "@exetron/contracts";
import type { PaymentMethodKind } from "@exetron/types";

const defaultPaymentMethods: PaymentMethodKind[] = ["CARD", "QR", "CASH"];

export function resolveStorefrontBranding(
  raw: Record<string, unknown> | null
): StorefrontBrandingDto {
  return {
    themeName: typeof raw?.themeName === "string" ? raw.themeName : "market",
    logoText: typeof raw?.logoText === "string" ? raw.logoText : "Exetron Storefront",
    heroTitle: typeof raw?.heroTitle === "string" ? raw.heroTitle : "Order online",
    heroSubtitle:
      typeof raw?.heroSubtitle === "string"
        ? raw.heroSubtitle
        : "Browse the live menu, place an order, and track progress in real time.",
    accentColor: typeof raw?.accentColor === "string" ? raw.accentColor : "#d94f30",
    surfaceColor: typeof raw?.surfaceColor === "string" ? raw.surfaceColor : "#fff8f2",
    bannerImageUrl: typeof raw?.bannerImageUrl === "string" ? raw.bannerImageUrl : null
  };
}

export function resolveStorefrontRules(
  raw: Record<string, unknown> | null
): StorefrontRulesDto {
  const allowedPaymentMethods = Array.isArray(raw?.allowedPaymentMethods)
    ? raw.allowedPaymentMethods.filter(
        (method): method is PaymentMethodKind =>
          method === "CASH" || method === "CARD" || method === "QR"
      )
    : [];

  return {
    allowGuestCheckout: raw?.allowGuestCheckout !== false,
    allowCustomerSessions: raw?.allowCustomerSessions !== false,
    requireCustomerName: raw?.requireCustomerName === true,
    requireCustomerPhone: raw?.requireCustomerPhone !== false,
    allowNotes: raw?.allowNotes !== false,
    autoConfirmPaidOrders: raw?.autoConfirmPaidOrders !== false,
    allowedPaymentMethods: allowedPaymentMethods.length
      ? allowedPaymentMethods
      : defaultPaymentMethods
  };
}
