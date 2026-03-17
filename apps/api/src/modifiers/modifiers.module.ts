import {
  BadRequestException,
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
  CreateModifierGroupRequest,
  CreateModifierOptionRequest,
  ListResponse,
  ModifierGroupDto,
  ModifierOptionDto,
  UpdateModifierGroupRequest,
  UpdateModifierOptionRequest
} from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { decimalToString } from "../common/catalog-helpers";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";

class ModifierGroupsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class ModifierOptionParamsDto extends IdParamDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  optionId!: string;
}

class CreateModifierGroupDto implements CreateModifierGroupRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: "burger-addons" })
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

  @ApiPropertyOptional({ enum: ["SINGLE", "MULTIPLE"] })
  @IsOptional()
  @IsIn(["SINGLE", "MULTIPLE"])
  selectionMode?: "SINGLE" | "MULTIPLE";

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSelection?: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSelection?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

class UpdateModifierGroupDto implements UpdateModifierGroupRequest {
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

  @ApiPropertyOptional({ enum: ["SINGLE", "MULTIPLE"] })
  @IsOptional()
  @IsIn(["SINGLE", "MULTIPLE"])
  selectionMode?: "SINGLE" | "MULTIPLE";

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSelection?: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSelection?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ enum: ["ACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "ARCHIVED";
}

class CreateModifierOptionDto implements CreateModifierOptionRequest {
  @ApiProperty({ example: "extra-cheese" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: "1.50" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  priceDelta?: string;
}

class UpdateModifierOptionDto implements UpdateModifierOptionRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "1.50" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  priceDelta?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "ARCHIVED";
}

function mapModifierOption(option: {
  id: string;
  tenantId: string;
  groupId: string;
  code: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  priceDelta: { toFixed: (digits?: number) => string };
  createdAt: Date;
  updatedAt: Date;
}): ModifierOptionDto {
  return {
    id: option.id,
    tenantId: option.tenantId,
    groupId: option.groupId,
    code: option.code,
    name: option.name,
    status: option.status,
    priceDelta: decimalToString(option.priceDelta) ?? "0.00",
    createdAt: option.createdAt.toISOString(),
    updatedAt: option.updatedAt.toISOString()
  };
}

function mapModifierGroup(group: {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  selectionMode: "SINGLE" | "MULTIPLE";
  minSelection: number;
  maxSelection: number | null;
  required: boolean;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
  options: Array<{
    id: string;
    tenantId: string;
    groupId: string;
    code: string;
    name: string;
    status: "ACTIVE" | "ARCHIVED";
    priceDelta: { toFixed: (digits?: number) => string };
    createdAt: Date;
    updatedAt: Date;
  }>;
}): ModifierGroupDto {
  return {
    id: group.id,
    tenantId: group.tenantId,
    code: group.code,
    name: group.name,
    description: group.description,
    selectionMode: group.selectionMode,
    minSelection: group.minSelection,
    maxSelection: group.maxSelection,
    required: group.required,
    status: group.status,
    options: group.options.map(mapModifierOption),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString()
  };
}

@Injectable()
class ModifiersService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  listGroups(
    context: RequestContext,
    query: ModifierGroupsQueryDto
  ): Promise<ListResponse<ModifierGroupDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const groups = await tx.modifierGroup.findMany({
        where: this.accessControl.tenantWhere(context, query.tenantId),
        include: {
          options: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: groups.map(mapModifierGroup),
        total: groups.length
      };
    });
  }

  async listOptions(
    context: RequestContext,
    groupId: string
  ): Promise<ListResponse<ModifierOptionDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const group = await tx.modifierGroup.findUniqueOrThrow({
        where: { id: groupId }
      });
      this.accessControl.resolveTenantId(context, group.tenantId);

      const options = await tx.modifierOption.findMany({
        where: { groupId },
        orderBy: { createdAt: "asc" }
      });

      return {
        items: options.map(mapModifierOption),
        total: options.length
      };
    });
  }

  createGroup(
    context: RequestContext,
    dto: CreateModifierGroupDto
  ): Promise<ModifierGroupDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const group = await tx.modifierGroup.create({
        data: {
          tenantId,
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          selectionMode: dto.selectionMode ?? "SINGLE",
          minSelection: dto.minSelection ?? 0,
          maxSelection: dto.maxSelection ?? null,
          required: dto.required ?? false
        },
        include: {
          options: true
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "modifier_group.created",
        entityType: "modifier_group",
        entityId: group.id,
        payload: { code: group.code }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "modifier_group.created",
        aggregate: "modifier_group",
        aggregateId: group.id,
        payload: { code: group.code }
      });

      return mapModifierGroup(group);
    });
  }

  updateGroup(
    context: RequestContext,
    groupId: string,
    dto: UpdateModifierGroupDto
  ): Promise<ModifierGroupDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.modifierGroup.findUniqueOrThrow({
        where: { id: groupId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);

      const group = await tx.modifierGroup.update({
        where: { id: groupId },
        data: {
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.selectionMode ? { selectionMode: dto.selectionMode } : {}),
          ...(dto.minSelection !== undefined ? { minSelection: dto.minSelection } : {}),
          ...(dto.maxSelection !== undefined ? { maxSelection: dto.maxSelection } : {}),
          ...(dto.required !== undefined ? { required: dto.required } : {}),
          ...(dto.status ? { status: dto.status } : {})
        },
        include: {
          options: true
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: group.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "modifier_group.updated",
        entityType: "modifier_group",
        entityId: group.id,
        payload: dto as Record<string, unknown>
      });

      return mapModifierGroup(group);
    });
  }

  createOption(
    context: RequestContext,
    groupId: string,
    dto: CreateModifierOptionDto
  ): Promise<ModifierOptionDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const group = await tx.modifierGroup.findUniqueOrThrow({
        where: { id: groupId }
      });
      this.accessControl.resolveTenantId(context, group.tenantId);

      const option = await tx.modifierOption.create({
        data: {
          tenantId: group.tenantId,
          groupId,
          code: dto.code,
          name: dto.name,
          priceDelta: dto.priceDelta ?? "0.00"
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: option.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "modifier_option.created",
        entityType: "modifier_option",
        entityId: option.id,
        payload: { code: option.code }
      });

      await this.domainEvents.record(tx, {
        tenantId: option.tenantId,
        eventName: "modifier_option.created",
        aggregate: "modifier_option",
        aggregateId: option.id,
        payload: { code: option.code }
      });

      return mapModifierOption(option);
    });
  }

  updateOption(
    context: RequestContext,
    groupId: string,
    optionId: string,
    dto: UpdateModifierOptionDto
  ): Promise<ModifierOptionDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const option = await tx.modifierOption.findUniqueOrThrow({
        where: { id: optionId }
      });
      this.accessControl.resolveTenantId(context, option.tenantId);

      if (option.groupId !== groupId) {
        throw new BadRequestException(
          "Modifier option does not belong to the requested group."
        );
      }

      const updated = await tx.modifierOption.update({
        where: { id: optionId },
        data: {
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.priceDelta !== undefined ? { priceDelta: dto.priceDelta } : {}),
          ...(dto.status ? { status: dto.status } : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: updated.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "modifier_option.updated",
        entityType: "modifier_option",
        entityId: updated.id,
        payload: dto as Record<string, unknown>
      });

      return mapModifierOption(updated);
    });
  }
}

@ApiTags("modifier-groups")
@Controller("modifier-groups")
class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  @Get()
  @Permissions("modifiers.read")
  listGroups(
    @CurrentContext() context: RequestContext,
    @Query() query: ModifierGroupsQueryDto
  ): Promise<ListResponse<ModifierGroupDto>> {
    return this.modifiersService.listGroups(context, query);
  }

  @Post()
  @Permissions("modifiers.write")
  createGroup(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateModifierGroupDto
  ): Promise<ModifierGroupDto> {
    return this.modifiersService.createGroup(context, dto);
  }

  @Patch(":id")
  @Permissions("modifiers.write")
  updateGroup(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateModifierGroupDto
  ): Promise<ModifierGroupDto> {
    return this.modifiersService.updateGroup(context, params.id, dto);
  }

  @Get(":id/options")
  @Permissions("modifiers.read")
  listOptions(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<ListResponse<ModifierOptionDto>> {
    return this.modifiersService.listOptions(context, params.id);
  }

  @Post(":id/options")
  @Permissions("modifiers.write")
  createOption(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: CreateModifierOptionDto
  ): Promise<ModifierOptionDto> {
    return this.modifiersService.createOption(context, params.id, dto);
  }

  @Patch(":id/options/:optionId")
  @Permissions("modifiers.write")
  updateOption(
    @CurrentContext() context: RequestContext,
    @Param() params: ModifierOptionParamsDto,
    @Body() dto: UpdateModifierOptionDto
  ): Promise<ModifierOptionDto> {
    return this.modifiersService.updateOption(context, params.id, params.optionId, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [ModifiersController],
  providers: [ModifiersService]
})
export class ModifiersModule {}
