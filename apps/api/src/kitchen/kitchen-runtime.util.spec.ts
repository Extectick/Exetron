import {
  canTransitionKitchenTicket,
  deriveBoardStatus,
  normalizeStationKey,
  resolveKitchenRoutingConfig,
  resolveKitchenStationKey
} from "./kitchen-runtime.util";

describe("kitchen-runtime.util", () => {
  it("allows only configured kitchen ticket transitions", () => {
    expect(canTransitionKitchenTicket("NEW", "IN_PROGRESS")).toBe(true);
    expect(canTransitionKitchenTicket("IN_PROGRESS", "READY")).toBe(true);
    expect(canTransitionKitchenTicket("READY", "COMPLETED")).toBe(true);
    expect(canTransitionKitchenTicket("READY", "NEW")).toBe(false);
    expect(canTransitionKitchenTicket("COMPLETED", "READY")).toBe(false);
  });

  it("resolves routing config with normalized station keys", () => {
    const config = resolveKitchenRoutingConfig({
      defaultStationKey: "hot line",
      productCodeMap: { latte: "bar" },
      categoryCodeMap: { desserts: "cold" }
    });

    expect(config.defaultStationKey).toBe("HOT_LINE");
    expect(resolveKitchenStationKey(config, { productCode: "latte" })).toBe("BAR");
    expect(
      resolveKitchenStationKey(config, { productCode: "cake", categoryCode: "desserts" })
    ).toBe("COLD");
    expect(resolveKitchenStationKey(config, { productCode: "burger" })).toBe("HOT_LINE");
  });

  it("derives board status from ticket statuses", () => {
    expect(deriveBoardStatus({ orderStatus: "CONFIRMED", ticketStatuses: [] })).toBe("NEW");
    expect(
      deriveBoardStatus({ orderStatus: "IN_PREPARATION", ticketStatuses: ["IN_PROGRESS"] })
    ).toBe("IN_PROGRESS");
    expect(
      deriveBoardStatus({ orderStatus: "READY", ticketStatuses: ["READY", "COMPLETED"] })
    ).toBe("READY");
    expect(
      deriveBoardStatus({ orderStatus: "COMPLETED", ticketStatuses: ["COMPLETED"] })
    ).toBe("COMPLETED");
    expect(
      deriveBoardStatus({ orderStatus: "CANCELLED", ticketStatuses: ["CANCELLED"] })
    ).toBe("CANCELLED");
  });

  it("normalizes empty station keys to KITCHEN", () => {
    expect(normalizeStationKey("  ")).toBe("KITCHEN");
  });
});
