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
  AdjustCustomerLoyaltyRequest,
  AppliedPromotionDto,
  CreatePromotionCampaignRequest,
  CustomerProfileDto,
  CustomerPublicProfileDto,
  ListResponse,
  LoyaltyAccountDto,
  LoyaltyLedgerEntryDto,
  PromotionCampaignDto,
  UpdatePromotionCampaignRequest
} from "@exetron/contracts";
import { Prisma } from "@exetron/database";
import type { RequestContext } from "@exetron/types";
import type { CustomerProfileStatus, PromotionStatus, PromotionType } from "@exetron/types";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
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
import { FulfillmentModule, FulfillmentService } from "../fulfillment/fulfillment.module";
import { OrdersModule, OrdersService } from "../orders/orders.module";
import { calculateCartTotals } from "../orders/order-money.util";
import {
  asRecord,
  deriveCustomerSegments,
  deriveRetentionState,
  normalizeCustomerPhone,
  resolveEarnedLoyaltyPoints,
  resolvePromotionDiscount
} from "./customer-runtime.util";

class CustomerProfilesQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "MERGED", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "MERGED", "ARCHIVED"])
  status?: CustomerProfileStatus;
}

class PromotionsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "PAUSED", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "PAUSED", "ARCHIVED"])
  status?: PromotionStatus;
}

class CreatePromotionCampaignDto implements CreatePromotionCampaignRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "PAUSED", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "PAUSED", "ARCHIVED"])
  status?: PromotionStatus;

  @ApiProperty({ enum: ["PERCENTAGE", "FIXED_AMOUNT", "LOYALTY_REDEEM"] })
  @IsIn(["PERCENTAGE", "FIXED_AMOUNT", "LOYALTY_REDEEM"])
  type!: PromotionType;

  @ApiProperty({ example: "10.00" })
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  value!: string;

  @ApiPropertyOptional({ example: "0.00" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  minimumOrderTotal?: string;

  @ApiPropertyOptional({ example: "5.00", nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  maxDiscountAmount?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsCost?: number | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  segmentKeys?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  activeFrom?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  activeTo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

class UpdatePromotionCampaignDto implements UpdatePromotionCampaignRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "PAUSED", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "PAUSED", "ARCHIVED"])
  status?: PromotionStatus;

  @ApiPropertyOptional({ enum: ["PERCENTAGE", "FIXED_AMOUNT", "LOYALTY_REDEEM"] })
  @IsOptional()
  @IsIn(["PERCENTAGE", "FIXED_AMOUNT", "LOYALTY_REDEEM"])
  type?: PromotionType;

  @ApiPropertyOptional({ example: "10.00" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  value?: string;

  @ApiPropertyOptional({ example: "0.00" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  minimumOrderTotal?: string;

  @ApiPropertyOptional({ example: "5.00", nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  maxDiscountAmount?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsCost?: number | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  segmentKeys?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  activeFrom?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  activeTo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

class AdjustCustomerLoyaltyDto implements AdjustCustomerLoyaltyRequest {
  @ApiProperty()
  @IsInt()
  points!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapLoyaltyAccount(account: {
  pointsBalance: number;
  totalEarnedPoints: number;
  totalRedeemedPoints: number;
  tierKey: string | null;
  updatedAt: Date;
} | null): LoyaltyAccountDto | null {
  if (!account) {
    return null;
  }

  return {
    pointsBalance: account.pointsBalance,
    totalEarnedPoints: account.totalEarnedPoints,
    totalRedeemedPoints: account.totalRedeemedPoints,
    tierKey: account.tierKey,
    updatedAt: account.updatedAt.toISOString()
  };
}

function mapPromotionCampaign(campaign: {
  id: string;
  tenantId: string;
  storeId: string | null;
  code: string;
  name: string;
  status: string;
  type: string;
  value: Prisma.Decimal;
  minimumOrderTotal: Prisma.Decimal;
  maxDiscountAmount: Prisma.Decimal | null;
  pointsCost: number | null;
  segmentKeys: string[];
  usageLimit: number | null;
  usedCount: number;
  activeFrom: Date | null;
  activeTo: Date | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): PromotionCampaignDto {
  return {
    id: campaign.id,
    tenantId: campaign.tenantId,
    storeId: campaign.storeId,
    code: campaign.code,
    name: campaign.name,
    status: campaign.status as PromotionStatus,
    type: campaign.type as PromotionType,
    value: campaign.value.toFixed(2),
    minimumOrderTotal: campaign.minimumOrderTotal.toFixed(2),
    maxDiscountAmount: decimalToString(campaign.maxDiscountAmount),
    pointsCost: campaign.pointsCost,
    segmentKeys: campaign.segmentKeys,
    usageLimit: campaign.usageLimit,
    usedCount: campaign.usedCount,
    activeFrom: campaign.activeFrom?.toISOString() ?? null,
    activeTo: campaign.activeTo?.toISOString() ?? null,
    metadata: asRecord(campaign.metadata),
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString()
  };
}

function mapAppliedPromotion(value: unknown): AppliedPromotionDto | null {
  const snapshot = asRecord(value);
  if (!snapshot || typeof snapshot.code !== "string" || typeof snapshot.name !== "string") {
    return null;
  }

  return {
    code: snapshot.code,
    name: snapshot.name,
    type:
      snapshot.type === "PERCENTAGE" ||
      snapshot.type === "FIXED_AMOUNT" ||
      snapshot.type === "LOYALTY_REDEEM"
        ? snapshot.type
        : "FIXED_AMOUNT",
    discountTotal: typeof snapshot.discountTotal === "string" ? snapshot.discountTotal : "0.00",
    pointsCost: typeof snapshot.pointsCost === "number" ? snapshot.pointsCost : null
  };
}

function mapCustomerProfile(profile: {
  id: string;
  tenantId: string;
  preferredStoreId: string | null;
  fullName: string | null;
  phone: string;
  status: string;
  orderCount: number;
  completedOrderCount: number;
  totalSpent: Prisma.Decimal;
  lastOrderAt: Date | null;
  lastSeenAt: Date | null;
  segments: Prisma.JsonValue;
  retentionState: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  loyaltyAccount: {
    pointsBalance: number;
    totalEarnedPoints: number;
    totalRedeemedPoints: number;
    tierKey: string | null;
    updatedAt: Date;
  } | null;
}): CustomerProfileDto {
  const retention = asRecord(profile.retentionState);

  return {
    id: profile.id,
    tenantId: profile.tenantId,
    preferredStoreId: profile.preferredStoreId,
    fullName: profile.fullName,
    phone: profile.phone,
    status: profile.status as CustomerProfileStatus,
    orderCount: profile.orderCount,
    completedOrderCount: profile.completedOrderCount,
    totalSpent: profile.totalSpent.toFixed(2),
    lastOrderAt: profile.lastOrderAt?.toISOString() ?? null,
    lastSeenAt: profile.lastSeenAt?.toISOString() ?? null,
    segments: parseStringArray(profile.segments),
    loyalty: mapLoyaltyAccount(profile.loyaltyAccount),
    retention:
      retention &&
      (retention.action === "WELCOME" ||
        retention.action === "NURTURE" ||
        retention.action === "WINBACK") &&
      typeof retention.templateKey === "string" &&
      typeof retention.recommendedAt === "string"
        ? {
            action: retention.action,
            templateKey: retention.templateKey,
            recommendedAt: retention.recommendedAt
          }
        : null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

function mapPublicCustomerProfile(profile: CustomerProfileDto): CustomerPublicProfileDto {
  return {
    id: profile.id,
    customerName: profile.fullName,
    customerPhone: profile.phone,
    orderCount: profile.orderCount,
    totalSpent: profile.totalSpent,
    lastOrderAt: profile.lastOrderAt,
    segments: profile.segments,
    loyalty: profile.loyalty,
    retention: profile.retention
  };
}

function mapLoyaltyEntry(entry: {
  id: string;
  tenantId: string;
  customerProfileId: string;
  loyaltyAccountId: string;
  orderId: string | null;
  entryKind: string;
  points: number;
  amount: Prisma.Decimal | null;
  description: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}): LoyaltyLedgerEntryDto {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    customerProfileId: entry.customerProfileId,
    loyaltyAccountId: entry.loyaltyAccountId,
    orderId: entry.orderId,
    entryKind: entry.entryKind as "EARN" | "REDEEM" | "ADJUST",
    points: entry.points,
    amount: decimalToString(entry.amount),
    description: entry.description,
    metadata: asRecord(entry.metadata),
    createdAt: entry.createdAt.toISOString()
  };
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly ordersService: OrdersService,
    private readonly fulfillmentService: FulfillmentService
  ) {}

  listProfiles(
    context: RequestContext,
    query: CustomerProfilesQueryDto
  ): Promise<ListResponse<CustomerProfileDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const phoneNormalized = query.phone?.trim()
        ? normalizeCustomerPhone(query.phone)
        : null;
      const items = await tx.customerProfile.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { preferredStoreId: query.storeId } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(phoneNormalized ? { phoneNormalized } : {})
        },
        include: {
          loyaltyAccount: true
        },
        orderBy: [{ lastOrderAt: "desc" }, { createdAt: "desc" }]
      });

      return {
        items: items.map((item) => mapCustomerProfile(item)),
        total: items.length
      };
    });
  }

  getProfile(context: RequestContext, customerProfileId: string): Promise<CustomerProfileDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const profile = await tx.customerProfile.findUniqueOrThrow({
        where: { id: customerProfileId },
        include: {
          loyaltyAccount: true
        }
      });
      this.accessControl.resolveTenantId(context, profile.tenantId);
      if (profile.preferredStoreId) {
        this.accessControl.enforceStoreAccess(context, profile.preferredStoreId);
      }
      return mapCustomerProfile(profile);
    });
  }

  listLoyaltyEntries(
    context: RequestContext,
    customerProfileId: string
  ): Promise<ListResponse<LoyaltyLedgerEntryDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const profile = await tx.customerProfile.findUniqueOrThrow({
        where: { id: customerProfileId }
      });
      this.accessControl.resolveTenantId(context, profile.tenantId);
      if (profile.preferredStoreId) {
        this.accessControl.enforceStoreAccess(context, profile.preferredStoreId);
      }

      const items = await tx.loyaltyLedgerEntry.findMany({
        where: {
          customerProfileId
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: items.map((item) => mapLoyaltyEntry(item)),
        total: items.length
      };
    });
  }

  adjustLoyalty(
    context: RequestContext,
    customerProfileId: string,
    dto: AdjustCustomerLoyaltyDto
  ): Promise<CustomerProfileDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const profile = await tx.customerProfile.findUniqueOrThrow({
        where: { id: customerProfileId }
      });
      this.accessControl.resolveTenantId(context, profile.tenantId);
      if (profile.preferredStoreId) {
        this.accessControl.enforceStoreAccess(context, profile.preferredStoreId);
      }

      const account = await this.ensureLoyaltyAccountTx(tx, profile);
      await tx.loyaltyLedgerEntry.create({
        data: {
          tenantId: profile.tenantId,
          customerProfileId: profile.id,
          loyaltyAccountId: account.id,
          entryKind: "ADJUST",
          points: dto.points,
          description: dto.description ?? null
        }
      });

      await this.refreshLoyaltyAccountTx(tx, profile.id);
      const refreshedProfile = await this.refreshCustomerProfileTx(tx, profile.id);

      await this.audit.recordTx(tx, {
        tenantId: profile.tenantId,
        storeId: profile.preferredStoreId,
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        action: "customer.loyalty_adjusted",
        entityType: "customer_profile",
        entityId: profile.id,
        payload: {
          points: dto.points,
          description: dto.description ?? null
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: profile.tenantId,
        eventName: "customer.loyalty_adjusted",
        aggregate: "customer_profile",
        aggregateId: profile.id,
        payload: {
          customerProfileId: profile.id,
          points: dto.points
        }
      });

      return mapCustomerProfile({
        ...refreshedProfile,
        loyaltyAccount: await tx.loyaltyAccount.findUnique({
          where: { customerProfileId: refreshedProfile.id }
        })
      });
    });
  }

  listPromotions(
    context: RequestContext,
    query: PromotionsQueryDto
  ): Promise<ListResponse<PromotionCampaignDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const items = await tx.promotionCampaign.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { OR: [{ storeId: query.storeId }, { storeId: null }] } : {}),
          ...(query.status ? { status: query.status } : {})
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }]
      });

      return {
        items: items.map((item) => mapPromotionCampaign(item)),
        total: items.length
      };
    });
  }

  createPromotion(
    context: RequestContext,
    dto: CreatePromotionCampaignDto
  ): Promise<PromotionCampaignDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      if (dto.storeId) {
        this.accessControl.enforceStoreAccess(context, dto.storeId);
      }

      const created = await tx.promotionCampaign.create({
        data: {
          tenantId,
          storeId: dto.storeId ?? null,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          status: dto.status ?? "ACTIVE",
          type: dto.type,
          value: dto.value,
          minimumOrderTotal: dto.minimumOrderTotal ?? "0.00",
          maxDiscountAmount: dto.maxDiscountAmount ?? null,
          pointsCost: dto.pointsCost ?? null,
          segmentKeys: dto.segmentKeys ?? [],
          usageLimit: dto.usageLimit ?? null,
          activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : null,
          activeTo: dto.activeTo ? new Date(dto.activeTo) : null,
          metadata: (dto.metadata ?? null) as Prisma.InputJsonValue
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        storeId: dto.storeId ?? null,
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        action: "promotion.created",
        entityType: "promotion_campaign",
        entityId: created.id,
        payload: {
          code: created.code,
          type: created.type
        }
      });

      return mapPromotionCampaign(created);
    });
  }

  updatePromotion(
    context: RequestContext,
    promotionId: string,
    dto: UpdatePromotionCampaignDto
  ): Promise<PromotionCampaignDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.promotionCampaign.findUniqueOrThrow({
        where: { id: promotionId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);
      if (current.storeId) {
        this.accessControl.enforceStoreAccess(context, current.storeId);
      }
      if (dto.storeId) {
        this.accessControl.enforceStoreAccess(context, dto.storeId);
      }

      const updated = await tx.promotionCampaign.update({
        where: { id: promotionId },
        data: {
          ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
          ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.value !== undefined ? { value: dto.value } : {}),
          ...(dto.minimumOrderTotal !== undefined
            ? { minimumOrderTotal: dto.minimumOrderTotal }
            : {}),
          ...(dto.maxDiscountAmount !== undefined
            ? { maxDiscountAmount: dto.maxDiscountAmount }
            : {}),
          ...(dto.pointsCost !== undefined ? { pointsCost: dto.pointsCost } : {}),
          ...(dto.segmentKeys !== undefined ? { segmentKeys: dto.segmentKeys } : {}),
          ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
          ...(dto.activeFrom !== undefined
            ? { activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : null }
            : {}),
          ...(dto.activeTo !== undefined
            ? { activeTo: dto.activeTo ? new Date(dto.activeTo) : null }
            : {}),
          ...(dto.metadata !== undefined
            ? { metadata: dto.metadata as Prisma.InputJsonValue }
            : {})
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: updated.tenantId,
        storeId: updated.storeId,
        actorType: context.scope === "device" ? "DEVICE" : "USER",
        actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
        action: "promotion.updated",
        entityType: "promotion_campaign",
        entityId: updated.id,
        payload: {
          code: updated.code,
          status: updated.status
        }
      });

      return mapPromotionCampaign(updated);
    });
  }

  async getPublicCustomerProfile(
    tenantId: string,
    storeId: string,
    customerPhone: string
  ): Promise<CustomerPublicProfileDto | null> {
    const context = this.buildPublicContext(tenantId, storeId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const profile = await tx.customerProfile.findFirst({
        where: {
          tenantId,
          phoneNormalized: normalizeCustomerPhone(customerPhone)
        },
        include: {
          loyaltyAccount: true
        }
      });

      return profile ? mapPublicCustomerProfile(mapCustomerProfile(profile)) : null;
    });
  }

  async listPublicAvailablePromotions(
    tenantId: string,
    storeId: string,
    customerPhone: string | null
  ): Promise<PromotionCampaignDto[]> {
    const context = this.buildPublicContext(tenantId, storeId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const profile = customerPhone
        ? await tx.customerProfile.findFirst({
            where: {
              tenantId,
              phoneNormalized: normalizeCustomerPhone(customerPhone)
            },
            include: {
              loyaltyAccount: true
            }
          })
        : null;
      const segments = profile ? parseStringArray(profile.segments) : [];
      const items = await tx.promotionCampaign.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
          OR: [{ storeId }, { storeId: null }]
        },
        orderBy: { createdAt: "desc" }
      });

      return items
        .filter((item) => this.isPromotionActive(item))
        .filter(
          (item) =>
            item.segmentKeys.length === 0 ||
            item.segmentKeys.some((segment) => segments.includes(segment))
        )
        .map((item) => mapPromotionCampaign(item));
    });
  }

  async applyPromotionToCart(
    context: RequestContext,
    input: {
      cartId: string;
      code: string;
      customerName?: string | null;
      customerPhone?: string | null;
    }
  ) {
    await this.dbContext.withRequestContext(context, async (tx) => {
      const cart = await tx.cart.findUniqueOrThrow({
        where: { id: input.cartId },
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
        throw new BadRequestException("Only open carts can apply promotions.");
      }
      if (!cart.items.length) {
        throw new BadRequestException("Cart must contain items before applying a promotion.");
      }

      const customerPhone = input.customerPhone?.trim()
        ? normalizeCustomerPhone(input.customerPhone)
        : cart.customerPhone?.trim()
          ? normalizeCustomerPhone(cart.customerPhone)
          : null;
      const customerName = input.customerName?.trim() || cart.customerName || null;
      const profile = customerPhone
        ? await this.resolveOrCreateCustomerProfileTx(tx, {
            tenantId: cart.tenantId,
            storeId: cart.storeId,
            customerName,
            customerPhone
          })
        : null;

      const promotion = await tx.promotionCampaign.findFirst({
        where: {
          tenantId: cart.tenantId,
          code: input.code.trim().toUpperCase(),
          status: "ACTIVE",
          OR: [{ storeId: cart.storeId }, { storeId: null }]
        }
      });
      if (!promotion || !this.isPromotionActive(promotion)) {
        throw new BadRequestException("Promotion code is invalid or inactive.");
      }

      const currentGross = calculateCartTotals(
        cart.items.map((item) => ({
          quantity: item.quantity,
          unitBasePrice: decimalToString(item.unitBasePrice),
          modifierTotal: decimalToString(item.modifierTotal) ?? "0.00"
        })),
        {
          fulfillmentFee: decimalToString(cart.fulfillmentFee)
        }
      );
      if (Number(currentGross.total) < Number(promotion.minimumOrderTotal.toFixed(2))) {
        throw new BadRequestException("Cart does not satisfy the promotion minimum order total.");
      }
      if (promotion.segmentKeys.length) {
        const segments = profile ? parseStringArray(profile.segments) : [];
        if (!promotion.segmentKeys.some((segment) => segments.includes(segment))) {
          throw new BadRequestException("Promotion is not eligible for this customer segment.");
        }
      }
      if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
        throw new BadRequestException("Promotion usage limit has already been reached.");
      }

      const loyaltyAccount = profile ? await this.ensureLoyaltyAccountTx(tx, profile) : null;
      if (promotion.type === "LOYALTY_REDEEM") {
        if (!profile || !loyaltyAccount || (promotion.pointsCost ?? 0) <= 0) {
          throw new BadRequestException("Loyalty redemption promotion is not available.");
        }
        if (loyaltyAccount.pointsBalance < (promotion.pointsCost ?? 0)) {
          throw new BadRequestException("Customer does not have enough loyalty points.");
        }
      }

      const discountTotal = resolvePromotionDiscount({
        type: promotion.type as PromotionType,
        value: promotion.value.toFixed(2),
        orderTotal: currentGross.total,
        maxDiscountAmount: decimalToString(promotion.maxDiscountAmount)
      });
      const totals = calculateCartTotals(
        cart.items.map((item) => ({
          quantity: item.quantity,
          unitBasePrice: decimalToString(item.unitBasePrice),
          modifierTotal: decimalToString(item.modifierTotal) ?? "0.00"
        })),
        {
          fulfillmentFee: decimalToString(cart.fulfillmentFee),
          discountTotal
        }
      );

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          customerProfileId: profile?.id ?? cart.customerProfileId,
          customerName,
          customerPhone: customerPhone ?? cart.customerPhone,
          discountTotal: totals.discountTotal,
          total: totals.total,
          promotionCode: promotion.code,
          promotionSnapshot: {
            promotionId: promotion.id,
            code: promotion.code,
            name: promotion.name,
            type: promotion.type,
            discountTotal: totals.discountTotal,
            pointsCost: promotion.pointsCost
          } as Prisma.InputJsonObject
        }
      });
    });

    return this.ordersService.getCart(context, input.cartId);
  }

  async finalizeOrderGrowth(
    context: RequestContext,
    orderId: string
  ): Promise<CustomerProfileDto | null> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId }
      });
      this.accessControl.resolveTenantId(context, order.tenantId);
      this.accessControl.enforceStoreAccess(context, order.storeId);

      if (!order.customerPhone?.trim()) {
        return null;
      }

      const profile = await this.resolveOrCreateCustomerProfileTx(tx, {
        tenantId: order.tenantId,
        storeId: order.storeId,
        customerName: order.customerName,
        customerPhone: normalizeCustomerPhone(order.customerPhone)
      });
      const account = await this.ensureLoyaltyAccountTx(tx, profile);

      await tx.order.update({
        where: { id: order.id },
        data: {
          customerProfileId: profile.id,
          customerPhone: profile.phone,
          customerName: order.customerName ?? profile.fullName
        }
      });
      if (order.cartId) {
        await tx.cart.update({
          where: { id: order.cartId },
          data: {
            customerProfileId: profile.id,
            customerPhone: profile.phone,
            customerName: order.customerName ?? profile.fullName
          }
        });
      }

      const pointsEarned = resolveEarnedLoyaltyPoints(order.total.toFixed(2));
      const appliedPromotion = asRecord(order.promotionSnapshot);

      const existingEarn = await tx.loyaltyLedgerEntry.findFirst({
        where: {
          orderId: order.id,
          entryKind: "EARN"
        }
      });
      if (!existingEarn && pointsEarned > 0 && order.status !== "CANCELLED") {
        await tx.loyaltyLedgerEntry.create({
          data: {
            tenantId: order.tenantId,
            customerProfileId: profile.id,
            loyaltyAccountId: account.id,
            orderId: order.id,
            entryKind: "EARN",
            points: pointsEarned,
            amount: order.total,
            description: `Earned from order ${order.number}`
          }
        });
      }

      const existingRedeem = await tx.loyaltyLedgerEntry.findFirst({
        where: {
          orderId: order.id,
          entryKind: "REDEEM"
        }
      });
      if (
        !existingRedeem &&
        appliedPromotion?.type === "LOYALTY_REDEEM" &&
        typeof appliedPromotion.pointsCost === "number" &&
        appliedPromotion.pointsCost > 0
      ) {
        await tx.loyaltyLedgerEntry.create({
          data: {
            tenantId: order.tenantId,
            customerProfileId: profile.id,
            loyaltyAccountId: account.id,
            orderId: order.id,
            entryKind: "REDEEM",
            points: -appliedPromotion.pointsCost,
            amount: order.discountTotal,
            description: `Redeemed for promotion ${order.promotionCode ?? "LOYALTY"}`
          }
        });
      }

      if (
        typeof appliedPromotion?.promotionId === "string" &&
        !(await this.orderEventExistsTx(tx, order.id, "customer.promotion_redeemed"))
      ) {
        await tx.promotionCampaign.update({
          where: { id: appliedPromotion.promotionId },
          data: {
            usedCount: {
              increment: 1
            }
          }
        });
        await this.recordOrderEventTx(tx, {
          orderId: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          type: "customer.promotion_redeemed",
          payload: {
            code: order.promotionCode,
            discountTotal: order.discountTotal.toFixed(2),
            customerProfileId: profile.id
          }
        });
      }

      if (!(await this.orderEventExistsTx(tx, order.id, "customer.profile_linked"))) {
        await this.recordOrderEventTx(tx, {
          orderId: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          type: "customer.profile_linked",
          payload: {
            customerProfileId: profile.id
          }
        });
      }

      const previousSegments = parseStringArray(profile.segments);
      await this.refreshLoyaltyAccountTx(tx, profile.id);
      const refreshedProfile = await this.refreshCustomerProfileTx(tx, profile.id);
      const nextSegments = parseStringArray(refreshedProfile.segments);

      if (pointsEarned > 0 && !(await this.orderEventExistsTx(tx, order.id, "customer.loyalty_earned"))) {
        await this.recordOrderEventTx(tx, {
          orderId: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          type: "customer.loyalty_earned",
          payload: {
            customerProfileId: refreshedProfile.id,
            points: pointsEarned
          }
        });
      }

      if (JSON.stringify(previousSegments) !== JSON.stringify(nextSegments)) {
        await this.recordOrderEventTx(tx, {
          orderId: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          type: "customer.segment_changed",
          payload: {
            customerProfileId: refreshedProfile.id,
            previousSegments,
            nextSegments
          }
        });
      }

      if (!(await this.orderEventExistsTx(tx, order.id, "customer.retention_hook_queued"))) {
        await this.recordOrderEventTx(tx, {
          orderId: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          type: "customer.retention_hook_queued",
          payload: {
            customerProfileId: refreshedProfile.id,
            retention: asRecord(refreshedProfile.retentionState)
          }
        });
      }

      return mapCustomerProfile({
        ...refreshedProfile,
        loyaltyAccount: await tx.loyaltyAccount.findUnique({
          where: { customerProfileId: refreshedProfile.id }
        })
      });
    });
  }

  async repeatCustomerOrder(
    context: RequestContext,
    input: {
      orderId: string;
      customerPhone: string;
      customerName?: string | null;
    }
  ) {
    const order = await this.ordersService.getOrder(context, input.orderId);
    if (order.customerPhone !== input.customerPhone) {
      throw new BadRequestException("Repeat order is only available for the original customer.");
    }
    if (order.channel !== "DELIVERY") {
      throw new BadRequestException("Repeat order is only available for storefront orders.");
    }

    const cart = await this.ordersService.createCart(context, {
      tenantId: order.tenantId,
      storeId: order.storeId,
      channel: "DELIVERY",
      customerName: input.customerName ?? order.customerName,
      customerPhone: input.customerPhone,
      note: order.note
    });

    for (const item of order.items) {
      const modifiers = Array.isArray(item.snapshot.modifiers)
        ? item.snapshot.modifiers
            .map((modifier) => asRecord(modifier))
            .filter((modifier): modifier is Record<string, unknown> => modifier !== null)
            .map((modifier) => modifier.optionId)
            .filter((modifier): modifier is string => typeof modifier === "string")
        : [];

      await this.ordersService.addItem(context, cart.id, {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        modifierOptionIds: modifiers
      });
    }

    if (order.fulfillment.mode && order.fulfillment.details) {
      await this.fulfillmentService.applyCartFulfillment(context, cart.id, {
        ...order.fulfillment.details,
        mode: order.fulfillment.mode
      });
    }

    const repeated = await this.ordersService.getCart(context, cart.id);
    await this.dbContext.withRequestContext(context, async (tx) => {
      await this.domainEvents.record(tx, {
        tenantId: order.tenantId,
        eventName: "customer.repeat_order_created",
        aggregate: "cart",
        aggregateId: repeated.id,
        payload: {
          sourceOrderId: order.id,
          cartId: repeated.id
        }
      });
    });

    return repeated;
  }

  private buildPublicContext(tenantId: string, storeId: string): RequestContext {
    return {
      userId: storeId,
      tenantId,
      scope: "device",
      roleIds: [],
      permissions: [],
      storeIds: [storeId],
      deviceId: storeId
    };
  }

  private isPromotionActive(promotion: {
    status: string;
    activeFrom: Date | null;
    activeTo: Date | null;
  }): boolean {
    if (promotion.status !== "ACTIVE") {
      return false;
    }
    const now = Date.now();
    if (promotion.activeFrom && promotion.activeFrom.getTime() > now) {
      return false;
    }
    if (promotion.activeTo && promotion.activeTo.getTime() < now) {
      return false;
    }
    return true;
  }

  private async resolveOrCreateCustomerProfileTx(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      storeId: string;
      customerName?: string | null;
      customerPhone: string;
    }
  ) {
    const normalizedPhone = normalizeCustomerPhone(input.customerPhone);
    const current = await tx.customerProfile.findFirst({
      where: {
        tenantId: input.tenantId,
        phoneNormalized: normalizedPhone
      }
    });
    if (current) {
      return tx.customerProfile.update({
        where: { id: current.id },
        data: {
          preferredStoreId: input.storeId,
          fullName: input.customerName ?? current.fullName,
          phone: normalizedPhone,
          lastSeenAt: new Date()
        }
      });
    }

    return tx.customerProfile.create({
      data: {
        tenantId: input.tenantId,
        preferredStoreId: input.storeId,
        fullName: input.customerName ?? null,
        phone: normalizedPhone,
        phoneNormalized: normalizedPhone,
        status: "ACTIVE",
        lastSeenAt: new Date(),
        segments: ["NEW"]
      }
    });
  }

  private async ensureLoyaltyAccountTx(
    tx: Prisma.TransactionClient,
    profile: { id: string; tenantId: string }
  ) {
    const current = await tx.loyaltyAccount.findUnique({
      where: {
        customerProfileId: profile.id
      }
    });
    if (current) {
      return current;
    }

    return tx.loyaltyAccount.create({
      data: {
        tenantId: profile.tenantId,
        customerProfileId: profile.id
      }
    });
  }

  private async refreshLoyaltyAccountTx(
    tx: Prisma.TransactionClient,
    customerProfileId: string
  ) {
    const entries = await tx.loyaltyLedgerEntry.findMany({
      where: {
        customerProfileId
      }
    });
    const account = await tx.loyaltyAccount.findUniqueOrThrow({
      where: {
        customerProfileId
      }
    });
    const pointsBalance = entries.reduce((sum, entry) => sum + entry.points, 0);
    const totalEarnedPoints = entries
      .filter((entry) => entry.points > 0)
      .reduce((sum, entry) => sum + entry.points, 0);
    const totalRedeemedPoints = entries
      .filter((entry) => entry.points < 0)
      .reduce((sum, entry) => sum + Math.abs(entry.points), 0);

    return tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        pointsBalance,
        totalEarnedPoints,
        totalRedeemedPoints,
        tierKey:
          totalEarnedPoints >= 300 ? "gold" : totalEarnedPoints >= 100 ? "silver" : "starter"
      }
    });
  }

  private async refreshCustomerProfileTx(
    tx: Prisma.TransactionClient,
    customerProfileId: string
  ) {
    const profile = await tx.customerProfile.findUniqueOrThrow({
      where: { id: customerProfileId }
    });
    const orders = await tx.order.findMany({
      where: {
        tenantId: profile.tenantId,
        OR: [{ customerProfileId: profile.id }, { customerPhone: profile.phone }],
        status: {
          not: "CANCELLED"
        }
      },
      orderBy: { placedAt: "desc" }
    });
    const loyalty = await this.ensureLoyaltyAccountTx(tx, profile);
    const orderCount = orders.length;
    const completedOrderCount = orders.filter((order) => order.status === "COMPLETED").length;
    const totalSpentCents = orders.reduce((sum, order) => {
      return sum + Math.max(0, Number((order.total as Prisma.Decimal).toFixed(2)) * 100);
    }, 0);
    const segments = deriveCustomerSegments({
      orderCount,
      completedOrderCount,
      totalSpent: (totalSpentCents / 100).toFixed(2),
      lastOrderAt: orders[0]?.placedAt ?? null,
      pointsBalance: loyalty.pointsBalance
    });
    const retentionState = deriveRetentionState({
      orderCount,
      segments,
      lastOrderAt: orders[0]?.placedAt ?? null
    });

    return tx.customerProfile.update({
      where: { id: profile.id },
      data: {
        preferredStoreId: orders[0]?.storeId ?? profile.preferredStoreId,
        orderCount,
        completedOrderCount,
        totalSpent: (totalSpentCents / 100).toFixed(2),
        lastOrderAt: orders[0]?.placedAt ?? null,
        lastSeenAt: new Date(),
        segments,
        retentionState: retentionState as unknown as Prisma.InputJsonObject
      }
    });
  }

  private async orderEventExistsTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    type: string
  ): Promise<boolean> {
    const count = await tx.orderEvent.count({
      where: {
        orderId,
        type
      }
    });

    return count > 0;
  }

  private async recordOrderEventTx(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      tenantId: string;
      storeId: string;
      type: string;
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

    await this.domainEvents.record(tx, {
      tenantId: input.tenantId,
      eventName: input.type,
      aggregate: "order",
      aggregateId: input.orderId,
      payload: input.payload
    });
  }
}

@ApiTags("customers")
@Controller("customers")
class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get("profiles")
  @Permissions("customers.read")
  listProfiles(
    @CurrentContext() context: RequestContext,
    @Query() query: CustomerProfilesQueryDto
  ): Promise<ListResponse<CustomerProfileDto>> {
    return this.customersService.listProfiles(context, query);
  }

  @Get("profiles/:id")
  @Permissions("customers.read")
  getProfile(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<CustomerProfileDto> {
    return this.customersService.getProfile(context, params.id);
  }

  @Get("profiles/:id/loyalty")
  @Permissions("customers.read")
  listLoyaltyEntries(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<ListResponse<LoyaltyLedgerEntryDto>> {
    return this.customersService.listLoyaltyEntries(context, params.id);
  }

  @Post("profiles/:id/loyalty/adjust")
  @Permissions("customers.write")
  adjustLoyalty(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: AdjustCustomerLoyaltyDto
  ): Promise<CustomerProfileDto> {
    return this.customersService.adjustLoyalty(context, params.id, dto);
  }

  @Get("promotions")
  @Permissions("customers.read")
  listPromotions(
    @CurrentContext() context: RequestContext,
    @Query() query: PromotionsQueryDto
  ): Promise<ListResponse<PromotionCampaignDto>> {
    return this.customersService.listPromotions(context, query);
  }

  @Post("promotions")
  @Permissions("customers.write")
  createPromotion(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreatePromotionCampaignDto
  ): Promise<PromotionCampaignDto> {
    return this.customersService.createPromotion(context, dto);
  }

  @Patch("promotions/:id")
  @Permissions("customers.write")
  updatePromotion(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdatePromotionCampaignDto
  ): Promise<PromotionCampaignDto> {
    return this.customersService.updatePromotion(context, params.id, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule, OrdersModule, FulfillmentModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService]
})
export class CustomersModule {}
