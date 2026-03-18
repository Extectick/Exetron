import {
  resolveDefaultAutoConfirm,
  resolveDefaultProviderType,
  resolvePaymentIntentState,
  simulateProviderResult,
  validatePaymentAllocations
} from "./payment-runtime.util";

describe("payment-runtime.util", () => {
  it("validates mixed allocations against the order total", () => {
    expect(
      validatePaymentAllocations(
        [
          { method: "CASH", amount: "5.00" },
          { method: "CARD", amount: "6.50" }
        ],
        "11.50"
      ).totalAmount
    ).toBe("11.50");
  });

  it("derives partially paid and completed intent states", () => {
    expect(
      resolvePaymentIntentState({
        totalAmount: "10.00",
        allocations: [
          { amount: "4.00", status: "COMPLETED" },
          { amount: "6.00", status: "PENDING" }
        ]
      })
    ).toEqual({
      status: "PARTIALLY_PAID",
      paidAmount: "4.00"
    });

    expect(
      resolvePaymentIntentState({
        totalAmount: "10.00",
        allocations: [
          { amount: "4.00", status: "COMPLETED" },
          { amount: "6.00", status: "COMPLETED" }
        ]
      })
    ).toEqual({
      status: "COMPLETED",
      paidAmount: "10.00"
    });
  });

  it("resolves default providers and auto-confirm policy by channel", () => {
    expect(resolveDefaultProviderType("CASH")).toBe("CASH_MANUAL");
    expect(resolveDefaultProviderType("CARD")).toBe("CARD_SIMULATED");
    expect(resolveDefaultAutoConfirm("KIOSK")).toBe(true);
    expect(resolveDefaultAutoConfirm("POS")).toBe(false);
  });

  it("simulates provider failures from config settings", () => {
    expect(
      simulateProviderResult({
        providerKey: "kiosk-qr",
        providerType: "QR_SIMULATED",
        method: "QR",
        settings: {
          simulateResult: "failed",
          failureCode: "QR_TIMEOUT"
        }
      })
    ).toMatchObject({
      status: "FAILED",
      errorCode: "QR_TIMEOUT"
    });
  });
});
