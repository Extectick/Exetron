import { formatCents, parseMoneyToCents } from "../pricing/money.util";

export interface CalculatedLineTotals {
  modifierTotal: string;
  lineTotal: string;
}

export interface CalculatedCartTotals {
  subtotal: string;
  modifierTotal: string;
  discountTotal: string;
  total: string;
}

export function calculateLineTotals(input: {
  quantity: number;
  unitBasePrice: string | null;
  modifierPriceDeltas: string[];
}): CalculatedLineTotals {
  const unitBasePriceCents = parseMoneyToCents(input.unitBasePrice) ?? 0;
  const modifierPerUnitCents = input.modifierPriceDeltas.reduce((sum, value) => {
    return sum + (parseMoneyToCents(value) ?? 0);
  }, 0);
  const modifierTotalCents = modifierPerUnitCents * input.quantity;
  const lineTotalCents = unitBasePriceCents * input.quantity + modifierTotalCents;

  return {
    modifierTotal: formatCents(modifierTotalCents),
    lineTotal: formatCents(lineTotalCents)
  };
}

export function calculateCartTotals(
  items: Array<{ quantity: number; unitBasePrice: string | null; modifierTotal: string }>,
  options?: { fulfillmentFee?: string | null; discountTotal?: string | null }
): CalculatedCartTotals {
  const subtotalCents = items.reduce((sum, item) => {
    return sum + (parseMoneyToCents(item.unitBasePrice) ?? 0) * item.quantity;
  }, 0);
  const modifierTotalCents = items.reduce((sum, item) => {
    return sum + (parseMoneyToCents(item.modifierTotal) ?? 0);
  }, 0);
  const fulfillmentFeeCents = parseMoneyToCents(options?.fulfillmentFee) ?? 0;
  const discountTotalCents = Math.max(0, parseMoneyToCents(options?.discountTotal) ?? 0);
  const grossTotalCents = subtotalCents + modifierTotalCents + fulfillmentFeeCents;

  return {
    subtotal: formatCents(subtotalCents),
    modifierTotal: formatCents(modifierTotalCents),
    discountTotal: formatCents(Math.min(grossTotalCents, discountTotalCents)),
    total: formatCents(Math.max(0, grossTotalCents - discountTotalCents))
  };
}
