import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Put,
  Query
} from "@nestjs/common";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  FeatureFlagDto,
  ListResponse,
  UpsertFeatureFlagRequest
} from "@exetron/contracts";
import type { Prisma } from "@exetron/database";
import type { RequestContext } from "@exetron/types";
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { DatabaseContextService } from "../database/database-context.service";

class FeatureFlagsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

class UpsertFeatureFlagDto implements UpsertFeatureFlagRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ enum: ["BOOLEAN", "PERCENTAGE"] })
  @IsOptional()
  @IsIn(["BOOLEAN", "PERCENTAGE"])
  kind?: "BOOLEAN" | "PERCENTAGE";

  @ApiPropertyOptional()
  @IsOptional()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown> | null;
}

@Injectable()
class FeatureFlagsService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService
  ) {}

  list(
    context: RequestContext,
    query: FeatureFlagsQueryDto
  ): Promise<ListResponse<FeatureFlagDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(
        context,
        query.tenantId ?? context.tenantId
      );

      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const flags = await tx.featureFlag.findMany({
        where: {
          tenantId,
          ...(query.storeId !== undefined ? { storeId: query.storeId } : {})
        },
        orderBy: { key: "asc" }
      });

      return {
        items: flags.map((flag) => ({
          id: flag.id,
          tenantId: flag.tenantId,
          storeId: flag.storeId,
          scopeKey: flag.scopeKey,
          key: flag.key,
          enabled: flag.enabled,
          kind: flag.kind,
          rolloutPercentage: flag.rolloutPercentage,
          rules:
            flag.rules && typeof flag.rules === "object"
              ? (flag.rules as Record<string, unknown>)
              : null,
          createdAt: flag.createdAt.toISOString(),
          updatedAt: flag.updatedAt.toISOString()
        })),
        total: flags.length
      };
    });
  }

  upsert(
    context: RequestContext,
    dto: UpsertFeatureFlagDto
  ): Promise<FeatureFlagDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    if (dto.storeId) {
      this.accessControl.enforceStoreAccess(context, dto.storeId);
    }

    return this.dbContext.withRequestContext(context, async (tx) => {
      const scopeKey = dto.storeId ? `store:${dto.storeId}` : `tenant:${tenantId}`;
      const flag = await tx.featureFlag.upsert({
        where: {
          scopeKey_key: {
            scopeKey,
            key: dto.key
          }
        },
        update: {
          enabled: dto.enabled,
          kind: dto.kind ?? "BOOLEAN",
          rolloutPercentage: dto.rolloutPercentage ?? null,
          rules: dto.rules
            ? (dto.rules as Prisma.InputJsonObject)
            : undefined
        },
        create: {
          tenantId,
          storeId: dto.storeId ?? null,
          scopeKey,
          key: dto.key,
          enabled: dto.enabled,
          kind: dto.kind ?? "BOOLEAN",
          rolloutPercentage: dto.rolloutPercentage ?? null,
          rules: dto.rules
            ? (dto.rules as Prisma.InputJsonObject)
            : undefined
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        storeId: dto.storeId ?? null,
        actorType: "USER",
        actorId: context.userId,
        action: "feature_flag.upserted",
        entityType: "feature_flag",
        entityId: flag.id,
        payload: {
          key: flag.key,
          scopeKey: flag.scopeKey,
          enabled: flag.enabled
        }
      });

      return {
        id: flag.id,
        tenantId: flag.tenantId,
        storeId: flag.storeId,
        scopeKey: flag.scopeKey,
        key: flag.key,
        enabled: flag.enabled,
        kind: flag.kind,
        rolloutPercentage: flag.rolloutPercentage,
        rules:
          flag.rules && typeof flag.rules === "object"
            ? (flag.rules as Record<string, unknown>)
            : null,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("feature-flags")
@Controller("feature-flags")
class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @Permissions("feature_flags.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: FeatureFlagsQueryDto
  ): Promise<ListResponse<FeatureFlagDto>> {
    return this.featureFlagsService.list(context, query);
  }

  @Put()
  @Permissions("feature_flags.write")
  upsert(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertFeatureFlagDto
  ): Promise<FeatureFlagDto> {
    return this.featureFlagsService.upsert(context, dto);
  }
}

@Module({
  imports: [AuditModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService]
})
export class FeatureFlagsModule {}
