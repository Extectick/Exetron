import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  CreateTenantRequest,
  ListResponse,
  TenantDto,
  UpdateTenantRequest
} from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import { IsEnum, IsOptional, IsString, Matches } from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";

class CreateTenantDto implements CreateTenantRequest {
  @ApiProperty({ example: "northwind" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({ example: "Northwind Foods" })
  @IsString()
  name!: string;
}

class UpdateTenantDto implements UpdateTenantRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "SUSPENDED", "ARCHIVED"] })
  @IsOptional()
  @IsEnum(["ACTIVE", "SUSPENDED", "ARCHIVED"])
  status?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
}

@Injectable()
class TenantsService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  list(context: RequestContext): Promise<ListResponse<TenantDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenants = await tx.tenant.findMany({
        where:
          context.scope === "platform_admin"
            ? undefined
            : { id: this.accessControl.resolveTenantId(context, context.tenantId) },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: tenants.map((tenant) => ({
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          status: tenant.status,
          createdAt: tenant.createdAt.toISOString(),
          updatedAt: tenant.updatedAt.toISOString()
        })),
        total: tenants.length
      };
    });
  }

  create(context: RequestContext, dto: CreateTenantDto): Promise<TenantDto> {
    this.accessControl.requirePlatformAdmin(context);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: dto.slug,
          name: dto.name
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: tenant.id,
        actorType: "USER",
        actorId: context.userId,
        action: "tenant.created",
        entityType: "tenant",
        entityId: tenant.id,
        payload: { slug: tenant.slug }
      });

      await this.domainEvents.record(tx, {
        tenantId: tenant.id,
        eventName: "tenant.created",
        aggregate: "tenant",
        aggregateId: tenant.id,
        payload: { slug: tenant.slug, name: tenant.name }
      });

      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString()
      };
    });
  }

  update(
    context: RequestContext,
    tenantId: string,
    dto: UpdateTenantDto
  ): Promise<TenantDto> {
    if (context.scope !== "platform_admin") {
      this.accessControl.resolveTenantId(context, tenantId);
    }

    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.status ? { status: dto.status } : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: tenant.id,
        actorType: "USER",
        actorId: context.userId,
        action: "tenant.updated",
        entityType: "tenant",
        entityId: tenant.id,
        payload: dto as Record<string, unknown>
      });

      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("tenants")
@Controller("tenants")
class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Permissions("tenants.read")
  list(@CurrentContext() context: RequestContext): Promise<ListResponse<TenantDto>> {
    return this.tenantsService.list(context);
  }

  @Post()
  @Permissions("tenants.write")
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateTenantDto
  ): Promise<TenantDto> {
    return this.tenantsService.create(context, dto);
  }

  @Patch(":id")
  @Permissions("tenants.write")
  update(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateTenantDto
  ): Promise<TenantDto> {
    return this.tenantsService.update(context, params.id, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [TenantsController],
  providers: [TenantsService]
})
export class TenantsModule {}
