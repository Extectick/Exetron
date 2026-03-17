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
  CategoryDto,
  CreateCategoryRequest,
  ListResponse,
  UpdateCategoryRequest
} from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import {
  IsIn,
  IsInt,
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

class CategoriesQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class CreateCategoryDto implements CreateCategoryRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty({ example: "burgers" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class UpdateCategoryDto implements UpdateCategoryRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

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
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ["ACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "ARCHIVED";
}

@Injectable()
class CategoriesService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  list(
    context: RequestContext,
    query: CategoriesQueryDto
  ): Promise<ListResponse<CategoryDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const categories = await tx.category.findMany({
        where: this.accessControl.tenantWhere(context, query.tenantId),
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      });

      return {
        items: categories.map((category) => ({
          id: category.id,
          tenantId: category.tenantId,
          parentId: category.parentId,
          code: category.code,
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          status: category.status,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString()
        })),
        total: categories.length
      };
    });
  }

  create(context: RequestContext, dto: CreateCategoryDto): Promise<CategoryDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      if (dto.parentId) {
        const parent = await tx.category.findUniqueOrThrow({
          where: { id: dto.parentId }
        });
        this.accessControl.resolveTenantId(context, parent.tenantId);
      }

      const category = await tx.category.create({
        data: {
          tenantId,
          parentId: dto.parentId ?? null,
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          sortOrder: dto.sortOrder ?? 0
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "category.created",
        entityType: "category",
        entityId: category.id,
        payload: { code: category.code, name: category.name }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "category.created",
        aggregate: "category",
        aggregateId: category.id,
        payload: { code: category.code }
      });

      return {
        id: category.id,
        tenantId: category.tenantId,
        parentId: category.parentId,
        code: category.code,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        status: category.status,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString()
      };
    });
  }

  update(
    context: RequestContext,
    categoryId: string,
    dto: UpdateCategoryDto
  ): Promise<CategoryDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.category.findUniqueOrThrow({
        where: { id: categoryId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);

      if (dto.parentId) {
        const parent = await tx.category.findUniqueOrThrow({
          where: { id: dto.parentId }
        });
        this.accessControl.resolveTenantId(context, parent.tenantId);
      }

      const category = await tx.category.update({
        where: { id: categoryId },
        data: {
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.status ? { status: dto.status } : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: category.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "category.updated",
        entityType: "category",
        entityId: category.id,
        payload: dto as Record<string, unknown>
      });

      return {
        id: category.id,
        tenantId: category.tenantId,
        parentId: category.parentId,
        code: category.code,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        status: category.status,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("categories")
@Controller("categories")
class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Permissions("categories.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: CategoriesQueryDto
  ): Promise<ListResponse<CategoryDto>> {
    return this.categoriesService.list(context, query);
  }

  @Post()
  @Permissions("categories.write")
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateCategoryDto
  ): Promise<CategoryDto> {
    return this.categoriesService.create(context, dto);
  }

  @Patch(":id")
  @Permissions("categories.write")
  update(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCategoryDto
  ): Promise<CategoryDto> {
    return this.categoriesService.update(context, params.id, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService]
})
export class CategoriesModule {}
