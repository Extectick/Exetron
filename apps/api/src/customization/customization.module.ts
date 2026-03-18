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
  BrandingConfigDto,
  CreateBrandingConfigRequest,
  CreateCustomizationRuleRequest,
  CustomizationEvaluationDto,
  CustomizationRuleDto,
  EvaluateCustomizationRequest,
  ListResponse,
  UpdateBrandingConfigRequest,
  UpdateCustomizationRuleRequest
} from "@exetron/contracts";
import { Prisma } from "@exetron/database";
import type {
  CustomizationChannel,
  CustomizationRuleStatus,
  RequestContext
} from "@exetron/types";
import { IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";
import {
  applyCustomizationRuleActions,
  buildCustomizationScopeKey,
  deepMergeRecord,
  matchesCustomizationRule,
  specificityScore,
  type CustomizationEvaluationInput,
  type EffectiveCustomizationState
} from "./customization-runtime.util";

const customizationChannels: CustomizationChannel[] = [
  "ADMIN",
  "POS",
  "KIOSK",
  "DELIVERY",
  "KITCHEN",
  "BOARD",
  "BACKOFFICE"
];

const customizationRuleStatuses: CustomizationRuleStatus[] = ["ACTIVE", "ARCHIVED"];

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mapBrandingConfig(config: {
  id: string;
  tenantId: string;
  storeId: string | null;
  channel: CustomizationChannel;
  pointKey: string | null;
  scopeKey: string;
  config: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): BrandingConfigDto {
  return {
    id: config.id,
    tenantId: config.tenantId,
    storeId: config.storeId,
    channel: config.channel,
    pointKey: config.pointKey,
    scopeKey: config.scopeKey,
    config: asRecord(config.config) ?? {},
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString()
  };
}

function mapCustomizationRule(rule: {
  id: string;
  tenantId: string;
  storeId: string | null;
  channel: CustomizationChannel | null;
  pointKey: string | null;
  key: string;
  description: string | null;
  status: CustomizationRuleStatus;
  priority: number;
  conditions: Prisma.JsonValue | null;
  actions: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): CustomizationRuleDto {
  return {
    id: rule.id,
    tenantId: rule.tenantId,
    storeId: rule.storeId,
    channel: rule.channel,
    pointKey: rule.pointKey,
    key: rule.key,
    description: rule.description,
    status: rule.status,
    priority: rule.priority,
    conditions: asRecord(rule.conditions),
    actions: asRecord(rule.actions) ?? {},
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString()
  };
}

class CustomizationScopedQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ enum: customizationChannels })
  @IsOptional()
  @IsIn(customizationChannels)
  channel?: CustomizationChannel;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pointKey?: string;
}

class CustomizationRulesQueryDto extends CustomizationScopedQueryDto {
  @ApiPropertyOptional({ enum: customizationRuleStatuses })
  @IsOptional()
  @IsIn(customizationRuleStatuses)
  status?: CustomizationRuleStatus;
}

class CreateBrandingConfigDto implements CreateBrandingConfigRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiProperty({ enum: customizationChannels })
  @IsIn(customizationChannels)
  channel!: CustomizationChannel;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pointKey?: string | null;

  @ApiProperty()
  @IsObject()
  config!: Record<string, unknown>;
}

class UpdateBrandingConfigDto implements UpdateBrandingConfigRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ enum: customizationChannels })
  @IsOptional()
  @IsIn(customizationChannels)
  channel?: CustomizationChannel;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pointKey?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

class CreateCustomizationRuleDto implements CreateCustomizationRuleRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ enum: customizationChannels, nullable: true })
  @IsOptional()
  @IsIn(customizationChannels)
  channel?: CustomizationChannel | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pointKey?: string | null;

  @ApiProperty()
  @IsString()
  key!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  priority?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown> | null;

  @ApiProperty()
  @IsObject()
  actions!: Record<string, unknown>;
}

class UpdateCustomizationRuleDto implements UpdateCustomizationRuleRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ enum: customizationChannels, nullable: true })
  @IsOptional()
  @IsIn(customizationChannels)
  channel?: CustomizationChannel | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pointKey?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: customizationRuleStatuses })
  @IsOptional()
  @IsIn(customizationRuleStatuses)
  status?: CustomizationRuleStatus;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  priority?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  actions?: Record<string, unknown>;
}

class EvaluateCustomizationDto implements EvaluateCustomizationRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiProperty({ enum: customizationChannels })
  @IsIn(customizationChannels)
  channel!: CustomizationChannel;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pointKey?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  inputs?: Record<string, unknown> | null;
}

@Injectable()
export class CustomizationService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  listBrandingConfigs(
    context: RequestContext,
    query: CustomizationScopedQueryDto
  ): Promise<ListResponse<BrandingConfigDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(
        context,
        query.tenantId ?? context.tenantId
      );

      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const items = await tx.customizationBrandingConfig.findMany({
        where: {
          tenantId,
          ...(query.storeId !== undefined ? { storeId: query.storeId } : {}),
          ...(query.channel ? { channel: query.channel } : {}),
          ...(query.pointKey !== undefined ? { pointKey: query.pointKey } : {})
        },
        orderBy: [{ channel: "asc" }, { createdAt: "asc" }]
      });

      return {
        items: items.map(mapBrandingConfig),
        total: items.length
      };
    });
  }

  createBrandingConfig(
    context: RequestContext,
    dto: CreateBrandingConfigDto
  ): Promise<BrandingConfigDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      if (dto.storeId) {
        this.accessControl.enforceStoreAccess(context, dto.storeId);
      }

      const scopeKey = buildCustomizationScopeKey({
        tenantId,
        storeId: dto.storeId ?? null,
        channel: dto.channel,
        pointKey: dto.pointKey ?? null
      });

      const existing = await tx.customizationBrandingConfig.findUnique({
        where: { scopeKey }
      });
      if (existing) {
        throw new BadRequestException("Branding config for this scope already exists.");
      }

      const created = await tx.customizationBrandingConfig.create({
        data: {
          tenantId,
          storeId: dto.storeId ?? null,
          channel: dto.channel,
          pointKey: dto.pointKey ?? null,
          scopeKey,
          config: dto.config as Prisma.InputJsonObject
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: created.tenantId,
        storeId: created.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "customization.branding_config_created",
        entityType: "branding_config",
        entityId: created.id,
        payload: {
          channel: created.channel,
          pointKey: created.pointKey,
          scopeKey: created.scopeKey
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: created.tenantId,
        eventName: "customization.branding_config_created",
        aggregate: "branding_config",
        aggregateId: created.id,
        payload: {
          channel: created.channel,
          pointKey: created.pointKey,
          scopeKey: created.scopeKey
        }
      });

      return mapBrandingConfig(created);
    });
  }

  updateBrandingConfig(
    context: RequestContext,
    id: string,
    dto: UpdateBrandingConfigDto
  ): Promise<BrandingConfigDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.customizationBrandingConfig.findUniqueOrThrow({
        where: { id }
      });

      this.accessControl.resolveTenantId(context, current.tenantId);
      if (current.storeId) {
        this.accessControl.enforceStoreAccess(context, current.storeId);
      }
      if (dto.storeId) {
        this.accessControl.enforceStoreAccess(context, dto.storeId);
      }

      const nextStoreId = dto.storeId !== undefined ? dto.storeId ?? null : current.storeId;
      const nextChannel = dto.channel ?? current.channel;
      const nextPointKey = dto.pointKey !== undefined ? dto.pointKey ?? null : current.pointKey;
      const nextScopeKey = buildCustomizationScopeKey({
        tenantId: current.tenantId,
        storeId: nextStoreId,
        channel: nextChannel,
        pointKey: nextPointKey
      });

      const duplicate = await tx.customizationBrandingConfig.findFirst({
        where: {
          scopeKey: nextScopeKey,
          id: { not: current.id }
        }
      });
      if (duplicate) {
        throw new BadRequestException("Branding config for this scope already exists.");
      }

      const updated = await tx.customizationBrandingConfig.update({
        where: { id: current.id },
        data: {
          ...(dto.storeId !== undefined ? { storeId: dto.storeId ?? null } : {}),
          ...(dto.channel !== undefined ? { channel: dto.channel } : {}),
          ...(dto.pointKey !== undefined ? { pointKey: dto.pointKey ?? null } : {}),
          ...(dto.config !== undefined
            ? { config: dto.config as Prisma.InputJsonObject }
            : {}),
          scopeKey: nextScopeKey
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: updated.tenantId,
        storeId: updated.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "customization.branding_config_updated",
        entityType: "branding_config",
        entityId: updated.id,
        payload: {
          channel: updated.channel,
          pointKey: updated.pointKey,
          scopeKey: updated.scopeKey
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: updated.tenantId,
        eventName: "customization.branding_config_updated",
        aggregate: "branding_config",
        aggregateId: updated.id,
        payload: {
          channel: updated.channel,
          pointKey: updated.pointKey,
          scopeKey: updated.scopeKey
        }
      });

      return mapBrandingConfig(updated);
    });
  }

  listRules(
    context: RequestContext,
    query: CustomizationRulesQueryDto
  ): Promise<ListResponse<CustomizationRuleDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(
        context,
        query.tenantId ?? context.tenantId
      );

      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const items = await tx.customizationRule.findMany({
        where: {
          tenantId,
          ...(query.storeId !== undefined ? { storeId: query.storeId } : {}),
          ...(query.channel !== undefined ? { channel: query.channel } : {}),
          ...(query.pointKey !== undefined ? { pointKey: query.pointKey } : {}),
          ...(query.status ? { status: query.status } : {})
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
      });

      return {
        items: items.map(mapCustomizationRule),
        total: items.length
      };
    });
  }

  createRule(
    context: RequestContext,
    dto: CreateCustomizationRuleDto
  ): Promise<CustomizationRuleDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      if (dto.storeId) {
        this.accessControl.enforceStoreAccess(context, dto.storeId);
      }

      const created = await tx.customizationRule.create({
        data: {
          tenantId,
          storeId: dto.storeId ?? null,
          channel: dto.channel ?? null,
          pointKey: dto.pointKey ?? null,
          key: dto.key,
          description: dto.description ?? null,
          priority: dto.priority ?? 100,
          conditions: dto.conditions
            ? (dto.conditions as Prisma.InputJsonObject)
            : Prisma.JsonNull,
          actions: dto.actions as Prisma.InputJsonObject
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: created.tenantId,
        storeId: created.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "customization.rule_created",
        entityType: "customization_rule",
        entityId: created.id,
        payload: {
          key: created.key,
          channel: created.channel,
          priority: created.priority
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: created.tenantId,
        eventName: "customization.rule_created",
        aggregate: "customization_rule",
        aggregateId: created.id,
        payload: {
          key: created.key,
          channel: created.channel,
          priority: created.priority
        }
      });

      return mapCustomizationRule(created);
    });
  }

  updateRule(
    context: RequestContext,
    id: string,
    dto: UpdateCustomizationRuleDto
  ): Promise<CustomizationRuleDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.customizationRule.findUniqueOrThrow({
        where: { id }
      });

      this.accessControl.resolveTenantId(context, current.tenantId);
      if (current.storeId) {
        this.accessControl.enforceStoreAccess(context, current.storeId);
      }
      if (dto.storeId) {
        this.accessControl.enforceStoreAccess(context, dto.storeId);
      }

      const updated = await tx.customizationRule.update({
        where: { id: current.id },
        data: {
          ...(dto.storeId !== undefined ? { storeId: dto.storeId ?? null } : {}),
          ...(dto.channel !== undefined ? { channel: dto.channel ?? null } : {}),
          ...(dto.pointKey !== undefined ? { pointKey: dto.pointKey ?? null } : {}),
          ...(dto.key !== undefined ? { key: dto.key } : {}),
          ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.conditions !== undefined
            ? {
                conditions: dto.conditions
                  ? (dto.conditions as Prisma.InputJsonObject)
                  : Prisma.JsonNull
              }
            : {}),
          ...(dto.actions !== undefined
            ? { actions: dto.actions as Prisma.InputJsonObject }
            : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: updated.tenantId,
        storeId: updated.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "customization.rule_updated",
        entityType: "customization_rule",
        entityId: updated.id,
        payload: {
          key: updated.key,
          channel: updated.channel,
          priority: updated.priority,
          status: updated.status
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: updated.tenantId,
        eventName: "customization.rule_updated",
        aggregate: "customization_rule",
        aggregateId: updated.id,
        payload: {
          key: updated.key,
          channel: updated.channel,
          priority: updated.priority,
          status: updated.status
        }
      });

      return mapCustomizationRule(updated);
    });
  }

  evaluate(
    context: RequestContext,
    dto: EvaluateCustomizationDto
  ): Promise<CustomizationEvaluationDto> {
    return this.resolveEffectiveCustomization(context, {
      tenantId: dto.tenantId ?? context.tenantId ?? "",
      storeId: dto.storeId ?? null,
      channel: dto.channel,
      pointKey: dto.pointKey ?? null,
      inputs: dto.inputs ?? null
    });
  }

  async resolveEffectiveCustomization(
    context: RequestContext,
    input: CustomizationEvaluationInput
  ): Promise<CustomizationEvaluationDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, input.tenantId);
      if (input.storeId) {
        this.accessControl.enforceStoreAccess(context, input.storeId);
      }

      const [tenantSettings, storeSettings, featureFlags, brandingConfigs, rules] =
        await Promise.all([
          tx.tenantSetting.findMany({
            where: { tenantId },
            orderBy: { key: "asc" }
          }),
          input.storeId
            ? tx.storeSetting.findMany({
                where: { storeId: input.storeId },
                orderBy: { key: "asc" }
              })
            : Promise.resolve([]),
          tx.featureFlag.findMany({
            where: {
              tenantId,
              ...(input.storeId
                ? {
                    OR: [{ storeId: null }, { storeId: input.storeId }]
                  }
                : {
                    storeId: null
                  })
            },
            orderBy: [{ key: "asc" }, { storeId: "asc" }]
          }),
          tx.customizationBrandingConfig.findMany({
            where: {
              tenantId,
              channel: input.channel,
              ...(input.storeId
                ? {
                    OR: [
                      { storeId: null, pointKey: null },
                      { storeId: null, pointKey: input.pointKey ?? null },
                      { storeId: input.storeId, pointKey: null },
                      { storeId: input.storeId, pointKey: input.pointKey ?? null }
                    ]
                  }
                : {
                    OR: [{ storeId: null, pointKey: null }, { storeId: null, pointKey: input.pointKey ?? null }]
                  })
            },
            orderBy: { createdAt: "asc" }
          }),
          tx.customizationRule.findMany({
            where: {
              tenantId,
              status: "ACTIVE",
              OR: [{ channel: null }, { channel: input.channel }],
              ...(input.storeId
                ? {
                    AND: [
                      {
                        OR: [{ storeId: null }, { storeId: input.storeId }]
                      },
                      {
                        OR: [{ pointKey: null }, { pointKey: input.pointKey ?? null }]
                      }
                    ]
                  }
                : {
                    storeId: null,
                    OR: [{ pointKey: null }, { pointKey: input.pointKey ?? null }]
                  })
            },
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
          })
        ]);

      const settings: Record<string, Record<string, unknown>> = {};
      for (const setting of tenantSettings) {
        settings[setting.key] = asRecord(setting.value) ?? {};
      }
      for (const setting of storeSettings) {
        settings[setting.key] = asRecord(setting.value) ?? {};
      }

      const featureFlagMap: Record<string, boolean> = {};
      for (const flag of featureFlags) {
        if (flag.storeId === null) {
          featureFlagMap[flag.key] = flag.enabled;
        }
      }
      for (const flag of featureFlags) {
        if (input.storeId && flag.storeId === input.storeId) {
          featureFlagMap[flag.key] = flag.enabled;
        }
      }

      let branding: Record<string, unknown> | null = null;
      const sortedBranding = [...brandingConfigs].sort((left, right) => {
        return (
          specificityScore({
            storeId: left.storeId,
            pointKey: left.pointKey
          }) -
            specificityScore({
              storeId: right.storeId,
              pointKey: right.pointKey
            }) || left.createdAt.getTime() - right.createdAt.getTime()
        );
      });

      for (const config of sortedBranding) {
        const patch = asRecord(config.config);
        if (!patch) {
          continue;
        }
        branding = deepMergeRecord(branding ?? {}, patch);
      }

      let state: EffectiveCustomizationState = {
        settings,
        featureFlags: featureFlagMap,
        branding
      };

      const now =
        typeof input.inputs?.now === "string" ? new Date(input.inputs.now) : new Date();
      const appliedRules: CustomizationEvaluationDto["appliedRules"] = [];

      for (const rule of rules) {
        const conditions = asRecord(rule.conditions);
        if (
          !matchesCustomizationRule(conditions, {
            ...input,
            inputs: input.inputs ?? null,
            now: Number.isNaN(now.getTime()) ? new Date() : now,
            featureFlags: state.featureFlags
          })
        ) {
          continue;
        }

        state = applyCustomizationRuleActions(
          state,
          asRecord(rule.actions) ?? {}
        );
        appliedRules.push({
          id: rule.id,
          key: rule.key,
          description: rule.description,
          priority: rule.priority
        });
      }

      return {
        tenantId,
        storeId: input.storeId ?? null,
        channel: input.channel,
        pointKey: input.pointKey ?? null,
        settings: state.settings,
        featureFlags: state.featureFlags,
        branding: state.branding,
        appliedRules
      };
    });
  }

  private resolveActorType(context: RequestContext): "USER" | "DEVICE" {
    return context.scope === "device" ? "DEVICE" : "USER";
  }

  private resolveActorId(context: RequestContext): string {
    return context.scope === "device" && context.deviceId ? context.deviceId : context.userId;
  }
}

@ApiTags("customization")
@Controller("customization")
class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Get("branding")
  @Permissions("customization.read")
  listBrandingConfigs(
    @CurrentContext() context: RequestContext,
    @Query() query: CustomizationScopedQueryDto
  ): Promise<ListResponse<BrandingConfigDto>> {
    return this.customizationService.listBrandingConfigs(context, query);
  }

  @Post("branding")
  @Permissions("customization.write")
  createBrandingConfig(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateBrandingConfigDto
  ): Promise<BrandingConfigDto> {
    return this.customizationService.createBrandingConfig(context, dto);
  }

  @Patch("branding/:id")
  @Permissions("customization.write")
  updateBrandingConfig(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateBrandingConfigDto
  ): Promise<BrandingConfigDto> {
    return this.customizationService.updateBrandingConfig(context, params.id, dto);
  }

  @Get("rules")
  @Permissions("customization.read")
  listRules(
    @CurrentContext() context: RequestContext,
    @Query() query: CustomizationRulesQueryDto
  ): Promise<ListResponse<CustomizationRuleDto>> {
    return this.customizationService.listRules(context, query);
  }

  @Post("rules")
  @Permissions("customization.write")
  createRule(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateCustomizationRuleDto
  ): Promise<CustomizationRuleDto> {
    return this.customizationService.createRule(context, dto);
  }

  @Patch("rules/:id")
  @Permissions("customization.write")
  updateRule(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCustomizationRuleDto
  ): Promise<CustomizationRuleDto> {
    return this.customizationService.updateRule(context, params.id, dto);
  }

  @Post("evaluate")
  @Permissions("customization.read")
  evaluate(
    @CurrentContext() context: RequestContext,
    @Body() dto: EvaluateCustomizationDto
  ): Promise<CustomizationEvaluationDto> {
    return this.customizationService.evaluate(context, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [CustomizationController],
  providers: [CustomizationService],
  exports: [CustomizationService]
})
export class CustomizationModule {}
