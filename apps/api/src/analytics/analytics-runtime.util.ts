import type {
  AnalyticsChannelSummaryDto,
  AnalyticsRefundCancellationSummaryDto,
  AnalyticsRevenueByStoreDto,
  AnalyticsTopProductDto,
  OwnerCabinetDashboardDto
} from "@exetron/contracts";
import type { OrderChannel, RefundStatus } from "@exetron/types";

export interface AnalyticsStoreRecord {
  id: string;
  code: string;
  name: string;
}

export interface AnalyticsOrderRecord {
  id: string;
  storeId: string;
  channel: OrderChannel;
  status: string;
  refundStatus: RefundStatus;
  total: string;
  paidAmount: string;
  items: Array<{
    productId: string;
    quantity: number;
    lineTotal: string;
    snapshot: Record<string, unknown>;
  }>;
}

function toAmount(value: string): number {
  return Number.parseFloat(value || "0") || 0;
}

function toMoney(value: number): string {
  return value.toFixed(2);
}

export function buildOwnerCabinetDashboard(input: {
  tenantId: string;
  storeId: string | null;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  stores: AnalyticsStoreRecord[];
  orders: AnalyticsOrderRecord[];
}): OwnerCabinetDashboardDto {
  const paidOrders = input.orders.filter((order) => toAmount(order.paidAmount) > 0);
  const revenue = paidOrders.reduce((sum, order) => sum + toAmount(order.paidAmount), 0);

  const revenueByStoreMap = new Map<
    string,
    {
      store: AnalyticsStoreRecord;
      revenue: number;
      paidOrders: number;
    }
  >();

  for (const store of input.stores) {
    revenueByStoreMap.set(store.id, {
      store,
      revenue: 0,
      paidOrders: 0
    });
  }

  const topProductsMap = new Map<
    string,
    {
      productId: string;
      productCode: string | null;
      productName: string;
      quantity: number;
      revenue: number;
    }
  >();

  const channelMap = new Map<OrderChannel, { paidOrders: number; revenue: number }>();

  for (const order of paidOrders) {
    const storeMetrics = revenueByStoreMap.get(order.storeId);
    if (storeMetrics) {
      storeMetrics.revenue += toAmount(order.paidAmount);
      storeMetrics.paidOrders += 1;
    }

    const channelMetrics = channelMap.get(order.channel) ?? { paidOrders: 0, revenue: 0 };
    channelMetrics.paidOrders += 1;
    channelMetrics.revenue += toAmount(order.paidAmount);
    channelMap.set(order.channel, channelMetrics);

    for (const item of order.items) {
      const snapshotProduct =
        item.snapshot.product && typeof item.snapshot.product === "object"
          ? (item.snapshot.product as Record<string, unknown>)
          : null;
      const productName =
        typeof snapshotProduct?.name === "string" ? snapshotProduct.name : "Unknown product";
      const productCode =
        typeof snapshotProduct?.code === "string" ? snapshotProduct.code : null;
      const current = topProductsMap.get(item.productId) ?? {
        productId: item.productId,
        productCode,
        productName,
        quantity: 0,
        revenue: 0
      };

      current.quantity += item.quantity;
      current.revenue += toAmount(item.lineTotal);
      if (!current.productCode && productCode) {
        current.productCode = productCode;
      }
      if (current.productName === "Unknown product" && productName !== "Unknown product") {
        current.productName = productName;
      }

      topProductsMap.set(item.productId, current);
    }
  }

  const cancelledOrders = input.orders.filter((order) => order.status === "CANCELLED");
  const refundsAndCancellations: AnalyticsRefundCancellationSummaryDto = {
    cancelledOrders: cancelledOrders.length,
    cancelledRevenue: toMoney(
      cancelledOrders.reduce((sum, order) => sum + toAmount(order.total), 0)
    ),
    pendingManualRefunds: cancelledOrders.filter(
      (order) => order.refundStatus === "PENDING_MANUAL"
    ).length,
    pendingManualRefundAmount: toMoney(
      cancelledOrders
        .filter((order) => order.refundStatus === "PENDING_MANUAL")
        .reduce((sum, order) => sum + toAmount(order.total), 0)
    )
  };

  const revenueByStore: AnalyticsRevenueByStoreDto[] = Array.from(revenueByStoreMap.values())
    .map(({ store, revenue: storeRevenue, paidOrders: storePaidOrders }) => ({
      storeId: store.id,
      storeCode: store.code,
      storeName: store.name,
      paidOrders: storePaidOrders,
      revenue: toMoney(storeRevenue),
      averageOrderValue: toMoney(storePaidOrders ? storeRevenue / storePaidOrders : 0)
    }))
    .sort((left, right) => Number(right.revenue) - Number(left.revenue));

  const topProducts: AnalyticsTopProductDto[] = Array.from(topProductsMap.values())
    .sort((left, right) => {
      if (right.quantity !== left.quantity) {
        return right.quantity - left.quantity;
      }
      return right.revenue - left.revenue;
    })
    .slice(0, 10)
    .map((product) => ({
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      quantity: product.quantity,
      revenue: toMoney(product.revenue)
    }));

  const channelSummary: AnalyticsChannelSummaryDto[] = Array.from(channelMap.entries())
    .map(([channel, metrics]) => ({
      channel,
      paidOrders: metrics.paidOrders,
      revenue: toMoney(metrics.revenue)
    }))
    .sort((left, right) => Number(right.revenue) - Number(left.revenue));

  return {
    tenantId: input.tenantId,
    storeId: input.storeId,
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    generatedAt: new Date().toISOString(),
    dataSource: "LIVE",
    snapshotId: null,
    currency: input.currency,
    totalOrders: input.orders.length,
    paidOrders: paidOrders.length,
    revenue: toMoney(revenue),
    averageOrderValue: toMoney(paidOrders.length ? revenue / paidOrders.length : 0),
    topProducts,
    revenueByStore,
    channelSummary,
    refundsAndCancellations
  };
}
