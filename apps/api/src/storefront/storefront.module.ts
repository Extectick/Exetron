import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  AddStorefrontCartItemRequest,
  CreateStorefrontCartRequest,
  CreateStorefrontCustomerSessionRequest,
  CreateStorefrontQrLinkRequest,
  ListResponse,
  StorefrontBootstrapResponse,
  StorefrontCartSessionDto,
  StorefrontCheckoutRequest,
  StorefrontCheckoutResponse,
  StorefrontCustomerOrderListItemDto,
  StorefrontCustomerSessionDto,
  StorefrontOrderTrackingResponse,
  StorefrontQrLinkDto,
  StorefrontQrResolutionDto,
  UpdateStorefrontCartItemRequest,
  UpdateStorefrontCartRequest
} from "@exetron/contracts";
import type { ApiEnv } from "@exetron/config";
import type { Store } from "@exetron/database";
import type { PaymentMethodKind, RequestContext } from "@exetron/types";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min
} from "class-validator";
import { Type } from "class-transformer";
import { APP_ENV } from "../common/app-env.provider";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Public } from "../common/decorators/public.decorator";
import { DatabaseContextService } from "../database/database-context.service";
import { PrismaService } from "../database/prisma.service";
import { OrdersModule, OrdersService } from "../orders/orders.module";
import { PaymentsModule, PaymentsService } from "../payments/payments.module";
import { PricingModule, PricingService } from "../pricing/pricing.module";
import { CustomizationModule, CustomizationService } from "../customization/customization.module";
import {
  resolveStorefrontBranding,
  resolveStorefrontRules
} from "./storefront-config.util";
import {
  resolveStorefrontPublicTokenSecret,
  STOREFRONT_CART_ACCESS_TOKEN_TTL,
  STOREFRONT_CART_ACCESS_TOKEN_TTL_MS,
  STOREFRONT_CUSTOMER_SESSION_TTL,
  STOREFRONT_CUSTOMER_SESSION_TTL_MS,
  STOREFRONT_QR_TOKEN_TTL,
  STOREFRONT_QR_TOKEN_TTL_MS,
  STOREFRONT_TRACKING_TOKEN_TTL,
  STOREFRONT_TRACKING_TOKEN_TTL_MS,
  type StorefrontCartAccessTokenClaims,
  type StorefrontCustomerSessionClaims,
  type StorefrontOrderTrackingTokenClaims,
  type StorefrontQrClaims
} from "./storefront-public-token.util";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function buildPublicContext(store: Store, customerPhone?: string | null): RequestContext {
  return {
    userId: store.id,
    tenantId: store.tenantId,
    scope: "device",
    roleIds: [],
    permissions: [],
    storeIds: [store.id],
    deviceId: store.id
  };
}

function mapNotificationQueue(
  event: { type: string; payload: Record<string, unknown>; createdAt: string }
) {
  return {
    type: event.type,
    templateKey:
      typeof event.payload.templateKey === "string" ? event.payload.templateKey : null,
    status: "QUEUED" as const,
    createdAt: event.createdAt
  };
}

class StorefrontBootstrapQueryDto {
  @ApiProperty()
  @IsString()
  storeCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrAccessToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerSessionToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;
}

class StorefrontAccessQueryDto {
  @ApiProperty()
  @IsString()
  accessToken!: string;
}

class CreateStorefrontCustomerSessionDto implements CreateStorefrontCustomerSessionRequest {
  @ApiProperty()
  @IsString()
  storeCode!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerName?: string | null;

  @ApiProperty()
  @IsString()
  customerPhone!: string;
}

class CreateStorefrontCartDto implements CreateStorefrontCartRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  qrAccessToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerSessionToken?: string | null;

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

class UpdateStorefrontCartDto implements UpdateStorefrontCartRequest {
  @ApiProperty()
  @IsString()
  accessToken!: string;

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

class StorefrontCartItemDto implements AddStorefrontCartItemRequest {
  @ApiProperty()
  @IsString()
  accessToken!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
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

class UpdateStorefrontCartItemDto implements UpdateStorefrontCartItemRequest {
  @ApiProperty()
  @IsString()
  accessToken!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
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

class StorefrontCheckoutDto implements StorefrontCheckoutRequest {
  @ApiProperty()
  @IsString()
  accessToken!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerSessionToken?: string | null;

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

  @ApiProperty({ enum: ["CASH", "CARD", "QR"] })
  @IsIn(["CASH", "CARD", "QR"])
  paymentMethod!: PaymentMethodKind;
}

class CreateStorefrontQrLinkDto implements CreateStorefrontQrLinkRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pointKey?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  locale?: string | null;
}

class StorefrontQrTokenParamDto {
  @ApiProperty()
  @IsString()
  token!: string;
}

class StorefrontIdParamDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  id!: string;
}

class StorefrontCartItemParamsDto extends StorefrontIdParamDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  itemId!: string;
}

@Injectable()
class StorefrontService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly customizationService: CustomizationService,
    private readonly pricingService: PricingService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService
  ) {}

  async bootstrap(query: StorefrontBootstrapQueryDto): Promise<StorefrontBootstrapResponse> {
    const store = await this.loadPublicStoreByCode(query.storeCode);
    const qrClaims = query.qrAccessToken?.trim()
      ? await this.verifyQrAccessToken(query.qrAccessToken, store)
      : null;
    const customerSession = query.customerSessionToken?.trim()
      ? await this.verifyCustomerSessionToken(query.customerSessionToken, store)
      : null;
    const context = buildPublicContext(store, customerSession?.customerPhone ?? null);
    const customization = await this.customizationService.resolveEffectiveCustomization(context, {
      tenantId: store.tenantId,
      storeId: store.id,
      channel: "DELIVERY",
      pointKey: qrClaims?.pointKey ?? null,
      inputs: {
        customerMode: customerSession ? "CUSTOMER" : "GUEST"
      }
    });
    this.ensureStorefrontEnabled(customization.settings["storefront.config"]);

    const catalog = await this.pricingService.compiledCatalog(context, {
      tenantId: store.tenantId,
      storeId: store.id,
      channel: "DELIVERY",
      locale: query.locale,
      customerLocale: query.locale
    });

    return {
      tenantId: store.tenantId,
      storeId: store.id,
      storeCode: store.code,
      storeName: store.name,
      pointKey: qrClaims?.pointKey ?? null,
      branding: resolveStorefrontBranding(
        customization.branding ?? asRecord(customization.settings["storefront.branding"]) ?? null
      ),
      rules: resolveStorefrontRules(
        asRecord(customization.settings["storefront.rules"]) ?? null
      ),
      catalog,
      customerSession: customerSession
        ? {
            mode: "CUSTOMER",
            customerName: customerSession.customerName,
            customerPhone: customerSession.customerPhone
          }
        : null
    };
  }

  async createCustomerSession(
    dto: CreateStorefrontCustomerSessionDto
  ): Promise<StorefrontCustomerSessionDto> {
    const store = await this.loadPublicStoreByCode(dto.storeCode);
    const context = buildPublicContext(store, dto.customerPhone);
    const customization = await this.customizationService.resolveEffectiveCustomization(context, {
      tenantId: store.tenantId,
      storeId: store.id,
      channel: "DELIVERY"
    });
    this.ensureStorefrontEnabled(customization.settings["storefront.config"]);
    const rules = resolveStorefrontRules(asRecord(customization.settings["storefront.rules"]) ?? null);

    if (!rules.allowCustomerSessions) {
      throw new BadRequestException("Customer sessions are disabled for this storefront.");
    }
    if (!dto.customerPhone.trim()) {
      throw new BadRequestException("Customer phone is required for a storefront session.");
    }

    const claims: StorefrontCustomerSessionClaims = {
      sub: `${store.id}:${dto.customerPhone.trim()}`,
      tenantId: store.tenantId,
      storeId: store.id,
      customerName: dto.customerName?.trim() ? dto.customerName.trim() : null,
      customerPhone: dto.customerPhone.trim(),
      scope: "storefront_customer_session"
    };
    const accessToken = await this.jwtService.signAsync(claims, {
      secret: resolveStorefrontPublicTokenSecret(this.env.JWT_ACCESS_SECRET),
      expiresIn: STOREFRONT_CUSTOMER_SESSION_TTL
    });
    const expiresAt = new Date(
      Date.now() + STOREFRONT_CUSTOMER_SESSION_TTL_MS
    ).toISOString();

    return {
      tenantId: store.tenantId,
      storeId: store.id,
      customerName: claims.customerName,
      customerPhone: claims.customerPhone,
      accessToken,
      expiresAt,
      storefrontPath: `/storefront/${store.code}?customerToken=${encodeURIComponent(accessToken)}`
    };
  }

  async createCart(dto: CreateStorefrontCartDto): Promise<StorefrontCartSessionDto> {
    const store = await this.loadPublicStoreById(dto.storeId);
    const qrClaims = dto.qrAccessToken?.trim()
      ? await this.verifyQrAccessToken(dto.qrAccessToken, store)
      : null;
    const customerSession = dto.customerSessionToken?.trim()
      ? await this.verifyCustomerSessionToken(dto.customerSessionToken, store)
      : null;
    const context = buildPublicContext(store, customerSession?.customerPhone ?? dto.customerPhone ?? null);
    const customization = await this.customizationService.resolveEffectiveCustomization(context, {
      tenantId: store.tenantId,
      storeId: store.id,
      channel: "DELIVERY",
      pointKey: qrClaims?.pointKey ?? null
    });
    this.ensureStorefrontEnabled(customization.settings["storefront.config"]);
    const rules = resolveStorefrontRules(asRecord(customization.settings["storefront.rules"]) ?? null);

    if (!rules.allowGuestCheckout && !customerSession) {
      throw new BadRequestException("Guest checkout is disabled for this storefront.");
    }

    const customerPhone = customerSession?.customerPhone ?? dto.customerPhone?.trim() ?? null;
    const customerName = customerSession?.customerName ?? dto.customerName?.trim() ?? null;

    const cart = await this.ordersService.createCart(context, {
      tenantId: store.tenantId,
      storeId: store.id,
      channel: "DELIVERY",
      customerName,
      customerPhone,
      note: dto.note ?? null
    });

    const access = await this.issueCartAccessToken({
      cartId: cart.id,
      tenantId: store.tenantId,
      storeId: store.id,
      pointKey: qrClaims?.pointKey ?? null,
      customerPhone,
      mode: customerSession ? "CUSTOMER" : "GUEST"
    });

    return {
      cart,
      access,
      customerSession: customerSession
        ? {
            mode: "CUSTOMER",
            customerName: customerSession.customerName,
            customerPhone: customerSession.customerPhone
          }
        : null
    };
  }

  async getCart(cartId: string, accessToken: string): Promise<StorefrontCartSessionDto> {
    const claims = await this.verifyCartAccessToken(cartId, accessToken);
    const store = await this.loadPublicStoreById(claims.storeId);
    const context = buildPublicContext(store, claims.customerPhone);
    const cart = await this.ordersService.getCart(context, cartId);

    return {
      cart,
      access: {
        cartId,
        accessToken,
        expiresAt: new Date(Date.now() + STOREFRONT_CART_ACCESS_TOKEN_TTL_MS).toISOString()
      },
      customerSession:
        claims.mode === "CUSTOMER" && claims.customerPhone
          ? {
              mode: "CUSTOMER",
              customerName: cart.customerName,
              customerPhone: claims.customerPhone
            }
          : null
    };
  }

  async updateCart(
    cartId: string,
    dto: UpdateStorefrontCartDto
  ): Promise<StorefrontCartSessionDto> {
    const claims = await this.verifyCartAccessToken(cartId, dto.accessToken);
    const store = await this.loadPublicStoreById(claims.storeId);
    const context = buildPublicContext(store, claims.customerPhone ?? dto.customerPhone ?? null);

    const cart = await this.ordersService.updateCart(context, cartId, {
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      note: dto.note
    });

    return {
      cart,
      access: {
        cartId,
        accessToken: dto.accessToken,
        expiresAt: new Date(Date.now() + STOREFRONT_CART_ACCESS_TOKEN_TTL_MS).toISOString()
      },
      customerSession:
        claims.mode === "CUSTOMER" && (dto.customerPhone ?? claims.customerPhone)
          ? {
              mode: "CUSTOMER",
              customerName: dto.customerName ?? cart.customerName,
              customerPhone: dto.customerPhone ?? claims.customerPhone ?? ""
            }
          : null
    };
  }

  async addItem(
    cartId: string,
    dto: StorefrontCartItemDto
  ): Promise<StorefrontCartSessionDto> {
    const claims = await this.verifyCartAccessToken(cartId, dto.accessToken);
    const store = await this.loadPublicStoreById(claims.storeId);
    const context = buildPublicContext(store, claims.customerPhone);
    const cart = await this.ordersService.addItem(context, cartId, {
      productId: dto.productId,
      variantId: dto.variantId ?? null,
      quantity: dto.quantity,
      priceListId: dto.priceListId ?? null,
      modifierOptionIds: dto.modifierOptionIds ?? []
    });

    return {
      cart,
      access: {
        cartId,
        accessToken: dto.accessToken,
        expiresAt: new Date(Date.now() + STOREFRONT_CART_ACCESS_TOKEN_TTL_MS).toISOString()
      },
      customerSession:
        claims.mode === "CUSTOMER" && claims.customerPhone
          ? {
              mode: "CUSTOMER",
              customerName: cart.customerName,
              customerPhone: claims.customerPhone
            }
          : null
    };
  }

  async updateItem(
    cartId: string,
    itemId: string,
    dto: UpdateStorefrontCartItemDto
  ): Promise<StorefrontCartSessionDto> {
    const claims = await this.verifyCartAccessToken(cartId, dto.accessToken);
    const store = await this.loadPublicStoreById(claims.storeId);
    const context = buildPublicContext(store, claims.customerPhone);
    const cart = await this.ordersService.updateItem(context, cartId, itemId, {
      variantId: dto.variantId ?? undefined,
      quantity: dto.quantity,
      priceListId: dto.priceListId ?? undefined,
      modifierOptionIds: dto.modifierOptionIds
    });

    return {
      cart,
      access: {
        cartId,
        accessToken: dto.accessToken,
        expiresAt: new Date(Date.now() + STOREFRONT_CART_ACCESS_TOKEN_TTL_MS).toISOString()
      },
      customerSession:
        claims.mode === "CUSTOMER" && claims.customerPhone
          ? {
              mode: "CUSTOMER",
              customerName: cart.customerName,
              customerPhone: claims.customerPhone
            }
          : null
    };
  }

  async deleteItem(
    cartId: string,
    itemId: string,
    accessToken: string
  ): Promise<StorefrontCartSessionDto> {
    const claims = await this.verifyCartAccessToken(cartId, accessToken);
    const store = await this.loadPublicStoreById(claims.storeId);
    const context = buildPublicContext(store, claims.customerPhone);
    const cart = await this.ordersService.deleteItem(context, cartId, itemId);

    return {
      cart,
      access: {
        cartId,
        accessToken,
        expiresAt: new Date(Date.now() + STOREFRONT_CART_ACCESS_TOKEN_TTL_MS).toISOString()
      },
      customerSession:
        claims.mode === "CUSTOMER" && claims.customerPhone
          ? {
              mode: "CUSTOMER",
              customerName: cart.customerName,
              customerPhone: claims.customerPhone
            }
          : null
    };
  }

  async checkout(
    cartId: string,
    dto: StorefrontCheckoutDto
  ): Promise<StorefrontCheckoutResponse> {
    const claims = await this.verifyCartAccessToken(cartId, dto.accessToken);
    const store = await this.loadPublicStoreById(claims.storeId);
    const customerSession = dto.customerSessionToken?.trim()
      ? await this.verifyCustomerSessionToken(dto.customerSessionToken, store)
      : null;
    const context = buildPublicContext(
      store,
      customerSession?.customerPhone ?? claims.customerPhone ?? dto.customerPhone ?? null
    );
    const customization = await this.customizationService.resolveEffectiveCustomization(context, {
      tenantId: store.tenantId,
      storeId: store.id,
      channel: "DELIVERY",
      pointKey: claims.pointKey,
      inputs: {
        paymentMethod: dto.paymentMethod,
        customerMode: customerSession ? "CUSTOMER" : claims.mode
      }
    });
    this.ensureStorefrontEnabled(customization.settings["storefront.config"]);
    const rules = resolveStorefrontRules(asRecord(customization.settings["storefront.rules"]) ?? null);

    if (!rules.allowedPaymentMethods.includes(dto.paymentMethod)) {
      throw new BadRequestException("Payment method is not allowed for this storefront.");
    }
    if (rules.requireCustomerName && !(dto.customerName?.trim() || customerSession?.customerName)) {
      throw new BadRequestException("Customer name is required for this storefront.");
    }
    if (
      rules.requireCustomerPhone &&
      !(dto.customerPhone?.trim() || customerSession?.customerPhone || claims.customerPhone)
    ) {
      throw new BadRequestException("Customer phone is required for this storefront.");
    }
    if (!rules.allowNotes && dto.note?.trim()) {
      throw new BadRequestException("Notes are disabled for this storefront.");
    }

    const order = await this.ordersService.checkout(context, cartId, {
      customerName: dto.customerName ?? customerSession?.customerName ?? null,
      customerPhone:
        dto.customerPhone ?? customerSession?.customerPhone ?? claims.customerPhone ?? null,
      note: dto.note ?? null
    });

    const paymentIntent = await this.paymentsService.createIntent(context, {
      tenantId: store.tenantId,
      storeId: store.id,
      orderId: order.id,
      channel: "DELIVERY",
      allocations: [
        {
          method: dto.paymentMethod,
          amount: order.total
        }
      ]
    });
    const allocation = paymentIntent.allocations[0];
    if (!allocation) {
      throw new BadRequestException("Storefront payment intent is missing an allocation.");
    }

    const processedIntent = await this.paymentsService.processAllocation(
      context,
      paymentIntent.id,
      allocation.id,
      {}
    );
    const orderAfterPayment =
      processedIntent.status === "COMPLETED" && !rules.autoConfirmPaidOrders
        ? await this.ordersService.transitionOrder(context, order.id, {
            toStatus: "CONFIRMED"
          })
        : await this.ordersService.getOrder(context, order.id);

    return {
      order: orderAfterPayment,
      paymentIntent: processedIntent,
      tracking: await this.issueOrderTrackingToken({
        orderId: order.id,
        tenantId: store.tenantId,
        storeId: store.id,
        pointKey: claims.pointKey,
        customerPhone:
          dto.customerPhone ?? customerSession?.customerPhone ?? claims.customerPhone ?? null
      })
    };
  }

  async listCustomerOrders(
    accessToken: string
  ): Promise<ListResponse<StorefrontCustomerOrderListItemDto>> {
    const claims = await this.verifyCustomerSessionTokenLoose(accessToken);
    const store = await this.loadPublicStoreById(claims.storeId);
    const context = buildPublicContext(store, claims.customerPhone);

    const orders = await this.dbContext.withRequestContext(context, (tx) =>
      tx.order.findMany({
        where: {
          tenantId: claims.tenantId,
          storeId: claims.storeId,
          channel: "DELIVERY",
          customerPhone: claims.customerPhone
        },
        orderBy: { placedAt: "desc" }
      })
    );

    const items = await Promise.all(
      orders.map(async (order) => ({
        orderId: order.id,
        number: order.number,
        status: order.status,
        total: order.total.toFixed(2),
        placedAt: order.placedAt.toISOString(),
        tracking: await this.issueOrderTrackingToken({
          orderId: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          pointKey: null,
          customerPhone: order.customerPhone
        })
      }))
    );

    return {
      items,
      total: items.length
    };
  }

  async getOrderTracking(
    orderId: string,
    accessToken: string
  ): Promise<StorefrontOrderTrackingResponse> {
    const claims = await this.verifyOrderTrackingToken(orderId, accessToken);
    const store = await this.loadPublicStoreById(claims.storeId);
    const context = buildPublicContext(store, claims.customerPhone);
    const [order, events] = await Promise.all([
      this.ordersService.getOrder(context, orderId),
      this.ordersService.listOrderEvents(context, orderId)
    ]);

    return {
      order,
      events: events.items,
      notifications: events.items
        .filter((event) => event.type === "storefront.notification_queued")
        .map((event) =>
          mapNotificationQueue({
            type: event.type,
            payload: event.payload,
            createdAt: event.createdAt
          })
        )
    };
  }

  async createQrLink(
    context: RequestContext,
    dto: CreateStorefrontQrLinkDto
  ): Promise<StorefrontQrLinkDto> {
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: dto.storeId }
    });
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId ?? store.tenantId);
    this.accessControl.enforceStoreAccess(context, store.id);

    if (store.tenantId !== tenantId) {
      throw new BadRequestException("Store tenant mismatch.");
    }

    const claims: StorefrontQrClaims = {
      sub: store.id,
      tenantId: store.tenantId,
      storeId: store.id,
      storeCode: store.code,
      pointKey: dto.pointKey ?? null,
      locale: dto.locale ?? null,
      scope: "storefront_qr_public"
    };
    const accessToken = await this.jwtService.signAsync(claims, {
      secret: resolveStorefrontPublicTokenSecret(this.env.JWT_ACCESS_SECRET),
      expiresIn: STOREFRONT_QR_TOKEN_TTL
    });
    const expiresAt = new Date(Date.now() + STOREFRONT_QR_TOKEN_TTL_MS).toISOString();

    return {
      storeId: store.id,
      pointKey: dto.pointKey ?? null,
      accessToken,
      expiresAt,
      storefrontPath: `/storefront/${store.code}?qr=${encodeURIComponent(accessToken)}`
    };
  }

  async resolveQrToken(token: string): Promise<StorefrontQrResolutionDto> {
    const claims = await this.verifyQrAccessTokenLoose(token);
    const store = await this.loadPublicStoreById(claims.storeId);

    return {
      tenantId: store.tenantId,
      storeId: store.id,
      storeCode: store.code,
      pointKey: claims.pointKey,
      locale: claims.locale,
      storefrontPath: `/storefront/${store.code}?qr=${encodeURIComponent(token)}`
    };
  }

  private async loadPublicStoreByCode(storeCode: string): Promise<Store> {
    const store = await this.prisma.store.findFirst({
      where: {
        code: storeCode,
        status: "ACTIVE"
      }
    });
    if (!store) {
      throw new BadRequestException("Storefront store was not found.");
    }
    return store;
  }

  private async loadPublicStoreById(storeId: string): Promise<Store> {
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: storeId }
    });
    if (store.status !== "ACTIVE") {
      throw new BadRequestException("Storefront store is not active.");
    }
    return store;
  }

  private ensureStorefrontEnabled(value: unknown): void {
    const config = asRecord(value);
    if (config?.enabled === false) {
      throw new BadRequestException("Storefront is disabled for this store.");
    }
  }

  private async issueCartAccessToken(input: {
    cartId: string;
    tenantId: string;
    storeId: string;
    pointKey: string | null;
    customerPhone: string | null;
    mode: "GUEST" | "CUSTOMER";
  }) {
    const claims: StorefrontCartAccessTokenClaims = {
      sub: input.cartId,
      tenantId: input.tenantId,
      storeId: input.storeId,
      pointKey: input.pointKey,
      customerPhone: input.customerPhone,
      mode: input.mode,
      scope: "storefront_cart_public"
    };
    const accessToken = await this.jwtService.signAsync(claims, {
      secret: resolveStorefrontPublicTokenSecret(this.env.JWT_ACCESS_SECRET),
      expiresIn: STOREFRONT_CART_ACCESS_TOKEN_TTL
    });

    return {
      cartId: input.cartId,
      accessToken,
      expiresAt: new Date(Date.now() + STOREFRONT_CART_ACCESS_TOKEN_TTL_MS).toISOString()
    };
  }

  private async issueOrderTrackingToken(input: {
    orderId: string;
    tenantId: string;
    storeId: string;
    pointKey: string | null;
    customerPhone: string | null;
  }) {
    const claims: StorefrontOrderTrackingTokenClaims = {
      sub: input.orderId,
      tenantId: input.tenantId,
      storeId: input.storeId,
      pointKey: input.pointKey,
      customerPhone: input.customerPhone,
      scope: "storefront_order_tracking"
    };
    const accessToken = await this.jwtService.signAsync(claims, {
      secret: resolveStorefrontPublicTokenSecret(this.env.JWT_ACCESS_SECRET),
      expiresIn: STOREFRONT_TRACKING_TOKEN_TTL
    });

    return {
      orderId: input.orderId,
      accessToken,
      expiresAt: new Date(Date.now() + STOREFRONT_TRACKING_TOKEN_TTL_MS).toISOString(),
      trackingPath: `/order-tracking/${input.orderId}?token=${encodeURIComponent(accessToken)}`
    };
  }

  private async verifyCartAccessToken(
    cartId: string,
    accessToken: string
  ): Promise<StorefrontCartAccessTokenClaims> {
    const claims = await this.verifyStorefrontToken<StorefrontCartAccessTokenClaims>(accessToken);
    if (claims.scope !== "storefront_cart_public" || claims.sub !== cartId) {
      throw new UnauthorizedException("Storefront cart access token does not match this cart.");
    }
    return claims;
  }

  private async verifyOrderTrackingToken(
    orderId: string,
    accessToken: string
  ): Promise<StorefrontOrderTrackingTokenClaims> {
    const claims =
      await this.verifyStorefrontToken<StorefrontOrderTrackingTokenClaims>(accessToken);
    if (claims.scope !== "storefront_order_tracking" || claims.sub !== orderId) {
      throw new UnauthorizedException("Storefront tracking token does not match this order.");
    }
    return claims;
  }

  private async verifyCustomerSessionToken(
    accessToken: string,
    store: Store
  ): Promise<StorefrontCustomerSessionClaims> {
    const claims = await this.verifyCustomerSessionTokenLoose(accessToken);
    if (claims.storeId !== store.id || claims.tenantId !== store.tenantId) {
      throw new UnauthorizedException("Storefront customer session is not valid for this store.");
    }
    return claims;
  }

  private async verifyCustomerSessionTokenLoose(
    accessToken: string
  ): Promise<StorefrontCustomerSessionClaims> {
    const claims =
      await this.verifyStorefrontToken<StorefrontCustomerSessionClaims>(accessToken);
    if (claims.scope !== "storefront_customer_session" || !claims.customerPhone?.trim()) {
      throw new UnauthorizedException("Storefront customer session token is invalid.");
    }
    return claims;
  }

  private async verifyQrAccessToken(
    accessToken: string,
    store: Store
  ): Promise<StorefrontQrClaims> {
    const claims = await this.verifyQrAccessTokenLoose(accessToken);
    if (claims.storeId !== store.id || claims.tenantId !== store.tenantId) {
      throw new UnauthorizedException("Storefront QR token is not valid for this store.");
    }
    return claims;
  }

  private async verifyQrAccessTokenLoose(accessToken: string): Promise<StorefrontQrClaims> {
    const claims = await this.verifyStorefrontToken<StorefrontQrClaims>(accessToken);
    if (claims.scope !== "storefront_qr_public") {
      throw new UnauthorizedException("Storefront QR token is invalid.");
    }
    return claims;
  }

  private async verifyStorefrontToken<TClaims extends object>(
    accessToken: string
  ): Promise<TClaims> {
    if (!accessToken?.trim()) {
      throw new UnauthorizedException("Storefront access token is required.");
    }

    try {
      return await this.jwtService.verifyAsync<TClaims>(accessToken, {
        secret: resolveStorefrontPublicTokenSecret(this.env.JWT_ACCESS_SECRET)
      });
    } catch {
      throw new UnauthorizedException("Storefront access token is invalid or expired.");
    }
  }
}

@ApiTags("storefront")
@Controller("storefront")
class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get("bootstrap")
  @Public()
  bootstrap(@Query() query: StorefrontBootstrapQueryDto): Promise<StorefrontBootstrapResponse> {
    return this.storefrontService.bootstrap(query);
  }

  @Post("customer-sessions")
  @Public()
  createCustomerSession(
    @Body() dto: CreateStorefrontCustomerSessionDto
  ): Promise<StorefrontCustomerSessionDto> {
    return this.storefrontService.createCustomerSession(dto);
  }

  @Get("customer-sessions/orders")
  @Public()
  listCustomerOrders(
    @Query() query: StorefrontAccessQueryDto
  ): Promise<ListResponse<StorefrontCustomerOrderListItemDto>> {
    return this.storefrontService.listCustomerOrders(query.accessToken);
  }

  @Post("carts")
  @Public()
  createCart(@Body() dto: CreateStorefrontCartDto): Promise<StorefrontCartSessionDto> {
    return this.storefrontService.createCart(dto);
  }

  @Get("carts/:id")
  @Public()
  getCart(
    @Param() params: StorefrontIdParamDto,
    @Query() query: StorefrontAccessQueryDto
  ): Promise<StorefrontCartSessionDto> {
    return this.storefrontService.getCart(params.id, query.accessToken);
  }

  @Patch("carts/:id")
  @Public()
  updateCart(
    @Param() params: StorefrontIdParamDto,
    @Body() dto: UpdateStorefrontCartDto
  ): Promise<StorefrontCartSessionDto> {
    return this.storefrontService.updateCart(params.id, dto);
  }

  @Post("carts/:id/items")
  @Public()
  addItem(
    @Param() params: StorefrontIdParamDto,
    @Body() dto: StorefrontCartItemDto
  ): Promise<StorefrontCartSessionDto> {
    return this.storefrontService.addItem(params.id, dto);
  }

  @Patch("carts/:id/items/:itemId")
  @Public()
  updateItem(
    @Param() params: StorefrontCartItemParamsDto,
    @Body() dto: UpdateStorefrontCartItemDto
  ): Promise<StorefrontCartSessionDto> {
    return this.storefrontService.updateItem(params.id, params.itemId, dto);
  }

  @Delete("carts/:id/items/:itemId")
  @Public()
  deleteItem(
    @Param() params: StorefrontCartItemParamsDto,
    @Query() query: StorefrontAccessQueryDto
  ): Promise<StorefrontCartSessionDto> {
    return this.storefrontService.deleteItem(params.id, params.itemId, query.accessToken);
  }

  @Post("carts/:id/checkout")
  @Public()
  checkout(
    @Param() params: StorefrontIdParamDto,
    @Body() dto: StorefrontCheckoutDto
  ): Promise<StorefrontCheckoutResponse> {
    return this.storefrontService.checkout(params.id, dto);
  }

  @Get("orders/:id/tracking")
  @Public()
  getOrderTracking(
    @Param() params: StorefrontIdParamDto,
    @Query() query: StorefrontAccessQueryDto
  ): Promise<StorefrontOrderTrackingResponse> {
    return this.storefrontService.getOrderTracking(params.id, query.accessToken);
  }

  @Post("qr-links")
  @Permissions("settings.write")
  createQrLink(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateStorefrontQrLinkDto
  ): Promise<StorefrontQrLinkDto> {
    return this.storefrontService.createQrLink(context, dto);
  }

  @Get("qr/:token")
  @Public()
  resolveQrToken(@Param() params: StorefrontQrTokenParamDto): Promise<StorefrontQrResolutionDto> {
    return this.storefrontService.resolveQrToken(params.token);
  }
}

@Module({
  imports: [JwtModule.register({}), CustomizationModule, PricingModule, OrdersModule, PaymentsModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
  exports: [StorefrontService]
})
export class StorefrontModule {}
