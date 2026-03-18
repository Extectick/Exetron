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
  CompiledCatalogCategoryDto,
  CompiledCatalogProductDto,
  CompiledCatalogResponse,
  CreatePriceListRequest,
  CreateStoreCatalogOverrideRequest,
  ListResponse,
  PriceListDto,
  PricePreviewRequest,
  PricePreviewResponse,
  StoreCatalogOverrideDto,
  UpdatePriceListRequest,
  UpdateStoreCatalogOverrideRequest,
  UpsertPriceListItemRequest
} from "@exetron/contracts";
import type { Prisma } from "@exetron/database";
import type {
  AvailabilityTargetType,
  CatalogTargetType,
  RequestContext
} from "@exetron/types";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested
} from "class-validator";
import { AccessControlService } from "../common/access-control.service";
import { decimalToString, groupAvailabilityWindows } from "../common/catalog-helpers";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import {
  isCatalogEntryAvailable,
  resolveCurrentSlot
} from "./availability.util";
import { resolvePrice } from "./money.util";

class PriceListsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class StoreCatalogOverridesQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

class CompiledCatalogQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  priceListId?: string;
}

class PriceListItemPayloadDto implements UpsertPriceListItemRequest {
  @ApiProperty({ enum: ["PRODUCT", "VARIANT", "MODIFIER_OPTION"] })
  @IsIn(["PRODUCT", "VARIANT", "MODIFIER_OPTION"])
  targetType!: CatalogTargetType;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ example: "7.90" })
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  price!: string;
}

class CreatePriceListDto implements CreatePriceListRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: "main-menu" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: "RUB" })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({ type: [PriceListItemPayloadDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PriceListItemPayloadDto)
  items?: PriceListItemPayloadDto[];
}

class UpdatePriceListDto implements UpdatePriceListRequest {
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
  currency?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "ARCHIVED";

  @ApiPropertyOptional({ type: [PriceListItemPayloadDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PriceListItemPayloadDto)
  items?: PriceListItemPayloadDto[];
}

class CreateStoreCatalogOverrideDto implements CreateStoreCatalogOverrideRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ enum: ["PRODUCT", "VARIANT", "MODIFIER_OPTION"] })
  @IsIn(["PRODUCT", "VARIANT", "MODIFIER_OPTION"])
  targetType!: CatalogTargetType;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  targetId!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean | null;

  @ApiPropertyOptional({ nullable: true, example: "10.50" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  priceOverride?: string | null;
}

class UpdateStoreCatalogOverrideDto implements UpdateStoreCatalogOverrideRequest {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean | null;

  @ApiPropertyOptional({ nullable: true, example: "10.50" })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  priceOverride?: string | null;
}

class PricePreviewDto implements PricePreviewRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  priceListId?: string | null;

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  modifierOptionIds?: string[];
}

function targetKey(targetType: CatalogTargetType, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function availabilityKey(targetType: AvailabilityTargetType, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function mapPriceList(priceList: {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  currency: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    tenantId: string;
    priceListId: string;
    targetType: CatalogTargetType;
    targetId: string;
    price: { toFixed: (digits?: number) => string };
    createdAt: Date;
    updatedAt: Date;
  }>;
}): PriceListDto {
  return {
    id: priceList.id,
    tenantId: priceList.tenantId,
    code: priceList.code,
    name: priceList.name,
    currency: priceList.currency,
    status: priceList.status,
    items: priceList.items.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      priceListId: item.priceListId,
      targetType: item.targetType,
      targetId: item.targetId,
      price: decimalToString(item.price) ?? "0.00",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    })),
    createdAt: priceList.createdAt.toISOString(),
    updatedAt: priceList.updatedAt.toISOString()
  };
}

function mapStoreCatalogOverride(override: {
  id: string;
  tenantId: string;
  storeId: string;
  targetType: CatalogTargetType;
  targetId: string;
  isVisible: boolean | null;
  isAvailable: boolean | null;
  isOutOfStock: boolean | null;
  priceOverride: { toFixed: (digits?: number) => string } | null;
  createdAt: Date;
  updatedAt: Date;
}): StoreCatalogOverrideDto {
  return {
    id: override.id,
    tenantId: override.tenantId,
    storeId: override.storeId,
    targetType: override.targetType,
    targetId: override.targetId,
    isVisible: override.isVisible,
    isAvailable: override.isAvailable,
    isOutOfStock: override.isOutOfStock,
    priceOverride: decimalToString(override.priceOverride),
    createdAt: override.createdAt.toISOString(),
    updatedAt: override.updatedAt.toISOString()
  };
}

@Injectable()
export class PricingService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService
  ) {}

  listPriceLists(
    context: RequestContext,
    query: PriceListsQueryDto
  ): Promise<ListResponse<PriceListDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const priceLists = await tx.priceList.findMany({
        where: this.accessControl.tenantWhere(context, query.tenantId),
        include: {
          items: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: priceLists.map(mapPriceList),
        total: priceLists.length
      };
    });
  }

  createPriceList(
    context: RequestContext,
    dto: CreatePriceListDto
  ): Promise<PriceListDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      await this.ensureCatalogTargets(tx, context, tenantId, dto.items ?? []);

      const priceList = await tx.priceList.create({
        data: {
          tenantId,
          code: dto.code,
          name: dto.name,
          currency: dto.currency,
          items: dto.items?.length
            ? {
                createMany: {
                  data: dto.items.map((item) => ({
                    tenantId,
                    targetType: item.targetType,
                    targetId: item.targetId,
                    price: item.price
                  }))
                }
              }
            : undefined
        },
        include: {
          items: {
            orderBy: { createdAt: "asc" }
          }
        }
      });

      return mapPriceList(priceList);
    });
  }

  updatePriceList(
    context: RequestContext,
    priceListId: string,
    dto: UpdatePriceListDto
  ): Promise<PriceListDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.priceList.findUniqueOrThrow({
        where: { id: priceListId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);
      await this.ensureCatalogTargets(tx, context, current.tenantId, dto.items ?? []);

      const priceList = await tx.priceList.update({
        where: { id: priceListId },
        data: {
          ...(dto.code ? { code: dto.code } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.currency ? { currency: dto.currency } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.items
            ? {
                items: {
                  deleteMany: {},
                  createMany: {
                    data: dto.items.map((item) => ({
                      tenantId: current.tenantId,
                      targetType: item.targetType,
                      targetId: item.targetId,
                      price: item.price
                    }))
                  }
                }
              }
            : {})
        },
        include: {
          items: {
            orderBy: { createdAt: "asc" }
          }
        }
      });

      return mapPriceList(priceList);
    });
  }

  listStoreOverrides(
    context: RequestContext,
    query: StoreCatalogOverridesQueryDto
  ): Promise<ListResponse<StoreCatalogOverrideDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const overrides = await tx.storeCatalogOverride.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          ...(this.accessControl.storeFilter(context) && !query.storeId
            ? { storeId: this.accessControl.storeFilter(context) }
            : {})
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: overrides.map(mapStoreCatalogOverride),
        total: overrides.length
      };
    });
  }

  createStoreOverride(
    context: RequestContext,
    dto: CreateStoreCatalogOverrideDto
  ): Promise<StoreCatalogOverrideDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
    this.accessControl.enforceStoreAccess(context, dto.storeId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      await this.ensureStoreAndTarget(tx, context, tenantId, dto.storeId, {
        targetType: dto.targetType,
        targetId: dto.targetId
      });

      const override = await tx.storeCatalogOverride.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          isVisible: dto.isVisible ?? null,
          isAvailable: dto.isAvailable ?? null,
          isOutOfStock: dto.isOutOfStock ?? null,
          priceOverride: dto.priceOverride ?? null
        }
      });

      return mapStoreCatalogOverride(override);
    });
  }

  updateStoreOverride(
    context: RequestContext,
    overrideId: string,
    dto: UpdateStoreCatalogOverrideDto
  ): Promise<StoreCatalogOverrideDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await tx.storeCatalogOverride.findUniqueOrThrow({
        where: { id: overrideId }
      });
      this.accessControl.resolveTenantId(context, current.tenantId);
      this.accessControl.enforceStoreAccess(context, current.storeId);

      const override = await tx.storeCatalogOverride.update({
        where: { id: overrideId },
        data: {
          ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
          ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
          ...(dto.isOutOfStock !== undefined
            ? { isOutOfStock: dto.isOutOfStock }
            : {}),
          ...(dto.priceOverride !== undefined ? { priceOverride: dto.priceOverride } : {})
        }
      });

      return mapStoreCatalogOverride(override);
    });
  }

  compiledCatalog(
    context: RequestContext,
    query: CompiledCatalogQueryDto
  ): Promise<CompiledCatalogResponse> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const store = await tx.store.findUniqueOrThrow({
        where: { id: query.storeId }
      });
      this.accessControl.resolveTenantId(context, query.tenantId ?? store.tenantId);
      this.accessControl.enforceStoreAccess(context, store.id);

      const priceList = query.priceListId
        ? await tx.priceList.findUniqueOrThrow({
            where: { id: query.priceListId },
            include: { items: true }
          })
        : null;

      if (priceList && priceList.tenantId !== store.tenantId) {
        throw new BadRequestException("Price list tenant mismatch.");
      }

      const categories = await tx.category.findMany({
        where: {
          tenantId: store.tenantId,
          status: "ACTIVE"
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      });

      const products = await tx.product.findMany({
        where: {
          tenantId: store.tenantId
        },
        include: {
          variants: {
            orderBy: { createdAt: "asc" }
          },
          modifierGroupLinks: {
            orderBy: { sortOrder: "asc" },
            include: {
              modifierGroup: {
                include: {
                  options: {
                    orderBy: { createdAt: "asc" }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      });

      const productIds = products.map((product) => product.id);
      const variantIds = products.flatMap((product) =>
        product.variants.map((variant) => variant.id)
      );
      const modifierOptionIds = products.flatMap((product) =>
        product.modifierGroupLinks.flatMap((link) =>
          link.modifierGroup.options.map((option) => option.id)
        )
      );

      const availabilityWindows = groupAvailabilityWindows(
        await tx.availabilityWindow.findMany({
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
      );

      const overrides = await tx.storeCatalogOverride.findMany({
        where: {
          storeId: store.id,
          OR: [
            ...(productIds.length
              ? [{ targetType: "PRODUCT" as const, targetId: { in: productIds } }]
              : []),
            ...(variantIds.length
              ? [{ targetType: "VARIANT" as const, targetId: { in: variantIds } }]
              : []),
            ...(modifierOptionIds.length
              ? [
                  {
                    targetType: "MODIFIER_OPTION" as const,
                    targetId: { in: modifierOptionIds }
                  }
                ]
              : [])
          ]
        }
      });
      const overrideMap = new Map(
        overrides.map((override) => [targetKey(override.targetType, override.targetId), override])
      );
      const priceItemMap = new Map(
        (priceList?.items ?? []).map((item) => [targetKey(item.targetType, item.targetId), item])
      );

      const slot = resolveCurrentSlot(new Date(), store.timezone);
      const categoryMap = new Map(
        categories.map((category) => [
          category.id,
          {
            id: category.id,
            parentId: category.parentId,
            code: category.code,
            name: category.name,
            sortOrder: category.sortOrder,
            products: [] as CompiledCatalogProductDto[]
          }
        ])
      );
      const uncategorizedProducts: CompiledCatalogProductDto[] = [];

      for (const product of products) {
        const productOverride = overrideMap.get(targetKey("PRODUCT", product.id));
        const productWindows = (
          availabilityWindows.get(availabilityKey("PRODUCT", product.id)) ?? []
        ).filter((window) => !window.storeId || window.storeId === store.id);

        const productVisible = isCatalogEntryAvailable({
          status: product.status,
          isVisible: productOverride?.isVisible ?? product.isVisible,
          isAvailable: productOverride?.isAvailable ?? product.isAvailable,
          isOutOfStock: productOverride?.isOutOfStock ?? product.isOutOfStock,
          windows: productWindows,
          currentWeekday: slot.weekday,
          currentMinuteOfDay: slot.minuteOfDay
        });

        if (!productVisible) {
          continue;
        }

        const compiledVariants = product.variants
          .map((variant) => {
            const variantOverride = overrideMap.get(targetKey("VARIANT", variant.id));
            const variantWindows = (
              availabilityWindows.get(availabilityKey("VARIANT", variant.id)) ?? []
            ).filter((window) => !window.storeId || window.storeId === store.id);

            const variantVisible = isCatalogEntryAvailable({
              status: variant.status,
              isVisible: variantOverride?.isVisible ?? variant.isVisible,
              isAvailable: variantOverride?.isAvailable ?? variant.isAvailable,
              isOutOfStock: variantOverride?.isOutOfStock ?? variant.isOutOfStock,
              windows: variantWindows,
              currentWeekday: slot.weekday,
              currentMinuteOfDay: slot.minuteOfDay
            });

            if (!variantVisible) {
              return null;
            }

            const resolvedVariantPrice = resolvePrice({
              storeOverridePrice: decimalToString(variantOverride?.priceOverride),
              priceListPrice: decimalToString(
                priceItemMap.get(targetKey("VARIANT", variant.id))?.price
              ),
              variantBasePrice: decimalToString(variant.basePrice),
              productBasePrice: decimalToString(product.basePrice)
            });

            return {
              id: variant.id,
              code: variant.code,
              name: variant.name,
              sku: variant.sku,
              barcode: variant.barcode,
              effectivePrice: resolvedVariantPrice.basePrice,
              priceSource: resolvedVariantPrice.source
            };
          })
          .filter(Boolean) as Array<CompiledCatalogProductDto["variants"][number]>;

        if (product.variants.length && !compiledVariants.length) {
          continue;
        }

        const resolvedProductPrice = resolvePrice({
          storeOverridePrice: decimalToString(productOverride?.priceOverride),
          priceListPrice: decimalToString(
            priceItemMap.get(targetKey("PRODUCT", product.id))?.price
          ),
          productBasePrice: decimalToString(product.basePrice)
        });

        const modifierGroups = product.modifierGroupLinks
          .filter((link) => link.modifierGroup.status === "ACTIVE")
          .map((link) => ({
            id: link.modifierGroup.id,
            code: link.modifierGroup.code,
            name: link.modifierGroup.name,
            selectionMode: link.modifierGroup.selectionMode,
            minSelection: link.modifierGroup.minSelection,
            maxSelection: link.modifierGroup.maxSelection,
            required: link.modifierGroup.required,
            options: link.modifierGroup.options
              .filter((option) => option.status === "ACTIVE")
              .map((option) => {
                const optionOverride = overrideMap.get(
                  targetKey("MODIFIER_OPTION", option.id)
                );
                const optionPriceItem = priceItemMap.get(
                  targetKey("MODIFIER_OPTION", option.id)
                );

                return {
                  id: option.id,
                  code: option.code,
                  name: option.name,
                  priceDelta:
                    decimalToString(optionOverride?.priceOverride) ??
                    decimalToString(optionPriceItem?.price) ??
                    decimalToString(option.priceDelta) ??
                    "0.00"
                };
              })
          }));

        const compiledProduct: CompiledCatalogProductDto = {
          id: product.id,
          brandId: product.brandId,
          code: product.code,
          name: product.name,
          description: product.description,
          effectivePrice: resolvedProductPrice.basePrice,
          priceSource: resolvedProductPrice.source,
          variants: compiledVariants,
          modifierGroups
        };

        const categoryBucket =
          (product.categoryId ? categoryMap.get(product.categoryId) : undefined) ?? null;

        if (categoryBucket) {
          categoryBucket.products.push(compiledProduct);
        } else {
          uncategorizedProducts.push(compiledProduct);
        }
      }

      const compiledCategories: CompiledCatalogCategoryDto[] = Array.from(
        categoryMap.values()
      ).filter((category) => category.products.length > 0);

      return {
        tenantId: store.tenantId,
        storeId: store.id,
        generatedAt: new Date().toISOString(),
        categories: compiledCategories,
        uncategorizedProducts
      };
    });
  }

  pricePreview(
    context: RequestContext,
    dto: PricePreviewDto
  ): Promise<PricePreviewResponse> {
    return this.dbContext.withRequestContext(context, (tx) =>
      this.resolveSelectionTx(tx, context, dto)
    );
  }

  async resolveSelectionTx(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    dto: PricePreviewRequest
  ): Promise<PricePreviewResponse> {
    const store = await tx.store.findUniqueOrThrow({
      where: { id: dto.storeId }
    });
    this.accessControl.resolveTenantId(context, dto.tenantId ?? store.tenantId);
    this.accessControl.enforceStoreAccess(context, store.id);

    const product = await tx.product.findUniqueOrThrow({
      where: { id: dto.productId }
    });

    if (product.tenantId !== store.tenantId) {
      throw new BadRequestException("Product tenant mismatch.");
    }

    const variant = dto.variantId
      ? await tx.productVariant.findUniqueOrThrow({
          where: { id: dto.variantId }
        })
      : null;

    if (variant && variant.productId !== product.id) {
      throw new BadRequestException("Variant does not belong to the requested product.");
    }

    const modifierOptions = dto.modifierOptionIds?.length
      ? await tx.modifierOption.findMany({
          where: {
            id: { in: dto.modifierOptionIds }
          }
        })
      : [];

    if (modifierOptions.length !== (dto.modifierOptionIds?.length ?? 0)) {
      throw new BadRequestException("One or more modifier options were not found.");
    }

    const priceList = dto.priceListId
      ? await tx.priceList.findUniqueOrThrow({
          where: { id: dto.priceListId },
          include: { items: true }
        })
      : null;

    if (priceList && priceList.tenantId !== store.tenantId) {
      throw new BadRequestException("Price list tenant mismatch.");
    }

    const overrideTargets: Array<{ targetType: CatalogTargetType; targetId: string }> = [
      { targetType: "PRODUCT", targetId: product.id },
      ...(variant ? [{ targetType: "VARIANT" as const, targetId: variant.id }] : []),
      ...modifierOptions.map((option) => ({
        targetType: "MODIFIER_OPTION" as const,
        targetId: option.id
      }))
    ];

    const overrides = await tx.storeCatalogOverride.findMany({
      where: {
        storeId: store.id,
        OR: overrideTargets.map((target) => ({
          targetType: target.targetType,
          targetId: target.targetId
        }))
      }
    });
    const overrideMap = new Map(
      overrides.map((override) => [targetKey(override.targetType, override.targetId), override])
    );
    const priceItemMap = new Map(
      (priceList?.items ?? []).map((item) => [targetKey(item.targetType, item.targetId), item])
    );

    const modifierBreakdown = modifierOptions.map((option) => ({
      optionId: option.id,
      priceDelta:
        decimalToString(
          overrideMap.get(targetKey("MODIFIER_OPTION", option.id))?.priceOverride
        ) ??
        decimalToString(priceItemMap.get(targetKey("MODIFIER_OPTION", option.id))?.price) ??
        decimalToString(option.priceDelta) ??
        "0.00"
    }));

    const priceTargetType = variant ? "VARIANT" : "PRODUCT";
    const priceTargetId = variant?.id ?? product.id;
    const resolved = resolvePrice({
      storeOverridePrice: decimalToString(
        overrideMap.get(targetKey(priceTargetType, priceTargetId))?.priceOverride
      ),
      priceListPrice: decimalToString(
        priceItemMap.get(targetKey(priceTargetType, priceTargetId))?.price
      ),
      variantBasePrice: decimalToString(variant?.basePrice),
      productBasePrice: decimalToString(product.basePrice),
      modifiers: modifierBreakdown
    });

    return {
      tenantId: store.tenantId,
      storeId: store.id,
      productId: product.id,
      variantId: variant?.id ?? null,
      priceListId: priceList?.id ?? null,
      basePrice: resolved.basePrice,
      modifierTotal: resolved.modifierTotal,
      finalPrice: resolved.finalPrice,
      source: resolved.source,
      modifierBreakdown
    };
  }

  private async ensureCatalogTargets(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    tenantId: string,
    items: Array<{ targetType: CatalogTargetType; targetId: string }>
  ): Promise<void> {
    if (!items.length) {
      return;
    }

    const productIds = items
      .filter((item) => item.targetType === "PRODUCT")
      .map((item) => item.targetId);
    const variantIds = items
      .filter((item) => item.targetType === "VARIANT")
      .map((item) => item.targetId);
    const optionIds = items
      .filter((item) => item.targetType === "MODIFIER_OPTION")
      .map((item) => item.targetId);

    if (productIds.length) {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException("One or more product targets were not found.");
      }
      for (const product of products) {
        this.accessControl.resolveTenantId(context, product.tenantId);
        if (product.tenantId !== tenantId) {
          throw new BadRequestException("Product target tenant mismatch.");
        }
      }
    }

    if (variantIds.length) {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } }
      });
      if (variants.length !== variantIds.length) {
        throw new BadRequestException("One or more variant targets were not found.");
      }
      for (const variant of variants) {
        this.accessControl.resolveTenantId(context, variant.tenantId);
        if (variant.tenantId !== tenantId) {
          throw new BadRequestException("Variant target tenant mismatch.");
        }
      }
    }

    if (optionIds.length) {
      const options = await tx.modifierOption.findMany({
        where: { id: { in: optionIds } }
      });
      if (options.length !== optionIds.length) {
        throw new BadRequestException("One or more modifier option targets were not found.");
      }
      for (const option of options) {
        this.accessControl.resolveTenantId(context, option.tenantId);
        if (option.tenantId !== tenantId) {
          throw new BadRequestException("Modifier option target tenant mismatch.");
        }
      }
    }
  }

  private async ensureStoreAndTarget(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    tenantId: string,
    storeId: string,
    target: { targetType: CatalogTargetType; targetId: string }
  ): Promise<void> {
    const store = await tx.store.findUniqueOrThrow({
      where: { id: storeId }
    });
    this.accessControl.resolveTenantId(context, store.tenantId);
    if (store.tenantId !== tenantId) {
      throw new BadRequestException("Store tenant mismatch.");
    }

    await this.ensureCatalogTargets(tx, context, tenantId, [target]);
  }
}

@ApiTags("price-lists")
@Controller()
class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get("price-lists")
  @Permissions("pricing.read")
  listPriceLists(
    @CurrentContext() context: RequestContext,
    @Query() query: PriceListsQueryDto
  ): Promise<ListResponse<PriceListDto>> {
    return this.pricingService.listPriceLists(context, query);
  }

  @Post("price-lists")
  @Permissions("pricing.write")
  createPriceList(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreatePriceListDto
  ): Promise<PriceListDto> {
    return this.pricingService.createPriceList(context, dto);
  }

  @Patch("price-lists/:id")
  @Permissions("pricing.write")
  updatePriceList(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdatePriceListDto
  ): Promise<PriceListDto> {
    return this.pricingService.updatePriceList(context, params.id, dto);
  }

  @Get("store-catalog-overrides")
  @Permissions("pricing.read")
  listStoreOverrides(
    @CurrentContext() context: RequestContext,
    @Query() query: StoreCatalogOverridesQueryDto
  ): Promise<ListResponse<StoreCatalogOverrideDto>> {
    return this.pricingService.listStoreOverrides(context, query);
  }

  @Post("store-catalog-overrides")
  @Permissions("pricing.write")
  createStoreOverride(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateStoreCatalogOverrideDto
  ): Promise<StoreCatalogOverrideDto> {
    return this.pricingService.createStoreOverride(context, dto);
  }

  @Patch("store-catalog-overrides/:id")
  @Permissions("pricing.write")
  updateStoreOverride(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateStoreCatalogOverrideDto
  ): Promise<StoreCatalogOverrideDto> {
    return this.pricingService.updateStoreOverride(context, params.id, dto);
  }

  @Get("catalog/compiled")
  @Permissions("products.read")
  compiledCatalog(
    @CurrentContext() context: RequestContext,
    @Query() query: CompiledCatalogQueryDto
  ): Promise<CompiledCatalogResponse> {
    return this.pricingService.compiledCatalog(context, query);
  }

  @Post("pricing/preview")
  @Permissions("pricing.read")
  pricePreview(
    @CurrentContext() context: RequestContext,
    @Body() dto: PricePreviewDto
  ): Promise<PricePreviewResponse> {
    return this.pricingService.pricePreview(context, dto);
  }
}

@Module({
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService]
})
export class PricingModule {}
