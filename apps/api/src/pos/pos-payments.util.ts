import { BadRequestException } from "@nestjs/common";
import { formatCents, parseMoneyToCents } from "../pricing/money.util";

export interface PaymentAllocationInput {
  method: "CASH" | "CARD" | "QR";
  amount: string;
}

export function validatePaymentAllocations(
  allocations: PaymentAllocationInput[],
  orderTotal: string
): { totalAmount: string } {
  if (!allocations.length) {
    throw new BadRequestException("At least one payment allocation is required.");
  }

  const totalCents = parseMoneyToCents(orderTotal) ?? 0;
  const allocationTotalCents = allocations.reduce((sum, allocation) => {
    const allocationCents = parseMoneyToCents(allocation.amount);

    if (allocationCents === null || allocationCents <= 0) {
      throw new BadRequestException("Payment allocation amount must be greater than zero.");
    }

    return sum + allocationCents;
  }, 0);

  if (allocationTotalCents !== totalCents) {
    throw new BadRequestException("Payment allocations must match the order total.");
  }

  return {
    totalAmount: formatCents(allocationTotalCents)
  };
}
