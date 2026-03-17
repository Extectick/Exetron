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
  CreateDeviceRequest,
  DeviceDto,
  ListResponse,
  UpdateDeviceRequest
} from "@exetron/contracts";
import type { RequestContext } from "@exetron/types";
import crypto from "node:crypto";
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

class DevicesQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class CreateDeviceDto implements CreateDeviceRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ example: "POS-001" })
  @IsString()
  @Matches(/^[A-Za-z0-9-_]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ["POS", "KIOSK", "KITCHEN", "BOARD", "BACKOFFICE"] })
  @IsIn(["POS", "KIOSK", "KITCHEN", "BOARD", "BACKOFFICE"])
  type!: "POS" | "KIOSK" | "KITCHEN" | "BOARD" | "BACKOFFICE";
}

class UpdateDeviceDto implements UpdateDeviceRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-_]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ["POS", "KIOSK", "KITCHEN", "BOARD", "BACKOFFICE"] })
  @IsOptional()
  @IsIn(["POS", "KIOSK", "KITCHEN", "BOARD", "BACKOFFICE"])
  type?: "POS" | "KIOSK" | "KITCHEN" | "BOARD" | "BACKOFFICE";

  @ApiPropertyOptional({ enum: ["PENDING", "ACTIVE", "SUSPENDED", "RETIRED"] })
  @IsOptional()
  @IsIn(["PENDING", "ACTIVE", "SUSPENDED", "RETIRED"])
  status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "RETIRED";
}

@Injectable()
class DevicesService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  list(
    context: RequestContext,
    query: DevicesQueryDto
  ): Promise<ListResponse<DeviceDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const devices = await tx.device.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(this.accessControl.storeFilter(context)
            ? { storeId: this.accessControl.storeFilter(context) }
            : {})
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: devices.map((device) => ({
          id: device.id,
          tenantId: device.tenantId,
          storeId: device.storeId,
          code: device.code,
          name: device.name,
          type: device.type,
          status: device.status,
          createdAt: device.createdAt.toISOString(),
          updatedAt: device.updatedAt.toISOString()
        })),
        total: devices.length
      };
    });
  }

  create(context: RequestContext, dto: CreateDeviceDto): Promise<DeviceDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
    this.accessControl.enforceStoreAccess(context, dto.storeId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const store = await tx.store.findUniqueOrThrow({ where: { id: dto.storeId } });
      this.accessControl.resolveTenantId(context, store.tenantId);

      const bootstrapSecret = crypto.randomBytes(24).toString("hex");
      const apiKeyHash = crypto
        .createHash("sha256")
        .update(bootstrapSecret)
        .digest("hex");

      const device = await tx.device.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          code: dto.code,
          name: dto.name,
          type: dto.type,
          status: "ACTIVE",
          apiKeyHash
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        storeId: device.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "device.registered",
        entityType: "device",
        entityId: device.id,
        payload: { code: device.code }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "device.registered",
        aggregate: "device",
        aggregateId: device.id,
        payload: { code: device.code, bootstrapSecret }
      });

      return {
        id: device.id,
        tenantId: device.tenantId,
        storeId: device.storeId,
        code: device.code,
        name: device.name,
        type: device.type,
        status: device.status,
        createdAt: device.createdAt.toISOString(),
        updatedAt: device.updatedAt.toISOString()
      };
    });
  }

  update(
    context: RequestContext,
    deviceId: string,
    dto: UpdateDeviceDto
  ): Promise<DeviceDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.device.findUniqueOrThrow({
        where: { id: deviceId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);
      this.accessControl.enforceStoreAccess(context, current.storeId);

      const device = await tx.device.update({
        where: { id: deviceId },
        data: {
          ...(dto.storeId ? { storeId: dto.storeId } : {}),
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.type ? { type: dto.type } : {}),
          ...(dto.status ? { status: dto.status } : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: device.tenantId,
        storeId: device.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "device.updated",
        entityType: "device",
        entityId: device.id,
        payload: dto as Record<string, unknown>
      });

      return {
        id: device.id,
        tenantId: device.tenantId,
        storeId: device.storeId,
        code: device.code,
        name: device.name,
        type: device.type,
        status: device.status,
        createdAt: device.createdAt.toISOString(),
        updatedAt: device.updatedAt.toISOString()
      };
    });
  }
}

@ApiTags("devices")
@Controller("devices")
class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @Permissions("devices.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: DevicesQueryDto
  ): Promise<ListResponse<DeviceDto>> {
    return this.devicesService.list(context, query);
  }

  @Post()
  @Permissions("devices.write")
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateDeviceDto
  ): Promise<DeviceDto> {
    return this.devicesService.create(context, dto);
  }

  @Patch(":id")
  @Permissions("devices.write")
  update(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateDeviceDto
  ): Promise<DeviceDto> {
    return this.devicesService.update(context, params.id, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [DevicesController],
  providers: [DevicesService]
})
export class DevicesModule {}
