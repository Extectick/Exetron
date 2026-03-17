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
import { Type } from "class-transformer";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  AvailabilityWindowInput,
  CreateProductRequest,
  CreateProductVariantRequest,
  ListResponse,
  ProductDto,
  ProductVariantDto,
  UpdateProductRequest,
  UpdateProductVariantRequest
} from "@exetron/contracts";
import type { Prisma } from "@exetron/database";
import type { RequestContext } from "@exetron/types";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Matches,
  Min,
  ValidateNested
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import {
  decimalToString,
  groupAvailabilityWindows,
  replaceAvailabilityWindows
} from "../common/catalog-helpers";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";

class ProductsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class ProductVariantParamsDto extends IdParamDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  variantId!: string;
}

class AvailabilityWindowPayloadDto implements AvailabilityWindowInput {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiProperty({ minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @ApiProperty({ example: "09:00" })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @ApiProperty({ example: "18:00" })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;
}

class CreateProductDto implements CreateProductRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiProperty({ example: "cheeseburger" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: "8.50", nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  basePrice?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean;

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  modifierGroupIds?: string[];

  @ApiPropertyOptional({ type: [AvailabilityWindowPayloadDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWindowPayloadDto)
  availabilityWindows?: AvailabilityWindowPayloadDto[];
}

class UpdateProductDto implements UpdateProductRequest {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";

  @ApiPropertyOptional({ example: "8.50", nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  basePrice?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean;

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  modifierGroupIds?: string[];

  @ApiPropertyOptional({ type: [AvailabilityWindowPayloadDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWindowPayloadDto)
  availabilityWindows?: AvailabilityWindowPayloadDto[];
}

class CreateProductVariantDto implements CreateProductVariantRequest {
  @ApiProperty({ example: "default" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string | null;

  @ApiPropertyOptional({ example: "9.20", nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  basePrice?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean;

  @ApiPropertyOptional({ type: [AvailabilityWindowPayloadDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWindowPayloadDto)
  availabilityWindows?: AvailabilityWindowPayloadDto[];
}

class UpdateProductVariantDto implements UpdateProductVariantRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string | null;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";

  @ApiPropertyOptional({ example: "9.20", nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  basePrice?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean;

  @ApiPropertyOptional({ type: [AvailabilityWindowPayloadDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWindowPayloadDto)
  availabilityWindows?: AvailabilityWindowPayloadDto[];
}

type ProductWithRelations = {
  id: string;
  tenantId: string;
  categoryId: string | null;
  brandId: string | null;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isVisible: boolean;
  isAvailable: boolean;
  isOutOfStock: boolean;
  basePrice: { toFixed: (digits?: number) => string } | null;
  createdAt: Date;
  updatedAt: Date;
  modifierGroupLinks: Array<{ modifierGroupId: string }>;
  variants: Array<{
    id: string;
    tenantId: string;
    productId: string;
    code: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    isVisible: boolean;
    isAvailable: boolean;
    isOutOfStock: boolean;
    basePrice: { toFixed: (digits?: number) => string } | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

@Injectable()
class ProductsService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  async list(
    context: RequestContext,
    query: ProductsQueryDto
  ): Promise<ListResponse<ProductDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const products = await tx.product.findMany({
        where: this.accessControl.tenantWhere(context, query.tenantId),
        include: {
          modifierGroupLinks: {
            orderBy: { sortOrder: "asc" }
          },
          variants: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: await this.mapProducts(tx, products),
        total: products.length
      };
    });
  }

  async listVariants(
    context: RequestContext,
    productId: string
  ): Promise<ListResponse<ProductVariantDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId }
      });
      this.accessControl.resolveTenantId(context, product.tenantId);

      const variants = await tx.productVariant.findMany({
        where: { productId },
        orderBy: { createdAt: "asc" }
      });
      const variantWindows = groupAvailabilityWindows(
        await tx.availabilityWindow.findMany({
          where: {
            targetType: "VARIANT",
            targetId: { in: variants.map((variant) => variant.id) }
          },
          orderBy: [{ weekday: "asc" }, { startTime: "asc" }]
        })
      );

      return {
        items: variants.map((variant) => ({
          id: variant.id,
          tenantId: variant.tenantId,
          productId: variant.productId,
          code: variant.code,
          name: variant.name,
          sku: variant.sku,
          barcode: variant.barcode,
          status: variant.status,
          isVisible: variant.isVisible,
          isAvailable: variant.isAvailable,
          isOutOfStock: variant.isOutOfStock,
          basePrice: decimalToString(variant.basePrice),
          availabilityWindows: variantWindows.get(`VARIANT:${variant.id}`) ?? [],
          createdAt: variant.createdAt.toISOString(),
          updatedAt: variant.updatedAt.toISOString()
        })),
        total: variants.length
      };
    });
  }

  create(context: RequestContext, dto: CreateProductDto): Promise<ProductDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      await this.ensureCatalogReferences(tx, context, tenantId, dto);
      await this.ensureAvailabilityWindowAccess(
        tx,
        context,
        tenantId,
        dto.availabilityWindows ?? []
      );

      const product = await tx.product.create({
        data: {
          tenantId,
          categoryId: dto.categoryId ?? null,
          brandId: dto.brandId ?? null,
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          basePrice: dto.basePrice ?? null,
          isVisible: dto.isVisible ?? true,
          isAvailable: dto.isAvailable ?? true,
          isOutOfStock: dto.isOutOfStock ?? false,
          modifierGroupLinks: dto.modifierGroupIds?.length
            ? {
                createMany: {
                  data: dto.modifierGroupIds.map((modifierGroupId, index) => ({
                    tenantId,
                    modifierGroupId,
                    sortOrder: index
                  }))
                }
              }
            : undefined
        },
        include: {
          modifierGroupLinks: true,
          variants: true
        }
      });

      await replaceAvailabilityWindows(tx, {
        tenantId,
        targetType: "PRODUCT",
        targetId: product.id,
        windows: dto.availabilityWindows ?? []
      });

      await this.audit.recordTx(tx, {
        tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "product.created",
        entityType: "product",
        entityId: product.id,
        payload: { code: product.code, name: product.name }
      });

      await this.domainEvents.record(tx, {
        tenantId,
        eventName: "product.created",
        aggregate: "product",
        aggregateId: product.id,
        payload: { code: product.code }
      });

      return this.getProductDto(tx, product.id);
    });
  }

  update(
    context: RequestContext,
    productId: string,
    dto: UpdateProductDto
  ): Promise<ProductDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: {
          modifierGroupLinks: true,
          variants: true
        }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);

      await this.ensureCatalogReferences(tx, context, current.tenantId, dto);
      await this.ensureAvailabilityWindowAccess(
        tx,
        context,
        current.tenantId,
        dto.availabilityWindows ?? []
      );

      await tx.product.update({
        where: { id: productId },
        data: {
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.brandId !== undefined ? { brandId: dto.brandId } : {}),
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
          ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
          ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
          ...(dto.isOutOfStock !== undefined
            ? { isOutOfStock: dto.isOutOfStock }
            : {}),
          ...(dto.modifierGroupIds
            ? {
                modifierGroupLinks: {
                  deleteMany: {},
                  createMany: {
                    data: dto.modifierGroupIds.map((modifierGroupId, index) => ({
                      tenantId: current.tenantId,
                      modifierGroupId,
                      sortOrder: index
                    }))
                  }
                }
              }
            : {})
        }
      });

      if (dto.availabilityWindows) {
        await replaceAvailabilityWindows(tx, {
          tenantId: current.tenantId,
          targetType: "PRODUCT",
          targetId: productId,
          windows: dto.availabilityWindows
        });
      }

      await this.audit.recordTx(tx, {
        tenantId: current.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "product.updated",
        entityType: "product",
        entityId: productId,
        payload: dto as Record<string, unknown>
      });

      return this.getProductDto(tx, productId);
    });
  }

  createVariant(
    context: RequestContext,
    productId: string,
    dto: CreateProductVariantDto
  ): Promise<ProductVariantDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId }
      });
      this.accessControl.resolveTenantId(context, product.tenantId);
      await this.ensureAvailabilityWindowAccess(
        tx,
        context,
        product.tenantId,
        dto.availabilityWindows ?? []
      );

      const variant = await tx.productVariant.create({
        data: {
          tenantId: product.tenantId,
          productId,
          code: dto.code,
          name: dto.name,
          sku: dto.sku ?? null,
          barcode: dto.barcode ?? null,
          basePrice: dto.basePrice ?? null,
          isVisible: dto.isVisible ?? true,
          isAvailable: dto.isAvailable ?? true,
          isOutOfStock: dto.isOutOfStock ?? false
        }
      });

      await replaceAvailabilityWindows(tx, {
        tenantId: product.tenantId,
        targetType: "VARIANT",
        targetId: variant.id,
        windows: dto.availabilityWindows ?? []
      });

      await this.audit.recordTx(tx, {
        tenantId: product.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "product_variant.created",
        entityType: "product_variant",
        entityId: variant.id,
        payload: { code: variant.code }
      });

      await this.domainEvents.record(tx, {
        tenantId: product.tenantId,
        eventName: "product_variant.created",
        aggregate: "product_variant",
        aggregateId: variant.id,
        payload: { code: variant.code, productId }
      });

      return this.getVariantDto(tx, variant.id);
    });
  }

  updateVariant(
    context: RequestContext,
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto
  ): Promise<ProductVariantDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: variantId }
      });
      this.accessControl.resolveTenantId(context, variant.tenantId);

      if (variant.productId !== productId) {
        throw new BadRequestException(
          "Product variant does not belong to the requested product."
        );
      }

      await this.ensureAvailabilityWindowAccess(
        tx,
        context,
        variant.tenantId,
        dto.availabilityWindows ?? []
      );

      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
          ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
          ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
          ...(dto.isOutOfStock !== undefined
            ? { isOutOfStock: dto.isOutOfStock }
            : {})
        }
      });

      if (dto.availabilityWindows) {
        await replaceAvailabilityWindows(tx, {
          tenantId: variant.tenantId,
          targetType: "VARIANT",
          targetId: variantId,
          windows: dto.availabilityWindows
        });
      }

      await this.audit.recordTx(tx, {
        tenantId: variant.tenantId,
        actorType: "USER",
        actorId: context.userId,
        action: "product_variant.updated",
        entityType: "product_variant",
        entityId: variantId,
        payload: dto as Record<string, unknown>
      });

      return this.getVariantDto(tx, variantId);
    });
  }

  private async ensureCatalogReferences(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    tenantId: string,
    dto: {
      categoryId?: string | null;
      brandId?: string | null;
      modifierGroupIds?: string[];
    }
  ): Promise<void> {
    if (dto.categoryId) {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: dto.categoryId }
      });
      this.accessControl.resolveTenantId(context, category.tenantId);
      if (category.tenantId !== tenantId) {
        throw new BadRequestException("Category tenant mismatch.");
      }
    }

    if (dto.brandId) {
      const brand = await tx.brand.findUniqueOrThrow({
        where: { id: dto.brandId }
      });
      this.accessControl.resolveTenantId(context, brand.tenantId);
      if (brand.tenantId !== tenantId) {
        throw new BadRequestException("Brand tenant mismatch.");
      }
    }

    if (dto.modifierGroupIds?.length) {
      const groups = await tx.modifierGroup.findMany({
        where: {
          id: { in: dto.modifierGroupIds }
        }
      });

      if (groups.length !== dto.modifierGroupIds.length) {
        throw new BadRequestException("One or more modifier groups were not found.");
      }

      for (const group of groups) {
        this.accessControl.resolveTenantId(context, group.tenantId);
        if (group.tenantId !== tenantId) {
          throw new BadRequestException("Modifier group tenant mismatch.");
        }
      }
    }
  }

  private async ensureAvailabilityWindowAccess(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    tenantId: string,
    windows: AvailabilityWindowInput[]
  ): Promise<void> {
    const storeIds = Array.from(
      new Set(windows.map((window) => window.storeId).filter(Boolean) as string[])
    );

    if (!storeIds.length) {
      return;
    }

    const stores = await tx.store.findMany({
      where: {
        id: { in: storeIds }
      }
    });

    if (stores.length !== storeIds.length) {
      throw new BadRequestException("One or more availability window stores were not found.");
    }

    for (const store of stores) {
      this.accessControl.resolveTenantId(context, store.tenantId);
      this.accessControl.enforceStoreAccess(context, store.id);
      if (store.tenantId !== tenantId) {
        throw new BadRequestException("Availability window store tenant mismatch.");
      }
    }
  }

  private async getProductDto(
    tx: Prisma.TransactionClient,
    productId: string
  ): Promise<ProductDto> {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      include: {
        modifierGroupLinks: true,
        variants: true
      }
    });

    const [mapped] = await this.mapProducts(tx, [product]);
    return mapped;
  }

  private async getVariantDto(
    tx: Prisma.TransactionClient,
    variantId: string
  ): Promise<ProductVariantDto> {
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: variantId }
    });
    const windows = groupAvailabilityWindows(
      await tx.availabilityWindow.findMany({
        where: {
          targetType: "VARIANT",
          targetId: variantId
        },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }]
      })
    );

    return {
      id: variant.id,
      tenantId: variant.tenantId,
      productId: variant.productId,
      code: variant.code,
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode,
      status: variant.status,
      isVisible: variant.isVisible,
      isAvailable: variant.isAvailable,
      isOutOfStock: variant.isOutOfStock,
      basePrice: decimalToString(variant.basePrice),
      availabilityWindows: windows.get(`VARIANT:${variant.id}`) ?? [],
      createdAt: variant.createdAt.toISOString(),
      updatedAt: variant.updatedAt.toISOString()
    };
  }

  private async mapProducts(
    tx: Prisma.TransactionClient,
    products: ProductWithRelations[]
  ): Promise<ProductDto[]> {
    const productIds = products.map((product) => product.id);
    const variantIds = products.flatMap((product) =>
      product.variants.map((variant) => variant.id)
    );

    const availabilityWindows =
      productIds.length || variantIds.length
        ? await tx.availabilityWindow.findMany({
            where: {
              OR: [
                ...(productIds.length
                  ? [{ targetType: "PRODUCT" as const, targetId: { in: productIds } }]
                  : []),
                ...(variantIds.length
                  ? [{ targetType: "VARIANT" as const, targetId: { in: variantIds } }]
                  : [])
              ]
            },
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }]
          })
        : [];
    const groupedWindows = groupAvailabilityWindows(availabilityWindows);

    return products.map((product) => ({
      id: product.id,
      tenantId: product.tenantId,
      categoryId: product.categoryId,
      brandId: product.brandId,
      code: product.code,
      name: product.name,
      description: product.description,
      status: product.status,
      isVisible: product.isVisible,
      isAvailable: product.isAvailable,
      isOutOfStock: product.isOutOfStock,
      basePrice: decimalToString(product.basePrice),
      modifierGroupIds: product.modifierGroupLinks.map((link) => link.modifierGroupId),
      availabilityWindows: groupedWindows.get(`PRODUCT:${product.id}`) ?? [],
      variants: product.variants.map((variant) => ({
        id: variant.id,
        tenantId: variant.tenantId,
        productId: variant.productId,
        code: variant.code,
        name: variant.name,
        sku: variant.sku,
        barcode: variant.barcode,
        status: variant.status,
        isVisible: variant.isVisible,
        isAvailable: variant.isAvailable,
        isOutOfStock: variant.isOutOfStock,
        basePrice: decimalToString(variant.basePrice),
        availabilityWindows: groupedWindows.get(`VARIANT:${variant.id}`) ?? [],
        createdAt: variant.createdAt.toISOString(),
        updatedAt: variant.updatedAt.toISOString()
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    }));
  }
}

@ApiTags("products")
@Controller("products")
class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Permissions("products.read")
  list(
    @CurrentContext() context: RequestContext,
    @Query() query: ProductsQueryDto
  ): Promise<ListResponse<ProductDto>> {
    return this.productsService.list(context, query);
  }

  @Post()
  @Permissions("products.write")
  create(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateProductDto
  ): Promise<ProductDto> {
    return this.productsService.create(context, dto);
  }

  @Patch(":id")
  @Permissions("products.write")
  update(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateProductDto
  ): Promise<ProductDto> {
    return this.productsService.update(context, params.id, dto);
  }

  @Get(":id/variants")
  @Permissions("products.read")
  listVariants(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<ListResponse<ProductVariantDto>> {
    return this.productsService.listVariants(context, params.id);
  }

  @Post(":id/variants")
  @Permissions("products.write")
  createVariant(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: CreateProductVariantDto
  ): Promise<ProductVariantDto> {
    return this.productsService.createVariant(context, params.id, dto);
  }

  @Patch(":id/variants/:variantId")
  @Permissions("products.write")
  updateVariant(
    @CurrentContext() context: RequestContext,
    @Param() params: ProductVariantParamsDto,
    @Body() dto: UpdateProductVariantDto
  ): Promise<ProductVariantDto> {
    return this.productsService.updateVariant(context, params.id, params.variantId, dto);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}
