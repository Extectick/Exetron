import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Put,
  Query
} from "@nestjs/common";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  ListResponse,
  StoreSettingDto,
  TenantSettingDto,
  UpsertStoreSettingRequest,
  UpsertTenantSettingRequest
} from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import type { Prisma } from "@exetron/database";
import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";

class SettingsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class UpsertTenantSettingDto implements UpsertTenantSettingRequest {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsObject()
  value!: Record<string, unknown>;
}

class UpsertStoreSettingDto implements UpsertStoreSettingRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsObject()
  value!: Record<string, unknown>;
}

@Injectable()
class SettingsService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService
  ) {}

  listTenantSettings(
    context: RequestContext,
    query: SettingsQueryDto
  ): Promise<ListResponse<TenantSettingDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(
        context,
        query.tenantId ?? context.tenantId
      );
      const settings = await tx.tenantSetting.findMany({
        where: { tenantId },
        orderBy: { key: "asc" }
      });

      return {
        items: settings.map((setting) => ({
          id: setting.id,
          tenantId: setting.tenantId,
          key: setting.key,
          value: setting.value as Record<string, unknown>,
          createdAt: setting.createdAt.toISOString(),
          updatedAt: setting.updatedAt.toISOString()
        })),
        total: settings.length
      };
    });
  }

  listStoreSettings(
    context: RequestContext,
    storeId: string
  ): Promise<ListResponse<StoreSettingDto>> {
    this.accessControl.enforceStoreAccess(context, storeId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const store = await tx.store.findUniqueOrThrow({ where: { id: storeId } });
      this.accessControl.resolveTenantId(context, store.tenantId);

      const settings = await tx.storeSetting.findMany({
        where: { storeId },
        orderBy: { key: "asc" }
      });

      return {
        items: settings.map((setting) => ({
          id: setting.id,
          tenantId: setting.tenantId,
          storeId: setting.storeId,
          key: setting.key,
          value: setting.value as Record<string, unknown>,
          createdAt: setting.createdAt.toISOString(),
          updatedAt: setting.updatedAt.toISOString()
        })),
        total: settings.length
      };
    });
  }

  upsertTenantSetting(
    context: RequestContext,
    dto: UpsertTenantSettingDto,
    tenantId?: string
  ): Promise<TenantSettingDto> {
    const resolvedTenantId = this.accessControl.resolveTenantId(
      context,
      tenantId ?? context.tenantId
    );

    return this.dbContext.withRequestContext(context, async (tx) => {
      const setting = await tx.tenantSetting.upsert({
        where: {
          tenantId_key: {
            tenantId: resolvedTenantId,
            key: dto.key
          }
        },
        update: {
          value: dto.value as Prisma.InputJsonObject
        },
        create: {
          tenantId: resolvedTenantId,
          key: dto.key,
          value: dto.value as Prisma.InputJsonObject
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: resolvedTenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "tenant_setting.upserted",
        entityType: "tenant_setting",
        entityId: setting.id,
        payload: { key: setting.key }
      });

      return {
        id: setting.id,
        tenantId: setting.tenantId,
        key: setting.key,
        value: setting.value as Record<string, unknown>,
        createdAt: setting.createdAt.toISOString(),
        updatedAt: setting.updatedAt.toISOString()
      };
    });
  }

  upsertStoreSetting(
    context: RequestContext,
    dto: UpsertStoreSettingDto
  ): Promise<StoreSettingDto> {
    this.accessControl.enforceStoreAccess(context, dto.storeId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const store = await tx.store.findUniqueOrThrow({ where: { id: dto.storeId } });
      this.accessControl.resolveTenantId(context, store.tenantId);

      const setting = await tx.storeSetting.upsert({
        where: {
          storeId_key: {
            storeId: dto.storeId,
            key: dto.key
          }
        },
        update: {
          value: dto.value as Prisma.InputJsonObject
        },
        create: {
          tenantId: store.tenantId,
          storeId: dto.storeId,
          key: dto.key,
          value: dto.value as Prisma.InputJsonObject
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: setting.tenantId,
        storeId: setting.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "store_setting.upserted",
        entityType: "store_setting",
        entityId: setting.id,
        payload: { key: setting.key }
      });

      return {
        id: setting.id,
        tenantId: setting.tenantId,
        storeId: setting.storeId,
        key: setting.key,
        value: setting.value as Record<string, unknown>,
        createdAt: setting.createdAt.toISOString(),
        updatedAt: setting.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("settings")
@Controller("settings")
class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("tenant")
  @Permissions("settings.read")
  listTenantSettings(
    @CurrentContext() context: RequestContext,
    @Query() query: SettingsQueryDto
  ): Promise<ListResponse<TenantSettingDto>> {
    return this.settingsService.listTenantSettings(context, query);
  }

  @Put("tenant")
  @Permissions("settings.write")
  upsertTenantSetting(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertTenantSettingDto,
    @Query() query: SettingsQueryDto
  ): Promise<TenantSettingDto> {
    return this.settingsService.upsertTenantSetting(context, dto, query.tenantId);
  }

  @Get("stores/:id")
  @Permissions("settings.read")
  listStoreSettings(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<ListResponse<StoreSettingDto>> {
    return this.settingsService.listStoreSettings(context, params.id);
  }

  @Put("store")
  @Permissions("settings.write")
  upsertStoreSetting(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertStoreSettingDto
  ): Promise<StoreSettingDto> {
    return this.settingsService.upsertStoreSetting(context, dto);
  }
}

@Module({
  imports: [AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService]
})
export class SettingsModule {}
