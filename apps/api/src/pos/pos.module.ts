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
  ClosePosShiftRequest,
  ListResponse,
  OpenPosShiftRequest,
  PaymentIntentDto,
  PosBootstrapResponse,
  PosSessionDto,
  PosShiftDto,
  RecordPaymentIntentRequest,
  StartPosSessionRequest
} from "@exetron/contracts";
import type { PosSession as PosSessionModel, PosShift as PosShiftModel, Prisma } from "@exetron/database";
import type { PaymentMethodKind, RequestContext } from "@exetron/types";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { decimalToString } from "../common/catalog-helpers";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";
import { PaymentsModule, PaymentsService } from "../payments/payments.module";
import { PricingModule, PricingService } from "../pricing/pricing.module";

class PosBootstrapQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  deviceId!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  priceListId?: string;
}

class PosShiftsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

class PosSessionsQueryDto extends PosShiftsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}

class OpenPosShiftDto implements OpenPosShiftRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  deviceId!: string;

  @ApiPropertyOptional({ nullable: true, example: "1000.00" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  openingCashAmount?: string | null;
}

class ClosePosShiftDto implements ClosePosShiftRequest {
  @ApiPropertyOptional({ nullable: true, example: "1500.00" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  closingCashAmount?: string | null;
}

class StartPosSessionDto implements StartPosSessionRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  deviceId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  shiftId!: string;
}

class PaymentAllocationPayloadDto {
  @ApiProperty({ enum: ["CASH", "CARD", "QR"] })
  @IsIn(["CASH", "CARD", "QR"])
  method!: PaymentMethodKind;

  @ApiProperty({ example: "11.75" })
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  amount!: string;
}

class RecordPaymentIntentDto implements RecordPaymentIntentRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  posSessionId!: string;

  @ApiProperty({ type: [PaymentAllocationPayloadDto] })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationPayloadDto)
  allocations!: PaymentAllocationPayloadDto[];
}

type ShiftRecord = PosShiftModel;
type SessionRecord = PosSessionModel;
function mapShift(shift: ShiftRecord): PosShiftDto {
  return {
    id: shift.id,
    tenantId: shift.tenantId,
    storeId: shift.storeId,
    deviceId: shift.deviceId,
    openedByUserId: shift.openedByUserId,
    status: shift.status,
    openingCashAmount: decimalToString(shift.openingCashAmount),
    closingCashAmount: decimalToString(shift.closingCashAmount),
    openedAt: shift.openedAt.toISOString(),
    closedAt: shift.closedAt?.toISOString() ?? null,
    createdAt: shift.createdAt.toISOString(),
    updatedAt: shift.updatedAt.toISOString()
  };
}

function mapSession(session: SessionRecord): PosSessionDto {
  return {
    id: session.id,
    tenantId: session.tenantId,
    storeId: session.storeId,
    deviceId: session.deviceId,
    shiftId: session.shiftId,
    userId: session.userId,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    lastHeartbeatAt: session.lastHeartbeatAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  };
}

@Injectable()
class PosService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly pricingService: PricingService,
    private readonly payments: PaymentsService
  ) {}

  listShifts(
    context: RequestContext,
    query: PosShiftsQueryDto
  ): Promise<ListResponse<PosShiftDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const shifts = await tx.posShift.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          ...(this.accessControl.storeFilter(context) && !query.storeId
            ? { storeId: this.accessControl.storeFilter(context) }
            : {})
        },
        orderBy: { openedAt: "desc" }
      });

      return {
        items: shifts.map(mapShift),
        total: shifts.length
      };
    });
  }

  listSessions(
    context: RequestContext,
    query: PosSessionsQueryDto
  ): Promise<ListResponse<PosSessionDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const sessions = await tx.posSession.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          ...(query.deviceId ? { deviceId: query.deviceId } : {}),
          ...(this.accessControl.storeFilter(context) && !query.storeId
            ? { storeId: this.accessControl.storeFilter(context) }
            : {})
        },
        orderBy: { startedAt: "desc" }
      });

      return {
        items: sessions.map(mapSession),
        total: sessions.length
      };
    });
  }

  async bootstrap(
    context: RequestContext,
    query: PosBootstrapQueryDto
  ): Promise<PosBootstrapResponse> {
    const bootstrapData = await this.dbContext.withRequestContext(context, async (tx) => {
      const device = await tx.device.findUniqueOrThrow({
        where: { id: query.deviceId }
      });
      this.accessControl.resolveTenantId(context, query.tenantId ?? device.tenantId);
      this.accessControl.enforceStoreAccess(context, device.storeId);
      this.ensurePosDevice(device.type);

      const [activeShift, activeSession, featureFlags, tenantSettings, storeSettings] =
        await Promise.all([
          tx.posShift.findFirst({
            where: { deviceId: device.id, status: "OPEN" },
            orderBy: { openedAt: "desc" }
          }),
          tx.posSession.findFirst({
            where: { deviceId: device.id, status: "ACTIVE" },
            orderBy: { startedAt: "desc" }
          }),
          tx.featureFlag.findMany({
            where: {
              tenantId: device.tenantId,
              OR: [{ storeId: null }, { storeId: device.storeId }]
            },
            orderBy: { createdAt: "asc" }
          }),
          tx.tenantSetting.findMany({
            where: { tenantId: device.tenantId },
            orderBy: { key: "asc" }
          }),
          tx.storeSetting.findMany({
            where: { storeId: device.storeId },
            orderBy: { key: "asc" }
          })
        ]);

      return {
        device,
        activeShift,
        activeSession,
        featureFlags,
        tenantSettings,
        storeSettings
      };
    });

    const catalog = await this.pricingService.compiledCatalog(context, {
      tenantId: bootstrapData.device.tenantId,
      storeId: bootstrapData.device.storeId,
      priceListId: query.priceListId,
      channel: "POS"
    });

    return {
      tenantId: bootstrapData.device.tenantId,
      storeId: bootstrapData.device.storeId,
      deviceId: bootstrapData.device.id,
      activeShift: bootstrapData.activeShift ? mapShift(bootstrapData.activeShift) : null,
      activeSession: bootstrapData.activeSession
        ? mapSession(bootstrapData.activeSession)
        : null,
      catalog,
      featureFlags: bootstrapData.featureFlags.map((flag) => ({
        id: flag.id,
        tenantId: flag.tenantId,
        storeId: flag.storeId,
        scopeKey: flag.scopeKey,
        key: flag.key,
        enabled: flag.enabled,
        kind: flag.kind,
        rolloutPercentage: flag.rolloutPercentage,
        rules: flag.rules as Record<string, unknown> | null,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString()
      })),
      tenantSettings: bootstrapData.tenantSettings.map((setting) => ({
        id: setting.id,
        tenantId: setting.tenantId,
        key: setting.key,
        value: setting.value as Record<string, unknown>,
        createdAt: setting.createdAt.toISOString(),
        updatedAt: setting.updatedAt.toISOString()
      })),
      storeSettings: bootstrapData.storeSettings.map((setting) => ({
        id: setting.id,
        tenantId: setting.tenantId,
        storeId: setting.storeId,
        key: setting.key,
        value: setting.value as Record<string, unknown>,
        createdAt: setting.createdAt.toISOString(),
        updatedAt: setting.updatedAt.toISOString()
      }))
    };
  }

  openShift(context: RequestContext, dto: OpenPosShiftDto): Promise<PosShiftDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const device = await this.loadPosDevice(tx, context, dto.deviceId, dto.tenantId, dto.storeId);

      const existingOpenShift = await tx.posShift.findFirst({
        where: {
          deviceId: device.id,
          status: "OPEN"
        }
      });

      if (existingOpenShift) {
        throw new BadRequestException("An open POS shift already exists for this device.");
      }

      const shift = await tx.posShift.create({
        data: {
          tenantId: device.tenantId,
          storeId: device.storeId,
          deviceId: device.id,
          openedByUserId: context.userId,
          openingCashAmount: dto.openingCashAmount ?? null
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: shift.tenantId,
        storeId: shift.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "pos.shift_opened",
        entityType: "pos_shift",
        entityId: shift.id,
        payload: {
          deviceId: shift.deviceId,
          openingCashAmount: dto.openingCashAmount ?? null
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: shift.tenantId,
        eventName: "pos.shift_opened",
        aggregate: "pos_shift",
        aggregateId: shift.id,
        payload: {
          shiftId: shift.id,
          deviceId: shift.deviceId
        }
      });

      return mapShift(shift);
    });
  }

  closeShift(
    context: RequestContext,
    shiftId: string,
    dto: ClosePosShiftDto
  ): Promise<PosShiftDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.posShift.findUniqueOrThrow({
        where: { id: shiftId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);
      this.accessControl.enforceStoreAccess(context, current.storeId);

      if (current.status !== "OPEN") {
        throw new BadRequestException("Only open POS shifts can be closed.");
      }

      await tx.posSession.updateMany({
        where: {
          shiftId: current.id,
          status: "ACTIVE"
        },
        data: {
          status: "ENDED",
          endedAt: new Date()
        }
      });

      const shift = await tx.posShift.update({
        where: { id: current.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closingCashAmount: dto.closingCashAmount ?? null
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: shift.tenantId,
        storeId: shift.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "pos.shift_closed",
        entityType: "pos_shift",
        entityId: shift.id,
        payload: {
          closingCashAmount: dto.closingCashAmount ?? null
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: shift.tenantId,
        eventName: "pos.shift_closed",
        aggregate: "pos_shift",
        aggregateId: shift.id,
        payload: {
          shiftId: shift.id
        }
      });

      return mapShift(shift);
    });
  }

  startSession(
    context: RequestContext,
    dto: StartPosSessionDto
  ): Promise<PosSessionDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const device = await this.loadPosDevice(tx, context, dto.deviceId, dto.tenantId, dto.storeId);
      const shift = await tx.posShift.findUniqueOrThrow({
        where: { id: dto.shiftId }
      });

      if (
        shift.tenantId !== device.tenantId ||
        shift.storeId !== device.storeId ||
        shift.deviceId !== device.id
      ) {
        throw new BadRequestException("Shift/device/store mismatch.");
      }

      if (shift.status !== "OPEN") {
        throw new BadRequestException("POS session requires an open shift.");
      }

      const existingSession = await tx.posSession.findFirst({
        where: {
          deviceId: device.id,
          status: "ACTIVE"
        }
      });

      if (existingSession) {
        throw new BadRequestException("An active POS session already exists for this device.");
      }

      const session = await tx.posSession.create({
        data: {
          tenantId: device.tenantId,
          storeId: device.storeId,
          deviceId: device.id,
          shiftId: shift.id,
          userId: context.userId,
          lastHeartbeatAt: new Date()
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: session.tenantId,
        storeId: session.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "pos.session_started",
        entityType: "pos_session",
        entityId: session.id,
        payload: {
          shiftId: session.shiftId,
          deviceId: session.deviceId
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: session.tenantId,
        eventName: "pos.session_started",
        aggregate: "pos_session",
        aggregateId: session.id,
        payload: {
          sessionId: session.id,
          shiftId: session.shiftId,
          deviceId: session.deviceId
        }
      });

      return mapSession(session);
    });
  }

  heartbeatSession(
    context: RequestContext,
    sessionId: string
  ): Promise<PosSessionDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.posSession.findUniqueOrThrow({
        where: { id: sessionId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);
      this.accessControl.enforceStoreAccess(context, current.storeId);

      if (current.status !== "ACTIVE") {
        throw new BadRequestException("Only active POS sessions can send heartbeat.");
      }

      const session = await tx.posSession.update({
        where: { id: current.id },
        data: {
          lastHeartbeatAt: new Date()
        }
      });

      return mapSession(session);
    });
  }

  endSession(
    context: RequestContext,
    sessionId: string
  ): Promise<PosSessionDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.posSession.findUniqueOrThrow({
        where: { id: sessionId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);
      this.accessControl.enforceStoreAccess(context, current.storeId);

      if (current.status !== "ACTIVE") {
        throw new BadRequestException("Only active POS sessions can be ended.");
      }

      const session = await tx.posSession.update({
        where: { id: current.id },
        data: {
          status: "ENDED",
          endedAt: new Date(),
          lastHeartbeatAt: new Date()
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: session.tenantId,
        storeId: session.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "pos.session_ended",
        entityType: "pos_session",
        entityId: session.id,
        payload: {
          shiftId: session.shiftId
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: session.tenantId,
        eventName: "pos.session_ended",
        aggregate: "pos_session",
        aggregateId: session.id,
        payload: {
          sessionId: session.id,
          shiftId: session.shiftId
        }
      });

      return mapSession(session);
    });
  }

  recordPaymentIntent(
    context: RequestContext,
    dto: RecordPaymentIntentDto
  ): Promise<PaymentIntentDto> {
    return this.payments.createIntent(context, {
      tenantId: dto.tenantId,
      storeId: dto.storeId,
      orderId: dto.orderId,
      channel: "POS",
      posSessionId: dto.posSessionId,
      allocations: dto.allocations
    });
  }

  private ensurePosDevice(deviceType: string): void {
    if (deviceType !== "POS") {
      throw new BadRequestException("The selected device is not a POS device.");
    }
  }

  private async loadPosDevice(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    deviceId: string,
    tenantIdInput?: string,
    storeIdInput?: string
  ) {
    const device = await tx.device.findUniqueOrThrow({
      where: { id: deviceId }
    });
    const tenantId = this.accessControl.resolveTenantId(
      context,
      tenantIdInput ?? device.tenantId
    );

    if (device.tenantId !== tenantId) {
      throw new BadRequestException("Device tenant mismatch.");
    }

    if (storeIdInput && storeIdInput !== device.storeId) {
      throw new BadRequestException("Device store mismatch.");
    }

    this.accessControl.enforceStoreAccess(context, device.storeId);
    this.ensurePosDevice(device.type);

    return device;
  }
}

@ApiTags("pos")
@Controller("pos")
class PosController {
  constructor(private readonly posService: PosService) {}

  @Get("bootstrap")
  @Permissions("pos.read", "products.read")
  bootstrap(
    @CurrentContext() context: RequestContext,
    @Query() query: PosBootstrapQueryDto
  ): Promise<PosBootstrapResponse> {
    return this.posService.bootstrap(context, query);
  }

  @Get("shifts")
  @Permissions("pos.read")
  listShifts(
    @CurrentContext() context: RequestContext,
    @Query() query: PosShiftsQueryDto
  ): Promise<ListResponse<PosShiftDto>> {
    return this.posService.listShifts(context, query);
  }

  @Post("shifts")
  @Permissions("pos.write")
  openShift(
    @CurrentContext() context: RequestContext,
    @Body() dto: OpenPosShiftDto
  ): Promise<PosShiftDto> {
    return this.posService.openShift(context, dto);
  }

  @Post("shifts/:id/close")
  @Permissions("pos.write")
  closeShift(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: ClosePosShiftDto
  ): Promise<PosShiftDto> {
    return this.posService.closeShift(context, params.id, dto);
  }

  @Get("sessions")
  @Permissions("pos.read")
  listSessions(
    @CurrentContext() context: RequestContext,
    @Query() query: PosSessionsQueryDto
  ): Promise<ListResponse<PosSessionDto>> {
    return this.posService.listSessions(context, query);
  }

  @Post("sessions")
  @Permissions("pos.write")
  startSession(
    @CurrentContext() context: RequestContext,
    @Body() dto: StartPosSessionDto
  ): Promise<PosSessionDto> {
    return this.posService.startSession(context, dto);
  }

  @Patch("sessions/:id/heartbeat")
  @Permissions("pos.write")
  heartbeat(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<PosSessionDto> {
    return this.posService.heartbeatSession(context, params.id);
  }

  @Post("sessions/:id/end")
  @Permissions("pos.write")
  endSession(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<PosSessionDto> {
    return this.posService.endSession(context, params.id);
  }

  @Post("payment-intents")
  @Permissions("pos.write", "orders.read")
  createPaymentIntent(
    @CurrentContext() context: RequestContext,
    @Body() dto: RecordPaymentIntentDto
  ): Promise<PaymentIntentDto> {
    return this.posService.recordPaymentIntent(context, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule, PricingModule, PaymentsModule],
  controllers: [PosController],
  providers: [PosService]
})
export class PosModule {}
