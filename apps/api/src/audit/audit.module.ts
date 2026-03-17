import { Module, Injectable } from "@nestjs/common";
import { ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import {
  Controller,
  Get,
  Query
} from "@nestjs/common";
import { IsOptional, IsString, IsUUID } from "class-validator";
import type { AuditLogDto, ListResponse } from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import type { Prisma } from "@exetron/database";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { AccessControlService } from "../common/access-control.service";
import { DatabaseContextService } from "../database/database-context.service";

export interface AuditWriteInput {
  tenantId?: string | null;
  storeId?: string | null;
  actorType: "USER" | "SYSTEM" | "DEVICE";
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown> | null;
}

class AuditQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService
  ) {}

  async list(
    context: RequestContext,
    query: AuditQueryDto
  ): Promise<ListResponse<AuditLogDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantWhere = this.accessControl.tenantWhere(context, query.tenantId);
      const allowedStores = this.accessControl.storeFilter(context);
      const storeFilter =
        query.storeId ??
        (context.scope === "platform_admin" ? undefined : context.storeIds[0]);

      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const logs = await tx.auditLog.findMany({
        where: {
          ...tenantWhere,
          ...(query.storeId
            ? { storeId: query.storeId }
            : allowedStores
              ? {
                  OR: [
                    { storeId: null },
                    { storeId: allowedStores }
                  ]
                }
              : {}),
          ...(query.action ? { action: query.action } : {})
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 100
      });

      const filteredLogs =
        storeFilter && !query.storeId && context.scope !== "platform_admin"
          ? logs.filter((log) => !log.storeId || context.storeIds.includes(log.storeId))
          : logs;

      return {
        items: filteredLogs.map((log) => ({
          id: log.id,
          tenantId: log.tenantId,
          storeId: log.storeId,
          actorType: log.actorType,
          actorId: log.actorId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          payload:
            log.payload && typeof log.payload === "object"
              ? (log.payload as Record<string, unknown>)
              : null,
          createdAt: log.createdAt.toISOString()
        })),
        total: filteredLogs.length
      };
    });
  }

  recordTx(tx: Prisma.TransactionClient, input: AuditWriteInput): Promise<void> {
    return tx.auditLog
      .create({
        data: {
          tenantId: input.tenantId ?? null,
          storeId: input.storeId ?? null,
          actorType: input.actorType,
          actorId: input.actorId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          payload: input.payload
            ? (input.payload as Prisma.InputJsonObject)
            : undefined
        }
      })
      .then(() => undefined);
  }
}

@ApiTags("audit")
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions("audit.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: AuditQueryDto
  ): Promise<ListResponse<AuditLogDto>> {
    return this.auditService.list(context, query);
  }
}

@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}
