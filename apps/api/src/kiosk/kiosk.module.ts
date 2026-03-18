import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query
} from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import type {
  KioskBootstrapResponse,
  KioskCheckoutRequest,
  KioskCheckoutResponse,
  KioskPaymentHandoffDto
} from "@exetron/contracts";
import type { Device } from "@exetron/database";
import type { PaymentMethodKind, RequestContext } from "@exetron/types";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { Public } from "../common/decorators/public.decorator";
import { CustomizationModule, CustomizationService } from "../customization/customization.module";
import { DatabaseContextService } from "../database/database-context.service";
import { PrismaService } from "../database/prisma.service";
import { OrdersModule, OrdersService } from "../orders/orders.module";
import { PaymentsModule, PaymentsService } from "../payments/payments.module";
import { PricingModule, PricingService } from "../pricing/pricing.module";
import { resolveKioskBranding, resolveKioskRules } from "./kiosk-config.util";

class KioskBootstrapQueryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  deviceId!: string;
}

class KioskCheckoutItemDto {
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

class KioskCheckoutDto implements KioskCheckoutRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  deviceId!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiProperty({ enum: ["CASH", "CARD", "QR"] })
  @IsIn(["CASH", "CARD", "QR"])
  paymentMethod!: PaymentMethodKind;

  @ApiProperty({ type: [KioskCheckoutItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => KioskCheckoutItemDto)
  items!: KioskCheckoutItemDto[];
}

function buildDeviceContext(device: Device): RequestContext {
  return {
    userId: device.id,
    tenantId: device.tenantId,
    scope: "device",
    roleIds: [],
    permissions: [],
    storeIds: [device.storeId],
    deviceId: device.id
  };
}

function mapKioskPaymentHandoff(handoff: {
  id: string;
  orderId: string;
  tenantId: string;
  storeId: string;
  deviceId: string;
  method: PaymentMethodKind;
  status: "INITIATED" | "COMPLETED" | "FAILED" | "CANCELLED";
  amount: string;
  provider: string;
  externalReference: string | null;
  createdAt: Date;
  completedAt: Date | null;
}): KioskPaymentHandoffDto {
  return {
    id: handoff.id,
    orderId: handoff.orderId,
    tenantId: handoff.tenantId,
    storeId: handoff.storeId,
    deviceId: handoff.deviceId,
    method: handoff.method,
    status: handoff.status,
    amount: handoff.amount,
    provider: handoff.provider,
    externalReference: handoff.externalReference,
    createdAt: handoff.createdAt.toISOString(),
    completedAt: handoff.completedAt?.toISOString() ?? null
  };
}

@Injectable()
class KioskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbContext: DatabaseContextService,
    private readonly customizationService: CustomizationService,
    private readonly pricingService: PricingService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService
  ) {}

  async bootstrap(deviceId: string): Promise<KioskBootstrapResponse> {
    const device = await this.loadKioskDevice(deviceId);
    const context = buildDeviceContext(device);
    const [store, customization] = await Promise.all([
      this.dbContext.withRequestContext(context, (tx) =>
        tx.store.findUniqueOrThrow({
          where: { id: device.storeId }
        })
      ),
      this.customizationService.resolveEffectiveCustomization(context, {
        tenantId: device.tenantId,
        storeId: device.storeId,
        channel: "KIOSK",
        pointKey: device.code
      })
    ]);

    const catalog = await this.pricingService.compiledCatalog(context, {
      tenantId: device.tenantId,
      storeId: device.storeId
    });

    return {
      tenantId: device.tenantId,
      storeId: device.storeId,
      deviceId: device.id,
      storeName: store.name,
      deviceName: device.name,
      branding: resolveKioskBranding(
        customization.branding ?? customization.settings["kiosk.branding"] ?? null
      ),
      rules: resolveKioskRules(customization.settings["kiosk.rules"] ?? null),
      catalog
    };
  }

  async checkout(dto: KioskCheckoutDto): Promise<KioskCheckoutResponse> {
    if (!dto.items.length) {
      throw new BadRequestException("Kiosk checkout requires at least one item.");
    }

    const device = await this.loadKioskDevice(dto.deviceId);
    const context = buildDeviceContext(device);
    const customization = await this.customizationService.resolveEffectiveCustomization(
      context,
      {
        tenantId: device.tenantId,
        storeId: device.storeId,
        channel: "KIOSK",
        pointKey: device.code,
        inputs: {
          paymentMethod: dto.paymentMethod,
          customerName: dto.customerName ?? null
        }
      }
    );
    const rules = resolveKioskRules(customization.settings["kiosk.rules"] ?? null);

    if (rules.requireCustomerName && !dto.customerName?.trim()) {
      throw new BadRequestException("Customer name is required for this kiosk.");
    }

    if (!rules.allowNotes && dto.note?.trim()) {
      throw new BadRequestException("Notes are disabled for this kiosk.");
    }

    if (!rules.allowedPaymentMethods.includes(dto.paymentMethod)) {
      throw new BadRequestException("Payment method is not allowed for this kiosk.");
    }

    const cart = await this.ordersService.createCart(context, {
      tenantId: device.tenantId,
      storeId: device.storeId,
      channel: "KIOSK",
      customerName: dto.customerName ?? null,
      note: dto.note ?? null,
      deviceId: device.id
    });

    for (const item of dto.items) {
      await this.ordersService.addItem(context, cart.id, {
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        priceListId: item.priceListId ?? null,
        modifierOptionIds: item.modifierOptionIds ?? []
      });
    }

    const order = await this.ordersService.checkout(context, cart.id, {
      customerName: dto.customerName ?? null,
      note: dto.note ?? null
    });

    const paymentIntent = await this.paymentsService.createIntent(context, {
      tenantId: device.tenantId,
      storeId: device.storeId,
      orderId: order.id,
      channel: "KIOSK",
      deviceId: device.id,
      allocations: [
        {
          method: dto.paymentMethod,
          amount: order.total
        }
      ]
    });

    const initialAllocation = paymentIntent.allocations[0];
    if (!initialAllocation) {
      throw new BadRequestException("Kiosk payment intent was created without allocations.");
    }

    const processedIntent = await this.paymentsService.processAllocation(
      context,
      paymentIntent.id,
      initialAllocation.id,
      {}
    );
    const processedAllocation = processedIntent.allocations[0];
    if (!processedAllocation) {
      throw new BadRequestException("Processed kiosk payment intent has no allocation.");
    }

    const orderAfterPayment =
      processedIntent.status === "COMPLETED" && !rules.autoConfirmPaidOrders
        ? await this.ordersService.transitionOrder(context, order.id, {
            toStatus: "CONFIRMED"
          })
        : await this.ordersService.getOrder(context, order.id);

    return {
      order: orderAfterPayment,
      paymentHandoff: mapKioskPaymentHandoff({
        id: processedAllocation.id,
        orderId: processedIntent.orderId,
        tenantId: processedIntent.tenantId,
        storeId: processedIntent.storeId,
        deviceId: processedIntent.deviceId ?? device.id,
        method: processedAllocation.method,
        status:
          processedIntent.status === "COMPLETED"
            ? "COMPLETED"
            : processedIntent.status === "FAILED"
              ? "FAILED"
              : processedIntent.status === "CANCELLED"
                ? "CANCELLED"
                : "INITIATED",
        amount: processedAllocation.amount,
        provider: processedAllocation.providerKey ?? "kiosk-default-provider",
        externalReference: processedAllocation.externalReference,
        createdAt: new Date(processedIntent.createdAt),
        completedAt: processedAllocation.completedAt
          ? new Date(processedAllocation.completedAt)
          : null
      })
    };
  }

  private async loadKioskDevice(deviceId: string): Promise<Device> {
    const device = await this.prisma.device.findUniqueOrThrow({
      where: { id: deviceId }
    });

    if (device.type !== "KIOSK") {
      throw new BadRequestException("Selected device is not a kiosk device.");
    }

    if (device.status !== "ACTIVE") {
      throw new BadRequestException("Kiosk device is not active.");
    }

    return device;
  }
}

@ApiTags("kiosk")
@Controller("kiosk")
class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Get("bootstrap")
  @Public()
  bootstrap(@Query() query: KioskBootstrapQueryDto): Promise<KioskBootstrapResponse> {
    return this.kioskService.bootstrap(query.deviceId);
  }

  @Post("checkout")
  @Public()
  checkout(@Body() dto: KioskCheckoutDto): Promise<KioskCheckoutResponse> {
    return this.kioskService.checkout(dto);
  }
}

@Module({
  imports: [CustomizationModule, PricingModule, OrdersModule, PaymentsModule],
  controllers: [KioskController],
  providers: [KioskService]
})
export class KioskModule {}
