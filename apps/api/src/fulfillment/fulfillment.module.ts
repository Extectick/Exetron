import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  AssignFulfillmentCourierRequest,
  FulfillmentDispatchBoardItemDto,
  FulfillmentOrderProjectionDto,
  FulfillmentSelectionDto,
  ListResponse,
  StoreFulfillmentConfigDto,
  UpdateFulfillmentEtaRequest,
  UpdateFulfillmentStatusRequest,
  UpdateStoreFulfillmentConfigRequest
} from "@exetron/contracts";
import { Prisma } from "@exetron/database";
import type { FulfillmentMode, FulfillmentStatus, RequestContext } from "@exetron/types";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { PrismaService } from "../database/prisma.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";
import { calculateCartTotals } from "../orders/order-money.util";
import { OrdersModule, OrdersService } from "../orders/orders.module";
import { decimalToString } from "../common/catalog-helpers";
import {
  mapFulfillmentSnapshot,
  normalizeFulfillmentSelection,
  quoteFulfillment,
  resolveStoreFulfillmentConfig
} from "./fulfillment-runtime.util";

const FULFILLMENT_CONFIG_KEY = "fulfillment.config";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function statusNotificationTemplate(status: FulfillmentStatus): string | null {
  switch (status) {
    case "READY_FOR_PICKUP":
      return "storefront-pickup-ready";
    case "OUT_FOR_DELIVERY":
      return "storefront-out-for-delivery";
    case "DELIVERED":
      return "storefront-delivered";
    case "PICKED_UP":
      return "storefront-picked-up";
    case "SERVED":
      return "storefront-served";
    default:
      return null;
  }
}

class FulfillmentSelectionInputDto {
  @ApiProperty({ enum: ["DELIVERY", "PICKUP", "DINE_IN"] })
  @IsIn(["DELIVERY", "PICKUP", "DINE_IN"])
  mode!: FulfillmentMode;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  zoneCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  addressLine1?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  contactless?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pickupSlotLabel?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  tableCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  instructions?: string | null;
}

class DeliveryZoneInputDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  postalCodes!: string[];

  @ApiProperty()
  @IsString()
  fee!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  etaMinMinutes!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  etaMaxMinutes!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  slaMinutes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class PickupConfigInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  leadTimeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  promisedWindowMinutes?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  instructions?: string | null;
}

class DineInTableInputDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class DineInConfigInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  leadTimeMinutes?: number;

  @ApiPropertyOptional({ type: [DineInTableInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DineInTableInputDto)
  tables?: DineInTableInputDto[];
}

class FulfillmentProviderInputDto {
  @ApiProperty()
  @IsString()
  providerKey!: string;

  @ApiPropertyOptional({ enum: ["MANUAL", "EXTERNAL_PLACEHOLDER"] })
  @IsOptional()
  @IsIn(["MANUAL", "EXTERNAL_PLACEHOLDER"])
  providerType?: "MANUAL" | "EXTERNAL_PLACEHOLDER";

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

class FulfillmentQueryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;
}

class UpdateStoreFulfillmentConfigDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiPropertyOptional({ enum: ["DELIVERY", "PICKUP", "DINE_IN"], isArray: true })
  @IsOptional()
  @IsArray()
  enabledModes?: FulfillmentMode[];

  @ApiPropertyOptional({ enum: ["DELIVERY", "PICKUP", "DINE_IN"] })
  @IsOptional()
  @IsIn(["DELIVERY", "PICKUP", "DINE_IN"])
  defaultMode?: FulfillmentMode;

  @ApiPropertyOptional({ type: [DeliveryZoneInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryZoneInputDto)
  deliveryZones?: DeliveryZoneInputDto[];

  @ApiPropertyOptional({ type: PickupConfigInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PickupConfigInputDto)
  pickup?: PickupConfigInputDto;

  @ApiPropertyOptional({ type: DineInConfigInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DineInConfigInputDto)
  dineIn?: DineInConfigInputDto;

  @ApiPropertyOptional({ type: [FulfillmentProviderInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FulfillmentProviderInputDto)
  providers?: FulfillmentProviderInputDto[];
}

class AssignFulfillmentCourierDto {
  @ApiProperty()
  @IsString()
  courierName!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  courierPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  courierExternalId?: string | null;
}

class UpdateFulfillmentEtaDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  etaAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  promisedAt?: string | null;
}

class UpdateFulfillmentStatusDto {
  @ApiProperty({
    enum: [
      "PENDING",
      "SCHEDULED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "PICKED_UP",
      "TABLE_ASSIGNED",
      "SERVED"
    ]
  })
  @IsIn([
    "PENDING",
    "SCHEDULED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "PICKED_UP",
    "TABLE_ASSIGNED",
    "SERVED"
  ])
  status!: FulfillmentStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

@Injectable()
export class FulfillmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly ordersService: OrdersService
  ) {}

  async getStoreConfig(
    context: RequestContext,
    storeId: string
  ): Promise<StoreFulfillmentConfigDto> {
    this.accessControl.enforceStoreAccess(context, storeId);
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: storeId }
    });
    this.accessControl.resolveTenantId(context, store.tenantId);
    const configValue = await this.loadConfigValue(storeId);
    return resolveStoreFulfillmentConfig(storeId, configValue);
  }

  async getPublicStoreConfig(storeId: string): Promise<StoreFulfillmentConfigDto> {
    const configValue = await this.loadConfigValue(storeId);
    return resolveStoreFulfillmentConfig(storeId, configValue);
  }

  async upsertStoreConfig(
    context: RequestContext,
    dto: UpdateStoreFulfillmentConfigDto
  ): Promise<StoreFulfillmentConfigDto> {
    this.accessControl.enforceStoreAccess(context, dto.storeId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const store = await tx.store.findUniqueOrThrow({ where: { id: dto.storeId } });
      this.accessControl.resolveTenantId(context, store.tenantId);

      const current = resolveStoreFulfillmentConfig(
        dto.storeId,
        await this.loadConfigValue(dto.storeId, tx)
      );
      const next = resolveStoreFulfillmentConfig(dto.storeId, {
        ...current,
        ...dto
      });

      const setting = await tx.storeSetting.upsert({
        where: {
          storeId_key: {
            storeId: dto.storeId,
            key: FULFILLMENT_CONFIG_KEY
          }
        },
        update: {
          value: next as unknown as Prisma.InputJsonObject
        },
        create: {
          tenantId: store.tenantId,
          storeId: dto.storeId,
          key: FULFILLMENT_CONFIG_KEY,
          value: next as unknown as Prisma.InputJsonObject
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: store.tenantId,
        storeId: store.id,
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        action: "fulfillment.config_upserted",
        entityType: "store_setting",
        entityId: setting.id,
        payload: {
          key: setting.key,
          enabledModes: next.enabledModes,
          defaultMode: next.defaultMode
        }
      });

      return next;
    });
  }

  async applyCartFulfillment(
    context: RequestContext,
    cartId: string,
    selectionInput: FulfillmentSelectionDto
  ) {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const cart = await tx.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: {
          items: {
            select: {
              quantity: true,
              unitBasePrice: true,
              modifierTotal: true
            }
          }
        }
      });
      this.accessControl.resolveTenantId(context, cart.tenantId);
      this.accessControl.enforceStoreAccess(context, cart.storeId);

      if (cart.status !== "OPEN") {
        throw new BadRequestException("Only open carts can update fulfillment.");
      }

      const selection = normalizeFulfillmentSelection(selectionInput);
      if (!selection) {
        throw new BadRequestException("Fulfillment selection is invalid.");
      }

      const config = resolveStoreFulfillmentConfig(
        cart.storeId,
        await this.loadConfigValue(cart.storeId, tx)
      );
      let quote;
      try {
        quote = quoteFulfillment(config, selection);
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : "Invalid fulfillment selection.");
      }

      const totals = calculateCartTotals(
        cart.items.map((item) => ({
          quantity: item.quantity,
          unitBasePrice: decimalToString(item.unitBasePrice),
          modifierTotal: decimalToString(item.modifierTotal) ?? "0.00"
        })),
        {
          fulfillmentFee: quote.fee,
          discountTotal: "0.00"
        }
      );

      await tx.cart.update({
        where: { id: cartId },
        data: {
          fulfillmentMode: quote.selection.mode,
          fulfillmentStatus: quote.status,
          fulfillmentFee: quote.fee,
          discountTotal: "0.00",
          promotionCode: null,
          promotionSnapshot: Prisma.DbNull,
          fulfillmentPayload: quote.selection as unknown as Prisma.InputJsonObject,
          promisedAt: quote.promisedAt ? new Date(quote.promisedAt) : null,
          etaAt: quote.etaAt ? new Date(quote.etaAt) : null,
          subtotal: totals.subtotal,
          modifierTotal: totals.modifierTotal,
          total: totals.total
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: cart.tenantId,
        storeId: cart.storeId,
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        action: "cart.fulfillment_updated",
        entityType: "cart",
        entityId: cart.id,
        payload: {
          fulfillmentMode: quote.selection.mode,
          fulfillmentStatus: quote.status,
          fulfillmentFee: quote.fee,
          promisedAt: quote.promisedAt,
          etaAt: quote.etaAt
        }
      });
    });
  }

  async getOrderProjection(
    context: RequestContext,
    orderId: string
  ): Promise<FulfillmentOrderProjectionDto> {
    const [order, events] = await Promise.all([
      this.ordersService.getOrder(context, orderId),
      this.ordersService.listOrderEvents(context, orderId)
    ]);

    return {
      order,
      fulfillment: order.fulfillment,
      events: events.items
    };
  }

  async listDispatchBoard(
    context: RequestContext,
    storeId: string
  ): Promise<ListResponse<FulfillmentDispatchBoardItemDto>> {
    this.accessControl.enforceStoreAccess(context, storeId);

    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: storeId }
    });
    this.accessControl.resolveTenantId(context, store.tenantId);

    const orders = await this.dbContext.withRequestContext(context, (tx) =>
      tx.order.findMany({
        where: {
          tenantId: store.tenantId,
          storeId,
          fulfillmentMode: { not: null },
          status: { notIn: ["COMPLETED", "CANCELLED"] }
        },
        include: {
          items: {
            include: {
              modifiers: {
                orderBy: { createdAt: "asc" }
              }
            },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: [{ promisedAt: "asc" }, { placedAt: "asc" }]
      })
    );

    const items = orders.map((order) => ({
      orderId: order.id,
      number: order.number,
      storeId: order.storeId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      orderStatus: order.status,
      fulfillment: mapFulfillmentSnapshot({
        mode: order.fulfillmentMode,
        status: order.fulfillmentStatus,
        fee: decimalToString(order.fulfillmentFee),
        promisedAt: order.promisedAt,
        etaAt: order.etaAt,
        payload: order.fulfillmentPayload
      }),
      total: decimalToString(order.total) ?? "0.00",
      placedAt: order.placedAt.toISOString()
    }));

    return {
      items,
      total: items.length
    };
  }

  async assignCourier(
    context: RequestContext,
    orderId: string,
    dto: AssignFulfillmentCourierDto
  ): Promise<FulfillmentOrderProjectionDto> {
    await this.dbContext.withRequestContext(context, async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      this.accessControl.resolveTenantId(context, order.tenantId);
      this.accessControl.enforceStoreAccess(context, order.storeId);

      const nextPayload = {
        ...(asRecord(order.fulfillmentPayload) ?? {}),
        courier: {
          courierName: dto.courierName,
          courierPhone: dto.courierPhone ?? null,
          courierExternalId: dto.courierExternalId ?? null
        }
      };

      await tx.order.update({
        where: { id: orderId },
        data: {
          fulfillmentPayload: nextPayload as Prisma.InputJsonObject
        }
      });

      await this.recordFulfillmentEvent(tx, {
        orderId,
        tenantId: order.tenantId,
        storeId: order.storeId,
        type: "fulfillment.assignment_updated",
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        payload: {
          orderId,
          courierName: dto.courierName,
          courierPhone: dto.courierPhone ?? null,
          courierExternalId: dto.courierExternalId ?? null
        }
      });
    });

    return this.getOrderProjection(context, orderId);
  }

  async updateEta(
    context: RequestContext,
    orderId: string,
    dto: UpdateFulfillmentEtaDto
  ): Promise<FulfillmentOrderProjectionDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      this.accessControl.resolveTenantId(context, order.tenantId);
      this.accessControl.enforceStoreAccess(context, order.storeId);

      await tx.order.update({
        where: { id: orderId },
        data: {
          etaAt: dto.etaAt ? new Date(dto.etaAt) : null,
          promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : order.promisedAt
        }
      });

      await this.recordFulfillmentEvent(tx, {
        orderId,
        tenantId: order.tenantId,
        storeId: order.storeId,
        type: "fulfillment.eta_updated",
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        payload: {
          orderId,
          etaAt: dto.etaAt ?? null,
          promisedAt: dto.promisedAt ?? order.promisedAt?.toISOString() ?? null
        }
      });
    }).then(() => this.getOrderProjection(context, orderId));
  }

  async updateStatus(
    context: RequestContext,
    orderId: string,
    dto: UpdateFulfillmentStatusDto
  ): Promise<FulfillmentOrderProjectionDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      this.accessControl.resolveTenantId(context, order.tenantId);
      this.accessControl.enforceStoreAccess(context, order.storeId);

      await tx.order.update({
        where: { id: orderId },
        data: {
          fulfillmentStatus: dto.status
        }
      });

      await this.recordFulfillmentEvent(tx, {
        orderId,
        tenantId: order.tenantId,
        storeId: order.storeId,
        type: "fulfillment.status_updated",
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        payload: {
          orderId,
          status: dto.status,
          note: dto.note ?? null
        }
      });

      const templateKey = statusNotificationTemplate(dto.status);
      if (order.customerPhone && templateKey) {
        await this.recordFulfillmentEvent(tx, {
          orderId,
          tenantId: order.tenantId,
          storeId: order.storeId,
          type: "storefront.notification_queued",
          actorType: context.scope === "device" ? "DEVICE" : "USER",
          actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
          payload: {
            orderId,
            trigger: "fulfillment.status_updated",
            templateKey,
            customerPhone: order.customerPhone,
            deliveryPath: "async_event"
          }
        });
      }
    }).then(() => this.getOrderProjection(context, orderId));
  }

  private async loadConfigValue(
    storeId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma
  ): Promise<Prisma.JsonValue | null> {
    const setting = await tx.storeSetting.findUnique({
      where: {
        storeId_key: {
          storeId,
          key: FULFILLMENT_CONFIG_KEY
        }
      }
    });

    return setting?.value ?? null;
  }

  private async recordFulfillmentEvent(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      tenantId: string;
      storeId: string;
      type: string;
      actorType: "USER" | "DEVICE";
      actorId: string;
      payload: Record<string, unknown>;
    }
  ) {
    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        tenantId: input.tenantId,
        storeId: input.storeId,
        type: input.type,
        payload: input.payload as Prisma.InputJsonObject
      }
    });

    await this.audit.recordTx(tx, {
      tenantId: input.tenantId,
      storeId: input.storeId,
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.type,
      entityType: "order",
      entityId: input.orderId,
      payload: input.payload
    });

    await this.domainEvents.record(tx, {
      tenantId: input.tenantId,
      eventName: input.type,
      aggregate: "order",
      aggregateId: input.orderId,
      payload: input.payload
    });
  }
}

@ApiTags("fulfillment")
@Controller("fulfillment")
class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Get("config")
  @Permissions("settings.read")
  getConfig(
    @CurrentContext() context: RequestContext,
    @Query() query: FulfillmentQueryDto
  ): Promise<StoreFulfillmentConfigDto> {
    return this.fulfillmentService.getStoreConfig(context, query.storeId);
  }

  @Put("config/store")
  @Permissions("settings.write")
  upsertConfig(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpdateStoreFulfillmentConfigDto
  ): Promise<StoreFulfillmentConfigDto> {
    return this.fulfillmentService.upsertStoreConfig(context, dto);
  }

  @Get("dispatch-board")
  @Permissions("orders.read")
  listDispatchBoard(
    @CurrentContext() context: RequestContext,
    @Query() query: FulfillmentQueryDto
  ): Promise<ListResponse<FulfillmentDispatchBoardItemDto>> {
    return this.fulfillmentService.listDispatchBoard(context, query.storeId);
  }

  @Get("orders/:id")
  @Permissions("orders.read")
  getOrderProjection(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<FulfillmentOrderProjectionDto> {
    return this.fulfillmentService.getOrderProjection(context, params.id);
  }

  @Post("orders/:id/assignment")
  @Permissions("orders.write")
  assignCourier(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: AssignFulfillmentCourierDto
  ): Promise<FulfillmentOrderProjectionDto> {
    return this.fulfillmentService.assignCourier(context, params.id, dto);
  }

  @Post("orders/:id/eta")
  @Permissions("orders.write")
  updateEta(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateFulfillmentEtaDto
  ): Promise<FulfillmentOrderProjectionDto> {
    return this.fulfillmentService.updateEta(context, params.id, dto);
  }

  @Post("orders/:id/status")
  @Permissions("orders.write")
  updateStatus(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateFulfillmentStatusDto
  ): Promise<FulfillmentOrderProjectionDto> {
    return this.fulfillmentService.updateStatus(context, params.id, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule, OrdersModule],
  controllers: [FulfillmentController],
  providers: [FulfillmentService],
  exports: [FulfillmentService]
})
export class FulfillmentModule {}
