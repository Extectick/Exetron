import { calculateCartTotals, calculateLineTotals } from "./order-money.util";

describe("order-money.util", () => {
  it("calculates line totals from quantity, base price, and modifiers", () => {
    expect(
      calculateLineTotals({
        quantity: 2,
        unitBasePrice: "10.50",
        modifierPriceDeltas: ["1.25", "0.75"]
      })
    ).toEqual({
      modifierTotal: "4.00",
      lineTotal: "25.00"
    });
  });

  it("aggregates cart totals across lines", () => {
    expect(
      calculateCartTotals([
        {
          quantity: 2,
          unitBasePrice: "10.50",
          modifierTotal: "4.00"
        },
        {
          quantity: 1,
          unitBasePrice: "5.00",
          modifierTotal: "0.00"
        }
      ])
    ).toEqual({
      subtotal: "26.00",
      modifierTotal: "4.00",
      total: "30.00"
    });
  });
});
