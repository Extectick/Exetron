import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query
} from "@nestjs/common";
import { ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import type {
  AnalyticsSnapshotDto,
  CreateAnalyticsSnapshotRequest,
  ListResponse,
  OwnerCabinetDashboardDto
} from "@exetron/contracts";
import type { Prisma } from "@exetron/database";
import {
  IsDateString,
  IsOptional,
  IsUUID
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";
import { buildOwnerCabinetDashboard } from "./analytics-runtime.util";
import type { RequestContext } from "@exetron/types";

class AnalyticsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}

class CreateAnalyticsSnapshotDto
  extends AnalyticsQueryDto
  implements CreateAnalyticsSnapshotRequest {}

function mapAnalyticsSnapshot(snapshot: {
  id: string;
  tenantId: string;
  storeId: string | null;
  kind: string;
  periodStart: Date;
  periodEnd: Date;
  payload: Prisma.JsonValue;
  createdByUserId: string | null;
  createdAt: Date;
}): AnalyticsSnapshotDto {
  return {
    id: snapshot.id,
    tenantId: snapshot.tenantId,
    storeId: snapshot.storeId,
    kind: snapshot.kind as "OWNER_DASHBOARD",
    periodStart: snapshot.periodStart.toISOString(),
    periodEnd: snapshot.periodEnd.toISOString(),
    payload:
      snapshot.payload && typeof snapshot.payload === "object"
        ? (snapshot.payload as Record<string, unknown>)
        : {},
    createdByUserId: snapshot.createdByUserId,
    createdAt: snapshot.createdAt.toISOString()
  };
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  getOwnerCabinetDashboard(
    context: RequestContext,
    query: AnalyticsQueryDto
  ): Promise<OwnerCabinetDashboardDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveAnalyticsScope(tx, context, query);
      const currency = await this.resolveCurrency(tx, scope.tenantId, scope.storeId);

      const orders = await tx.order.findMany({
        where: {
          tenantId: scope.tenantId,
          storeId: { in: scope.stores.map((store) => store.id) },
          placedAt: {
            gte: scope.periodStart,
            lte: scope.periodEnd
          }
        },
        orderBy: { placedAt: "desc" },
        include: {
          items: {
            select: {
              productId: true,
              quantity: true,
              lineTotal: true,
              snapshot: true
            }
          },
          paymentIntents: {
            where: {
              status: "COMPLETED"
            },
            orderBy: { createdAt: "desc" },
            select: {
              paidAmount: true
            }
          }
        }
      });

      return buildOwnerCabinetDashboard({
        tenantId: scope.tenantId,
        storeId: scope.storeId,
        periodStart: scope.periodStart,
        periodEnd: scope.periodEnd,
        currency,
        stores: scope.stores,
        orders: orders.map((order) => ({
          id: order.id,
          storeId: order.storeId,
          channel: order.channel,
          status: order.status,
          refundStatus: order.refundStatus,
          total: order.total.toFixed(2),
          paidAmount: order.paymentIntents[0]?.paidAmount.toFixed(2) ?? "0.00",
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            lineTotal: item.lineTotal.toFixed(2),
            snapshot:
              item.snapshot && typeof item.snapshot === "object"
                ? (item.snapshot as Record<string, unknown>)
                : {}
          }))
        }))
      });
    });
  }

  listSnapshots(
    context: RequestContext,
    query: AnalyticsQueryDto
  ): Promise<ListResponse<AnalyticsSnapshotDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveAnalyticsScope(tx, context, query);
      const snapshots = await tx.analyticsSnapshot.findMany({
        where: {
          tenantId: scope.tenantId,
          ...(scope.storeId ? { storeId: scope.storeId } : {}),
          kind: "OWNER_DASHBOARD",
          periodStart: {
            gte: scope.periodStart
          },
          periodEnd: {
            lte: scope.periodEnd
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: snapshots.map(mapAnalyticsSnapshot),
        total: snapshots.length
      };
    });
  }

  async createSnapshot(
    context: RequestContext,
    dto: CreateAnalyticsSnapshotDto
  ): Promise<AnalyticsSnapshotDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveAnalyticsScope(tx, context, dto);
      const dashboard = await this.getOwnerCabinetDashboard(context, dto);
      const snapshot = await tx.analyticsSnapshot.create({
        data: {
          tenantId: scope.tenantId,
          storeId: scope.storeId,
          kind: "OWNER_DASHBOARD",
          periodStart: scope.periodStart,
          periodEnd: scope.periodEnd,
          payload: dashboard as unknown as Prisma.InputJsonObject,
          createdByUserId: context.scope === "device" ? null : context.userId
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: snapshot.tenantId,
        storeId: snapshot.storeId,
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        action: "analytics.snapshot_created",
        entityType: "analytics_snapshot",
        entityId: snapshot.id,
        payload: {
          kind: snapshot.kind,
          periodStart: snapshot.periodStart.toISOString(),
          periodEnd: snapshot.periodEnd.toISOString()
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: snapshot.tenantId,
        eventName: "analytics.snapshot_created",
        aggregate: "analytics_snapshot",
        aggregateId: snapshot.id,
        payload: {
          kind: snapshot.kind,
          storeId: snapshot.storeId
        }
      });

      return mapAnalyticsSnapshot(snapshot);
    });
  }

  private async resolveAnalyticsScope(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    query: AnalyticsQueryDto
  ): Promise<{
    tenantId: string;
    storeId: string | null;
    stores: Array<{ id: string; code: string; name: string }>;
    periodStart: Date;
    periodEnd: Date;
  }> {
    const tenantId = this.accessControl.resolveTenantId(
      context,
      query.tenantId ?? context.tenantId
    );

    if (query.storeId) {
      this.accessControl.enforceStoreAccess(context, query.storeId);
    }

    const periodEnd = query.periodEnd ? new Date(query.periodEnd) : new Date();
    const periodStart = query.periodStart
      ? new Date(query.periodStart)
      : new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new BadRequestException("Analytics period is invalid.");
    }

    if (periodStart >= periodEnd) {
      throw new BadRequestException("Analytics period start must be before end.");
    }

    const stores = await tx.store.findMany({
      where: {
        tenantId,
        ...(query.storeId ? { id: query.storeId } : {}),
        ...(this.accessControl.storeFilter(context) && !query.storeId
          ? { id: this.accessControl.storeFilter(context) }
          : {})
      },
      select: {
        id: true,
        code: true,
        name: true
      },
      orderBy: { name: "asc" }
    });

    return {
      tenantId,
      storeId: query.storeId ?? null,
      stores,
      periodStart,
      periodEnd
    };
  }

  private async resolveCurrency(
    tx: Prisma.TransactionClient,
    tenantId: string,
    storeId: string | null
  ): Promise<string> {
    if (storeId) {
      const storeCurrency = await tx.storeSetting.findFirst({
        where: {
          storeId,
          key: "currency"
        }
      });
      if (
        storeCurrency?.value &&
        typeof storeCurrency.value === "object" &&
        "default" in storeCurrency.value &&
        typeof storeCurrency.value.default === "string"
      ) {
        return storeCurrency.value.default;
      }
    }

    const tenantCurrency = await tx.tenantSetting.findFirst({
      where: {
        tenantId,
        key: "currency"
      }
    });

    if (
      tenantCurrency?.value &&
      typeof tenantCurrency.value === "object" &&
      "default" in tenantCurrency.value &&
      typeof tenantCurrency.value.default === "string"
    ) {
      return tenantCurrency.value.default;
    }

    return "RUB";
  }
}

@ApiTags("analytics")
@Controller("analytics")
class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("owner-cabinet")
  @Permissions("analytics.read")
  getOwnerCabinetDashboard(
    @CurrentContext() context: RequestContext,
    @Query() query: AnalyticsQueryDto
  ): Promise<OwnerCabinetDashboardDto> {
    return this.analyticsService.getOwnerCabinetDashboard(context, query);
  }

  @Get("snapshots")
  @Permissions("analytics.read")
  listSnapshots(
    @CurrentContext() context: RequestContext,
    @Query() query: AnalyticsQueryDto
  ): Promise<ListResponse<AnalyticsSnapshotDto>> {
    return this.analyticsService.listSnapshots(context, query);
  }

  @Post("snapshots")
  @Permissions("analytics.write")
  createSnapshot(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateAnalyticsSnapshotDto
  ): Promise<AnalyticsSnapshotDto> {
    return this.analyticsService.createSnapshot(context, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}
