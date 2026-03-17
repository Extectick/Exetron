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
  CreateUserRequest,
  ListResponse,
  UpdateUserRequest,
  UserDto
} from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { PasswordService } from "../auth/password.service";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";

class UsersQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class CreateUserDto implements CreateUserRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  tenantId?: string | null;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPlatformAdmin?: boolean;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  storeIds?: string[];
}

class UpdateUserDto implements UpdateUserRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INVITED", "DISABLED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "INVITED", "DISABLED"])
  status?: "ACTIVE" | "INVITED" | "DISABLED";

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  storeIds?: string[];
}

@Injectable()
class UsersService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly passwordService: PasswordService
  ) {}

  list(
    context: RequestContext,
    query: UsersQueryDto
  ): Promise<ListResponse<UserDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const users = await tx.user.findMany({
        where: this.accessControl.tenantWhere(context, query.tenantId),
        include: {
          userRoles: true,
          storeAccess: true
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: users.map((user) => ({
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          isPlatformAdmin: user.isPlatformAdmin,
          roleIds: user.userRoles.map((link) => link.roleId),
          storeIds: user.storeAccess.map((link) => link.storeId),
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        })),
        total: users.length
      };
    });
  }

  create(context: RequestContext, dto: CreateUserDto): Promise<UserDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = dto.isPlatformAdmin
        ? null
        : this.accessControl.resolveTenantId(context, dto.tenantId ?? context.tenantId);

      if (dto.isPlatformAdmin) {
        this.accessControl.requirePlatformAdmin(context);
      }

      const passwordHash = await this.passwordService.hash(dto.password);
      const roles =
        dto.roleIds && dto.roleIds.length
          ? await tx.role.findMany({
              where: {
                id: { in: dto.roleIds }
              }
            })
          : [];
      const stores =
        dto.storeIds && dto.storeIds.length
          ? await tx.store.findMany({
              where: {
                id: { in: dto.storeIds }
              }
            })
          : [];

      roles.forEach((role) => this.accessControl.resolveTenantId(context, role.tenantId));
      stores.forEach((store) => this.accessControl.resolveTenantId(context, store.tenantId));

      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          isPlatformAdmin: dto.isPlatformAdmin ?? false,
          userRoles: dto.roleIds?.length
            ? {
                createMany: {
                  data: dto.roleIds.map((roleId) => ({ roleId }))
                }
              }
            : undefined,
          storeAccess: dto.storeIds?.length
            ? {
                createMany: {
                  data: dto.storeIds.map((storeId) => ({ storeId }))
                }
              }
            : undefined
        },
        include: {
          userRoles: true,
          storeAccess: true
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: tenantId ?? null,
        actorType: "USER",
        actorId: context.userId,
        action: "user.created",
        entityType: "user",
        entityId: user.id,
        payload: {
          email: user.email,
          roleIds: user.userRoles.map((link) => link.roleId)
        }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "user.created",
        aggregate: "user",
        aggregateId: user.id,
        payload: { email: user.email }
      });

      return {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        isPlatformAdmin: user.isPlatformAdmin,
        roleIds: user.userRoles.map((link) => link.roleId),
        storeIds: user.storeAccess.map((link) => link.storeId),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    });
  }

  update(
    context: RequestContext,
    userId: string,
    dto: UpdateUserDto
  ): Promise<UserDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          userRoles: true,
          storeAccess: true
        }
      });

      if (current.isPlatformAdmin && context.scope !== "platform_admin") {
        this.accessControl.requirePlatformAdmin(context);
      }

      if (current.tenantId) {
        this.accessControl.resolveTenantId(context, current.tenantId);
      }

      const passwordHash = dto.password
        ? await this.passwordService.hash(dto.password)
        : undefined;

      const roleData = dto.roleIds
        ? {
            deleteMany: {},
            createMany: {
              data: dto.roleIds.map((roleId) => ({ roleId }))
            }
          }
        : undefined;

      const storeData = dto.storeIds
        ? {
            deleteMany: {},
            createMany: {
              data: dto.storeIds.map((storeId) => ({ storeId }))
            }
          }
        : undefined;

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.firstName ? { firstName: dto.firstName } : {}),
          ...(dto.lastName ? { lastName: dto.lastName } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          ...(roleData ? { userRoles: roleData } : {}),
          ...(storeData ? { storeAccess: storeData } : {})
        },
        include: {
          userRoles: true,
          storeAccess: true
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: user.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "user.updated",
        entityType: "user",
        entityId: user.id,
        payload: {
          status: dto.status,
          roleIds: dto.roleIds,
          storeIds: dto.storeIds
        }
      });

      return {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        isPlatformAdmin: user.isPlatformAdmin,
        roleIds: user.userRoles.map((link) => link.roleId),
        storeIds: user.storeAccess.map((link) => link.storeId),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("users")
@Controller("users")
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions("users.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: UsersQueryDto
  ): Promise<ListResponse<UserDto>> {
    return this.usersService.list(context, query);
  }

  @Post()
  @Permissions("users.write")
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateUserDto
  ): Promise<UserDto> {
    return this.usersService.create(context, dto);
  }

  @Patch(":id")
  @Permissions("users.write")
  update(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateUserDto
  ): Promise<UserDto> {
    return this.usersService.update(context, params.id, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [UsersController],
  providers: [UsersService, PasswordService]
})
export class UsersModule {}
