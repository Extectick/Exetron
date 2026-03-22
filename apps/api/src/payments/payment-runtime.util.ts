import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@exetron/database";
import type {
  OrderChannel,
  PaymentAllocationStatus,
  PaymentMethodKind,
  PaymentIntentStatus,
  PaymentProviderType
} from "@exetron/types";

const zero = new Prisma.Decimal(0);

export interface PaymentAllocationInput {
  method: PaymentMethodKind;
  amount: string;
}

export interface PaymentProviderSettings {
  simulateResult?: string;
  externalReferencePrefix?: string;
  failureCode?: string;
  failureMessage?: string;
  adapterMode?: string;
  webhookSecret?: string;
}

export function validatePaymentAllocations(
  allocations: PaymentAllocationInput[],
  expectedTotal: string
): {
  totalAmount: string;
  normalizedAllocations: PaymentAllocationInput[];
} {
  if (!allocations.length) {
    throw new BadRequestException("At least one payment allocation is required.");
  }

  const total = allocations.reduce(
    (sum, allocation) => sum.plus(new Prisma.Decimal(allocation.amount)),
    zero
  );
  const expected = new Prisma.Decimal(expectedTotal);

  if (!total.equals(expected)) {
    throw new BadRequestException("Payment allocations must match the order total.");
  }

  return {
    totalAmount: total.toFixed(2),
    normalizedAllocations: allocations.map((allocation) => ({
      method: allocation.method,
      amount: new Prisma.Decimal(allocation.amount).toFixed(2)
    }))
  };
}

export function resolvePaymentIntentState(input: {
  totalAmount: string;
  allocations: Array<{
    amount: string;
    status: PaymentAllocationStatus;
  }>;
}): {
  status: PaymentIntentStatus;
  paidAmount: string;
} {
  const totalAmount = new Prisma.Decimal(input.totalAmount);
  const completedAmount = input.allocations.reduce((sum, allocation) => {
    if (allocation.status !== "COMPLETED") {
      return sum;
    }

    return sum.plus(new Prisma.Decimal(allocation.amount));
  }, zero);

  const statuses = input.allocations.map((allocation) => allocation.status);
  const hasPending = statuses.includes("PENDING");
  const hasFailed = statuses.includes("FAILED");
  const hasCancelled = statuses.includes("CANCELLED");

  if (completedAmount.equals(totalAmount)) {
    return {
      status: "COMPLETED",
      paidAmount: completedAmount.toFixed(2)
    };
  }

  if (completedAmount.greaterThan(zero)) {
    return {
      status: "PARTIALLY_PAID",
      paidAmount: completedAmount.toFixed(2)
    };
  }

  if (hasPending) {
    return {
      status: "PENDING",
      paidAmount: completedAmount.toFixed(2)
    };
  }

  if (hasFailed) {
    return {
      status: "FAILED",
      paidAmount: completedAmount.toFixed(2)
    };
  }

  if (hasCancelled && statuses.every((status) => status === "CANCELLED")) {
    return {
      status: "CANCELLED",
      paidAmount: completedAmount.toFixed(2)
    };
  }

  return {
    status: "PENDING",
    paidAmount: completedAmount.toFixed(2)
  };
}

export function resolveDefaultProviderType(method: PaymentMethodKind): PaymentProviderType {
  switch (method) {
    case "CASH":
      return "CASH_MANUAL";
    case "CARD":
      return "CARD_SIMULATED";
    case "QR":
      return "QR_SIMULATED";
  }
}

export function resolveDefaultAutoConfirm(channel: OrderChannel): boolean {
  return channel === "KIOSK";
}

export function simulateProviderResult(input: {
  providerKey: string;
  providerType: PaymentProviderType;
  method: PaymentMethodKind;
  settings?: PaymentProviderSettings | null;
}): {
  status: "SUCCEEDED" | "FAILED";
  externalReference: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  responsePayload: Record<string, unknown>;
} {
  const settings = input.settings ?? {};
  const simulateResult = settings.simulateResult?.toLowerCase() ?? "success";

  if (simulateResult === "failed" || simulateResult === "failure" || simulateResult === "error") {
    return {
      status: "FAILED",
      externalReference: null,
      errorCode: settings.failureCode ?? "SIMULATED_FAILURE",
      errorMessage: settings.failureMessage ?? `${input.method} payment failed in simulation mode.`,
      responsePayload: {
        providerKey: input.providerKey,
        providerType: input.providerType,
        simulated: true,
        outcome: "failed"
      }
    };
  }

  const prefix = settings.externalReferencePrefix?.trim() || input.providerKey;
  const externalReference = `${prefix}-${Date.now()}`;

  return {
    status: "SUCCEEDED",
    externalReference,
    errorCode: null,
    errorMessage: null,
    responsePayload: {
      providerKey: input.providerKey,
      providerType: input.providerType,
      simulated: true,
      outcome: "succeeded",
      externalReference
    }
  };
}
