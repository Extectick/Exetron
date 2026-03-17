import {
  isCatalogEntryAvailable,
  isWithinAvailabilityWindows,
  parseClockTime,
  resolveCurrentSlot
} from "./availability.util";

describe("availability.util", () => {
  it("parses valid clock values", () => {
    expect(parseClockTime("09:30")).toBe(570);
  });

  it("matches regular and overnight availability windows", () => {
    expect(
      isWithinAvailabilityWindows(
        [{ weekday: 1, startTime: "09:00", endTime: "18:00" }],
        1,
        10 * 60
      )
    ).toBe(true);

    expect(
      isWithinAvailabilityWindows(
        [{ weekday: 1, startTime: "22:00", endTime: "02:00" }],
        2,
        60
      )
    ).toBe(true);
  });

  it("filters hidden, inactive and out-of-stock catalog entries", () => {
    expect(
      isCatalogEntryAvailable({
        status: "ACTIVE",
        isVisible: true,
        isAvailable: true,
        isOutOfStock: false,
        currentWeekday: 3,
        currentMinuteOfDay: 12 * 60
      })
    ).toBe(true);

    expect(
      isCatalogEntryAvailable({
        status: "INACTIVE",
        isVisible: true,
        isAvailable: true,
        isOutOfStock: false,
        currentWeekday: 3,
        currentMinuteOfDay: 12 * 60
      })
    ).toBe(false);

    expect(
      isCatalogEntryAvailable({
        status: "ACTIVE",
        isVisible: false,
        isAvailable: true,
        isOutOfStock: false,
        currentWeekday: 3,
        currentMinuteOfDay: 12 * 60
      })
    ).toBe(false);
  });

  it("resolves local weekday and minute of day from a timezone", () => {
    const slot = resolveCurrentSlot(new Date("2026-03-17T12:00:00.000Z"), "Asia/Novosibirsk");

    expect(slot.weekday).toBe(2);
    expect(slot.minuteOfDay).toBe(19 * 60);
  });
});
