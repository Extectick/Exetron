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
  CreateRoleRequest,
  ListResponse,
  PermissionDto,
  RoleDto,
  UpdateRoleRequest
} from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import {
  ArrayNotEmpty,
  IsArray,
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

class RolesQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class CreateRoleDto implements CreateRoleRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: "tenant-admin" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  key!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionKeys!: string[];
}

class UpdateRoleDto implements UpdateRoleRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];
}

@Injectable()
class RolesService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  list(
    context: RequestContext,
    query: RolesQueryDto
  ): Promise<ListResponse<RoleDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const roles = await tx.role.findMany({
        where: this.accessControl.tenantWhere(context, query.tenantId),
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: roles.map((role) => ({
          id: role.id,
          tenantId: role.tenantId,
          key: role.key,
          name: role.name,
          description: role.description,
          permissionKeys: role.permissions.map((link) => link.permission.key),
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString()
        })),
        total: roles.length
      };
    });
  }

  listPermissions(): Promise<ListResponse<PermissionDto>> {
    return this.dbContext.withRequestContext(null, async (tx) => {
      const permissions = await tx.permission.findMany({
        orderBy: { key: "asc" }
      });

      return {
        items: permissions.map((permission) => ({
          id: permission.id,
          key: permission.key,
          name: permission.name,
          description: permission.description
        })),
        total: permissions.length
      };
    });
  }

  create(context: RequestContext, dto: CreateRoleDto): Promise<RoleDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const permissions = await tx.permission.findMany({
        where: {
          key: {
            in: dto.permissionKeys
          }
        }
      });

      const role = await tx.role.create({
        data: {
          tenantId,
          key: dto.key,
          name: dto.name,
          description: dto.description ?? null,
          permissions: {
            createMany: {
              data: permissions.map((permission) => ({
                permissionId: permission.id
              }))
            }
          }
        },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "role.created",
        entityType: "role",
        entityId: role.id,
        payload: { key: role.key, permissionKeys: dto.permissionKeys }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "role.created",
        aggregate: "role",
        aggregateId: role.id,
        payload: { key: role.key }
      });

      return {
        id: role.id,
        tenantId: role.tenantId,
        key: role.key,
        name: role.name,
        description: role.description,
        permissionKeys: role.permissions.map((link) => link.permission.key),
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString()
      };
    });
  }

  update(
    context: RequestContext,
    roleId: string,
    dto: UpdateRoleDto
  ): Promise<RoleDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.role.findUniqueOrThrow({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);

      const permissions = dto.permissionKeys
        ? await tx.permission.findMany({
            where: {
              key: {
                in: dto.permissionKeys
              }
            }
          })
        : [];

      const role = await tx.role.update({
        where: { id: roleId },
        data: {
          ...(dto.key ? { key: dto.key } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.permissionKeys
            ? {
                permissions: {
                  deleteMany: {},
                  createMany: {
                    data: permissions.map((permission) => ({
                      permissionId: permission.id
                    }))
                  }
                }
              }
            : {})
        },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: role.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "role.updated",
        entityType: "role",
        entityId: role.id,
        payload: dto as Record<string, unknown>
      });

      return {
        id: role.id,
        tenantId: role.tenantId,
        key: role.key,
        name: role.name,
        description: role.description,
        permissionKeys: role.permissions.map((link) => link.permission.key),
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("roles")
@Controller()
class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("roles")
  @Permissions("roles.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: RolesQueryDto
  ): Promise<ListResponse<RoleDto>> {
    return this.rolesService.list(context, query);
  }

  @Post("roles")
  @Permissions("roles.write")
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateRoleDto
  ): Promise<RoleDto> {
    return this.rolesService.create(context, dto);
  }

  @Patch("roles/:id")
  @Permissions("roles.write")
  update(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateRoleDto
  ): Promise<RoleDto> {
    return this.rolesService.update(context, params.id, dto);
  }

  @Get("permissions")
  @Permissions("roles.read")
  listPermissions(): Promise<ListResponse<PermissionDto>> {
    return this.rolesService.listPermissions();
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [RolesController],
  providers: [RolesService]
})
export class RolesModule {}
