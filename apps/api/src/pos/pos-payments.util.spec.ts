import { BadRequestException } from "@nestjs/common";
import { validatePaymentAllocations } from "./pos-payments.util";

describe("pos-payments.util", () => {
  it("accepts single and mixed allocations matching the order total", () => {
    expect(
      validatePaymentAllocations(
        [
          { method: "CASH", amount: "5.00" },
          { method: "CARD", amount: "6.75" }
        ],
        "11.75"
      )
    ).toEqual({ totalAmount: "11.75" });
  });

  it("rejects allocations that do not match the order total", () => {
    expect(() =>
      validatePaymentAllocations(
        [
          { method: "CASH", amount: "5.00" },
          { method: "CARD", amount: "6.00" }
        ],
        "11.75"
      )
    ).toThrow(BadRequestException);
  });
});
