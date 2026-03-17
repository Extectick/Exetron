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
  BrandDto,
  CreateBrandRequest,
  ListResponse,
  UpdateBrandRequest
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

class BrandQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class CreateBrandDto implements CreateBrandRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: "main-brand" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty({ example: "Main Brand" })
  @IsString()
  name!: string;
}

class UpdateBrandDto implements UpdateBrandRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "ARCHIVED";
}

@Injectable()
class BrandsService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  list(
    context: RequestContext,
    query: BrandQueryDto
  ): Promise<ListResponse<BrandDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const brands = await tx.brand.findMany({
        where: this.accessControl.tenantWhere(context, query.tenantId),
        orderBy: { createdAt: "desc" }
      });

      return {
        items: brands.map((brand) => ({
          id: brand.id,
          tenantId: brand.tenantId,
          code: brand.code,
          name: brand.name,
          status: brand.status,
          createdAt: brand.createdAt.toISOString(),
          updatedAt: brand.updatedAt.toISOString()
        })),
        total: brands.length
      };
    });
  }

  create(context: RequestContext, dto: CreateBrandDto): Promise<BrandDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const brand = await tx.brand.create({
        data: {
          tenantId,
          code: dto.code,
          name: dto.name
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "brand.created",
        entityType: "brand",
        entityId: brand.id,
        payload: { code: brand.code, name: brand.name }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "brand.created",
        aggregate: "brand",
        aggregateId: brand.id,
        payload: { code: brand.code, name: brand.name }
      });

      return {
        id: brand.id,
        tenantId: brand.tenantId,
        code: brand.code,
        name: brand.name,
        status: brand.status,
        createdAt: brand.createdAt.toISOString(),
        updatedAt: brand.updatedAt.toISOString()
      };
    });
  }

  update(
    context: RequestContext,
    brandId: string,
    dto: UpdateBrandDto
  ): Promise<BrandDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.brand.findUniqueOrThrow({
        where: { id: brandId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);

      const brand = await tx.brand.update({
        where: { id: brandId },
        data: {
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.status ? { status: dto.status } : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: brand.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "brand.updated",
        entityType: "brand",
        entityId: brand.id,
        payload: dto as Record<string, unknown>
      });

      return {
        id: brand.id,
        tenantId: brand.tenantId,
        code: brand.code,
        name: brand.name,
        status: brand.status,
        createdAt: brand.createdAt.toISOString(),
        updatedAt: brand.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("brands")
@Controller("brands")
class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Permissions("brands.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: BrandQueryDto
  ): Promise<ListResponse<BrandDto>> {
    return this.brandsService.list(context, query);
  }

  @Post()
  @Permissions("brands.write")
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateBrandDto
  ): Promise<BrandDto> {
    return this.brandsService.create(context, dto);
  }

  @Patch(":id")
  @Permissions("brands.write")
  update(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateBrandDto
  ): Promise<BrandDto> {
    return this.brandsService.update(context, params.id, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [BrandsController],
  providers: [BrandsService]
})
export class BrandsModule {}
