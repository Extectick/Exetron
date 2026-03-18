import {
  canTransitionOrder,
  resolveRefundStatusOnCancel
} from "./order-lifecycle.util";

describe("order-lifecycle.util", () => {
  it("allows only configured status transitions", () => {
    expect(canTransitionOrder("PLACED", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("CONFIRMED", "IN_PREPARATION")).toBe(true);
    expect(canTransitionOrder("IN_PREPARATION", "READY")).toBe(true);
    expect(canTransitionOrder("READY", "COMPLETED")).toBe(true);
    expect(canTransitionOrder("PLACED", "READY")).toBe(false);
    expect(canTransitionOrder("COMPLETED", "CANCELLED")).toBe(false);
  });

  it("derives shallow refund status for cancellation", () => {
    expect(resolveRefundStatusOnCancel(false)).toBe("NOT_REQUIRED");
    expect(resolveRefundStatusOnCancel(true)).toBe("PENDING_MANUAL");
    expect(resolveRefundStatusOnCancel(undefined)).toBe("NOT_REQUIRED");
  });
});
