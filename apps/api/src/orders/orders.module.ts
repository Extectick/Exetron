import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  AddCartItemRequest,
  CartDto,
  CartItemDto,
  CheckoutCartRequest,
  CreateCartRequest,
  ListResponse,
  OrderDto,
  OrderEventDto,
  TransitionOrderRequest,
  UpdateCartItemRequest,
  UpdateCartRequest
} from "@exetron/contracts";
import { Prisma } from "@exetron/database";
import type { OrderChannel, OrderStatus, RequestContext } from "@exetron/types";
import { randomUUID } from "node:crypto";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { decimalToString } from "../common/catalog-helpers";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";
import { OperationsRealtimeService, KitchenModule } from "../kitchen/kitchen.module";
import {
  InventoryModule,
  InventoryService,
  type InventoryReservationPlanEntry
} from "../inventory/inventory.module";
import {
  resolveKitchenRoutingConfig,
  resolveKitchenStationKey
} from "../kitchen/kitchen-runtime.util";
import { PricingModule, PricingService } from "../pricing/pricing.module";
import { mapFulfillmentSnapshot } from "../fulfillment/fulfillment-runtime.util";
import {
  calculateCartTotals,
  calculateLineTotals
} from "./order-money.util";
import {
  canTransitionOrder,
  resolveRefundStatusOnCancel
} from "./order-lifecycle.util";

class CartItemParamsDto extends IdParamDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  itemId!: string;
}

class CartsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ enum: ["OPEN", "CONVERTED"] })
  @IsOptional()
  @IsIn(["OPEN", "CONVERTED"])
  status?: "OPEN" | "CONVERTED";
}

class OrdersQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    enum: ["PLACED", "CONFIRMED", "IN_PREPARATION", "READY", "COMPLETED", "CANCELLED"]
  })
  @IsOptional()
  @IsIn(["PLACED", "CONFIRMED", "IN_PREPARATION", "READY", "COMPLETED", "CANCELLED"])
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: ["ADMIN", "POS", "KIOSK", "DELIVERY"] })
  @IsOptional()
  @IsIn(["ADMIN", "POS", "KIOSK", "DELIVERY"])
  channel?: OrderChannel;
}

class CreateCartDto implements CreateCartRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiPropertyOptional({ enum: ["ADMIN", "POS", "KIOSK", "DELIVERY"] })
  @IsOptional()
  @IsIn(["ADMIN", "POS", "KIOSK", "DELIVERY"])
  channel?: OrderChannel;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  deviceId?: string | null;
}

class UpdateCartDto implements UpdateCartRequest {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

class AddCartItemDto implements AddCartItemRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  priceListId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  modifierOptionIds?: string[];
}

class UpdateCartItemDto implements UpdateCartItemRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  priceListId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  modifierOptionIds?: string[];
}

class CheckoutCartDto implements CheckoutCartRequest {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

class TransitionOrderDto implements TransitionOrderRequest {
  @ApiProperty({
    enum: ["PLACED", "CONFIRMED", "IN_PREPARATION", "READY", "COMPLETED", "CANCELLED"]
  })
  @IsIn(["PLACED", "CONFIRMED", "IN_PREPARATION", "READY", "COMPLETED", "CANCELLED"])
  toStatus!: OrderStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasExternalPayment?: boolean;
}

type LoadedCart = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        modifiers: true;
      };
    };
  };
}>;

type LoadedOrder = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        modifiers: true;
      };
    };
  };
}>;

function mapCartItem(item: LoadedCart["items"][number]): CartItemDto {
  return {
    id: item.id,
    cartId: item.cartId,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    priceListId: item.priceListId,
    unitBasePrice: decimalToString(item.unitBasePrice),
    modifierTotal: decimalToString(item.modifierTotal) ?? "0.00",
    lineTotal: decimalToString(item.lineTotal) ?? "0.00",
    snapshot: item.snapshot as Record<string, unknown>,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    modifiers: item.modifiers.map((modifier) => ({
      id: modifier.id,
      modifierGroupId: modifier.modifierGroupId,
      modifierOptionId: modifier.modifierOptionId,
      nameSnapshot: modifier.nameSnapshot,
      priceDelta: decimalToString(modifier.priceDelta) ?? "0.00"
    }))
  };
}

function mapAppliedPromotion(
  value: Prisma.JsonValue | null,
  discountTotal: Prisma.Decimal
): {
  code: string;
  name: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "LOYALTY_REDEEM";
  discountTotal: string;
  pointsCost: number | null;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return {
    code: typeof value.code === "string" ? value.code : "PROMO",
    name: typeof value.name === "string" ? value.name : "Promotion",
    type:
      value.type === "PERCENTAGE" ||
      value.type === "FIXED_AMOUNT" ||
      value.type === "LOYALTY_REDEEM"
        ? value.type
        : "FIXED_AMOUNT",
    discountTotal:
      typeof value.discountTotal === "string"
        ? value.discountTotal
        : decimalToString(discountTotal) ?? "0.00",
    pointsCost: typeof value.pointsCost === "number" ? value.pointsCost : null
  };
}

function mapCart(cart: LoadedCart): CartDto {
  return {
    id: cart.id,
    tenantId: cart.tenantId,
    storeId: cart.storeId,
    customerProfileId: cart.customerProfileId,
    channel: cart.channel,
    status: cart.status,
    customerName: cart.customerName,
    customerPhone: cart.customerPhone,
    note: cart.note,
    subtotal: decimalToString(cart.subtotal) ?? "0.00",
    modifierTotal: decimalToString(cart.modifierTotal) ?? "0.00",
    fulfillmentFee: decimalToString(cart.fulfillmentFee) ?? "0.00",
    discountTotal: decimalToString(cart.discountTotal) ?? "0.00",
    total: decimalToString(cart.total) ?? "0.00",
    promotion: mapAppliedPromotion(cart.promotionSnapshot, cart.discountTotal),
    fulfillment: mapFulfillmentSnapshot({
      mode: cart.fulfillmentMode,
      status: cart.fulfillmentStatus,
      fee: decimalToString(cart.fulfillmentFee),
      promisedAt: cart.promisedAt,
      etaAt: cart.etaAt,
      payload: cart.fulfillmentPayload
    }),
    deviceId: cart.deviceId,
    createdByUserId: cart.createdByUserId,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
    items: cart.items.map(mapCartItem)
  };
}

function mapOrderItem(item: LoadedOrder["items"][number]) {
  return {
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    unitBasePrice: decimalToString(item.unitBasePrice),
    modifierTotal: decimalToString(item.modifierTotal) ?? "0.00",
    lineTotal: decimalToString(item.lineTotal) ?? "0.00",
    snapshot: item.snapshot as Record<string, unknown>,
    createdAt: item.createdAt.toISOString(),
    modifiers: item.modifiers.map((modifier) => ({
      id: modifier.id,
      modifierGroupId: modifier.modifierGroupId,
      modifierOptionId: modifier.modifierOptionId,
      nameSnapshot: modifier.nameSnapshot,
      priceDelta: decimalToString(modifier.priceDelta) ?? "0.00"
    }))
  };
}

function mapOrder(order: LoadedOrder): OrderDto {
  return {
    id: order.id,
    tenantId: order.tenantId,
    storeId: order.storeId,
    cartId: order.cartId,
    customerProfileId: order.customerProfileId,
    number: order.number,
    channel: order.channel,
    status: order.status,
    refundStatus: order.refundStatus,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    note: order.note,
    subtotal: decimalToString(order.subtotal) ?? "0.00",
    modifierTotal: decimalToString(order.modifierTotal) ?? "0.00",
    fulfillmentFee: decimalToString(order.fulfillmentFee) ?? "0.00",
    discountTotal: decimalToString(order.discountTotal) ?? "0.00",
    total: decimalToString(order.total) ?? "0.00",
    promotion: mapAppliedPromotion(order.promotionSnapshot, order.discountTotal),
    fulfillment: mapFulfillmentSnapshot({
      mode: order.fulfillmentMode,
      status: order.fulfillmentStatus,
      fee: decimalToString(order.fulfillmentFee),
      promisedAt: order.promisedAt,
      etaAt: order.etaAt,
      payload: order.fulfillmentPayload
    }),
    cancelReason: order.cancelReason,
    deviceId: order.deviceId,
    createdByUserId: order.createdByUserId,
    placedAt: order.placedAt.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(mapOrderItem)
  };
}

function mapOrderEvent(event: {
  id: string;
  orderId: string;
  tenantId: string;
  storeId: string;
  type: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
}): OrderEventDto {
  return {
    id: event.id,
    orderId: event.orderId,
    tenantId: event.tenantId,
    storeId: event.storeId,
    type: event.type,
    payload: event.payload as Record<string, unknown>,
    createdAt: event.createdAt.toISOString()
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly pricingService: PricingService,
    private readonly realtime: OperationsRealtimeService,
    private readonly inventoryService: InventoryService
  ) {}

  listCarts(
    context: RequestContext,
    query: CartsQueryDto
  ): Promise<ListResponse<CartDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const carts = await tx.cart.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(this.accessControl.storeFilter(context) && !query.storeId
            ? { storeId: this.accessControl.storeFilter(context) }
            : {})
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
        orderBy: { createdAt: "desc" }
      });

      return {
        items: carts.map(mapCart),
        total: carts.length
      };
    });
  }

  getCart(context: RequestContext, cartId: string): Promise<CartDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const cart = await this.loadCart(tx, cartId);
      this.accessControl.resolveTenantId(context, cart.tenantId);
      this.accessControl.enforceStoreAccess(context, cart.storeId);
      return mapCart(cart);
    });
  }

  createCart(context: RequestContext, dto: CreateCartDto): Promise<CartDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const store = await tx.store.findUniqueOrThrow({
        where: { id: dto.storeId }
      });
      const tenantId = this.accessControl.resolveTenantId(
        context,
        dto.tenantId ?? store.tenantId
      );
      this.accessControl.enforceStoreAccess(context, store.id);

      if (store.tenantId !== tenantId) {
        throw new BadRequestException("Store tenant mismatch.");
      }

      if (dto.deviceId) {
        await this.ensureDeviceBelongsToStore(tx, tenantId, store.id, dto.deviceId);
      }

      const cart = await tx.cart.create({
        data: {
          tenantId,
          storeId: store.id,
          channel: dto.channel ?? "ADMIN",
          customerName: dto.customerName ?? null,
          customerPhone: dto.customerPhone ?? null,
          note: dto.note ?? null,
          deviceId: dto.deviceId ?? null,
          createdByUserId: this.resolveCreatedByUserId(context)
        },
        include: {
          items: {
            include: {
              modifiers: {
                orderBy: { createdAt: "asc" }
              }
            }
          }
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        storeId: store.id,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "cart.created",
        entityType: "cart",
        entityId: cart.id,
        payload: {
          channel: cart.channel,
          deviceId: cart.deviceId
        }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "cart.created",
        aggregate: "cart",
        aggregateId: cart.id,
        payload: {
          cartId: cart.id,
          storeId: cart.storeId,
          channel: cart.channel
        }
      });

      return mapCart(cart);
    });
  }

  updateCart(
    context: RequestContext,
    cartId: string,
    dto: UpdateCartDto
  ): Promise<CartDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const cart = await this.loadCart(tx, cartId);
      this.ensureCartOpen(cart);
      this.accessControl.resolveTenantId(context, cart.tenantId);
      this.accessControl.enforceStoreAccess(context, cart.storeId);
      const shouldResetPromotion =
        dto.customerPhone !== undefined &&
        (dto.customerPhone ?? null) !== (cart.customerPhone ?? null);

      if (shouldResetPromotion) {
        await this.clearCartPromotionTx(tx, cart.id);
      }

      const updatedCart = await tx.cart.update({
        where: { id: cart.id },
        data: {
          ...(shouldResetPromotion ? { customerProfileId: null } : {}),
          ...(dto.customerName !== undefined ? { customerName: dto.customerName } : {}),
          ...(dto.customerPhone !== undefined ? { customerPhone: dto.customerPhone } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {})
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
        }
      });

      if (shouldResetPromotion) {
        await this.recalculateCartTotals(tx, cart.id);
      }

      await this.audit.recordTx(tx, {
        tenantId: updatedCart.tenantId,
        storeId: updatedCart.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "cart.updated",
        entityType: "cart",
        entityId: updatedCart.id,
        payload: dto as Record<string, unknown>
      });

      await this.domainEvents.record(tx, {
        tenantId: updatedCart.tenantId,
        eventName: "cart.updated",
        aggregate: "cart",
        aggregateId: updatedCart.id,
        payload: {
          cartId: updatedCart.id
        }
      });

      return mapCart(updatedCart);
    });
  }

  addItem(
    context: RequestContext,
    cartId: string,
    dto: AddCartItemDto
  ): Promise<CartDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const cart = await this.loadCart(tx, cartId);
      this.ensureCartOpen(cart);
      this.accessControl.resolveTenantId(context, cart.tenantId);
      this.accessControl.enforceStoreAccess(context, cart.storeId);

      const resolvedItem = await this.resolveCartItemSelection(tx, context, {
        tenantId: cart.tenantId,
        storeId: cart.storeId,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
        priceListId: dto.priceListId ?? null,
        modifierOptionIds: dto.modifierOptionIds ?? []
      });

      const lineTotals = calculateLineTotals({
        quantity: dto.quantity,
        unitBasePrice: resolvedItem.price.basePrice,
        modifierPriceDeltas: resolvedItem.price.modifierBreakdown.map(
          (modifier) => modifier.priceDelta
        )
      });

      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId: resolvedItem.product.id,
          variantId: resolvedItem.variant?.id ?? null,
          priceListId: resolvedItem.price.priceListId,
          quantity: dto.quantity,
          unitBasePrice: resolvedItem.price.basePrice,
          modifierTotal: lineTotals.modifierTotal,
          lineTotal: lineTotals.lineTotal,
          snapshot: resolvedItem.snapshot as Prisma.InputJsonObject,
          modifiers: {
            create: resolvedItem.snapshot.modifiers.map((modifier) => ({
              modifierGroupId: modifier.groupId,
              modifierOptionId: modifier.optionId,
              nameSnapshot: modifier.optionName,
              priceDelta: modifier.priceDelta
            }))
          }
        }
      });

      await this.clearCartPromotionTx(tx, cart.id);
      await this.recalculateCartTotals(tx, cart.id);
      const updatedCart = await this.loadCart(tx, cart.id);

      await this.audit.recordTx(tx, {
        tenantId: cart.tenantId,
        storeId: cart.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "cart.item_added",
        entityType: "cart",
        entityId: cart.id,
        payload: {
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          quantity: dto.quantity
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: cart.tenantId,
        eventName: "cart.item_added",
        aggregate: "cart",
        aggregateId: cart.id,
        payload: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity
        }
      });

      return mapCart(updatedCart);
    });
  }

  updateItem(
    context: RequestContext,
    cartId: string,
    itemId: string,
    dto: UpdateCartItemDto
  ): Promise<CartDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const cart = await this.loadCart(tx, cartId);
      this.ensureCartOpen(cart);
      this.accessControl.resolveTenantId(context, cart.tenantId);
      this.accessControl.enforceStoreAccess(context, cart.storeId);

      const currentItem = cart.items.find((item) => item.id === itemId);
      if (!currentItem) {
        throw new BadRequestException("Cart item was not found.");
      }

      const selection = await this.resolveCartItemSelection(tx, context, {
        tenantId: cart.tenantId,
        storeId: cart.storeId,
        productId: currentItem.productId,
        variantId:
          dto.variantId !== undefined ? dto.variantId ?? null : currentItem.variantId ?? null,
        priceListId:
          dto.priceListId !== undefined
            ? dto.priceListId ?? null
            : currentItem.priceListId ?? null,
        modifierOptionIds:
          dto.modifierOptionIds ?? currentItem.modifiers.map((modifier) => modifier.modifierOptionId)
      });

      const quantity = dto.quantity ?? currentItem.quantity;
      const lineTotals = calculateLineTotals({
        quantity,
        unitBasePrice: selection.price.basePrice,
        modifierPriceDeltas: selection.price.modifierBreakdown.map((modifier) => modifier.priceDelta)
      });

      await tx.cartItem.update({
        where: { id: currentItem.id },
        data: {
          variantId: selection.variant?.id ?? null,
          priceListId: selection.price.priceListId,
          quantity,
          unitBasePrice: selection.price.basePrice,
          modifierTotal: lineTotals.modifierTotal,
          lineTotal: lineTotals.lineTotal,
          snapshot: selection.snapshot as Prisma.InputJsonObject,
          modifiers: {
            deleteMany: {},
            create: selection.snapshot.modifiers.map((modifier) => ({
              modifierGroupId: modifier.groupId,
              modifierOptionId: modifier.optionId,
              nameSnapshot: modifier.optionName,
              priceDelta: modifier.priceDelta
            }))
          }
        }
      });

      await this.clearCartPromotionTx(tx, cart.id);
      await this.recalculateCartTotals(tx, cart.id);
      const updatedCart = await this.loadCart(tx, cart.id);

      await this.audit.recordTx(tx, {
        tenantId: cart.tenantId,
        storeId: cart.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "cart.item_updated",
        entityType: "cart",
        entityId: cart.id,
        payload: {
          itemId,
          quantity
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: cart.tenantId,
        eventName: "cart.item_updated",
        aggregate: "cart",
        aggregateId: cart.id,
        payload: {
          cartId: cart.id,
          itemId
        }
      });

      return mapCart(updatedCart);
    });
  }

  deleteItem(
    context: RequestContext,
    cartId: string,
    itemId: string
  ): Promise<CartDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const cart = await this.loadCart(tx, cartId);
      this.ensureCartOpen(cart);
      this.accessControl.resolveTenantId(context, cart.tenantId);
      this.accessControl.enforceStoreAccess(context, cart.storeId);

      const currentItem = cart.items.find((item) => item.id === itemId);
      if (!currentItem) {
        throw new BadRequestException("Cart item was not found.");
      }

      await tx.cartItem.delete({
        where: { id: itemId }
      });

      await this.clearCartPromotionTx(tx, cart.id);
      await this.recalculateCartTotals(tx, cart.id);
      const updatedCart = await this.loadCart(tx, cart.id);

      await this.audit.recordTx(tx, {
        tenantId: cart.tenantId,
        storeId: cart.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "cart.item_removed",
        entityType: "cart",
        entityId: cart.id,
        payload: {
          itemId
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: cart.tenantId,
        eventName: "cart.item_removed",
        aggregate: "cart",
        aggregateId: cart.id,
        payload: {
          cartId: cart.id,
          itemId
        }
      });

      return mapCart(updatedCart);
    });
  }

  checkout(
    context: RequestContext,
    cartId: string,
    dto: CheckoutCartDto
  ): Promise<OrderDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const cart = await this.loadCart(tx, cartId);
      this.ensureCartOpen(cart);
      this.accessControl.resolveTenantId(context, cart.tenantId);
      this.accessControl.enforceStoreAccess(context, cart.storeId);

      if (!cart.items.length) {
        throw new BadRequestException("Cart must have at least one item before checkout.");
      }

      const inventoryReservationPlan = await this.inventoryService.buildReservationPlanTx(tx, {
        tenantId: cart.tenantId,
        storeId: cart.storeId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        }))
      });
      const orderId = randomUUID();

      const order = await tx.order.create({
        data: {
          id: orderId,
          tenantId: cart.tenantId,
          storeId: cart.storeId,
          cartId: cart.id,
          customerProfileId: cart.customerProfileId,
          number: this.generateOrderNumber(),
          channel: cart.channel,
          status: "PLACED",
          refundStatus: "NONE",
          customerName: dto.customerName ?? cart.customerName,
          customerPhone: dto.customerPhone ?? cart.customerPhone,
          note: dto.note ?? cart.note,
          subtotal: cart.subtotal,
          modifierTotal: cart.modifierTotal,
          fulfillmentFee: cart.fulfillmentFee,
          discountTotal: cart.discountTotal,
          total: cart.total,
          promotionCode: cart.promotionCode,
          promotionSnapshot:
            (cart.promotionSnapshot as Prisma.InputJsonValue | undefined) ?? undefined,
          fulfillmentMode: cart.fulfillmentMode,
          fulfillmentStatus: cart.fulfillmentStatus,
          fulfillmentPayload:
            (cart.fulfillmentPayload as Prisma.InputJsonValue | undefined) ?? undefined,
          promisedAt: cart.promisedAt,
          etaAt: cart.etaAt,
          placedAt: new Date(),
          deviceId: cart.deviceId,
          createdByUserId: cart.createdByUserId,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitBasePrice: item.unitBasePrice,
              modifierTotal: item.modifierTotal,
              lineTotal: item.lineTotal,
              snapshot: item.snapshot as Prisma.InputJsonObject,
              modifiers: {
                create: item.modifiers.map((modifier) => ({
                  modifierGroupId: modifier.modifierGroupId,
                  modifierOptionId: modifier.modifierOptionId,
                  nameSnapshot: modifier.nameSnapshot,
                  priceDelta: modifier.priceDelta
                }))
              }
            }))
          }
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
        }
      });

      await this.inventoryService.reserveOrderInventoryTx(
        tx,
        order.tenantId,
        order.id,
        inventoryReservationPlan
      );

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          status: "CONVERTED",
          customerProfileId: order.customerProfileId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          note: order.note,
          fulfillmentStatus: order.fulfillmentStatus
        }
      });

      await this.recordOrderEvent(tx, {
        orderId: order.id,
        tenantId: order.tenantId,
        storeId: order.storeId,
        type: "order.placed",
        payload: {
          orderId: order.id,
          cartId: cart.id,
          status: order.status,
          total: decimalToString(order.total),
          fulfillmentMode: order.fulfillmentMode,
          fulfillmentStatus: order.fulfillmentStatus,
          promisedAt: order.promisedAt?.toISOString() ?? null,
          etaAt: order.etaAt?.toISOString() ?? null
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: order.tenantId,
        storeId: order.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "order.placed",
        entityType: "order",
        entityId: order.id,
        payload: {
          cartId: cart.id,
          number: order.number,
          total: decimalToString(order.total),
          fulfillmentMode: order.fulfillmentMode,
          fulfillmentStatus: order.fulfillmentStatus
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: order.tenantId,
        eventName: "order.placed",
        aggregate: "order",
        aggregateId: order.id,
        payload: {
          orderId: order.id,
          cartId: cart.id,
          status: order.status,
          total: decimalToString(order.total),
          fulfillmentMode: order.fulfillmentMode,
          fulfillmentStatus: order.fulfillmentStatus
        }
      });

      await this.enqueueStorefrontCustomerUpdates(tx, order, {
        trigger: "order.placed",
        templateKey: "storefront-order-placed"
      });

      return mapOrder(order);
    });
  }

  listOrders(
    context: RequestContext,
    query: OrdersQueryDto
  ): Promise<ListResponse<OrderDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const orders = await tx.order.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.channel ? { channel: query.channel } : {}),
          ...(this.accessControl.storeFilter(context) && !query.storeId
            ? { storeId: this.accessControl.storeFilter(context) }
            : {})
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
        orderBy: { placedAt: "desc" }
      });

      return {
        items: orders.map(mapOrder),
        total: orders.length
      };
    });
  }

  getOrder(context: RequestContext, orderId: string): Promise<OrderDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const order = await this.loadOrder(tx, orderId);
      this.accessControl.resolveTenantId(context, order.tenantId);
      this.accessControl.enforceStoreAccess(context, order.storeId);
      return mapOrder(order);
    });
  }

  transitionOrder(
    context: RequestContext,
    orderId: string,
    dto: TransitionOrderDto
  ): Promise<OrderDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.loadOrder(tx, orderId);
      this.accessControl.resolveTenantId(context, current.tenantId);
      this.accessControl.enforceStoreAccess(context, current.storeId);

      if (!canTransitionOrder(current.status, dto.toStatus)) {
        throw new BadRequestException(
          `Order transition ${current.status} -> ${dto.toStatus} is not allowed.`
        );
      }

      const now = new Date();
      const updateData: Prisma.OrderUpdateInput = {
        status: dto.toStatus,
        ...(dto.toStatus === "CONFIRMED" ? { confirmedAt: now } : {}),
        ...(dto.toStatus === "READY" ? { readyAt: now } : {}),
        ...(dto.toStatus === "COMPLETED" ? { completedAt: now } : {}),
        ...(dto.toStatus === "CANCELLED"
          ? {
              cancelledAt: now,
              cancelReason: dto.reason ?? null,
              refundStatus: resolveRefundStatusOnCancel(dto.hasExternalPayment)
            }
          : {})
      };

      const order = await tx.order.update({
        where: { id: current.id },
        data: updateData,
        include: {
          items: {
            include: {
              modifiers: {
                orderBy: { createdAt: "asc" }
              }
            },
            orderBy: { createdAt: "asc" }
          }
        }
      });

      const eventName = dto.toStatus === "CANCELLED" ? "order.cancelled" : "order.status_changed";
      const eventPayload = {
        orderId: order.id,
        fromStatus: current.status,
        toStatus: order.status,
        reason: dto.reason ?? null,
        refundStatus: order.refundStatus
      };

      await this.recordOrderEvent(tx, {
        orderId: order.id,
        tenantId: order.tenantId,
        storeId: order.storeId,
        type: eventName,
        payload: eventPayload
      });

      await this.audit.recordTx(tx, {
        tenantId: order.tenantId,
        storeId: order.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: eventName,
        entityType: "order",
        entityId: order.id,
        payload: eventPayload
      });

      await this.domainEvents.record(tx, {
        tenantId: order.tenantId,
        eventName,
        aggregate: "order",
        aggregateId: order.id,
        payload: eventPayload
      });

      await this.enqueueStorefrontCustomerUpdates(tx, order, {
        trigger: eventName,
        templateKey:
          dto.toStatus === "CONFIRMED"
            ? "storefront-order-confirmed"
            : dto.toStatus === "READY"
              ? "storefront-order-ready"
              : dto.toStatus === "COMPLETED"
                ? "storefront-order-completed"
                : dto.toStatus === "CANCELLED"
                  ? "storefront-order-cancelled"
                  : null
      });

      let createdKitchenTickets: Array<{
        id: string;
        tenantId: string;
        storeId: string;
        stationKey: string;
        orderId: string;
      }> = [];

      if (dto.toStatus === "CONFIRMED") {
        const kitchenPayload = {
          orderId: order.id,
          storeId: order.storeId,
          channel: order.channel,
          itemCount: order.items.length
        };

        await this.recordOrderEvent(tx, {
          orderId: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          type: "order.kitchen_handoff_requested",
          payload: kitchenPayload
        });

        await this.audit.recordTx(tx, {
          tenantId: order.tenantId,
          storeId: order.storeId,
          actorType: this.resolveActorType(context),
          actorId: this.resolveActorId(context),
          action: "order.kitchen_handoff_requested",
          entityType: "order",
          entityId: order.id,
          payload: kitchenPayload
        });

        await this.domainEvents.record(tx, {
          tenantId: order.tenantId,
          eventName: "order.kitchen_handoff_requested",
          aggregate: "order",
          aggregateId: order.id,
          payload: kitchenPayload
        });

        createdKitchenTickets = await this.createKitchenTicketsForOrder(tx, order, context);
      }

      if (dto.toStatus === "CANCELLED") {
        const releasedReservationCount = await this.inventoryService.releaseOrderInventoryReservationsTx(
          tx,
          order.tenantId,
          order.id
        );
        const cancelledCount = await this.cancelKitchenTicketsForOrder(tx, order.id);

        if (releasedReservationCount > 0) {
          await this.recordOrderEvent(tx, {
            orderId: order.id,
            tenantId: order.tenantId,
            storeId: order.storeId,
            type: "inventory.reservations_released",
            payload: {
              orderId: order.id,
              reservationCount: releasedReservationCount
            }
          });
        }

        if (cancelledCount > 0) {
          await this.recordOrderEvent(tx, {
            orderId: order.id,
            tenantId: order.tenantId,
            storeId: order.storeId,
            type: "kitchen.ticket_cancelled",
            payload: {
              orderId: order.id,
              cancelledTicketCount: cancelledCount
            }
          });
        }
      }

      if (dto.toStatus === "COMPLETED") {
        const consumedReservationCount = await this.inventoryService.consumeOrderInventoryReservationsTx(
          tx,
          order.tenantId,
          order.id
        );

        if (consumedReservationCount > 0) {
          await this.recordOrderEvent(tx, {
            orderId: order.id,
            tenantId: order.tenantId,
            storeId: order.storeId,
            type: "inventory.reservations_consumed",
            payload: {
              orderId: order.id,
              reservationCount: consumedReservationCount
            }
          });
        }
      }

      for (const ticket of createdKitchenTickets) {
        this.realtime.emitToStore(ticket.tenantId, ticket.storeId, "kitchen.ticket.created", {
          orderId: ticket.orderId,
          ticketId: ticket.id,
          stationKey: ticket.stationKey
        });
      }

      if (createdKitchenTickets.length || dto.toStatus === "CANCELLED") {
        this.realtime.emitToStore(order.tenantId, order.storeId, "board.order.updated", {
          orderId: order.id
        });
      }

      return mapOrder(order);
    });
  }

  listOrderEvents(
    context: RequestContext,
    orderId: string
  ): Promise<ListResponse<OrderEventDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId }
      });
      this.accessControl.resolveTenantId(context, order.tenantId);
      this.accessControl.enforceStoreAccess(context, order.storeId);

      const events = await tx.orderEvent.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" }
      });

      return {
        items: events.map(mapOrderEvent),
        total: events.length
      };
    });
  }

  private async loadCart(
    tx: Prisma.TransactionClient,
    cartId: string
  ): Promise<LoadedCart> {
    return tx.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          include: {
            modifiers: {
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });
  }

  private async loadOrder(
    tx: Prisma.TransactionClient,
    orderId: string
  ): Promise<LoadedOrder> {
    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: {
          include: {
            modifiers: {
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });
  }

  private ensureCartOpen(cart: LoadedCart): void {
    if (cart.status !== "OPEN") {
      throw new BadRequestException("Only open carts can be modified.");
    }
  }

  private resolveActorType(context: RequestContext): "USER" | "DEVICE" {
    return context.scope === "device" ? "DEVICE" : "USER";
  }

  private resolveActorId(context: RequestContext): string {
    if (context.scope === "device" && context.deviceId) {
      return context.deviceId;
    }

    return context.userId;
  }

  private resolveCreatedByUserId(context: RequestContext): string | null {
    return context.scope === "device" ? null : context.userId;
  }

  private generateOrderNumber(): string {
    return `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;
  }

  private async ensureDeviceBelongsToStore(
    tx: Prisma.TransactionClient,
    tenantId: string,
    storeId: string,
    deviceId: string
  ): Promise<void> {
    const device = await tx.device.findUniqueOrThrow({
      where: { id: deviceId }
    });

    if (device.tenantId !== tenantId || device.storeId !== storeId) {
      throw new BadRequestException("Device does not belong to the requested store.");
    }
  }

  private async resolveCartItemSelection(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    input: {
      tenantId: string;
      storeId: string;
      productId: string;
      variantId: string | null;
      priceListId: string | null;
      modifierOptionIds: string[];
    }
  ) {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: input.productId },
      include: {
        modifierGroupLinks: {
          include: {
            modifierGroup: true
          }
        }
      }
    });

    if (product.tenantId !== input.tenantId) {
      throw new BadRequestException("Product tenant mismatch.");
    }

    const variant = input.variantId
      ? await tx.productVariant.findUniqueOrThrow({
          where: { id: input.variantId }
        })
      : null;

    if (variant && variant.productId !== product.id) {
      throw new BadRequestException("Variant does not belong to the requested product.");
    }

    const modifierOptions = input.modifierOptionIds.length
      ? await tx.modifierOption.findMany({
          where: {
            id: { in: input.modifierOptionIds }
          },
          include: {
            group: true
          }
        })
      : [];

    if (modifierOptions.length !== input.modifierOptionIds.length) {
      throw new BadRequestException("One or more modifier options were not found.");
    }

    const allowedGroupIds = new Set(
      product.modifierGroupLinks.map((link) => link.modifierGroupId)
    );
    for (const option of modifierOptions) {
      if (!allowedGroupIds.has(option.groupId)) {
        throw new BadRequestException("Modifier option does not belong to the product.");
      }
    }

    const price = await this.pricingService.resolveSelectionTx(tx, context, {
      tenantId: input.tenantId,
      storeId: input.storeId,
      productId: input.productId,
      variantId: input.variantId,
      priceListId: input.priceListId,
      modifierOptionIds: input.modifierOptionIds
    });

    const groupMap = new Map(
      product.modifierGroupLinks.map((link) => [
        link.modifierGroupId,
        {
          code: link.modifierGroup.code,
          name: link.modifierGroup.name
        }
      ])
    );
    const modifierPriceMap = new Map(
      price.modifierBreakdown.map((modifier) => [modifier.optionId, modifier.priceDelta])
    );

    const snapshot = {
      capturedAt: new Date().toISOString(),
      priceListId: price.priceListId,
      source: price.source,
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description
      },
      variant: variant
        ? {
            id: variant.id,
            code: variant.code,
            name: variant.name,
            sku: variant.sku,
            barcode: variant.barcode
          }
        : null,
      modifiers: modifierOptions.map((option) => ({
        groupId: option.groupId,
        groupCode: groupMap.get(option.groupId)?.code ?? null,
        groupName: groupMap.get(option.groupId)?.name ?? null,
        optionId: option.id,
        optionCode: option.code,
        optionName: option.name,
        priceDelta: modifierPriceMap.get(option.id) ?? "0.00"
      }))
    };

    return {
      product,
      variant,
      price,
      snapshot
    };
  }

  private async recalculateCartTotals(
    tx: Prisma.TransactionClient,
    cartId: string
  ): Promise<void> {
    const items = await tx.cartItem.findMany({
      where: { cartId },
      select: {
        quantity: true,
        unitBasePrice: true,
        modifierTotal: true
      }
    });
    const cart = await tx.cart.findUniqueOrThrow({
      where: { id: cartId },
      select: {
        fulfillmentFee: true,
        discountTotal: true
      }
    });

    const totals = calculateCartTotals(
      items.map((item) => ({
        quantity: item.quantity,
        unitBasePrice: decimalToString(item.unitBasePrice),
        modifierTotal: decimalToString(item.modifierTotal) ?? "0.00"
      })),
      {
        fulfillmentFee: decimalToString(cart.fulfillmentFee),
        discountTotal: decimalToString(cart.discountTotal)
      }
    );

    await tx.cart.update({
      where: { id: cartId },
      data: {
        subtotal: totals.subtotal,
        modifierTotal: totals.modifierTotal,
        discountTotal: totals.discountTotal,
        total: totals.total
      }
    });
  }

  private async clearCartPromotionTx(
    tx: Prisma.TransactionClient,
    cartId: string
  ): Promise<void> {
    await tx.cart.update({
      where: { id: cartId },
      data: {
        discountTotal: "0.00",
        promotionCode: null,
        promotionSnapshot: Prisma.DbNull
      }
    });
  }

  private async recordOrderEvent(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      tenantId: string;
      storeId: string;
      type: string;
      payload: Record<string, unknown>;
    }
  ): Promise<void> {
    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        tenantId: input.tenantId,
        storeId: input.storeId,
        type: input.type,
        payload: input.payload as Prisma.InputJsonObject
      }
    });
  }

  private async enqueueStorefrontCustomerUpdates(
    tx: Prisma.TransactionClient,
    order: LoadedOrder,
    input: {
      trigger: string;
      templateKey: string | null;
    }
  ): Promise<void> {
    if (order.channel !== "DELIVERY") {
      return;
    }

    const hookPayload = {
      orderId: order.id,
      status: order.status,
      trigger: input.trigger,
      customerPhone: order.customerPhone
    };

    await this.recordOrderEvent(tx, {
      orderId: order.id,
      tenantId: order.tenantId,
      storeId: order.storeId,
      type: "storefront.status_hook_emitted",
      payload: hookPayload
    });

    await this.domainEvents.record(tx, {
      tenantId: order.tenantId,
      eventName: "storefront.status_hook_emitted",
      aggregate: "order",
      aggregateId: order.id,
      payload: hookPayload
    });

    if (!order.customerPhone?.trim() || !input.templateKey) {
      return;
    }

    const notificationPayload = {
      orderId: order.id,
      status: order.status,
      trigger: input.trigger,
      customerPhone: order.customerPhone,
      templateKey: input.templateKey,
      deliveryPath: "async_event"
    };

    await this.recordOrderEvent(tx, {
      orderId: order.id,
      tenantId: order.tenantId,
      storeId: order.storeId,
      type: "storefront.notification_queued",
      payload: notificationPayload
    });

    await this.domainEvents.record(tx, {
      tenantId: order.tenantId,
      eventName: "storefront.notification_queued",
      aggregate: "order",
      aggregateId: order.id,
      payload: notificationPayload
    });
  }

  private async createKitchenTicketsForOrder(
    tx: Prisma.TransactionClient,
    order: LoadedOrder,
    context: RequestContext
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      storeId: string;
      stationKey: string;
      orderId: string;
    }>
  > {
    const existingTickets = await tx.kitchenTicket.count({
      where: { orderId: order.id }
    });

    if (existingTickets > 0) {
      return [];
    }

    const [storeRoutingSetting, tenantRoutingSetting, products] = await Promise.all([
      tx.storeSetting.findFirst({
        where: {
          storeId: order.storeId,
          key: "kitchen.routing"
        }
      }),
      tx.tenantSetting.findFirst({
        where: {
          tenantId: order.tenantId,
          key: "kitchen.routing"
        }
      }),
      tx.product.findMany({
        where: {
          id: {
            in: order.items.map((item) => item.productId)
          }
        },
        include: {
          category: true
        }
      })
    ]);

    const routing = resolveKitchenRoutingConfig(
      storeRoutingSetting?.value ?? tenantRoutingSetting?.value
    );
    const productMap = new Map(products.map((product) => [product.id, product]));
    const groupedItems = new Map<string, LoadedOrder["items"]>();

    for (const item of order.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        continue;
      }

      const stationKey = resolveKitchenStationKey(routing, {
        productCode: product.code,
        categoryCode: product.category?.code
      });

      const currentItems = groupedItems.get(stationKey) ?? [];
      currentItems.push(item);
      groupedItems.set(stationKey, currentItems);
    }

    const createdTickets: Array<{
      id: string;
      tenantId: string;
      storeId: string;
      stationKey: string;
      orderId: string;
    }> = [];

    for (const [stationKey, items] of groupedItems.entries()) {
      const ticket = await tx.kitchenTicket.create({
        data: {
          orderId: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          stationKey,
          sourceChannel: order.channel,
          displayNumber: order.number,
          note: order.note,
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
          items: {
            create: items.map((item) => ({
              orderItemId: item.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
              snapshot: item.snapshot as Prisma.InputJsonObject
            }))
          }
        },
        include: {
          items: true
        }
      });

      const eventPayload = {
        orderId: order.id,
        ticketId: ticket.id,
        stationKey: ticket.stationKey,
        itemCount: ticket.itemCount
      };

      await this.recordOrderEvent(tx, {
        orderId: order.id,
        tenantId: order.tenantId,
        storeId: order.storeId,
        type: "kitchen.ticket_created",
        payload: eventPayload
      });

      await this.audit.recordTx(tx, {
        tenantId: order.tenantId,
        storeId: order.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "kitchen.ticket_created",
        entityType: "kitchen_ticket",
        entityId: ticket.id,
        payload: eventPayload
      });

      await this.domainEvents.record(tx, {
        tenantId: order.tenantId,
        eventName: "kitchen.ticket_created",
        aggregate: "kitchen_ticket",
        aggregateId: ticket.id,
        payload: eventPayload
      });

      createdTickets.push({
        id: ticket.id,
        tenantId: ticket.tenantId,
        storeId: ticket.storeId,
        stationKey: ticket.stationKey,
        orderId: order.id
      });
    }

    return createdTickets;
  }

  private async cancelKitchenTicketsForOrder(
    tx: Prisma.TransactionClient,
    orderId: string
  ): Promise<number> {
    const result = await tx.kitchenTicket.updateMany({
      where: {
        orderId,
        status: {
          in: ["NEW", "IN_PROGRESS", "READY"]
        }
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date()
      }
    });

    return result.count;
  }

}

@ApiTags("carts")
@Controller()
class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("carts")
  @Permissions("carts.read")
  listCarts(
    @CurrentContext() context: RequestContext,
    @Query() query: CartsQueryDto
  ): Promise<ListResponse<CartDto>> {
    return this.ordersService.listCarts(context, query);
  }

  @Get("carts/:id")
  @Permissions("carts.read")
  getCart(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<CartDto> {
    return this.ordersService.getCart(context, params.id);
  }

  @Post("carts")
  @Permissions("carts.write")
  createCart(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateCartDto
  ): Promise<CartDto> {
    return this.ordersService.createCart(context, dto);
  }

  @Patch("carts/:id")
  @Permissions("carts.write")
  updateCart(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCartDto
  ): Promise<CartDto> {
    return this.ordersService.updateCart(context, params.id, dto);
  }

  @Post("carts/:id/items")
  @Permissions("carts.write")
  addItem(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: AddCartItemDto
  ): Promise<CartDto> {
    return this.ordersService.addItem(context, params.id, dto);
  }

  @Patch("carts/:id/items/:itemId")
  @Permissions("carts.write")
  updateItem(
    @CurrentContext() context: RequestContext,
    @Param() params: CartItemParamsDto,
    @Body() dto: UpdateCartItemDto
  ): Promise<CartDto> {
    return this.ordersService.updateItem(context, params.id, params.itemId, dto);
  }

  @Delete("carts/:id/items/:itemId")
  @Permissions("carts.write")
  deleteItem(
    @CurrentContext() context: RequestContext,
    @Param() params: CartItemParamsDto
  ): Promise<CartDto> {
    return this.ordersService.deleteItem(context, params.id, params.itemId);
  }

  @Post("carts/:id/checkout")
  @Permissions("carts.write", "orders.write")
  checkout(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: CheckoutCartDto
  ): Promise<OrderDto> {
    return this.ordersService.checkout(context, params.id, dto);
  }

  @Get("orders")
  @Permissions("orders.read")
  listOrders(
    @CurrentContext() context: RequestContext,
    @Query() query: OrdersQueryDto
  ): Promise<ListResponse<OrderDto>> {
    return this.ordersService.listOrders(context, query);
  }

  @Get("orders/:id")
  @Permissions("orders.read")
  getOrder(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<OrderDto> {
    return this.ordersService.getOrder(context, params.id);
  }

  @Post("orders/:id/transition")
  @Permissions("orders.write")
  transitionOrder(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: TransitionOrderDto
  ): Promise<OrderDto> {
    return this.ordersService.transitionOrder(context, params.id, dto);
  }

  @Get("orders/:id/events")
  @Permissions("order_events.read")
  listOrderEvents(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<ListResponse<OrderEventDto>> {
    return this.ordersService.listOrderEvents(context, params.id);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule, PricingModule, KitchenModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
