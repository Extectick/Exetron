import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  CreateStoreRequest,
  ListResponse,
  StoreDto,
  UpdateStoreRequest
} from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";

class StoreQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class CreateStoreDto implements CreateStoreRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiProperty({ example: "novosibirsk-1" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty({ example: "Novosibirsk Flagship" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "Asia/Novosibirsk" })
  @IsString()
  timezone!: string;
}

class UpdateStoreDto implements UpdateStoreRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

@Injectable()
class StoresService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  list(
    context: RequestContext,
    query: StoreQueryDto
  ): Promise<ListResponse<StoreDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const stores = await tx.store.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(this.accessControl.storeFilter(context)
            ? { id: this.accessControl.storeFilter(context) }
            : {})
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: stores.map((store) => ({
          id: store.id,
          tenantId: store.tenantId,
          brandId: store.brandId,
          code: store.code,
          name: store.name,
          timezone: store.timezone,
          status: store.status,
          createdAt: store.createdAt.toISOString(),
          updatedAt: store.updatedAt.toISOString()
        })),
        total: stores.length
      };
    });
  }

  create(context: RequestContext, dto: CreateStoreDto): Promise<StoreDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      if (dto.brandId) {
        const brand = await tx.brand.findUniqueOrThrow({
          where: { id: dto.brandId }
        });
        this.accessControl.resolveTenantId(context, brand.tenantId);
      }

      const store = await tx.store.create({
        data: {
          tenantId,
          brandId: dto.brandId ?? null,
          code: dto.code,
          name: dto.name,
          timezone: dto.timezone
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        storeId: store.id,
        actorType: "USER",
        actorId: context.userId,
        action: "store.created",
        entityType: "store",
        entityId: store.id,
        payload: { code: store.code, name: store.name }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "store.created",
        aggregate: "store",
        aggregateId: store.id,
        payload: { code: store.code, name: store.name }
      });

      return {
        id: store.id,
        tenantId: store.tenantId,
        brandId: store.brandId,
        code: store.code,
        name: store.name,
        timezone: store.timezone,
        status: store.status,
        createdAt: store.createdAt.toISOString(),
        updatedAt: store.updatedAt.toISOString()
      };
    });
  }

  update(
    context: RequestContext,
    storeId: string,
    dto: UpdateStoreDto
  ): Promise<StoreDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.store.findUniqueOrThrow({
        where: { id: storeId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);
      this.accessControl.enforceStoreAccess(context, current.id);

      const store = await tx.store.update({
        where: { id: storeId },
        data: {
          ...(dto.brandId !== undefined ? { brandId: dto.brandId } : {}),
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.timezone ? { timezone: dto.timezone } : {}),
          ...(dto.status ? { status: dto.status } : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: store.tenantId,
        storeId: store.id,
        actorType: "USER",
        actorId: context.userId,
        action: "store.updated",
        entityType: "store",
        entityId: store.id,
        payload: dto as Record<string, unknown>
      });

      return {
        id: store.id,
        tenantId: store.tenantId,
        brandId: store.brandId,
        code: store.code,
        name: store.name,
        timezone: store.timezone,
        status: store.status,
        createdAt: store.createdAt.toISOString(),
        updatedAt: store.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("stores")
@Controller("stores")
class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Permissions("stores.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: StoreQueryDto
  ): Promise<ListResponse<StoreDto>> {
    return this.storesService.list(context, query);
  }

  @Post()
  @Permissions("stores.write")
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateStoreDto
  ): Promise<StoreDto> {
    return this.storesService.create(context, dto);
  }

  @Patch(":id")
  @Permissions("stores.write")
  update(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateStoreDto
  ): Promise<StoreDto> {
    return this.storesService.update(context, params.id, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [StoresController],
  providers: [StoresService]
})
export class StoresModule {}
