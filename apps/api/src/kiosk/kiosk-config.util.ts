import type { KioskBrandingDto, KioskRulesDto } from "@exetron/contracts";
import type { PaymentMethodKind } from "@exetron/types";

const defaultBranding: KioskBrandingDto = {
  themeName: "classic",
  logoText: "Exetron",
  heroTitle: "Build your order",
  heroSubtitle: "Fast self-service ordering on this kiosk.",
  accentColor: "#c46d38",
  surfaceColor: "#fffaf0"
};

const defaultRules: KioskRulesDto = {
  allowNotes: true,
  requireCustomerName: false,
  allowedPaymentMethods: ["CARD", "QR"],
  autoConfirmPaidOrders: true
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asPaymentMethods(value: unknown): PaymentMethodKind[] {
  if (!Array.isArray(value)) {
    return defaultRules.allowedPaymentMethods;
  }

  const methods = value.filter(
    (item): item is PaymentMethodKind =>
      item === "CASH" || item === "CARD" || item === "QR"
  );

  return methods.length ? methods : defaultRules.allowedPaymentMethods;
}

export function resolveKioskBranding(value: unknown): KioskBrandingDto {
  const record = asRecord(value);

  return {
    themeName: asString(record.themeName, defaultBranding.themeName),
    logoText: asString(record.logoText, defaultBranding.logoText),
    heroTitle: asString(record.heroTitle, defaultBranding.heroTitle),
    heroSubtitle: asString(record.heroSubtitle, defaultBranding.heroSubtitle),
    accentColor: asString(record.accentColor, defaultBranding.accentColor),
    surfaceColor: asString(record.surfaceColor, defaultBranding.surfaceColor)
  };
}

export function resolveKioskRules(value: unknown): KioskRulesDto {
  const record = asRecord(value);

  return {
    allowNotes: asBoolean(record.allowNotes, defaultRules.allowNotes),
    requireCustomerName: asBoolean(
      record.requireCustomerName,
      defaultRules.requireCustomerName
    ),
    allowedPaymentMethods: asPaymentMethods(record.allowedPaymentMethods),
    autoConfirmPaidOrders: asBoolean(
      record.autoConfirmPaidOrders,
      defaultRules.autoConfirmPaidOrders
    )
  };
}
