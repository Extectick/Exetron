import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Post,
  Query
} from "@nestjs/common";
import { ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import type {
  AnalyticsPrecomputeRunDto,
  AnalyticsSnapshotDto,
  CreateAnalyticsSnapshotRequest,
  CreateAnalyticsPrecomputeRequest,
  ListResponse,
  OwnerCabinetDashboardDto
} from "@exetron/contracts";
import type { Prisma } from "@exetron/database";
import {
  IsDateString,
  IsIn,
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

  @ApiPropertyOptional({ enum: ["LIVE", "PREFER_SNAPSHOT", "SNAPSHOT_ONLY"] })
  @IsOptional()
  @IsIn(["LIVE", "PREFER_SNAPSHOT", "SNAPSHOT_ONLY"])
  mode?: "LIVE" | "PREFER_SNAPSHOT" | "SNAPSHOT_ONLY";
}

class CreateAnalyticsSnapshotDto
  extends AnalyticsQueryDto
  implements CreateAnalyticsSnapshotRequest {}

class CreateAnalyticsPrecomputeDto
  extends CreateAnalyticsSnapshotDto
  implements CreateAnalyticsPrecomputeRequest {
  @ApiPropertyOptional({ enum: ["OWNER_DASHBOARD"] })
  @IsOptional()
  @IsIn(["OWNER_DASHBOARD"])
  kind?: "OWNER_DASHBOARD";
}

function buildAnalyticsArtifactKey(input: {
  kind: string;
  tenantId: string;
  storeId: string | null;
  periodStart: Date;
  periodEnd: Date;
}): string {
  return [
    input.kind.toLowerCase(),
    input.tenantId,
    input.storeId ?? "all-stores",
    input.periodStart.toISOString(),
    input.periodEnd.toISOString()
  ].join(":");
}

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
    artifactKey: buildAnalyticsArtifactKey({
      kind: snapshot.kind,
      tenantId: snapshot.tenantId,
      storeId: snapshot.storeId,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd
    }),
    artifactStatus: "READY",
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
      const snapshot =
        query.mode && query.mode !== "LIVE"
          ? await this.findSnapshotForScope(tx, scope)
          : null;

      if (query.mode === "SNAPSHOT_ONLY") {
        if (!snapshot) {
          throw new NotFoundException("Precomputed analytics snapshot was not found for this scope.");
        }

        return this.mapDashboardFromSnapshot(snapshot);
      }

      if (query.mode === "PREFER_SNAPSHOT" && snapshot) {
        return this.mapDashboardFromSnapshot(snapshot);
      }

      return this.buildLiveDashboardTx(tx, scope);
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
      const snapshot = await this.createOwnerDashboardSnapshotTx(tx, context, scope);

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

  async createPrecomputeRun(
    context: RequestContext,
    dto: CreateAnalyticsPrecomputeDto
  ): Promise<AnalyticsPrecomputeRunDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveAnalyticsScope(tx, context, dto);
      const artifactKey = buildAnalyticsArtifactKey({
        kind: dto.kind ?? "OWNER_DASHBOARD",
        tenantId: scope.tenantId,
        storeId: scope.storeId,
        periodStart: scope.periodStart,
        periodEnd: scope.periodEnd
      });

      await this.audit.recordTx(tx, {
        tenantId: scope.tenantId,
        storeId: scope.storeId,
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        action: "analytics.precompute_requested",
        entityType: "analytics_artifact",
        entityId: artifactKey,
        payload: {
          kind: dto.kind ?? "OWNER_DASHBOARD",
          executionMode: "INLINE"
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: scope.tenantId,
        eventName: "analytics.precompute_requested",
        aggregate: "analytics_artifact",
        aggregateId: artifactKey,
        payload: {
          kind: dto.kind ?? "OWNER_DASHBOARD",
          storeId: scope.storeId,
          executionMode: "INLINE"
        }
      });

      const snapshot = await this.createOwnerDashboardSnapshotTx(tx, context, scope);

      await this.audit.recordTx(tx, {
        tenantId: snapshot.tenantId,
        storeId: snapshot.storeId,
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        action: "analytics.precompute_completed",
        entityType: "analytics_artifact",
        entityId: artifactKey,
        payload: {
          snapshotId: snapshot.id,
          kind: snapshot.kind
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: snapshot.tenantId,
        eventName: "analytics.precompute_completed",
        aggregate: "analytics_artifact",
        aggregateId: artifactKey,
        payload: {
          snapshotId: snapshot.id,
          kind: snapshot.kind,
          storeId: snapshot.storeId
        }
      });

      return {
        kind: "OWNER_DASHBOARD",
        executionMode: "INLINE",
        status: "COMPLETED",
        generatedAt: snapshot.createdAt.toISOString(),
        artifactKey,
        snapshot: mapAnalyticsSnapshot(snapshot)
      };
    });
  }

  private async buildLiveDashboardTx(
    tx: Prisma.TransactionClient,
    scope: {
      tenantId: string;
      storeId: string | null;
      stores: Array<{ id: string; code: string; name: string }>;
      periodStart: Date;
      periodEnd: Date;
    }
  ): Promise<OwnerCabinetDashboardDto> {
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

    return {
      ...buildOwnerCabinetDashboard({
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
      }),
      dataSource: "LIVE",
      snapshotId: null,
      generatedAt: new Date().toISOString()
    };
  }

  private async createOwnerDashboardSnapshotTx(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    scope: {
      tenantId: string;
      storeId: string | null;
      stores: Array<{ id: string; code: string; name: string }>;
      periodStart: Date;
      periodEnd: Date;
    }
  ) {
    const dashboard = await this.buildLiveDashboardTx(tx, scope);
    return tx.analyticsSnapshot.create({
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
  }

  private async findSnapshotForScope(
    tx: Prisma.TransactionClient,
    scope: {
      tenantId: string;
      storeId: string | null;
      periodStart: Date;
      periodEnd: Date;
    }
  ) {
    return tx.analyticsSnapshot.findFirst({
      where: {
        tenantId: scope.tenantId,
        storeId: scope.storeId,
        kind: "OWNER_DASHBOARD",
        periodStart: scope.periodStart,
        periodEnd: scope.periodEnd
      },
      orderBy: { createdAt: "desc" }
    });
  }

  private mapDashboardFromSnapshot(snapshot: {
    id: string;
    payload: Prisma.JsonValue;
    createdAt: Date;
  }): OwnerCabinetDashboardDto {
    if (!snapshot.payload || typeof snapshot.payload !== "object") {
      throw new BadRequestException("Analytics snapshot payload is invalid.");
    }

    const payload = snapshot.payload as unknown as OwnerCabinetDashboardDto;

    return {
      ...payload,
      dataSource: "SNAPSHOT",
      snapshotId: snapshot.id,
      generatedAt: snapshot.createdAt.toISOString()
    };
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

  @Post("precompute")
  @Permissions("analytics.write")
  createPrecomputeRun(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateAnalyticsPrecomputeDto
  ): Promise<AnalyticsPrecomputeRunDto> {
    return this.analyticsService.createPrecomputeRun(context, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}
