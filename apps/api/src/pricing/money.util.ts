import type { PriceSource } from "@exetron/types";

export interface PriceModifierInput {
  optionId: string;
  priceDelta: string;
}

export interface PriceResolutionInput {
  storeOverridePrice?: string | null;
  priceListPrice?: string | null;
  variantBasePrice?: string | null;
  productBasePrice?: string | null;
  modifiers?: PriceModifierInput[];
}

export interface PriceResolutionResult {
  basePrice: string | null;
  modifierTotal: string;
  finalPrice: string;
  source: PriceSource;
  modifierBreakdown: PriceModifierInput[];
}

const moneyPattern = /^-?\d+(?:\.\d{1,2})?$/;

export function parseMoneyToCents(value?: string | null): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (!moneyPattern.test(value)) {
    throw new Error(`Invalid money value: ${value}`);
  }

  const negative = value.startsWith("-");
  const normalized = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));

  return negative ? -cents : cents;
}

export function formatCents(value: number): string {
  const negative = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute / 100);
  const fraction = (absolute % 100).toString().padStart(2, "0");

  return `${negative}${whole}.${fraction}`;
}

export function resolvePrice(input: PriceResolutionInput): PriceResolutionResult {
  const modifiers = input.modifiers ?? [];
  const modifierTotalCents = modifiers.reduce((sum, modifier) => {
    return sum + (parseMoneyToCents(modifier.priceDelta) ?? 0);
  }, 0);

  const sources: Array<[PriceSource, string | null | undefined]> = [
    ["store_override", input.storeOverridePrice],
    ["price_list", input.priceListPrice],
    ["variant_base", input.variantBasePrice],
    ["product_base", input.productBasePrice]
  ];

  const resolvedSource =
    sources.find(([, price]) => parseMoneyToCents(price) !== null) ?? ["none", null];
  const [source, rawBasePrice] = resolvedSource;
  const basePriceCents = parseMoneyToCents(rawBasePrice);

  return {
    basePrice: basePriceCents === null ? null : formatCents(basePriceCents),
    modifierTotal: formatCents(modifierTotalCents),
    finalPrice: formatCents((basePriceCents ?? 0) + modifierTotalCents),
    source,
    modifierBreakdown: modifiers
  };
}
