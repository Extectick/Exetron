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
import { ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import type {
  CancelPaymentIntentRequest,
  CreatePaymentIntentRequest,
  CreatePaymentProviderConfigRequest,
  ListResponse,
  PaymentAttemptDto,
  PaymentIntentDto,
  PaymentIntentListItemDto,
  PaymentProviderConfigDto,
  PaymentReconciliationSummaryDto,
  ProcessPaymentAllocationRequest,
  RecordPaymentIntentRequest,
  UpdatePaymentProviderConfigRequest
} from "@exetron/contracts";
import { Prisma } from "@exetron/database";
import type {
  OrderChannel,
  PaymentAllocationStatus,
  PaymentMethodKind,
  PaymentProviderType,
  RequestContext
} from "@exetron/types";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
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
import { OrdersModule, OrdersService } from "../orders/orders.module";
import {
  resolveDefaultAutoConfirm,
  resolveDefaultProviderType,
  resolvePaymentIntentState,
  simulateProviderResult,
  type PaymentAllocationInput,
  validatePaymentAllocations
} from "./payment-runtime.util";

const allOrderChannels: OrderChannel[] = ["ADMIN", "POS", "KIOSK", "DELIVERY"];

class PaymentAllocationAmountDto {
  @ApiProperty({ enum: ["CASH", "CARD", "QR"] })
  @IsIn(["CASH", "CARD", "QR"])
  method!: PaymentMethodKind;

  @ApiProperty({ example: "11.50" })
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  amount!: string;
}

class PaymentProviderConfigQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ enum: ["CASH", "CARD", "QR"] })
  @IsOptional()
  @IsIn(["CASH", "CARD", "QR"])
  method?: PaymentMethodKind;
}

class PaymentIntentsQueryDto extends PaymentProviderConfigQueryDto {
  @ApiPropertyOptional({
    enum: ["PENDING", "PARTIALLY_PAID", "COMPLETED", "FAILED", "CANCELLED"]
  })
  @IsOptional()
  @IsIn(["PENDING", "PARTIALLY_PAID", "COMPLETED", "FAILED", "CANCELLED"])
  status?: "PENDING" | "PARTIALLY_PAID" | "COMPLETED" | "FAILED" | "CANCELLED";

  @ApiPropertyOptional({ enum: ["ADMIN", "POS", "KIOSK", "DELIVERY"] })
  @IsOptional()
  @IsIn(["ADMIN", "POS", "KIOSK", "DELIVERY"])
  channel?: OrderChannel;
}

class PaymentSummaryQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

class CreatePaymentProviderConfigDto implements CreatePaymentProviderConfigRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiProperty()
  @IsString()
  providerKey!: string;

  @ApiProperty({ enum: ["CASH_MANUAL", "CARD_SIMULATED", "QR_SIMULATED"] })
  @IsIn(["CASH_MANUAL", "CARD_SIMULATED", "QR_SIMULATED"])
  providerType!: PaymentProviderType;

  @ApiProperty({ enum: ["CASH", "CARD", "QR"] })
  @IsIn(["CASH", "CARD", "QR"])
  method!: PaymentMethodKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  priority?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsIn(["ADMIN", "POS", "KIOSK", "DELIVERY"], { each: true })
  allowedChannels?: OrderChannel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoConfirmOrderOnSuccess?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown> | null;
}

class UpdatePaymentProviderConfigDto implements UpdatePaymentProviderConfigRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerKey?: string;

  @ApiPropertyOptional({ enum: ["CASH_MANUAL", "CARD_SIMULATED", "QR_SIMULATED"] })
  @IsOptional()
  @IsIn(["CASH_MANUAL", "CARD_SIMULATED", "QR_SIMULATED"])
  providerType?: PaymentProviderType;

  @ApiPropertyOptional({ enum: ["CASH", "CARD", "QR"] })
  @IsOptional()
  @IsIn(["CASH", "CARD", "QR"])
  method?: PaymentMethodKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  priority?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsIn(["ADMIN", "POS", "KIOSK", "DELIVERY"], { each: true })
  allowedChannels?: OrderChannel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoConfirmOrderOnSuccess?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown> | null;
}

class CreatePaymentIntentDto implements CreatePaymentIntentRequest {
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

  @ApiPropertyOptional({ enum: ["ADMIN", "POS", "KIOSK", "DELIVERY"] })
  @IsOptional()
  @IsIn(["ADMIN", "POS", "KIOSK", "DELIVERY"])
  channel?: OrderChannel;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  deviceId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  posSessionId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  shiftId?: string | null;

  @ApiProperty({ type: [PaymentAllocationAmountDto] })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationAmountDto)
  allocations!: PaymentAllocationAmountDto[];
}

class ProcessPaymentAllocationDto implements ProcessPaymentAllocationRequest {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  providerKey?: string | null;
}

class CancelPaymentIntentDto implements CancelPaymentIntentRequest {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string | null;
}

class PaymentAllocationParamsDto extends IdParamDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  allocationId!: string;
}

type LoadedPaymentIntent = Prisma.PaymentIntentGetPayload<{
  include: {
    allocations: true;
    order: true;
  };
}>;

type LegacyProviderConfig = {
  id: string | null;
  tenantId: string;
  storeId: string | null;
  providerKey: string;
  providerType: PaymentProviderType;
  method: PaymentMethodKind;
  enabled: boolean;
  priority: number;
  allowedChannels: OrderChannel[];
  autoConfirmOrderOnSuccess: boolean;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapPaymentAllocation(allocation: LoadedPaymentIntent["allocations"][number]) {
  return {
    id: allocation.id,
    paymentIntentId: allocation.paymentIntentId,
    method: allocation.method,
    amount: decimalToString(allocation.amount) ?? "0.00",
    status: allocation.status,
    providerKey: allocation.providerKey,
    externalReference: allocation.externalReference,
    completedAt: allocation.completedAt?.toISOString() ?? null,
    failedAt: allocation.failedAt?.toISOString() ?? null,
    failureReason: allocation.failureReason,
    createdAt: allocation.createdAt.toISOString()
  };
}

function mapPaymentIntent(intent: LoadedPaymentIntent): PaymentIntentDto {
  return {
    id: intent.id,
    tenantId: intent.tenantId,
    storeId: intent.storeId,
    orderId: intent.orderId,
    channel: intent.channel,
    deviceId: intent.deviceId,
    posSessionId: intent.posSessionId,
    shiftId: intent.shiftId,
    status: intent.status,
    totalAmount: decimalToString(intent.totalAmount) ?? "0.00",
    paidAmount: decimalToString(intent.paidAmount) ?? "0.00",
    createdByUserId: intent.createdByUserId,
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString(),
    allocations: intent.allocations.map(mapPaymentAllocation)
  };
}

function mapPaymentIntentListItem(intent: LoadedPaymentIntent): PaymentIntentListItemDto {
  return {
    id: intent.id,
    tenantId: intent.tenantId,
    storeId: intent.storeId,
    orderId: intent.orderId,
    orderNumber: intent.order.number,
    channel: intent.channel,
    status: intent.status,
    totalAmount: decimalToString(intent.totalAmount) ?? "0.00",
    paidAmount: decimalToString(intent.paidAmount) ?? "0.00",
    customerName: intent.order.customerName,
    allocationStatuses: intent.allocations.map((allocation) => allocation.status),
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString()
  };
}

function mapPaymentAttempt(attempt: {
  id: string;
  paymentIntentId: string;
  paymentAllocationId: string;
  tenantId: string;
  storeId: string;
  orderId: string;
  providerKey: string;
  providerType: PaymentProviderType;
  method: PaymentMethodKind;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  requestPayload: Prisma.JsonValue | null;
  responsePayload: Prisma.JsonValue | null;
  externalReference: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
}): PaymentAttemptDto {
  return {
    id: attempt.id,
    paymentIntentId: attempt.paymentIntentId,
    paymentAllocationId: attempt.paymentAllocationId,
    tenantId: attempt.tenantId,
    storeId: attempt.storeId,
    orderId: attempt.orderId,
    providerKey: attempt.providerKey,
    providerType: attempt.providerType,
    method: attempt.method,
    status: attempt.status,
    requestPayload:
      attempt.requestPayload && typeof attempt.requestPayload === "object"
        ? (attempt.requestPayload as Record<string, unknown>)
        : null,
    responsePayload:
      attempt.responsePayload && typeof attempt.responsePayload === "object"
        ? (attempt.responsePayload as Record<string, unknown>)
        : null,
    externalReference: attempt.externalReference,
    errorCode: attempt.errorCode,
    errorMessage: attempt.errorMessage,
    startedAt: attempt.startedAt.toISOString(),
    finishedAt: attempt.finishedAt?.toISOString() ?? null,
    createdAt: attempt.createdAt.toISOString()
  };
}

function mapProviderConfig(config: LegacyProviderConfig): PaymentProviderConfigDto {
  return {
    id: config.id ?? "default",
    tenantId: config.tenantId,
    storeId: config.storeId,
    providerKey: config.providerKey,
    providerType: config.providerType,
    method: config.method,
    enabled: config.enabled,
    priority: config.priority,
    allowedChannels: config.allowedChannels,
    autoConfirmOrderOnSuccess: config.autoConfirmOrderOnSuccess,
    settings: config.settings,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString()
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly ordersService: OrdersService
  ) {}

  listProviderConfigs(
    context: RequestContext,
    query: PaymentProviderConfigQueryDto
  ): Promise<ListResponse<PaymentProviderConfigDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(
        context,
        query.tenantId ?? context.tenantId
      );

      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const configs = await tx.paymentProviderConfig.findMany({
        where: {
          tenantId,
          ...(query.storeId !== undefined ? { storeId: query.storeId } : {}),
          ...(query.method ? { method: query.method } : {})
        },
        orderBy: [{ storeId: "desc" }, { priority: "asc" }, { providerKey: "asc" }]
      });

      return {
        items: configs.map((config) =>
          mapProviderConfig({
            ...config,
            settings:
              config.settings && typeof config.settings === "object"
                ? (config.settings as Record<string, unknown>)
                : null
          })
        ),
        total: configs.length
      };
    });
  }

  createProviderConfig(
    context: RequestContext,
    dto: CreatePaymentProviderConfigDto
  ): Promise<PaymentProviderConfigDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

      if (dto.storeId) {
        this.accessControl.enforceStoreAccess(context, dto.storeId);
      }

      await this.ensureProviderKeyIsUnique(tx, tenantId, dto.storeId ?? null, dto.providerKey);

      const config = await tx.paymentProviderConfig.create({
        data: {
          tenantId,
          storeId: dto.storeId ?? null,
          providerKey: dto.providerKey,
          providerType: dto.providerType,
          method: dto.method,
          enabled: dto.enabled ?? true,
          priority: dto.priority ?? 100,
          allowedChannels: dto.allowedChannels ?? allOrderChannels,
          autoConfirmOrderOnSuccess: dto.autoConfirmOrderOnSuccess ?? false,
          settings: dto.settings
            ? (dto.settings as Prisma.InputJsonObject)
            : Prisma.JsonNull
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: config.tenantId,
        storeId: config.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "payment.provider_config_created",
        entityType: "payment_provider_config",
        entityId: config.id,
        payload: {
          providerKey: config.providerKey,
          method: config.method,
          storeId: config.storeId
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: config.tenantId,
        eventName: "payment.provider_config_created",
        aggregate: "payment_provider_config",
        aggregateId: config.id,
        payload: {
          providerKey: config.providerKey,
          method: config.method,
          storeId: config.storeId
        }
      });

      return mapProviderConfig({
        ...config,
        settings:
          config.settings && typeof config.settings === "object"
            ? (config.settings as Record<string, unknown>)
            : null
      });
    });
  }

  updateProviderConfig(
    context: RequestContext,
    configId: string,
    dto: UpdatePaymentProviderConfigDto
  ): Promise<PaymentProviderConfigDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.paymentProviderConfig.findUniqueOrThrow({
        where: { id: configId }
      });

      this.accessControl.resolveTenantId(context, current.tenantId);
      if (current.storeId) {
        this.accessControl.enforceStoreAccess(context, current.storeId);
      }
      if (dto.storeId) {
        this.accessControl.enforceStoreAccess(context, dto.storeId);
      }

      const nextProviderKey = dto.providerKey ?? current.providerKey;
      const nextStoreId = dto.storeId !== undefined ? dto.storeId ?? null : current.storeId;

      if (nextProviderKey !== current.providerKey || nextStoreId !== current.storeId) {
        await this.ensureProviderKeyIsUnique(
          tx,
          current.tenantId,
          nextStoreId,
          nextProviderKey,
          current.id
        );
      }

      const updated = await tx.paymentProviderConfig.update({
        where: { id: current.id },
        data: {
          ...(dto.storeId !== undefined ? { storeId: dto.storeId ?? null } : {}),
          ...(dto.providerKey !== undefined ? { providerKey: dto.providerKey } : {}),
          ...(dto.providerType !== undefined ? { providerType: dto.providerType } : {}),
          ...(dto.method !== undefined ? { method: dto.method } : {}),
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.allowedChannels !== undefined ? { allowedChannels: dto.allowedChannels } : {}),
          ...(dto.autoConfirmOrderOnSuccess !== undefined
            ? { autoConfirmOrderOnSuccess: dto.autoConfirmOrderOnSuccess }
            : {}),
          ...(dto.settings !== undefined
            ? {
                settings: dto.settings
                  ? (dto.settings as Prisma.InputJsonObject)
                  : Prisma.JsonNull
              }
            : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: updated.tenantId,
        storeId: updated.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "payment.provider_config_updated",
        entityType: "payment_provider_config",
        entityId: updated.id,
        payload: dto as Record<string, unknown>
      });

      await this.domainEvents.record(tx, {
        tenantId: updated.tenantId,
        eventName: "payment.provider_config_updated",
        aggregate: "payment_provider_config",
        aggregateId: updated.id,
        payload: {
          providerKey: updated.providerKey,
          storeId: updated.storeId
        }
      });

      return mapProviderConfig({
        ...updated,
        settings:
          updated.settings && typeof updated.settings === "object"
            ? (updated.settings as Record<string, unknown>)
            : null
      });
    });
  }

  listIntents(
    context: RequestContext,
    query: PaymentIntentsQueryDto
  ): Promise<ListResponse<PaymentIntentListItemDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const where = this.buildPaymentIntentWhere(context, query);
      const intents = await tx.paymentIntent.findMany({
        where,
        include: {
          allocations: {
            orderBy: { createdAt: "asc" }
          },
          order: true
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: intents.map(mapPaymentIntentListItem),
        total: intents.length
      };
    });
  }

  getIntent(context: RequestContext, intentId: string): Promise<PaymentIntentDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const intent = await this.loadIntent(tx, intentId);
      this.accessControl.resolveTenantId(context, intent.tenantId);
      this.accessControl.enforceStoreAccess(context, intent.storeId);
      return mapPaymentIntent(intent);
    });
  }

  createIntent(
    context: RequestContext,
    dto: CreatePaymentIntentDto | RecordPaymentIntentRequest
  ): Promise<PaymentIntentDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: dto.orderId }
      });
      const tenantId = this.accessControl.resolveTenantId(
        context,
        dto.tenantId ?? order.tenantId
      );
      this.accessControl.enforceStoreAccess(context, dto.storeId);

      if (order.tenantId !== tenantId || order.storeId !== dto.storeId) {
        throw new BadRequestException("Payment intent context mismatch.");
      }

      const channel = "channel" in dto && dto.channel ? dto.channel : order.channel;
      if (channel !== order.channel) {
        throw new BadRequestException("Payment channel must match the order channel.");
      }

      const session =
        "posSessionId" in dto && dto.posSessionId
          ? await tx.posSession.findUniqueOrThrow({
              where: { id: dto.posSessionId }
            })
          : null;

      if (session) {
        if (
          session.tenantId !== tenantId ||
          session.storeId !== dto.storeId ||
          session.status !== "ACTIVE"
        ) {
          throw new BadRequestException("POS payment intent requires an active matching session.");
        }
      }

      const shiftId =
        "shiftId" in dto && dto.shiftId !== undefined
          ? dto.shiftId ?? null
          : session?.shiftId ?? null;
      if (shiftId) {
        const shift = await tx.posShift.findUniqueOrThrow({ where: { id: shiftId } });
        if (
          shift.tenantId !== tenantId ||
          shift.storeId !== dto.storeId ||
          (session && shift.id !== session.shiftId)
        ) {
          throw new BadRequestException("Payment shift context mismatch.");
        }
      }

      const deviceId =
        "deviceId" in dto && dto.deviceId !== undefined ? dto.deviceId ?? null : session?.deviceId ?? null;
      if (deviceId) {
        const device = await tx.device.findUniqueOrThrow({ where: { id: deviceId } });
        if (device.tenantId !== tenantId || device.storeId !== dto.storeId) {
          throw new BadRequestException("Payment device context mismatch.");
        }
      }

      const existingIntent = await tx.paymentIntent.findFirst({
        where: {
          orderId: order.id,
          status: {
            in: ["PENDING", "PARTIALLY_PAID", "COMPLETED"]
          }
        }
      });
      if (existingIntent) {
        throw new BadRequestException("An active payment intent already exists for this order.");
      }

      const validated = validatePaymentAllocations(
        dto.allocations as PaymentAllocationInput[],
        decimalToString(order.total) ?? "0.00"
      );

      const intent = await tx.paymentIntent.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          orderId: order.id,
          channel,
          deviceId,
          posSessionId: session?.id ?? null,
          shiftId,
          status: "PENDING",
          totalAmount: validated.totalAmount,
          paidAmount: "0.00",
          createdByUserId: context.scope === "device" ? null : context.userId,
          allocations: {
            create: validated.normalizedAllocations.map((allocation) => ({
              tenantId,
              method: allocation.method,
              amount: allocation.amount,
              status: "PENDING"
            }))
          }
        },
        include: {
          allocations: {
            orderBy: { createdAt: "asc" }
          },
          order: true
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: intent.tenantId,
        storeId: intent.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "payment.intent_created",
        entityType: "payment_intent",
        entityId: intent.id,
        payload: {
          orderId: intent.orderId,
          channel: intent.channel,
          methods: intent.allocations.map((allocation) => allocation.method)
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: intent.tenantId,
        eventName: "payment.intent_created",
        aggregate: "payment_intent",
        aggregateId: intent.id,
        payload: {
          paymentIntentId: intent.id,
          orderId: intent.orderId,
          channel: intent.channel
        }
      });

      return mapPaymentIntent(intent);
    });
  }

  async processAllocation(
    context: RequestContext,
    intentId: string,
    allocationId: string,
    dto: ProcessPaymentAllocationDto
  ): Promise<PaymentIntentDto> {
    const result = await this.dbContext.withRequestContext(context, async (tx) => {
      const intent = await this.loadIntent(tx, intentId);
      this.accessControl.resolveTenantId(context, intent.tenantId);
      this.accessControl.enforceStoreAccess(context, intent.storeId);

      if (intent.status === "COMPLETED" || intent.status === "CANCELLED") {
        throw new BadRequestException("This payment intent is already closed.");
      }

      const allocation = intent.allocations.find((item) => item.id === allocationId);
      if (!allocation) {
        throw new BadRequestException("Payment allocation was not found.");
      }

      if (allocation.status === "COMPLETED" || allocation.status === "CANCELLED") {
        throw new BadRequestException("This allocation cannot be processed again.");
      }

      const providerConfig = await this.resolveProviderConfigTx(
        tx,
        intent,
        allocation.method,
        dto.providerKey ?? null
      );

      const requestPayload = {
        paymentIntentId: intent.id,
        paymentAllocationId: allocation.id,
        providerKey: providerConfig.providerKey,
        providerType: providerConfig.providerType,
        channel: intent.channel,
        method: allocation.method,
        amount: decimalToString(allocation.amount)
      };

      const attempt = await tx.paymentAttempt.create({
        data: {
          paymentIntentId: intent.id,
          paymentAllocationId: allocation.id,
          tenantId: intent.tenantId,
          storeId: intent.storeId,
          orderId: intent.orderId,
          providerKey: providerConfig.providerKey,
          providerType: providerConfig.providerType,
          method: allocation.method,
          status: "PENDING",
          requestPayload: requestPayload as Prisma.InputJsonObject
        }
      });

      const simulated = simulateProviderResult({
        providerKey: providerConfig.providerKey,
        providerType: providerConfig.providerType,
        method: allocation.method,
        settings: providerConfig.settings
      });
      const now = new Date();

      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: simulated.status,
          responsePayload: simulated.responsePayload as Prisma.InputJsonObject,
          externalReference: simulated.externalReference,
          errorCode: simulated.errorCode,
          errorMessage: simulated.errorMessage,
          finishedAt: now
        }
      });

      const allocationStatus: PaymentAllocationStatus =
        simulated.status === "SUCCEEDED" ? "COMPLETED" : "FAILED";

      await tx.paymentAllocation.update({
        where: { id: allocation.id },
        data: {
          status: allocationStatus,
          providerKey: providerConfig.providerKey,
          externalReference: simulated.externalReference,
          completedAt: allocationStatus === "COMPLETED" ? now : null,
          failedAt: allocationStatus === "FAILED" ? now : null,
          failureReason: simulated.errorMessage
        }
      });

      const refreshed = await this.loadIntent(tx, intent.id);
      const nextState = resolvePaymentIntentState({
        totalAmount: decimalToString(refreshed.totalAmount) ?? "0.00",
        allocations: refreshed.allocations.map((item) => ({
          amount: decimalToString(item.amount) ?? "0.00",
          status: item.status
        }))
      });

      const updatedIntent = await tx.paymentIntent.update({
        where: { id: refreshed.id },
        data: {
          status: nextState.status,
          paidAmount: nextState.paidAmount
        },
        include: {
          allocations: {
            orderBy: { createdAt: "asc" }
          },
          order: true
        }
      });

      const eventName =
        simulated.status === "SUCCEEDED" ? "payment.attempt_succeeded" : "payment.attempt_failed";

      await this.audit.recordTx(tx, {
        tenantId: updatedIntent.tenantId,
        storeId: updatedIntent.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: eventName,
        entityType: "payment_attempt",
        entityId: attempt.id,
        payload: {
          paymentIntentId: updatedIntent.id,
          paymentAllocationId: allocation.id,
          providerKey: providerConfig.providerKey,
          status: simulated.status,
          externalReference: simulated.externalReference,
          errorMessage: simulated.errorMessage
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: updatedIntent.tenantId,
        eventName,
        aggregate: "payment_attempt",
        aggregateId: attempt.id,
        payload: {
          paymentIntentId: updatedIntent.id,
          paymentAllocationId: allocation.id,
          providerKey: providerConfig.providerKey,
          status: simulated.status
        }
      });

      return {
        intent: updatedIntent,
        providerConfig
      };
    });

    if (
      result.intent.status === "COMPLETED" &&
      result.providerConfig.autoConfirmOrderOnSuccess &&
      result.intent.order.status === "PLACED"
    ) {
      await this.ordersService.transitionOrder(context, result.intent.orderId, {
        toStatus: "CONFIRMED"
      });
    }

    return this.getIntent(context, intentId);
  }

  cancelIntent(
    context: RequestContext,
    intentId: string,
    dto: CancelPaymentIntentDto
  ): Promise<PaymentIntentDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const intent = await this.loadIntent(tx, intentId);
      this.accessControl.resolveTenantId(context, intent.tenantId);
      this.accessControl.enforceStoreAccess(context, intent.storeId);

      if (intent.status === "COMPLETED") {
        throw new BadRequestException("Completed payment intents cannot be cancelled.");
      }

      if ((decimalToString(intent.paidAmount) ?? "0.00") !== "0.00") {
        throw new BadRequestException("Partially paid payment intents cannot be cancelled.");
      }

      await tx.paymentAllocation.updateMany({
        where: {
          paymentIntentId: intent.id,
          status: {
            in: ["PENDING", "FAILED"]
          }
        },
        data: {
          status: "CANCELLED"
        }
      });

      const updated = await tx.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "CANCELLED"
        },
        include: {
          allocations: {
            orderBy: { createdAt: "asc" }
          },
          order: true
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: updated.tenantId,
        storeId: updated.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "payment.intent_cancelled",
        entityType: "payment_intent",
        entityId: updated.id,
        payload: {
          orderId: updated.orderId,
          reason: dto.reason ?? null
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: updated.tenantId,
        eventName: "payment.intent_cancelled",
        aggregate: "payment_intent",
        aggregateId: updated.id,
        payload: {
          orderId: updated.orderId,
          reason: dto.reason ?? null
        }
      });

      return mapPaymentIntent(updated);
    });
  }

  listAttempts(
    context: RequestContext,
    intentId: string
  ): Promise<ListResponse<PaymentAttemptDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const intent = await tx.paymentIntent.findUniqueOrThrow({
        where: { id: intentId }
      });
      this.accessControl.resolveTenantId(context, intent.tenantId);
      this.accessControl.enforceStoreAccess(context, intent.storeId);

      const attempts = await tx.paymentAttempt.findMany({
        where: {
          paymentIntentId: intentId
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: attempts.map(mapPaymentAttempt),
        total: attempts.length
      };
    });
  }

  reconciliationSummary(
    context: RequestContext,
    query: PaymentSummaryQueryDto
  ): Promise<PaymentReconciliationSummaryDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = query.tenantId
        ? this.accessControl.resolveTenantId(context, query.tenantId)
        : context.scope === "platform_admin"
          ? null
          : this.accessControl.resolveTenantId(context, context.tenantId);

      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const sharedStoreFilter =
        this.accessControl.storeFilter(context) && !query.storeId
          ? { storeId: this.accessControl.storeFilter(context) }
          : {};

      const intents = await tx.paymentIntent.findMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          ...sharedStoreFilter
        },
        select: {
          status: true,
          totalAmount: true,
          paidAmount: true
        }
      });

      const allocations = await tx.paymentAllocation.findMany({
        where: {
          paymentIntent: {
            ...(tenantId ? { tenantId } : {}),
            ...(query.storeId ? { storeId: query.storeId } : {}),
            ...sharedStoreFilter
          }
        },
        select: {
          method: true,
          status: true,
          amount: true
        }
      });

      const failedAttemptsCount = await tx.paymentAttempt.count({
        where: {
          status: "FAILED",
          ...(tenantId ? { tenantId } : {}),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          ...sharedStoreFilter
        }
      });

      const intentsByStatus = new Map<
        string,
        { count: number; totalAmount: Prisma.Decimal; paidAmount: Prisma.Decimal }
      >();
      for (const intent of intents) {
        const current = intentsByStatus.get(intent.status) ?? {
          count: 0,
          totalAmount: new Prisma.Decimal(0),
          paidAmount: new Prisma.Decimal(0)
        };
        current.count += 1;
        current.totalAmount = current.totalAmount.plus(intent.totalAmount);
        current.paidAmount = current.paidAmount.plus(intent.paidAmount);
        intentsByStatus.set(intent.status, current);
      }

      const allocationsByMethod = new Map<string, { count: number; amount: Prisma.Decimal }>();
      for (const allocation of allocations) {
        const key = `${allocation.method}:${allocation.status}`;
        const current = allocationsByMethod.get(key) ?? {
          count: 0,
          amount: new Prisma.Decimal(0)
        };
        current.count += 1;
        current.amount = current.amount.plus(allocation.amount);
        allocationsByMethod.set(key, current);
      }

      return {
        tenantId,
        storeId: query.storeId ?? null,
        generatedAt: new Date().toISOString(),
        intentsByStatus: Array.from(intentsByStatus.entries()).map(([status, value]) => ({
          status: status as PaymentIntentDto["status"],
          count: value.count,
          totalAmount: value.totalAmount.toFixed(2),
          paidAmount: value.paidAmount.toFixed(2)
        })),
        allocationsByMethod: Array.from(allocationsByMethod.entries()).map(([key, value]) => {
          const [method, status] = key.split(":");
          return {
            method: method as PaymentMethodKind,
            status: status as PaymentAllocationStatus,
            count: value.count,
            amount: value.amount.toFixed(2)
          };
        }),
        failedAttempts: {
          count: failedAttemptsCount
        }
      };
    });
  }

  private buildPaymentIntentWhere(
    context: RequestContext,
    query: PaymentIntentsQueryDto
  ): Prisma.PaymentIntentWhereInput {
    const tenantId = query.tenantId
      ? this.accessControl.resolveTenantId(context, query.tenantId)
      : context.scope === "platform_admin"
        ? undefined
        : this.accessControl.resolveTenantId(context, context.tenantId);

    if (query.storeId) {
      this.accessControl.enforceStoreAccess(context, query.storeId);
    }

    return {
      ...(tenantId ? { tenantId } : {}),
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(this.accessControl.storeFilter(context) && !query.storeId
        ? { storeId: this.accessControl.storeFilter(context) }
        : {})
    };
  }

  private async loadIntent(
    tx: Prisma.TransactionClient,
    intentId: string
  ): Promise<LoadedPaymentIntent> {
    return tx.paymentIntent.findUniqueOrThrow({
      where: { id: intentId },
      include: {
        allocations: {
          orderBy: { createdAt: "asc" }
        },
        order: true
      }
    });
  }

  private async ensureProviderKeyIsUnique(
    tx: Prisma.TransactionClient,
    tenantId: string,
    storeId: string | null,
    providerKey: string,
    excludeId?: string
  ): Promise<void> {
    const existing = await tx.paymentProviderConfig.findFirst({
      where: {
        tenantId,
        storeId,
        providerKey,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });

    if (existing) {
      throw new BadRequestException("A payment provider config with this key already exists.");
    }
  }

  private async resolveProviderConfigTx(
    tx: Prisma.TransactionClient,
    intent: LoadedPaymentIntent,
    method: PaymentMethodKind,
    explicitProviderKey: string | null
  ): Promise<LegacyProviderConfig> {
    const persistedConfigs = await tx.paymentProviderConfig.findMany({
      where: {
        tenantId: intent.tenantId,
        method,
        enabled: true,
        ...(explicitProviderKey ? { providerKey: explicitProviderKey } : {})
      }
    });

    const matchingConfigs = persistedConfigs
      .filter(
        (config) =>
          config.allowedChannels.includes(intent.channel) &&
          (config.storeId === null || config.storeId === intent.storeId)
      )
      .sort((left, right) => {
        if (left.storeId === intent.storeId && right.storeId !== intent.storeId) {
          return -1;
        }
        if (left.storeId !== intent.storeId && right.storeId === intent.storeId) {
          return 1;
        }
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }
        return left.createdAt.getTime() - right.createdAt.getTime();
      });

    const selected = matchingConfigs[0];
    if (selected) {
      return {
        ...selected,
        settings:
          selected.settings && typeof selected.settings === "object"
            ? (selected.settings as Record<string, unknown>)
            : null
      };
    }

    if (explicitProviderKey) {
      throw new BadRequestException("Requested payment provider config was not found.");
    }

    return {
      id: null,
      tenantId: intent.tenantId,
      storeId: null,
      providerKey: `${intent.channel.toLowerCase()}-${method.toLowerCase()}-default`,
      providerType: resolveDefaultProviderType(method),
      method,
      enabled: true,
      priority: 100,
      allowedChannels: [intent.channel],
      autoConfirmOrderOnSuccess: resolveDefaultAutoConfirm(intent.channel),
      settings: null,
      createdAt: new Date(0),
      updatedAt: new Date(0)
    };
  }

  private resolveActorType(context: RequestContext): "USER" | "DEVICE" {
    return context.scope === "device" ? "DEVICE" : "USER";
  }

  private resolveActorId(context: RequestContext): string {
    return context.scope === "device" && context.deviceId ? context.deviceId : context.userId;
  }
}

@ApiTags("payments")
@Controller("payments")
class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("provider-configs")
  @Permissions("payment_configs.read")
  listProviderConfigs(
    @CurrentContext() context: RequestContext,
    @Query() query: PaymentProviderConfigQueryDto
  ): Promise<ListResponse<PaymentProviderConfigDto>> {
    return this.paymentsService.listProviderConfigs(context, query);
  }

  @Post("provider-configs")
  @Permissions("payment_configs.write")
  createProviderConfig(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreatePaymentProviderConfigDto
  ): Promise<PaymentProviderConfigDto> {
    return this.paymentsService.createProviderConfig(context, dto);
  }

  @Patch("provider-configs/:id")
  @Permissions("payment_configs.write")
  updateProviderConfig(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdatePaymentProviderConfigDto
  ): Promise<PaymentProviderConfigDto> {
    return this.paymentsService.updateProviderConfig(context, params.id, dto);
  }

  @Get("intents")
  @Permissions("payments.read")
  listIntents(
    @CurrentContext() context: RequestContext,
    @Query() query: PaymentIntentsQueryDto
  ): Promise<ListResponse<PaymentIntentListItemDto>> {
    return this.paymentsService.listIntents(context, query);
  }

  @Get("intents/:id")
  @Permissions("payments.read")
  getIntent(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<PaymentIntentDto> {
    return this.paymentsService.getIntent(context, params.id);
  }

  @Post("intents")
  @Permissions("payments.write", "orders.read")
  createIntent(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreatePaymentIntentDto
  ): Promise<PaymentIntentDto> {
    return this.paymentsService.createIntent(context, dto);
  }

  @Post("intents/:id/allocations/:allocationId/process")
  @Permissions("payments.write")
  processAllocation(
    @CurrentContext() context: RequestContext,
    @Param() params: PaymentAllocationParamsDto,
    @Body() dto: ProcessPaymentAllocationDto
  ): Promise<PaymentIntentDto> {
    return this.paymentsService.processAllocation(context, params.id, params.allocationId, dto);
  }

  @Post("intents/:id/cancel")
  @Permissions("payments.write")
  cancelIntent(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: CancelPaymentIntentDto
  ): Promise<PaymentIntentDto> {
    return this.paymentsService.cancelIntent(context, params.id, dto);
  }

  @Get("intents/:id/attempts")
  @Permissions("payments.read")
  listAttempts(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<ListResponse<PaymentAttemptDto>> {
    return this.paymentsService.listAttempts(context, params.id);
  }

  @Get("reconciliation/summary")
  @Permissions("payments.read")
  reconciliationSummary(
    @CurrentContext() context: RequestContext,
    @Query() query: PaymentSummaryQueryDto
  ): Promise<PaymentReconciliationSummaryDto> {
    return this.paymentsService.reconciliationSummary(context, query);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
