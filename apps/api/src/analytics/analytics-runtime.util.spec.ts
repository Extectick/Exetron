import { buildOwnerCabinetDashboard } from "./analytics-runtime.util";

describe("buildOwnerCabinetDashboard", () => {
  it("aggregates revenue, top products, channel metrics, and cancellations", () => {
    const dashboard = buildOwnerCabinetDashboard({
      tenantId: "tenant-1",
      storeId: null,
      periodStart: new Date("2026-03-01T00:00:00.000Z"),
      periodEnd: new Date("2026-03-31T23:59:59.999Z"),
      currency: "RUB",
      stores: [
        { id: "store-a", code: "A", name: "Store A" },
        { id: "store-b", code: "B", name: "Store B" }
      ],
      orders: [
        {
          id: "order-1",
          storeId: "store-a",
          channel: "POS",
          status: "PLACED",
          refundStatus: "NONE",
          total: "12.00",
          paidAmount: "12.00",
          items: [
            {
              productId: "product-1",
              quantity: 2,
              lineTotal: "12.00",
              snapshot: {
                product: { code: "latte", name: "Latte" }
              }
            }
          ]
        },
        {
          id: "order-2",
          storeId: "store-b",
          channel: "KIOSK",
          status: "CONFIRMED",
          refundStatus: "NONE",
          total: "8.50",
          paidAmount: "8.50",
          items: [
            {
              productId: "product-2",
              quantity: 1,
              lineTotal: "8.50",
              snapshot: {
                product: { code: "burger", name: "Burger" }
              }
            }
          ]
        },
        {
          id: "order-3",
          storeId: "store-b",
          channel: "POS",
          status: "CANCELLED",
          refundStatus: "PENDING_MANUAL",
          total: "9.00",
          paidAmount: "0.00",
          items: []
        }
      ]
    });

    expect(dashboard.revenue).toBe("20.50");
    expect(dashboard.paidOrders).toBe(2);
    expect(dashboard.averageOrderValue).toBe("10.25");
    expect(dashboard.topProducts[0]).toEqual(
      expect.objectContaining({
        productId: "product-1",
        productCode: "latte",
        productName: "Latte",
        quantity: 2,
        revenue: "12.00"
      })
    );
    expect(dashboard.revenueByStore).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storeId: "store-a",
          revenue: "12.00",
          paidOrders: 1
        }),
        expect.objectContaining({
          storeId: "store-b",
          revenue: "8.50",
          paidOrders: 1
        })
      ])
    );
    expect(dashboard.channelSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: "POS", revenue: "12.00", paidOrders: 1 }),
        expect.objectContaining({ channel: "KIOSK", revenue: "8.50", paidOrders: 1 })
      ])
    );
    expect(dashboard.refundsAndCancellations).toEqual({
      cancelledOrders: 1,
      cancelledRevenue: "9.00",
      pendingManualRefunds: 1,
      pendingManualRefundAmount: "9.00"
    });
  });
});
