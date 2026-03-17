import { formatCents, parseMoneyToCents, resolvePrice } from "./money.util";

describe("money.util", () => {
  it("parses and formats money values with cents precision", () => {
    expect(parseMoneyToCents("12.50")).toBe(1250);
    expect(parseMoneyToCents("-3.25")).toBe(-325);
    expect(formatCents(905)).toBe("9.05");
  });

  it("resolves price precedence and applies modifier deltas", () => {
    const resolved = resolvePrice({
      storeOverridePrice: "11.00",
      priceListPrice: "10.00",
      variantBasePrice: "9.00",
      productBasePrice: "8.00",
      modifiers: [
        { optionId: "one", priceDelta: "1.50" },
        { optionId: "two", priceDelta: "0.25" }
      ]
    });

    expect(resolved).toEqual({
      basePrice: "11.00",
      modifierTotal: "1.75",
      finalPrice: "12.75",
      source: "store_override",
      modifierBreakdown: [
        { optionId: "one", priceDelta: "1.50" },
        { optionId: "two", priceDelta: "0.25" }
      ]
    });
  });

  it("falls back through price sources and handles modifier-only totals", () => {
    expect(
      resolvePrice({
        variantBasePrice: "7.20"
      })
    ).toMatchObject({
      basePrice: "7.20",
      finalPrice: "7.20",
      source: "variant_base"
    });

    expect(
      resolvePrice({
        modifiers: [{ optionId: "extra", priceDelta: "0.80" }]
      })
    ).toMatchObject({
      basePrice: null,
      modifierTotal: "0.80",
      finalPrice: "0.80",
      source: "none"
    });
  });
});
