import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  Prisma,
  type Ingredient as IngredientModel,
  type InventoryReplenishmentJob as InventoryReplenishmentJobModel,
  type InventoryAdjustment as InventoryAdjustmentModel,
  type InventoryItem as InventoryItemModel,
  type ReceivingLine as ReceivingLineModel,
  type ReceivingRecord as ReceivingRecordModel,
  type RecipeBom as RecipeBomModel,
  type StockLedgerEntry as StockLedgerEntryModel,
  type StockReservation as StockReservationModel,
  type StopListRule as StopListRuleModel,
  type Warehouse as WarehouseModel
} from "@exetron/database";
import type { RequestContext } from "@exetron/types";
import { DatabaseContextService } from "../database/database-context.service";
import { PrismaService } from "../database/prisma.service";
import {
  buildInventorySupplierProviderStageMetadata,
  classifyInventorySupplierProviderHttpPushResult,
  executeInventorySupplierTransportHandoff,
  executeInventorySupplierStatusSync,
  resolveInventorySupplierProviderImportPayload,
  resolveInventorySupplierProviderSyncStatus,
  resolveInventorySupplierProviderWebhookPayload,
  type InventorySupplierProviderErrorClass,
  type InventorySupplierProviderExecutionPhase,
  type InventorySupplierProviderRetryClass,
  type InventorySupplierTransportHandoffExecution
} from "./inventory-supplier-connector.util";
import {
  listInventorySupplierProviderProfiles,
  resolveInventorySupplierProviderProfile
} from "./inventory-supplier-provider-profile.util";
import {
  listInventorySupplierProviderAdapters,
  resolveInventorySupplierProviderAdapter
} from "./inventory-supplier-provider-adapter.util";
import {
  evaluateInventorySupplierProviderRuntimeCompatibility,
  listInventorySupplierProviderRuntimePolicies,
  resolveInventorySupplierProviderRuntimePolicyForRuntime
} from "./inventory-supplier-provider-policy.util";
import {
  type CompleteReceivingDto,
  type CreateIngredientDto,
  type CreateInventoryAdjustmentDto,
  type CreateInventoryItemDto,
  type CreateInventoryReplenishmentJobDto,
  type CreateRecipeBomDto,
  type CreateReceivingDto,
  type CreateStockReservationDto,
  type CreateStopListRuleDto,
  type CreateWarehouseDto,
  type HandoffInventoryReplenishmentJobDto,
  type InventorySupplierConnectorExecutionDto,
  type InventorySupplierFilePickupDto,
  type InventorySupplierConnectorReadinessDto,
  type InventorySupplierDeadLetterListQueryDto,
  type InventorySupplierProviderAdapterDto,
  type InventorySupplierProviderRuntimePolicyDto,
  type InventorySupplierProviderProfileDto,
  type InventorySupplierOperationsOverviewDto,
  type InventorySupplierRetryWorkerStatusDto,
  type InventorySupplierProviderRuntimeOverviewDto,
  type InventoryReplenishmentJobExportQueryDto,
  type ReopenInventorySupplierDeadLetterDto,
  type DropInventoryReplenishmentSupplierFileDto,
  type ImportInventoryReplenishmentSupplierUpdateDto,
  type InventorySupplierRetryRunResultDto,
  type InventorySupplierRetrySweepResultDto,
  type ReceiveInventoryReplenishmentJobDto,
  type ReplayInventoryReplenishmentSupplierReconciliationDto,
  type QueueInventoryReplenishmentSupplierRetryDto,
  type DispatchInventoryReplenishmentSupplierRetryDto,
  type QueueInventoryReplenishmentSupplierRetrySweepDto,
  type RunInventoryReplenishmentSupplierRetrySweepDto,
  type ProcessInventoryReplenishmentSupplierWebhookDto,
  type SyncInventoryReplenishmentSupplierStatusDto,
  type InventoryAdjustmentDto,
  type InventoryAvailabilityDto,
  type InventoryIngredientDto,
  type InventoryItemDto,
  type InventoryLedgerDrilldownDto,
  type InventoryOperationsOverviewDto,
  type InventoryRecord,
  type InventoryReplenishmentJobReceiptDto,
  type InventoryReplenishmentJobExportDto,
  type InventorySupplierExecutionReadinessDto,
  type InventoryReplenishmentJobExportRowDto,
  type InventoryReplenishmentJobDto,
  type InventoryReplenishmentReportDto,
  type InventorySupplierConnectorDto,
  type InventorySupplierConnectorQueryDto,
  type InventoryWarehouseDto,
  type RecipeBomDto,
  type ReceivingLineDto,
  type ReceivingRecordDto,
  type StockLedgerEntryDto,
  type StockReservationDto,
  type StopListRuleDto,
  type UpdateInventoryReplenishmentSupplierStatusDto,
  type UpdateIngredientDto,
  type UpdateInventoryItemDto,
  type UpdateStopListRuleDto,
  type UpdateWarehouseDto
} from "./inventory.dto";

export type InventoryReservationPlanEntry = {
  warehouseId: string;
  ingredientId: string;
  quantity: number;
};

function asRecord(value: unknown): InventoryRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as InventoryRecord) : {};
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function verifyHexHmac(expected: string, actual: string): boolean {
  if (expected.length === 0 || actual.length === 0 || expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function toIsoNullable(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asUuidOrNull(value: string | null | undefined): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function mapWarehouse(model: WarehouseModel): InventoryWarehouseDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    storeId: model.storeId,
    code: model.code,
    name: model.name,
    kind: model.kind,
    notes: model.notes,
    isActive: model.isActive,
    metadata: asRecord(model.metadata),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function mapIngredient(model: IngredientModel): InventoryIngredientDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    code: model.code,
    name: model.name,
    unit: model.unit,
    lowStockThreshold: toNumber(model.lowStockThreshold),
    metadata: asRecord(model.metadata),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function mapItem(model: InventoryItemModel): InventoryItemDto {
  const onHand = toNumber(model.onHand);
  const reserved = toNumber(model.reserved);
  return {
    id: model.id,
    tenantId: model.tenantId,
    warehouseId: model.warehouseId,
    ingredientId: model.ingredientId,
    sku: model.sku,
    onHand,
    reserved,
    reorderPoint: toNumber(model.reorderPoint),
    available: onHand - reserved,
    metadata: asRecord(model.metadata),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function mapBom(model: RecipeBomModel): RecipeBomDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    productId: model.productId,
    variantId: model.variantId,
    ingredientId: model.ingredientId,
    quantity: toNumber(model.quantity),
    metadata: asRecord(model.metadata),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function mapReceivingLine(model: ReceivingLineModel): ReceivingLineDto {
  return {
    ingredientId: model.ingredientId,
    quantity: toNumber(model.quantity),
    unitCost: model.unitCost?.toString() ?? null,
    metadata: asRecord(model.metadata)
  };
}

function mapReceivingRecord(model: ReceivingRecordModel, lines: ReceivingLineDto[]): ReceivingRecordDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    warehouseId: model.warehouseId,
    reference: model.reference,
    status: model.status,
    receivedBy: model.receivedBy,
    completedAt: toIsoNullable(model.completedAt),
    metadata: asRecord(model.metadata),
    lines,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function mapAdjustment(model: InventoryAdjustmentModel): InventoryAdjustmentDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    warehouseId: model.warehouseId,
    ingredientId: model.ingredientId,
    adjustmentType: model.adjustmentType,
    quantity: toNumber(model.quantity),
    reason: model.reason,
    metadata: asRecord(model.metadata),
    createdAt: model.createdAt.toISOString()
  };
}

function mapReservation(model: StockReservationModel): StockReservationDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    warehouseId: model.warehouseId,
    ingredientId: model.ingredientId,
    sourceType: model.sourceType,
    sourceId: model.sourceId,
    quantity: toNumber(model.quantity),
    status: model.status,
    expiresAt: toIsoNullable(model.expiresAt),
    metadata: asRecord(model.metadata),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function mapLedger(model: StockLedgerEntryModel): StockLedgerEntryDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    warehouseId: model.warehouseId,
    ingredientId: model.ingredientId,
    entryType: model.entryType,
    quantity: toNumber(model.quantity),
    balanceAfter: toNumber(model.balanceAfter),
    sourceType: model.sourceType,
    sourceId: model.sourceId,
    metadata: asRecord(model.metadata),
    createdAt: model.createdAt.toISOString()
  };
}

function mapStopRule(model: StopListRuleModel): StopListRuleDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    storeId: model.storeId,
    warehouseId: model.warehouseId,
    ingredientId: model.ingredientId,
    sku: model.sku,
    ruleType: model.ruleType,
    threshold: toNumber(model.threshold),
    isActive: model.isActive,
    metadata: asRecord(model.metadata),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function mapReplenishmentJob(model: InventoryReplenishmentJobModel): InventoryReplenishmentJobDto {
  return {
    id: model.id,
    tenantId: model.tenantId,
    storeId: model.storeId,
    warehouseId: model.warehouseId,
    status: model.status,
    summary: asRecord(model.summary) as InventoryReplenishmentJobDto["summary"],
    artifact: asRecord(model.artifact),
    createdByUserId: model.createdByUserId,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function getReplenishmentWorkflow(model: InventoryReplenishmentJobModel): InventoryRecord {
  return asRecord(asRecord(model.artifact).workflow);
}

function getReplenishmentSupplier(model: InventoryReplenishmentJobModel): InventoryRecord {
  return asRecord(getReplenishmentWorkflow(model).supplier);
}

function mapSupplierConnector(model: {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  connectorKey: string;
  version: string;
  status: string;
  manifest: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}, activation?: InventorySupplierConnectorDto["activation"]): InventorySupplierConnectorDto {
  const manifest = asRecord(model.manifest);
  const runtime = asRecord(manifest.runtime);
  const transport = asRecord(runtime.transport);
  const provider = asRecord(manifest.provider);
  const providerAdapterKeySource =
    transport.providerAdapter ?? runtime.providerAdapter ?? provider.adapter ?? manifest.providerAdapter;
  const providerAdapterKey =
    typeof providerAdapterKeySource === "string" && providerAdapterKeySource.trim()
      ? providerAdapterKeySource.trim()
      : null;
  const resolvedAdapter = resolveInventorySupplierProviderAdapter(providerAdapterKey);
  const providerProfileKeySource =
    transport.providerProfile ??
    runtime.providerProfile ??
    provider.profile ??
    manifest.providerProfile ??
    resolvedAdapter?.providerProfileKey;
  const providerProfileKey =
    typeof providerProfileKeySource === "string" && providerProfileKeySource.trim()
      ? providerProfileKeySource.trim()
      : null;
  const resolvedProfile = resolveInventorySupplierProviderProfile(providerProfileKey);
  const resolvedPolicy = resolveInventorySupplierProviderRuntimePolicyForRuntime({
    providerAdapterKey,
    providerProfileKey
  });
  const enterpriseRollout = asRecord(manifest.enterpriseRollout);
  const governance = asRecord(enterpriseRollout.governance);
  return {
    id: model.id,
    tenantId: model.tenantId,
    organizationId: model.organizationId,
    connectorKey: model.connectorKey,
    version: model.version,
    status: model.status,
    manifest: {
      ...manifest,
      providerAdapterKey,
      providerAdapter:
        resolvedAdapter === null
          ? null
          : {
              key: resolvedAdapter.key,
              name: resolvedAdapter.name,
              version: resolvedAdapter.version,
              visibility: resolvedAdapter.visibility,
              defaultPolicyVisible: resolvedAdapter.defaultPolicyVisible,
              providerProfileKey: resolvedAdapter.providerProfileKey,
              payloadVariant: resolvedAdapter.execution.payloadVariant
            },
      providerProfileKey,
      providerProfile:
        resolvedProfile === null
          ? null
          : {
              key: resolvedProfile.key,
              name: resolvedProfile.name,
              visibility: "VISIBLE",
              defaultPolicyVisible: true,
              payloadShape: resolvedProfile.payloadShape,
              transportMode: resolvedProfile.transport.mode
            },
      providerPolicyKey: resolvedPolicy?.key ?? null,
      providerPolicy:
        resolvedPolicy === null
          ? null
          : {
              key: resolvedPolicy.key,
              name: resolvedPolicy.name,
              riskLevel: resolvedPolicy.riskLevel,
              executionModel: resolvedPolicy.executionModel
            }
    },
    providerAdapterKey,
    providerAdapterName: resolvedAdapter?.name ?? null,
    providerAdapterVersion: resolvedAdapter?.version ?? null,
    providerAdapterVisibility: resolvedAdapter?.visibility ?? null,
    providerAdapterDefaultPolicyVisible: resolvedAdapter?.defaultPolicyVisible ?? null,
    providerAdapter:
      resolvedAdapter === null
        ? null
        : {
            key: resolvedAdapter.key,
            name: resolvedAdapter.name,
            version: resolvedAdapter.version,
            visibility: resolvedAdapter.visibility,
            defaultPolicyVisible: resolvedAdapter.defaultPolicyVisible,
            providerProfileKey: resolvedAdapter.providerProfileKey,
            payloadVariant: resolvedAdapter.execution.payloadVariant
          },
    providerProfileKey,
    providerProfileName: resolvedProfile?.name ?? null,
    providerProfileVersion: "1",
    providerProfileVisibility: "VISIBLE",
    providerProfileDefaultPolicyVisible: resolvedProfile ? true : null,
    providerProfile:
      resolvedProfile === null
        ? null
        : {
            key: resolvedProfile.key,
            name: resolvedProfile.name,
            version: "1",
            visibility: "VISIBLE",
            defaultPolicyVisible: true,
            payloadShape: resolvedProfile.payloadShape,
            transportMode: resolvedProfile.transport.mode
          },
    providerPolicyKey: resolvedPolicy?.key ?? null,
    providerPolicy:
      resolvedPolicy === null
        ? null
        : {
            key: resolvedPolicy.key,
            name: resolvedPolicy.name,
            riskLevel: resolvedPolicy.riskLevel,
            executionModel: resolvedPolicy.executionModel
          },
    providerPolicySummary:
      resolvedPolicy === null
        ? null
        : {
            requirePublicationSnapshot: resolvedPolicy.distribution.requirePublicationSnapshot,
            requireSignedPublication: resolvedPolicy.distribution.requireSignedPublication,
            requireTenantInstall: resolvedPolicy.activation.requireTenantInstall,
            preferredRetryExecution: resolvedPolicy.runtime.preferredRetryExecution
          },
    activation: activation ?? null,
    installation:
      Object.keys(enterpriseRollout).length === 0
        ? null
        : {
            source:
              enterpriseRollout.source !== undefined && enterpriseRollout.source !== null
                ? String(enterpriseRollout.source)
                : null,
            activationRequestId:
              enterpriseRollout.activationRequestId !== undefined &&
              enterpriseRollout.activationRequestId !== null
                ? String(enterpriseRollout.activationRequestId)
                : null,
            publicationId:
              enterpriseRollout.publicationId !== undefined && enterpriseRollout.publicationId !== null
                ? String(enterpriseRollout.publicationId)
                : null,
            connectorTemplateId:
              enterpriseRollout.connectorTemplateId !== undefined &&
              enterpriseRollout.connectorTemplateId !== null
                ? String(enterpriseRollout.connectorTemplateId)
                : null,
            sourceRegistryEntryId:
              enterpriseRollout.sourceRegistryEntryId !== undefined &&
              enterpriseRollout.sourceRegistryEntryId !== null
                ? String(enterpriseRollout.sourceRegistryEntryId)
                : null,
            installedAt:
              enterpriseRollout.installedAt !== undefined && enterpriseRollout.installedAt !== null
                ? String(enterpriseRollout.installedAt)
                : null,
            installMode:
              enterpriseRollout.installMode !== undefined && enterpriseRollout.installMode !== null
                ? String(enterpriseRollout.installMode)
                : null,
            targetStoreId:
              enterpriseRollout.targetStoreId !== undefined && enterpriseRollout.targetStoreId !== null
                ? String(enterpriseRollout.targetStoreId)
                : null,
            governanceStatus:
              governance.status !== undefined && governance.status !== null
                ? String(governance.status)
                : null,
            governanceReason:
              governance.reason !== undefined && governance.reason !== null
                ? String(governance.reason)
                : null,
            driftStatus:
              governance.driftStatus !== undefined && governance.driftStatus !== null
                ? String(governance.driftStatus)
                : null,
            lastGovernanceEvaluationAt:
              governance.lastEvaluatedAt !== undefined && governance.lastEvaluatedAt !== null
                ? String(governance.lastEvaluatedAt)
                : null
          },
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString()
  };
}

function mapSupplierConnectorExecution(model: {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  connectorKind: string;
  connectorKey: string;
  action: string;
  status: string;
  requestPayload: Prisma.JsonValue | null;
  responsePayload: Prisma.JsonValue | null;
  errorMessage: string | null;
  createdAt: Date;
  finishedAt: Date | null;
}): InventorySupplierConnectorExecutionDto {
  const requestPayload = asRecord(model.requestPayload);
  const responsePayload = asRecord(model.responsePayload);
  return {
    id: model.id,
    tenantId: model.tenantId,
    storeId: model.storeId,
    connectorKind: "SUPPLIER_ADAPTER",
    connectorKey: model.connectorKey,
    action: model.action,
    status: model.status as InventorySupplierConnectorExecutionDto["status"],
    requestPayload,
    responsePayload,
    errorMessage: model.errorMessage,
    providerErrorClass:
      typeof responsePayload.providerErrorClass === "string"
        ? responsePayload.providerErrorClass
        : typeof requestPayload.providerErrorClass === "string"
          ? requestPayload.providerErrorClass
          : null,
    retryClass:
      typeof responsePayload.retryClass === "string"
        ? responsePayload.retryClass
        : typeof requestPayload.retryClass === "string"
          ? requestPayload.retryClass
          : null,
    providerExecutionPhase:
      typeof responsePayload.providerExecutionPhase === "string"
        ? responsePayload.providerExecutionPhase
        : typeof requestPayload.providerExecutionPhase === "string"
          ? requestPayload.providerExecutionPhase
          : null,
    createdAt: model.createdAt.toISOString(),
    finishedAt: model.finishedAt?.toISOString() ?? null
  };
}

function countStatuses(items: Array<{ status?: string | null }>): Record<string, number> {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const status = String(item.status ?? "UNKNOWN").trim().toUpperCase();
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});
}

function normalizeExecutionPolicyStatus(value: unknown): "READY" | "WARN" | "BLOCKED" | "SUSPENDED" | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized === "READY" ||
    normalized === "WARN" ||
    normalized === "BLOCKED" ||
    normalized === "SUSPENDED"
    ? normalized
    : null;
}

function normalizeProviderExecutionPhase(
  value: unknown
): InventorySupplierProviderExecutionPhase | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized === "HANDOFF" ||
    normalized === "SYNC" ||
    normalized === "WEBHOOK" ||
    normalized === "FILE_STAGE" ||
    normalized === "FILE_PICKUP" ||
    normalized === "FILE_DROP" ||
    normalized === "RETRY"
    ? (normalized as InventorySupplierProviderExecutionPhase)
    : null;
}

function normalizeProviderErrorClass(
  value: unknown
): InventorySupplierProviderErrorClass | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized === "NETWORK" ||
    normalized === "AUTH" ||
    normalized === "SIGNATURE" ||
    normalized === "CHECKSUM" ||
    normalized === "REFERENCE" ||
    normalized === "PROVIDER_REJECTED" ||
    normalized === "CONFIGURATION" ||
    normalized === "REPLAY" ||
    normalized === "GOVERNANCE" ||
    normalized === "STATE" ||
    normalized === "UNKNOWN"
    ? (normalized as InventorySupplierProviderErrorClass)
    : null;
}

function normalizeProviderRetryClass(
  value: unknown
): InventorySupplierProviderRetryClass | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized === "NONE" || normalized === "RETRYABLE" || normalized === "TERMINAL"
    ? (normalized as InventorySupplierProviderRetryClass)
    : null;
}

function escapeCsvCell(value: unknown): string {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbContext: DatabaseContextService
  ) {}

  async getOverview(context: RequestContext, input: { tenantId?: string; storeId?: string }) {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const where = this.tenantWhere(tenantId);
      const [warehouses, ingredients, items, reservations, stopListRules, receivingRecords] =
        await Promise.all([
          tx.warehouse.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.ingredient.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.inventoryItem.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.stockReservation.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
          tx.stopListRule.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.receivingRecord.findMany({ where, orderBy: { createdAt: "desc" } })
        ]);

      return {
        tenantId,
        storeId: input.storeId ?? null,
        warehouses: warehouses.map(mapWarehouse),
        ingredients: ingredients.map(mapIngredient),
        items: items.map(mapItem),
        reservations: reservations.map(mapReservation),
        stopListRules: stopListRules.map(mapStopRule),
        receivingRecords: await Promise.all(
          receivingRecords.map(async (record) =>
            mapReceivingRecord(record, await this.listReceivingLines(tx, record.id))
          )
        ),
        lowStockItems: items.map(mapItem).filter((item) => item.available <= item.reorderPoint)
      };
    });
  }

  async getOperationsOverview(
    context: RequestContext,
    input: { tenantId?: string; storeId?: string }
  ): Promise<InventoryOperationsOverviewDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const where = this.tenantWhere(tenantId);
      const [warehouses, ingredients, items, reservations, stopListRules, receivingRecords, ledgerEntries] =
        await Promise.all([
          tx.warehouse.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.ingredient.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.inventoryItem.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.stockReservation.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.stopListRule.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.receivingRecord.findMany({ where, orderBy: { createdAt: "desc" } }),
          tx.stockLedgerEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 })
        ]);

      const mappedItems = items.map(mapItem);
      const mappedReservations = reservations.map(mapReservation);
      const mappedStopRules = stopListRules.map(mapStopRule);
      const mappedReceivings = await Promise.all(
        receivingRecords.map(async (record) =>
          mapReceivingRecord(record, await this.listReceivingLines(tx, record.id))
        )
      );
      const mappedLedgerEntries = ledgerEntries.map(mapLedger);
      const lowStockItems = mappedItems.filter((item) => item.available <= item.reorderPoint);

      return {
        tenantId,
        storeId: input.storeId ?? null,
        summary: {
          warehouseCount: warehouses.length,
          activeWarehouseCount: warehouses.filter((item) => item.isActive).length,
          ingredientCount: ingredients.length,
          itemCount: mappedItems.length,
          lowStockItemCount: lowStockItems.length,
          reservationCount: mappedReservations.length,
          activeReservationCount: mappedReservations.filter((item) => item.status === "ACTIVE").length,
          receivingCount: mappedReceivings.length,
          openReceivingCount: mappedReceivings.filter((item) => item.status === "OPEN").length,
          completedReceivingCount: mappedReceivings.filter((item) => item.status === "COMPLETED").length,
          stopListRuleCount: mappedStopRules.length,
          activeStopListRuleCount: mappedStopRules.filter((item) => item.isActive).length,
          ledgerEntryCount: mappedLedgerEntries.length
        },
        quantities: {
          onHand: mappedItems.reduce((sum, item) => sum + item.onHand, 0),
          reserved: mappedItems.reduce((sum, item) => sum + item.reserved, 0),
          available: mappedItems.reduce((sum, item) => sum + item.available, 0)
        },
        statuses: {
          reservations: countStatuses(mappedReservations),
          receivings: countStatuses(mappedReceivings)
        },
        latest: {
          receiving: mappedReceivings[0] ?? null,
          reservation: mappedReservations[0] ?? null,
          lowStockItem: lowStockItems[0] ?? null,
          stopListRule: mappedStopRules[0] ?? null,
          ledgerEntry: mappedLedgerEntries[0] ?? null
        },
        coverage: {
          warehouseIds: [...new Set(warehouses.map((item) => item.id))],
          ingredientIds: [...new Set(ingredients.map((item) => item.id))],
          skuList: [
            ...new Set(
              mappedItems
                .map((item) => item.sku)
                .filter((item): item is string => Boolean(item))
            )
          ]
        }
      };
    });
  }

  async getReplenishmentReport(
    context: RequestContext,
    input: { tenantId?: string; storeId?: string; warehouseId?: string }
  ): Promise<InventoryReplenishmentReportDto> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      this.computeReplenishmentReportTx(tx, context, input)
    );
  }

  listReplenishmentJobs(
    context: RequestContext,
    input: { tenantId?: string; storeId?: string; warehouseId?: string }
  ): Promise<InventoryReplenishmentJobDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      return (
        await tx.inventoryReplenishmentJob.findMany({
          where: {
            ...this.tenantWhere(tenantId),
            ...(input.storeId ? { storeId: input.storeId } : {}),
            ...(input.warehouseId ? { warehouseId: input.warehouseId } : {})
          },
          orderBy: { createdAt: "desc" }
        })
      ).map(mapReplenishmentJob);
    });
  }

  listSupplierConnectors(
    context: RequestContext,
    input: InventorySupplierConnectorQueryDto
  ): Promise<InventorySupplierConnectorDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const connectors = await this.listVisibleSupplierConnectorsTx(tx, tenantId, {
        connectorKey: input.connectorKey
      });
      const activations = await this.listLatestSupplierConnectorActivationsTx(
        tx,
        tenantId,
        connectors.map((item) => ({
          connectorKey: item.connectorKey,
          version: item.version,
          tenantId: item.tenantId
        }))
      );
      return connectors.map((connector) =>
        mapSupplierConnector(
          connector,
          this.mapSupplierConnectorActivation(
            connector,
            tenantId,
            activations.get(`${connector.connectorKey}::${connector.version}`) ?? null
          )
        )
      );
    });
  }

  listSupplierProviderProfiles(): InventorySupplierProviderProfileDto[] {
    return listInventorySupplierProviderProfiles().map((profile) => {
      const providerPolicy = resolveInventorySupplierProviderRuntimePolicyForRuntime({
        providerProfileKey: profile.key
      });
      return {
        key: profile.key,
        name: profile.name,
        description: profile.description,
        transportMode: profile.transport.mode,
        payloadShape: profile.payloadShape,
        providerPolicyKey: providerPolicy?.key ?? null,
        providerPolicy: providerPolicy
          ? {
              key: providerPolicy.key,
              name: providerPolicy.name,
              riskLevel: providerPolicy.riskLevel,
              executionModel: providerPolicy.executionModel
            }
          : null,
        providerPolicySummary: providerPolicy
          ? {
              requirePublicationSnapshot: providerPolicy.distribution.requirePublicationSnapshot,
              requireSignedPublication: providerPolicy.distribution.requireSignedPublication,
              requireTenantInstall: providerPolicy.activation.requireTenantInstall,
              preferredRetryExecution: providerPolicy.runtime.preferredRetryExecution
            }
          : null,
        id: profile.key,
        providerProfileKey: profile.key,
        providerProfileName: profile.name,
        providerProfileVersion: "1",
        providerProfileVisibility: "VISIBLE",
        providerProfileDefaultPolicyVisible: true,
        status: "ACTIVE",
        defaults: {
          key: profile.key,
          name: profile.name,
          mode: profile.transport.mode,
          transportMode: profile.transport.mode,
          payloadShape: profile.payloadShape,
          callbackPath: profile.transport.callbackPath ?? null,
          importFormat: profile.transport.importFormat ?? null,
          pickupPath: profile.transport.pickupPath ?? null,
          dropPath: profile.transport.dropPath ?? null,
          requireSignature: profile.transport.requireSignature ?? false,
          requireChecksum: profile.transport.requireChecksum ?? false,
          authHeaderName: profile.transport.auth?.headerName ?? null,
          retryEnabled: profile.transport.retryPolicy?.enabled ?? false,
          retryMaxAttempts: profile.transport.retryPolicy?.maxAttempts ?? 0,
          transport: profile.transport as unknown as InventoryRecord,
          auth: (profile.transport.auth ?? {}) as unknown as InventoryRecord,
          retry: (profile.transport.retryPolicy ?? {}) as unknown as InventoryRecord
        },
        defaultPolicy: {
          transport: profile.transport as unknown as InventoryRecord,
          payloadShape: profile.payloadShape
        },
        defaultPolicySummary: {
          transportMode: profile.transport.mode,
          payloadShape: profile.payloadShape,
          retryEnabled: profile.transport.retryPolicy?.enabled ?? false,
          requireSignature: profile.transport.requireSignature ?? false,
          requireChecksum: profile.transport.requireChecksum ?? false
        }
      };
    });
  }

  listSupplierProviderPolicies(): InventorySupplierProviderRuntimePolicyDto[] {
    return listInventorySupplierProviderRuntimePolicies().map((policy) => ({
      key: policy.key,
      name: policy.name,
      description: policy.description,
      riskLevel: policy.riskLevel,
      executionModel: policy.executionModel,
      adapterKeys: policy.adapterKeys.slice(),
      profileKeys: policy.profileKeys.slice(),
      distribution: policy.distribution as unknown as InventoryRecord,
      activation: policy.activation as unknown as InventoryRecord,
      runtime: policy.runtime as unknown as InventoryRecord,
      summary: {
        allowedVisibility: policy.distribution.allowedVisibility,
        allowedChannels: policy.distribution.allowedChannels,
        requirePublicationSnapshot: policy.distribution.requirePublicationSnapshot,
        requireSignedPublication: policy.distribution.requireSignedPublication,
        requireApproval: policy.activation.requireApproval,
        requireAppliedActivation: policy.activation.requireAppliedActivation,
        requireTenantInstall: policy.activation.requireTenantInstall,
        requireCurrentGovernance: policy.runtime.requireCurrentGovernance,
        requireCurrentSourceDigest: policy.runtime.requireCurrentSourceDigest,
        requireResolvedSecrets: policy.runtime.requireResolvedSecrets,
        allowGlobalFallback: policy.runtime.allowGlobalFallback,
        preferredRetryExecution: policy.runtime.preferredRetryExecution
      }
    }));
  }

  listSupplierProviderAdapters(): InventorySupplierProviderAdapterDto[] {
    return listInventorySupplierProviderAdapters().map((adapter) => {
      const profile = resolveInventorySupplierProviderProfile(adapter.providerProfileKey);
      const providerPolicy = resolveInventorySupplierProviderRuntimePolicyForRuntime({
        providerAdapterKey: adapter.key,
        providerProfileKey: adapter.providerProfileKey
      });
      const mergedTransportMode = adapter.transport?.mode ?? profile?.transport.mode ?? "HTTP_PUSH";
      const mergedTransport = {
        ...(profile?.transport ?? {}),
        ...(adapter.transport ?? {})
      };
      const mergedRetry = asRecord(mergedTransport.retryPolicy);
      const mergedAuth = asRecord(mergedTransport.auth);
      return {
        key: adapter.key,
        name: adapter.name,
        description: adapter.description,
        version: adapter.version,
        visibility: adapter.visibility,
        defaultPolicyVisible: adapter.defaultPolicyVisible,
        providerProfileKey: adapter.providerProfileKey,
        transportMode: mergedTransportMode,
        providerPolicyKey: providerPolicy?.key ?? null,
        providerPolicy: providerPolicy
          ? {
              key: providerPolicy.key,
              name: providerPolicy.name,
              riskLevel: providerPolicy.riskLevel,
              executionModel: providerPolicy.executionModel
            }
          : null,
        providerPolicySummary: providerPolicy
          ? {
              requirePublicationSnapshot: providerPolicy.distribution.requirePublicationSnapshot,
              requireSignedPublication: providerPolicy.distribution.requireSignedPublication,
              requireTenantInstall: providerPolicy.activation.requireTenantInstall,
              preferredRetryExecution: providerPolicy.runtime.preferredRetryExecution
            }
          : null,
        payloadVariant: adapter.execution.payloadVariant,
        id: adapter.key,
        providerAdapterKey: adapter.key,
        providerAdapterName: adapter.name,
        providerAdapterVersion: adapter.version,
        providerAdapterVisibility: adapter.visibility,
        providerAdapterDefaultPolicyVisible: adapter.defaultPolicyVisible,
        status: "ACTIVE",
        defaults: {
          key: adapter.key,
          name: adapter.name,
          providerAdapter: adapter.key,
          providerAdapterKey: adapter.key,
          providerProfileKey: adapter.providerProfileKey,
          transportMode: mergedTransportMode,
          payloadShape: adapter.execution.payloadVariant,
          endpoint: null,
          method: mergedTransport.method ?? null,
          pickupPath: mergedTransport.pickupPath ?? null,
          dropPath: mergedTransport.dropPath ?? null,
          authHeaderName:
            mergedAuth.headerName ??
            (mergedAuth.kind === "BEARER" ? "authorization" : null),
          requireSignature: mergedTransport.requireSignature ?? false,
          requireChecksum: mergedTransport.requireChecksum ?? false,
          retryEnabled: mergedRetry.enabled ?? false,
          retryMaxAttempts: toNumber(mergedRetry.maxAttempts, 0),
          transport: mergedTransport as unknown as InventoryRecord,
          auth: mergedAuth,
          retry: mergedRetry
        },
        defaultPolicy: {
          providerProfileKey: adapter.providerProfileKey,
          transport: mergedTransport as unknown as InventoryRecord,
          execution: adapter.execution as unknown as InventoryRecord
        },
        defaultPolicySummary: {
          transportMode: mergedTransportMode,
          payloadVariant: adapter.execution.payloadVariant,
          visibility: adapter.visibility,
          retryEnabled: mergedRetry.enabled ?? false
        }
      };
    });
  }

  private async listVisibleSupplierConnectorsTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: { connectorKey?: string } = {}
  ) {
    const rows = await tx.integrationRegistryEntry.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ tenantId }, { tenantId: null }],
        ...(input.connectorKey ? { connectorKey: input.connectorKey.trim() } : {})
      },
      orderBy: [{ connectorKey: "asc" }, { createdAt: "desc" }]
    });
    const visible = new Map<
      string,
      (typeof rows)[number] & {
        _priority?: number;
      }
    >();
    for (const row of rows) {
      const key = `${row.connectorKey}::${row.version}`;
      const priority = row.tenantId && row.tenantId === tenantId ? 2 : 1;
      const current = visible.get(key);
      if (
        !current ||
        priority > (current._priority ?? 0) ||
        (priority === (current._priority ?? 0) && row.updatedAt > current.updatedAt)
      ) {
        visible.set(key, {
          ...row,
          _priority: priority
        });
      }
    }
    return Array.from(visible.values())
      .sort((left, right) =>
        left.connectorKey === right.connectorKey
          ? right.createdAt.getTime() - left.createdAt.getTime()
          : left.connectorKey.localeCompare(right.connectorKey)
      )
      .map(({ _priority, ...row }) => row);
  }

  getSupplierConnectorReadiness(
    context: RequestContext,
    input: { tenantId?: string; storeId?: string }
  ): Promise<InventorySupplierConnectorReadinessDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const connectors = await this.listVisibleSupplierConnectorsTx(tx, tenantId);
      const activations = await this.listLatestSupplierConnectorActivationsTx(
        tx,
        tenantId,
        connectors.map((item) => ({
          connectorKey: item.connectorKey,
          version: item.version,
          tenantId: item.tenantId
        }))
      );
      const items = await Promise.all(
        connectors.map((connector) =>
          this.evaluateSupplierConnectorReadinessTx(
            tx,
            tenantId,
            connector,
            activations.get(`${connector.connectorKey}::${connector.version}`) ?? null
          )
        )
      );
      return {
        tenantId,
        storeId: input.storeId ?? null,
        summary: {
          connectorCount: items.length,
          readyCount: items.filter((item) => item.status === "READY").length,
          blockedCount: items.filter((item) => item.status === "BLOCKED").length,
          warnCount: items.filter((item) => item.status === "WARN").length
        },
        items
      };
    });
  }

  getSupplierOperationsOverview(
    context: RequestContext,
    input: { tenantId?: string; storeId?: string },
    workerStatus: InventorySupplierRetryWorkerStatusDto
  ): Promise<InventorySupplierOperationsOverviewDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const storeId = input.storeId?.trim() || null;
      const [jobs, connectors, logs] = await Promise.all([
        tx.inventoryReplenishmentJob.findMany({
          where: {
            tenantId,
            ...(storeId ? { storeId } : {})
          },
          orderBy: { updatedAt: "desc" }
        }),
        this.listVisibleSupplierConnectorsTx(tx, tenantId),
        tx.connectorExecutionLog.findMany({
          where: {
            tenantId,
            connectorKind: "SUPPLIER_ADAPTER",
            ...(storeId ? { storeId } : {})
          },
          orderBy: { createdAt: "desc" },
          take: 500
        })
      ]);

      const supplierJobs = jobs
        .map((job) => ({ job, supplier: getReplenishmentSupplier(job) }))
        .filter(({ supplier }) => Object.keys(supplier).length > 0);
      const hasQueuedLifecycle = (supplier: InventoryRecord) =>
        asRecord(supplier.reconciliation).status === "RETRY_QUEUED" ||
        Math.max(0, toNumber(supplier.retryQueuedCount, 0)) > 0;

      const byTransportMode = supplierJobs.reduce<Record<string, number>>((accumulator, item) => {
        const transportMode =
          typeof item.supplier.transportMode === "string" && item.supplier.transportMode.trim()
            ? item.supplier.transportMode.trim().toUpperCase()
            : "MANUAL";
        accumulator[transportMode] = (accumulator[transportMode] ?? 0) + 1;
        return accumulator;
      }, {});

      const executionByConnector = logs.reduce<
        Map<
          string,
          {
            latestExecutionAt: string | null;
            failedCount: number;
          }
        >
      >((accumulator, item) => {
        const current = accumulator.get(item.connectorKey) ?? {
          latestExecutionAt: null,
          failedCount: 0
        };
        accumulator.set(item.connectorKey, {
          latestExecutionAt: current.latestExecutionAt ?? item.createdAt.toISOString(),
          failedCount: current.failedCount + (item.status === "FAILED" ? 1 : 0)
        });
        return accumulator;
      }, new Map());

      const connectorKeys = new Set<string>();
      for (const connector of connectors) {
        connectorKeys.add(connector.connectorKey);
      }
      for (const { supplier } of supplierJobs) {
        if (typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()) {
          connectorKeys.add(supplier.connectorKey.trim());
        }
      }

      const byConnector = [...connectorKeys]
        .map((connectorKey) => {
          const connectorJobs = supplierJobs.filter(({ supplier }) => supplier.connectorKey === connectorKey);
          const latestJob = connectorJobs[0]?.supplier ?? {};
          const execution = executionByConnector.get(connectorKey);
          return {
            connectorKey,
            transportMode:
              (typeof latestJob.transportMode === "string" && latestJob.transportMode.trim()) ||
              (connectors.find((item) => item.connectorKey === connectorKey)
                ? String(asRecord(asRecord(asRecord(connectors.find((item) => item.connectorKey === connectorKey)!.manifest).runtime).transport).mode ?? "SIMULATED")
                : "UNKNOWN"),
            totalJobs: connectorJobs.length,
            retryQueuedCount: connectorJobs.filter(({ supplier }) => hasQueuedLifecycle(supplier)).length,
            deadLetterCount: connectorJobs.filter(({ supplier }) => typeof supplier.deadLetterAt === "string" || typeof supplier.deadLetteredAt === "string").length,
            failedCount:
              connectorJobs.filter(({ supplier }) => supplier.lastTransportStatus === "FAILED").length +
              (execution?.failedCount ?? 0),
            latestSupplierStatus:
              typeof latestJob.supplierStatus === "string" ? latestJob.supplierStatus : null,
            latestExecutionAt: execution?.latestExecutionAt ?? null
          };
        })
        .sort((left, right) => left.connectorKey.localeCompare(right.connectorKey));

      const recentFailures = supplierJobs
        .filter(({ supplier }) =>
          typeof supplier.lastFailureAt === "string" ||
          typeof supplier.deadLetterAt === "string" ||
          supplier.lastTransportStatus === "FAILED"
        )
        .slice()
        .sort((left, right) => {
          const leftAt = new Date(
            String(left.supplier.deadLetterAt ?? left.supplier.deadLetteredAt ?? left.supplier.lastFailureAt ?? left.job.updatedAt)
          ).getTime();
          const rightAt = new Date(
            String(right.supplier.deadLetterAt ?? right.supplier.deadLetteredAt ?? right.supplier.lastFailureAt ?? right.job.updatedAt)
          ).getTime();
          return rightAt - leftAt;
        })
        .slice(0, 10)
        .map(({ job, supplier }) => ({
          jobId: job.id,
          connectorKey: typeof supplier.connectorKey === "string" ? supplier.connectorKey : null,
          transportMode: typeof supplier.transportMode === "string" ? supplier.transportMode : "MANUAL",
          code: typeof supplier.lastFailureCode === "string" ? supplier.lastFailureCode : null,
          reason: typeof supplier.lastFailureReason === "string" ? supplier.lastFailureReason : null,
          failedAt:
            typeof supplier.deadLetterAt === "string"
              ? supplier.deadLetterAt
              : typeof supplier.deadLetteredAt === "string"
                ? supplier.deadLetteredAt
                : typeof supplier.lastFailureAt === "string"
                  ? supplier.lastFailureAt
                  : null,
          retryState:
            typeof asRecord(supplier.reconciliation).status === "string"
              ? String(asRecord(supplier.reconciliation).status)
              : null
        }));

      const dueRetries = supplierJobs
        .filter(({ supplier }) => typeof supplier.nextRetryAt === "string")
        .map(({ job, supplier }) => ({
          jobId: job.id,
          connectorKey: typeof supplier.connectorKey === "string" ? supplier.connectorKey : null,
          source:
            typeof supplier.lastRetryQueuedSource === "string"
              ? supplier.lastRetryQueuedSource
              : typeof supplier.lastFailureSource === "string"
                ? supplier.lastFailureSource
                : null,
          nextRetryAt: String(supplier.nextRetryAt),
          retryAttemptCount: Math.max(0, toNumber(supplier.retryAttemptCount, 0)),
          terminal:
            typeof supplier.deadLetterAt === "string" ||
            typeof supplier.deadLetteredAt === "string" ||
            asRecord(supplier.reconciliation).status === "DEAD_LETTER" ||
            asRecord(supplier.reconciliation).status === "DEAD_LETTERED"
        }))
        .sort((left, right) => new Date(left.nextRetryAt).getTime() - new Date(right.nextRetryAt).getTime())
        .slice(0, 10);

      const deadLetters = supplierJobs
        .filter(({ supplier }) => typeof supplier.deadLetterAt === "string" || typeof supplier.deadLetteredAt === "string")
        .map(({ job, supplier }) => ({
          jobId: job.id,
          connectorKey: typeof supplier.connectorKey === "string" ? supplier.connectorKey : null,
          code: typeof supplier.deadLetterCode === "string" ? supplier.deadLetterCode : null,
          reason:
            typeof supplier.deadLetterReason === "string"
              ? supplier.deadLetterReason
              : typeof supplier.lastFailureReason === "string"
                ? supplier.lastFailureReason
                : null,
          deadLetterAt: String(supplier.deadLetterAt ?? supplier.deadLetteredAt)
        }))
        .sort((left, right) => new Date(right.deadLetterAt).getTime() - new Date(left.deadLetterAt).getTime())
        .slice(0, 20);

      return {
        tenantId,
        storeId,
        summary: {
          connectorCount: connectorKeys.size,
          supplierJobCount: supplierJobs.length,
          retryQueuedCount: supplierJobs.filter(({ supplier }) => hasQueuedLifecycle(supplier)).length,
          retryDispatchedCount: supplierJobs.filter(({ supplier }) => asRecord(supplier.reconciliation).status === "RETRY_DISPATCHED").length,
          retryCompletedCount: supplierJobs.filter(({ supplier }) => asRecord(supplier.reconciliation).status === "RETRY_COMPLETED").length,
          deadLetterCount: deadLetters.length,
          terminalCount: supplierJobs.filter(({ supplier }) => typeof supplier.deadLetterAt === "string" || typeof supplier.deadLetteredAt === "string").length,
          pendingCallbackCount: supplierJobs.filter(({ supplier }) => supplier.pendingCallback === true).length,
          pendingImportCount: supplierJobs.filter(({ supplier }) => supplier.pendingImport === true).length,
          pendingPushCount: supplierJobs.filter(({ supplier }) => supplier.pendingPush === true).length,
          failedCount: supplierJobs.filter(({ supplier }) => supplier.lastTransportStatus === "FAILED").length
        },
        byTransportMode,
        byConnector,
        recentFailures,
        dueRetries,
        deadLetters,
        worker: workerStatus
      };
    });
  }

  getSupplierProviderRuntimeOverview(
    context: RequestContext,
    input: { tenantId?: string; storeId?: string }
  ): Promise<InventorySupplierProviderRuntimeOverviewDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const storeId = input.storeId?.trim() || null;
      const [jobs, connectors] = await Promise.all([
        tx.inventoryReplenishmentJob.findMany({
          where: {
            tenantId,
            ...(storeId ? { storeId } : {})
          },
          orderBy: { updatedAt: "desc" }
        }),
        this.listVisibleSupplierConnectorsTx(tx, tenantId)
      ]);
      const grouped = new Map<
        string,
        InventorySupplierProviderRuntimeOverviewDto["items"][number]
      >();
      let readyExecutionCount = 0;
      let warnExecutionCount = 0;
      let blockedExecutionCount = 0;
      let suspendedExecutionCount = 0;
      const supplierJobs = jobs
        .map((job) => ({ job, supplier: getReplenishmentSupplier(job) }))
        .filter(({ supplier }) => Object.keys(supplier).length > 0);

      for (const { job, supplier } of supplierJobs) {
        const providerAdapterKey =
          typeof supplier.providerAdapterKey === "string" && supplier.providerAdapterKey.trim()
            ? supplier.providerAdapterKey.trim()
            : null;
        const providerProfileKey =
          typeof supplier.providerProfileKey === "string" && supplier.providerProfileKey.trim()
            ? supplier.providerProfileKey.trim()
            : null;
        const providerPolicyKey =
          typeof supplier.providerPolicyKey === "string" && supplier.providerPolicyKey.trim()
            ? supplier.providerPolicyKey.trim()
            : null;
        const providerAdapterName =
          typeof supplier.providerAdapterName === "string" && supplier.providerAdapterName.trim()
            ? supplier.providerAdapterName.trim()
            : null;
        const transportMode =
          typeof supplier.transportMode === "string" && supplier.transportMode.trim()
            ? supplier.transportMode.trim().toUpperCase()
            : "MANUAL";
        const executionPolicy = asRecord(asRecord(supplier.executionPolicy).snapshot);
        const executionPolicyStatus =
          normalizeExecutionPolicyStatus(
            executionPolicy.status ?? supplier.executionPolicyStatus ?? asRecord(supplier.executionPolicy).status
          ) ?? null;
        const key = [
          providerAdapterKey ?? "none",
          providerProfileKey ?? "none",
          providerPolicyKey ?? "none",
          transportMode,
          executionPolicyStatus ?? "none"
        ].join("::");
        const current =
          grouped.get(key) ??
          {
            providerAdapterKey,
            providerAdapterName,
            providerProfileKey,
            providerPolicyKey,
            transportMode,
            executionPolicyStatus,
            connectorCount: 0,
            supplierJobCount: 0,
            successCount: 0,
            failedCount: 0,
            retryableFailureCount: 0,
            terminalFailureCount: 0,
            latestExecutionAt: null,
            failureClasses: {},
            retryClasses: {},
            executionPhases: {}
          };
        current.supplierJobCount += 1;
        if (
          !current.latestExecutionAt ||
          new Date(current.latestExecutionAt).getTime() < job.updatedAt.getTime()
        ) {
          current.latestExecutionAt = job.updatedAt.toISOString();
        }
        if (supplier.lastTransportStatus === "FAILED") {
          current.failedCount += 1;
        } else if (supplier.lastTransportStatus === "COMPLETED") {
          current.successCount += 1;
        }
        const failureClass =
          normalizeProviderErrorClass(
            supplier.providerErrorClass ?? supplier.lastProviderErrorClass ?? supplier.lastFailureClass
          ) ?? null;
        if (failureClass) {
          current.failureClasses[failureClass] = (current.failureClasses[failureClass] ?? 0) + 1;
        }
        const retryClass =
          normalizeProviderRetryClass(supplier.retryClass ?? supplier.lastRetryClass) ?? null;
        if (retryClass) {
          current.retryClasses[retryClass] = (current.retryClasses[retryClass] ?? 0) + 1;
          if (retryClass === "RETRYABLE") {
            current.retryableFailureCount += 1;
          }
          if (retryClass === "TERMINAL") {
            current.terminalFailureCount += 1;
          }
        }
        const phase =
          normalizeProviderExecutionPhase(
            supplier.providerExecutionPhase ?? supplier.lastProviderExecutionPhase
          ) ?? null;
        if (phase) {
          current.executionPhases[phase] = (current.executionPhases[phase] ?? 0) + 1;
        }
        grouped.set(key, current);
        if (executionPolicyStatus === "READY") {
          readyExecutionCount += 1;
        } else if (executionPolicyStatus === "WARN") {
          warnExecutionCount += 1;
        } else if (executionPolicyStatus === "BLOCKED") {
          blockedExecutionCount += 1;
        } else if (executionPolicyStatus === "SUSPENDED") {
          suspendedExecutionCount += 1;
        }
      }

      const connectorKeysByGroup = new Map<string, Set<string>>();
      for (const connector of connectors) {
        const runtime = this.resolveSupplierConnectorRuntime(connector);
        const key = [
          runtime.providerAdapter?.key ?? "none",
          runtime.providerProfile?.key ?? "none",
          runtime.providerPolicy?.key ?? "none",
          runtime.mode,
          normalizeExecutionPolicyStatus(
            asRecord(asRecord(asRecord(connector.manifest).enterpriseRollout).executionPolicy).status
          ) ?? "none"
        ].join("::");
        const current = connectorKeysByGroup.get(key) ?? new Set<string>();
        current.add(connector.connectorKey);
        connectorKeysByGroup.set(key, current);
        if (!grouped.has(key)) {
          grouped.set(key, {
            providerAdapterKey: runtime.providerAdapter?.key ?? null,
            providerAdapterName: runtime.providerAdapter?.name ?? null,
            providerProfileKey: runtime.providerProfile?.key ?? null,
            providerPolicyKey: runtime.providerPolicy?.key ?? null,
            transportMode: runtime.mode,
            executionPolicyStatus:
              normalizeExecutionPolicyStatus(
                asRecord(asRecord(asRecord(connector.manifest).enterpriseRollout).executionPolicy).status
              ) ?? null,
            connectorCount: 0,
            supplierJobCount: 0,
            successCount: 0,
            failedCount: 0,
            retryableFailureCount: 0,
            terminalFailureCount: 0,
            latestExecutionAt: null,
            failureClasses: {},
            retryClasses: {},
            executionPhases: {}
          });
        }
      }

      for (const [key, connectorKeys] of connectorKeysByGroup.entries()) {
        const current = grouped.get(key);
        if (current) {
          current.connectorCount = connectorKeys.size;
        }
      }

      const items = [...grouped.values()].sort((left, right) =>
        `${left.providerAdapterKey ?? ""}:${left.transportMode}`.localeCompare(
          `${right.providerAdapterKey ?? ""}:${right.transportMode}`
        )
      );

      return {
        tenantId,
        storeId,
        summary: {
          connectorCount: connectors.length,
          runtimeGroupCount: items.length,
          supplierJobCount: supplierJobs.length,
          readyExecutionCount,
          warnExecutionCount,
          blockedExecutionCount,
          suspendedExecutionCount,
          retryableFailureCount: items.reduce((sum, item) => sum + item.retryableFailureCount, 0),
          terminalFailureCount: items.reduce((sum, item) => sum + item.terminalFailureCount, 0)
        },
        items
      };
    });
  }

  async getReplenishmentSupplierExecutionReadiness(
    context: RequestContext,
    id: string
  ): Promise<InventorySupplierExecutionReadinessDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const supplier = getReplenishmentSupplier(current);
      const connectorKey =
        typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
          ? supplier.connectorKey.trim()
          : null;
      if (!connectorKey) {
        return {
          jobId: current.id,
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: null,
          transportMode: null,
          status: "WARN",
          canExecute: false,
          providerAdapterKey: null,
          providerAdapterName: null,
          providerProfileKey: null,
          providerPolicyKey: null,
          providerPolicy: null,
          providerCompatibility: null,
          executionPolicy: null,
          blockingIssues: [],
          warnings: ["Supplier connector handoff has not been configured for this replenishment job."],
          checks: [
            {
              code: "SUPPLIER_CONNECTOR_MISSING",
              status: "WARN",
              message: "Supplier connector handoff has not been configured for this replenishment job."
            }
          ],
          failure: {
            providerErrorClass: null,
            retryClass: null,
            providerExecutionPhase: null,
            deadLetterReasonCode: null
          },
          staging: null
        };
      }

      const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
      return this.buildSupplierExecutionReadinessSnapshotTx(tx, current, connector);
    });
  }

  async dispatchReplenishmentSupplierRetry(
    context: RequestContext,
    id: string,
    input: DispatchInventoryReplenishmentSupplierRetryDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const supplier = getReplenishmentSupplier(current);
      const connectorKey =
        typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
          ? supplier.connectorKey.trim()
          : null;
      if (!connectorKey) {
        throw new BadRequestException("Supplier connector handoff is required before retry dispatch.");
      }
      const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
      const readiness = await this.buildSupplierExecutionReadinessSnapshotTx(tx, current, connector);
      if (!readiness.canExecute) {
        throw new BadRequestException(
          readiness.blockingIssues[0] ??
            readiness.warnings[0] ??
            "Supplier execution policy does not allow external retry dispatch."
        );
      }
      let queued =
        asRecord(supplier.reconciliation).status === "RETRY_QUEUED"
          ? current
          : await this.queueSupplierRetryTx(tx, current, context, {
              source:
                input.source === "WEBHOOK" || input.source === "FILE_IMPORT" || input.source === "HTTP_PUSH"
                  ? input.source
                  : undefined,
              note: input.note ?? "Forced provider retry dispatch requested by operator.",
              delayMs: 0,
              autoQueued: false,
              code: normalizeProviderErrorClass(supplier.providerErrorClass) ? String(supplier.providerErrorClass) : null,
              reason:
                typeof supplier.lastFailureReason === "string"
                  ? supplier.lastFailureReason
                  : "Forced provider retry dispatch requested by operator."
            });
      if (asRecord(getReplenishmentSupplier(queued).reconciliation).status === "RETRY_QUEUED") {
        const queuedSupplier = getReplenishmentSupplier(queued);
        queued = await tx.inventoryReplenishmentJob.update({
          where: { id: queued.id },
          data: {
            artifact: this.withReplenishmentWorkflowMetadata(queued, {
              supplier: {
                ...queuedSupplier,
                nextRetryAt: new Date().toISOString(),
                reconciliation: {
                  ...asRecord(queuedSupplier.reconciliation),
                  nextRetryAt: new Date().toISOString()
                }
              }
            })
          }
        });
      }
      const updated =
        (await this.processDueSupplierRetryTx(tx, queued, context, new Date(), {
          source:
            input.source === "WEBHOOK" || input.source === "FILE_IMPORT" || input.source === "HTTP_PUSH"
              ? input.source
              : null,
          note: input.note ?? "Forced provider retry dispatch executed by operator."
        })) ?? queued;
      return mapReplenishmentJob(updated);
    });
  }

  listSupplierConnectorActivationState(
    context: RequestContext,
    input: { tenantId?: string; storeId?: string }
  ) {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const connectors = await this.listVisibleSupplierConnectorsTx(tx, tenantId);
      const activations = await this.listLatestSupplierConnectorActivationsTx(
        tx,
        tenantId,
        connectors.map((item) => ({
          connectorKey: item.connectorKey,
          version: item.version,
          tenantId: item.tenantId
        }))
      );
      const readinessItems = await Promise.all(
        connectors.map((connector) =>
          this.evaluateSupplierConnectorReadinessTx(
            tx,
            tenantId,
            connector,
            activations.get(`${connector.connectorKey}::${connector.version}`) ?? null
          )
        )
      );
      const readinessByKey = new Map(
        readinessItems.map((item) => [`${item.connectorKey}::${item.version}`, item] as const)
      );
      return connectors.map((connector) => {
        const activation = this.mapSupplierConnectorActivation(
          connector,
          tenantId,
          activations.get(`${connector.connectorKey}::${connector.version}`) ?? null
        );
        const readiness = readinessByKey.get(`${connector.connectorKey}::${connector.version}`);
        const mappedConnector = mapSupplierConnector(connector, activation);
        return {
          connectorKey: connector.connectorKey,
          version: connector.version,
          tenantId: connector.tenantId,
          activationRequired: activation?.required ?? false,
          activationStatus: activation?.status ?? "UNKNOWN",
          activationState: activation?.status ?? "UNKNOWN",
          activationRequestId: activation?.requestId ?? null,
          activationPublicationId: activation?.publicationId ?? null,
          readiness: readiness?.status ?? "UNKNOWN",
          reason: readiness?.reason ?? activation?.reason ?? null,
          appliedAt: activation?.appliedAt ?? null,
          approvedAt: activation?.approvedAt ?? null,
          revokedAt: activation?.revokedAt ?? null,
          installationSource: mappedConnector.installation?.source ?? null,
          installedRegistryEntryId: connector.id,
          installedAt: mappedConnector.installation?.installedAt ?? null,
          installMode: mappedConnector.installation?.installMode ?? null,
          installationTargetStoreId: mappedConnector.installation?.targetStoreId ?? null,
          rolloutGovernanceStatus: mappedConnector.installation?.governanceStatus ?? null,
          rolloutGovernanceReason: mappedConnector.installation?.governanceReason ?? null,
          rolloutDriftStatus: mappedConnector.installation?.driftStatus ?? null,
          providerPolicyKey: mappedConnector.providerPolicyKey ?? null,
          providerPolicySummary: mappedConnector.providerPolicySummary ?? null
        };
      });
    });
  }

  listSupplierDeadLetters(
    context: RequestContext,
    input: InventorySupplierDeadLetterListQueryDto
  ): Promise<Array<InventoryReplenishmentJobDto & { connectorKey: string | null }>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const limit = Math.max(1, Math.min(100, Number(input.limit ?? 25) || 25));
      const jobs = await tx.inventoryReplenishmentJob.findMany({
        where: {
          tenantId,
          ...(input.storeId ? { storeId: input.storeId } : {})
        },
        orderBy: { updatedAt: "desc" },
        take: limit * 3
      });

      return jobs
        .filter((job) => {
          const supplier = getReplenishmentSupplier(job);
          return typeof supplier.deadLetterAt === "string" || typeof supplier.deadLetteredAt === "string";
        })
        .slice(0, limit)
        .map((job) => {
          const supplier = getReplenishmentSupplier(job);
          const reconciliation = asRecord(supplier.reconciliation);
          return {
            ...mapReplenishmentJob(job),
            jobId: job.id,
            connectorKey:
              typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
                ? supplier.connectorKey.trim()
                : null,
            supplierName:
              typeof supplier.supplierName === "string" && supplier.supplierName.trim()
                ? supplier.supplierName.trim()
                : null,
            supplierReference:
              typeof supplier.supplierReference === "string" && supplier.supplierReference.trim()
                ? supplier.supplierReference.trim()
                : null,
            providerAdapterKey:
              typeof supplier.providerAdapterKey === "string" && supplier.providerAdapterKey.trim()
                ? supplier.providerAdapterKey.trim()
                : null,
            providerAdapterName:
              typeof supplier.providerAdapterName === "string" && supplier.providerAdapterName.trim()
                ? supplier.providerAdapterName.trim()
                : null,
            providerAdapterVersion:
              typeof supplier.providerAdapterVersion === "string" && supplier.providerAdapterVersion.trim()
                ? supplier.providerAdapterVersion.trim()
                : null,
            providerAdapterVisibility:
              typeof supplier.providerAdapterVisibility === "string" && supplier.providerAdapterVisibility.trim()
                ? supplier.providerAdapterVisibility.trim()
                : null,
            providerAdapterDefaultPolicyVisible:
              typeof supplier.providerAdapterDefaultPolicyVisible === "boolean"
                ? supplier.providerAdapterDefaultPolicyVisible
                : null,
            providerAdapter: asRecord(supplier.providerAdapter),
            providerProfileKey:
              typeof supplier.providerProfileKey === "string" && supplier.providerProfileKey.trim()
                ? supplier.providerProfileKey.trim()
                : null,
            providerProfileName:
              typeof supplier.providerProfileName === "string" && supplier.providerProfileName.trim()
                ? supplier.providerProfileName.trim()
                : null,
            providerProfileVersion:
              typeof supplier.providerProfileVersion === "string" && supplier.providerProfileVersion.trim()
                ? supplier.providerProfileVersion.trim()
                : null,
            providerProfileVisibility:
              typeof supplier.providerProfileVisibility === "string" && supplier.providerProfileVisibility.trim()
                ? supplier.providerProfileVisibility.trim()
                : null,
            providerProfileDefaultPolicyVisible:
              typeof supplier.providerProfileDefaultPolicyVisible === "boolean"
                ? supplier.providerProfileDefaultPolicyVisible
                : null,
            providerProfile: asRecord(supplier.providerProfile),
            transportMode:
              typeof supplier.transportMode === "string" && supplier.transportMode.trim()
                ? supplier.transportMode.trim()
                : null,
            retryState:
              typeof reconciliation.status === "string" && reconciliation.status.trim()
                ? reconciliation.status.trim()
                : null,
            retryAttemptCount: Math.max(0, toNumber(supplier.retryAttemptCount, 0)),
            deadLetterAt:
              typeof supplier.deadLetterAt === "string"
                ? supplier.deadLetterAt
                : typeof supplier.deadLetteredAt === "string"
                  ? supplier.deadLetteredAt
                  : null,
            deadLetterCode:
              typeof supplier.deadLetterCode === "string" && supplier.deadLetterCode.trim()
                ? supplier.deadLetterCode.trim()
                : null,
            deadLetterReason:
              typeof supplier.deadLetterReason === "string" && supplier.deadLetterReason.trim()
                ? supplier.deadLetterReason.trim()
                : null,
            lastFailureAt:
              typeof supplier.lastFailureAt === "string" && supplier.lastFailureAt.trim()
                ? supplier.lastFailureAt.trim()
                : null,
            lastFailureCode:
              typeof supplier.lastFailureCode === "string" && supplier.lastFailureCode.trim()
                ? supplier.lastFailureCode.trim()
                : null,
            lastFailureReason:
              typeof supplier.lastFailureReason === "string" && supplier.lastFailureReason.trim()
                ? supplier.lastFailureReason.trim()
                : null,
            retryPolicy: asRecord(supplier.retryPolicy),
            terminal:
              typeof supplier.deadLetterAt === "string" ||
              typeof supplier.deadLetteredAt === "string" ||
              reconciliation.status === "DEAD_LETTER" ||
              reconciliation.status === "DEAD_LETTERED"
          };
        });
    });
  }

  listReplenishmentConnectorExecutions(
    context: RequestContext,
    id: string
  ): Promise<InventorySupplierConnectorExecutionDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const job = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, job.tenantId);
      return (
        await tx.$queryRaw<
          Array<{
            id: string;
            tenantId: string | null;
            storeId: string | null;
            connectorKind: string;
            connectorKey: string;
            action: string;
            status: string;
            requestPayload: Prisma.JsonValue | null;
            responsePayload: Prisma.JsonValue | null;
            errorMessage: string | null;
            createdAt: Date;
            finishedAt: Date | null;
          }>
        >(Prisma.sql`
          SELECT
            id,
            "tenantId",
            "storeId",
            "connectorKind",
            "connectorKey",
            action,
            status,
            "requestPayload",
            "responsePayload",
            "errorMessage",
            "createdAt",
            "finishedAt"
          FROM "ConnectorExecutionLog"
          WHERE "tenantId" = ${job.tenantId}::uuid
            AND "connectorKind" = 'SUPPLIER_ADAPTER'
            AND "requestPayload" ->> 'replenishmentJobId' = ${job.id}
          ORDER BY "createdAt" DESC
        `)
      ).map(mapSupplierConnectorExecution);
    });
  }

  createReplenishmentJob(
    context: RequestContext,
    input: CreateInventoryReplenishmentJobDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const report = await this.computeReplenishmentReportTx(tx, context, input);
      const job = await tx.inventoryReplenishmentJob.create({
        data: {
          id: randomUUID(),
          tenantId: report.tenantId,
          storeId: report.storeId,
          warehouseId: report.warehouseId,
          status: "GENERATED",
          summary: report.summary as Prisma.InputJsonObject,
          artifact: report as unknown as Prisma.InputJsonObject,
          createdByUserId: context.scope === "device" ? null : asUuidOrNull(context.userId)
        }
      });
      return mapReplenishmentJob(job);
    });
  }

  getReplenishmentJob(context: RequestContext, id: string): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const job = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, job.tenantId);
      return mapReplenishmentJob(job);
    });
  }

  approveReplenishmentJob(context: RequestContext, id: string): Promise<InventoryReplenishmentJobDto> {
    return this.transitionReplenishmentJobStatus(context, id, "APPROVED");
  }

  dispatchReplenishmentJob(context: RequestContext, id: string): Promise<InventoryReplenishmentJobDto> {
    return this.transitionReplenishmentJobStatus(context, id, "DISPATCHED");
  }

  exportReplenishmentJob(
    context: RequestContext,
    id: string,
    query: InventoryReplenishmentJobExportQueryDto
  ): Promise<InventoryReplenishmentJobExportDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);

      const generatedAt = new Date().toISOString();
      const rows = this.mapReplenishmentExportRows(current);
      const format = query.format ?? "csv";
      const content =
        format === "json"
          ? JSON.stringify(
              {
                jobId: current.id,
                status: current.status,
                rows
              },
              null,
              2
            )
          : this.buildReplenishmentCsv(rows);
      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            lastExportedAt: generatedAt,
            lastExportedByActorId: this.resolveReplenishmentActorId(context),
            lastExportFormat: format
          })
        }
      });

      return {
        jobId: updated.id,
        status: updated.status,
        generatedAt,
        filename: `replenishment-${updated.id.slice(0, 8)}-${generatedAt.slice(0, 10)}.${format}`,
        contentType: format === "json" ? "application/json" : "text/csv",
        rowCount: rows.length,
        rows,
        content
      };
    });
  }

  handoffReplenishmentJob(
    context: RequestContext,
    id: string,
    input: HandoffInventoryReplenishmentJobDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      if (!["DISPATCHED", "RECEIVING", "RECEIVED"].includes(current.status)) {
        throw new BadRequestException("Only dispatched replenishment jobs can be handed off to a supplier.");
      }

      const timestamp = new Date().toISOString();
      const connector =
        input.connectorKey?.trim()
          ? await this.requireSupplierConnectorTx(tx, current.tenantId, input.connectorKey.trim())
          : null;
      if (connector) {
        await this.ensureSupplierConnectorReadyForHandoffTx(tx, current.tenantId, connector);
        const executionReadiness = await this.buildSupplierExecutionReadinessSnapshotTx(tx, current, connector);
        if (!executionReadiness.canExecute) {
          throw new BadRequestException(
            executionReadiness.blockingIssues[0] ??
              executionReadiness.warnings[0] ??
              "Supplier execution policy does not allow external provider handoff."
          );
        }
      }
      const runtime = connector ? this.resolveSupplierConnectorRuntime(connector) : null;
      const summary = asRecord(current.summary);
      const baseHandoffExecution = connector
        ? executeInventorySupplierTransportHandoff({
            replenishmentJobId: current.id,
            connectorKey: connector.connectorKey,
            supplierName: input.supplierName.trim(),
            supplierReference: input.supplierReference?.trim() || null,
            channel: input.channel?.trim() || "MANUAL",
            recommendationCount: toNumber(summary.recommendationCount),
            totalRecommendedOrderQuantity: toNumber(summary.totalRecommendedOrderQuantity),
            transportMode: runtime?.mode ?? "SIMULATED",
            callbackPath:
              runtime?.callbackPath?.replace(":jobId", current.id) ?? null,
            importFormat: runtime?.importFormat ?? null
            ,
            pickupPath:
              runtime?.pickupPath?.replace(":jobId", current.id) ?? null,
            dropPath:
              runtime?.dropPath?.replace(":jobId", current.id) ?? null,
            endpoint: runtime?.endpoint ?? null,
            method: runtime?.method ?? null,
            timeoutMs: runtime?.mode === "HTTP_PUSH" ? runtime.timeoutMs : null,
            acceptedStatusCodes:
              runtime?.mode === "HTTP_PUSH" ? runtime.acceptedStatusCodes : null,
            responseStatusField:
              runtime?.mode === "HTTP_PUSH" ? runtime.responseStatusField : null,
            responseStatusMap:
              runtime?.mode === "HTTP_PUSH" ? runtime.responseStatusMap : null,
            authKind: runtime?.mode === "HTTP_PUSH" ? runtime.auth?.kind ?? null : null,
            authHeaderName:
              runtime?.mode === "HTTP_PUSH" ? runtime.auth?.headerName ?? null : null,
            providerProfileKey: runtime?.providerProfile?.key ?? null,
            providerAdapterKey: runtime?.providerAdapter?.key ?? null,
            payloadShape: runtime?.providerProfile?.payloadShape ?? "DEFAULT"
            ,
            payloadVariant: runtime?.payloadVariant ?? runtime?.providerProfile?.payloadShape ?? "DEFAULT",
            externalReferencePrefix: runtime?.externalReferencePrefix ?? null,
            fileNamePrefix: runtime?.fileNamePrefix ?? null
          })
        : null;
      const httpPushAuth =
        runtime?.mode === "HTTP_PUSH"
          ? await this.resolveSupplierConnectorHttpPushAuthTx(tx, current.tenantId, runtime)
          : null;
      const handoffExecution =
        runtime?.mode === "HTTP_PUSH" && baseHandoffExecution
          ? await this.executeInventorySupplierHttpPushDelivery(baseHandoffExecution, runtime, httpPushAuth)
          : baseHandoffExecution;
      const action =
        runtime?.mode === "WEBHOOK"
          ? "replenishment_supplier_webhook_handoff"
          : runtime?.mode === "FILE_IMPORT"
            ? "replenishment_supplier_file_handoff"
            : runtime?.mode === "HTTP_PUSH"
              ? "replenishment_supplier_http_push_handoff"
            : "replenishment_handoff";
      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            supplier: {
              supplierName: input.supplierName.trim(),
              supplierReference:
                handoffExecution?.externalReference ?? input.supplierReference?.trim() ?? null,
              channel: input.channel?.trim() || "MANUAL",
              connectorKey: connector?.connectorKey ?? null,
              connectorVersion: connector?.version ?? null,
              notes: input.notes ?? null,
              handedOffAt: timestamp,
              handedOffByActorId: this.resolveReplenishmentActorId(context),
              supplierStatus: handoffExecution?.supplierStatus ?? "SUBMITTED",
              transportMode: runtime?.mode ?? "MANUAL",
              callbackPath:
                runtime?.mode === "WEBHOOK"
                  ? runtime.callbackPath?.replace(":jobId", current.id) ?? null
                  : null,
              importFormat: runtime?.mode === "FILE_IMPORT" ? runtime.importFormat ?? "json" : null,
              pickupPath:
                runtime?.mode === "FILE_IMPORT"
                  ? runtime.pickupPath?.replace(":jobId", current.id) ?? null
                  : null,
              dropPath:
                runtime?.mode === "FILE_IMPORT"
                  ? runtime.dropPath?.replace(":jobId", current.id) ?? null
                  : null,
              endpoint:
                runtime?.mode === "HTTP_PUSH" ? runtime.endpoint ?? null : null,
              method:
                runtime?.mode === "HTTP_PUSH" ? runtime.method ?? "POST" : null,
              timeoutMs:
                runtime?.mode === "HTTP_PUSH" ? runtime.timeoutMs : null,
              acceptedStatusCodes:
                runtime?.mode === "HTTP_PUSH" ? runtime.acceptedStatusCodes : null,
              responseStatusField:
                runtime?.mode === "HTTP_PUSH" ? runtime.responseStatusField : null,
              responseStatusMap:
                runtime?.mode === "HTTP_PUSH" ? runtime.responseStatusMap : null,
              authKind:
                runtime?.mode === "HTTP_PUSH" ? runtime.auth?.kind ?? null : null,
              authHeaderName:
                runtime?.mode === "HTTP_PUSH" ? runtime.auth?.headerName ?? null : null,
              providerAdapterKey: runtime?.providerAdapter?.key ?? null,
              providerAdapterName: runtime?.providerAdapter?.name ?? null,
              providerAdapterVersion: runtime?.providerAdapter?.version ?? null,
              providerAdapterVisibility: runtime?.providerAdapter?.visibility ?? null,
              providerAdapterDefaultPolicyVisible: runtime?.providerAdapter?.defaultPolicyVisible ?? null,
              providerAdapter:
                runtime?.providerAdapter
                  ? {
                      key: runtime.providerAdapter.key,
                      name: runtime.providerAdapter.name,
                      version: runtime.providerAdapter.version,
                      visibility: runtime.providerAdapter.visibility,
                      defaultPolicyVisible: runtime.providerAdapter.defaultPolicyVisible,
                      providerProfileKey: runtime.providerAdapter.providerProfileKey,
                      payloadVariant: runtime.providerAdapter.payloadVariant
                    }
                  : null,
              providerProfileKey: runtime?.providerProfile?.key ?? null,
              providerProfileName: runtime?.providerProfile?.name ?? null,
              providerProfileVersion: runtime?.providerProfile?.version ?? null,
              providerProfileVisibility: runtime?.providerProfile?.visibility ?? null,
              providerProfileDefaultPolicyVisible: runtime?.providerProfile?.defaultPolicyVisible ?? null,
              providerProfile:
                runtime?.providerProfile
                  ? {
                      key: runtime.providerProfile.key,
                      name: runtime.providerProfile.name,
                      version: runtime.providerProfile.version,
                      visibility: runtime.providerProfile.visibility,
                      defaultPolicyVisible: runtime.providerProfile.defaultPolicyVisible,
                      payloadShape: runtime.providerProfile.payloadShape,
                      transportMode: runtime.providerProfile.transportMode
                    }
                  : null,
              payloadShape: runtime?.providerProfile?.payloadShape ?? "DEFAULT",
              payloadVariant: runtime?.payloadVariant ?? runtime?.providerProfile?.payloadShape ?? "DEFAULT",
              authKeyRef:
                runtime?.mode === "HTTP_PUSH" ? httpPushAuth?.keyRef ?? null : null,
              retryPolicy:
                runtime?.mode === "HTTP_PUSH" ? runtime.retryPolicy ?? null : null,
              requireSignature: runtime?.mode === "WEBHOOK" ? runtime.requireSignature : false,
              requireChecksum: runtime?.mode === "FILE_IMPORT" ? runtime.requireChecksum : false,
              pendingCallback: runtime?.mode === "WEBHOOK",
              pendingImport: runtime?.mode === "FILE_IMPORT",
              pendingPush: runtime?.mode === "HTTP_PUSH" && handoffExecution?.status === "FAILED",
              deliveryArtifact: handoffExecution?.deliveryArtifact ?? null,
              lastTransportAction: action,
              lastTransportStatus: handoffExecution?.status ?? null
            }
          })
        }
      });

      if (connector) {
        await this.logSupplierConnectorExecutionTx(tx, {
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: connector.connectorKey,
          action,
          requestPayload: {
            replenishmentJobId: current.id,
            supplierName: input.supplierName.trim(),
            supplierReference: input.supplierReference?.trim() || null,
            channel: input.channel?.trim() || "MANUAL",
            transportMode: runtime?.mode ?? "SIMULATED",
            providerAdapterKey: runtime?.providerAdapter?.key ?? null,
            providerProfileKey: runtime?.providerProfile?.key ?? null
          },
          responsePayload: {
            ...(handoffExecution?.responsePayload ?? {}),
            connectorVersion: connector.version,
            deliveryArtifact: handoffExecution?.deliveryArtifact ?? null
          },
          status: handoffExecution?.status ?? "COMPLETED",
          errorMessage: handoffExecution?.errorMessage ?? null
        });
      }

      let nextModel = updated;
      if (connector && runtime?.mode === "HTTP_PUSH" && handoffExecution?.status === "FAILED") {
        const nextArtifact = asRecord(nextModel.artifact);
        const nextWorkflow = asRecord(nextArtifact.workflow);
        const nextSupplier = asRecord(nextWorkflow.supplier);
        const retryDecision = this.resolveHttpPushRetryDecision(nextSupplier, runtime, handoffExecution);
        if (retryDecision.shouldRetry) {
          nextModel = await this.queueSupplierRetryTx(tx, nextModel, context, {
            source: "HTTP_PUSH",
            note: `Auto-queued HTTP push retry after failed handoff. ${retryDecision.reason}`,
            delayMs: retryDecision.delayMs,
            autoQueued: true,
            code: retryDecision.code,
            reason: retryDecision.reason
          });
        } else if (retryDecision.terminal) {
          nextModel = await this.markSupplierDeadLetterTx(tx, nextModel, connector.connectorKey, nextSupplier, {
            source: "HTTP_PUSH",
            code: retryDecision.code,
            reason: retryDecision.reason,
            attempt: retryDecision.attempt,
            deadLetterStatus: runtime.retryPolicy?.deadLetterStatus ?? "DEAD_LETTER",
            note: `HTTP push failure moved to dead letter. ${retryDecision.reason}`,
            execution: handoffExecution
          });
        }
      }

      return mapReplenishmentJob(nextModel);
    });
  }

  updateReplenishmentSupplierStatus(
    context: RequestContext,
    id: string,
    input: UpdateInventoryReplenishmentSupplierStatusDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const artifact = asRecord(current.artifact);
      const workflow = asRecord(artifact.workflow);
      const supplier = asRecord(workflow.supplier);
      if (!Object.keys(supplier).length) {
        throw new BadRequestException("Supplier handoff must be created before supplier status sync.");
      }

      const timestamp = new Date().toISOString();
      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            supplier: {
              ...supplier,
              supplierStatus: input.supplierStatus,
              lastStatusSyncAt: timestamp,
              lastStatusSyncByActorId: this.resolveReplenishmentActorId(context),
              lastStatusNote: input.note ?? null
            }
          })
        }
      });

      if (typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()) {
        await this.logSupplierConnectorExecutionTx(tx, {
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: supplier.connectorKey.trim(),
          action: "replenishment_supplier_status_sync",
          requestPayload: {
            replenishmentJobId: current.id,
            previousStatus: supplier.supplierStatus ?? null,
            nextStatus: input.supplierStatus
          },
          responsePayload: {
            status: input.supplierStatus,
            note: input.note ?? null
          },
          status: "COMPLETED",
          errorMessage: null
        });
      }

      return mapReplenishmentJob(updated);
    });
  }

  syncReplenishmentSupplierStatus(
    context: RequestContext,
    id: string,
    input: SyncInventoryReplenishmentSupplierStatusDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const artifact = asRecord(current.artifact);
      const workflow = asRecord(artifact.workflow);
      const supplier = asRecord(workflow.supplier);
      const connectorKey =
        typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
          ? supplier.connectorKey.trim()
          : null;
      const supplierName =
        typeof supplier.supplierName === "string" && supplier.supplierName.trim()
          ? supplier.supplierName.trim()
          : null;

      if (!connectorKey || !supplierName) {
        throw new BadRequestException("Supplier connector handoff is required before status sync.");
      }

      const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
      const runtime = this.resolveSupplierConnectorRuntime(connector);
      if (!runtime.allowsPolling) {
        throw new BadRequestException(
          "This supplier connector expects webhook or import callbacks instead of polling sync."
        );
      }
      const executionReadiness = await this.buildSupplierExecutionReadinessSnapshotTx(tx, current, connector);
      if (!executionReadiness.canExecute) {
        throw new BadRequestException(
          executionReadiness.blockingIssues[0] ??
            executionReadiness.warnings[0] ??
            "Supplier execution policy does not allow external provider sync."
        );
      }
      const execution = executeInventorySupplierStatusSync({
        connectorKey: connector.connectorKey,
        supplierName,
        supplierReference:
          typeof supplier.supplierReference === "string" ? supplier.supplierReference : null,
        currentSupplierStatus:
          typeof supplier.supplierStatus === "string" ? supplier.supplierStatus : "SUBMITTED"
      });
      const mappedProviderStatus = resolveInventorySupplierProviderSyncStatus({
        providerAdapterKey: runtime.providerAdapter?.key ?? null,
        currentSupplierStatus:
          typeof supplier.supplierStatus === "string" ? supplier.supplierStatus : execution.supplierStatus
      });
      const timestamp = new Date().toISOString();

      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            supplier: {
              ...supplier,
              supplierStatus: mappedProviderStatus,
              lastStatusSyncAt: timestamp,
              lastStatusSyncByActorId: this.resolveReplenishmentActorId(context),
              lastStatusNote: input.note ?? null,
              pendingCallback: false,
              pendingImport: false,
              providerExecutionPhase: "SYNC"
            }
          })
        }
      });

      await this.logSupplierConnectorExecutionTx(tx, {
        tenantId: current.tenantId,
        storeId: current.storeId,
        connectorKey: connector.connectorKey,
        action: "replenishment_supplier_connector_sync",
        requestPayload: {
          replenishmentJobId: current.id,
          previousStatus: supplier.supplierStatus ?? null,
          note: input.note ?? null,
          providerExecutionPhase: "SYNC"
        },
        responsePayload: {
          ...execution.responsePayload,
          supplierStatus: mappedProviderStatus,
          providerExecutionPhase: "SYNC",
          retryClass: "NONE",
          providerErrorClass: null
        },
        status: execution.status,
        errorMessage: execution.errorMessage
      });

      return mapReplenishmentJob(updated);
    });
  }

  processReplenishmentSupplierWebhook(
    context: RequestContext,
    id: string,
    input: ProcessInventoryReplenishmentSupplierWebhookDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const artifact = asRecord(current.artifact);
      const workflow = asRecord(artifact.workflow);
      const supplier = asRecord(workflow.supplier);
      const connectorKey =
        typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
          ? supplier.connectorKey.trim()
          : null;

      if (!connectorKey) {
        throw new BadRequestException("Supplier connector handoff is required before webhook callbacks.");
      }

      const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
      const runtime = this.resolveSupplierConnectorRuntime(connector);
      if (runtime.mode !== "WEBHOOK") {
        throw new BadRequestException("This supplier connector does not use webhook callbacks.");
      }
      const resolvedWebhookPayload = resolveInventorySupplierProviderWebhookPayload({
        providerAdapterKey: runtime.providerAdapter?.key ?? null,
        supplierStatus: input.supplierStatus,
        eventType: input.eventType ?? null,
        payload: input.payload ?? null
      });

      const deliveryId = input.deliveryId.trim();
      if (!deliveryId) {
        throw new BadRequestException("deliveryId is required for supplier webhook callbacks.");
      }

      const replay = asRecord(supplier.replay);
      const processedWebhookDeliveries = Array.isArray(replay.webhookDeliveries)
        ? replay.webhookDeliveries.map((item) => asRecord(item))
        : [];
      const duplicateDelivery = processedWebhookDeliveries.find(
        (item) => String(item.deliveryId ?? "") === deliveryId
      );
      if (duplicateDelivery) {
        const timestamp = new Date().toISOString();
        const updated = await tx.inventoryReplenishmentJob.update({
          where: { id },
          data: {
            artifact: this.withReplenishmentWorkflowMetadata(current, {
              supplier: {
                ...supplier,
                lastDuplicateDeliveryId: deliveryId,
                lastDuplicateDeliveryAt: timestamp,
                reconciliation: {
                  source: "WEBHOOK",
                  status: "DUPLICATE",
                  processedAt: timestamp,
                  deliveryId
                }
              }
            })
          }
        });

        await this.logSupplierConnectorExecutionTx(tx, {
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: connector.connectorKey,
          action: "replenishment_supplier_webhook_callback",
          requestPayload: {
            replenishmentJobId: current.id,
            deliveryId,
            eventType: input.eventType ?? null
          },
          responsePayload: {
            duplicate: true
          },
          status: "COMPLETED",
          errorMessage: null
        });

        return mapReplenishmentJob(updated);
      }

      const incomingReference = input.externalReference?.trim() || null;
      const currentReference =
        typeof supplier.supplierReference === "string" ? supplier.supplierReference : null;
      if (incomingReference && currentReference && incomingReference !== currentReference) {
          await this.recordSupplierReconciliationFailure(current, supplier, {
            source: "WEBHOOK",
            reason: "Supplier callback external reference does not match the current handoff.",
            code: "REFERENCE_MISMATCH",
            providerErrorClass: "REFERENCE",
            retryClass: "TERMINAL",
            providerExecutionPhase: "WEBHOOK",
            deliveryId,
            externalReference: incomingReference
          });
        await this.logSupplierConnectorExecution({
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: connector.connectorKey,
          action: "replenishment_supplier_webhook_callback",
          requestPayload: {
            replenishmentJobId: current.id,
            externalReference: incomingReference,
            eventType: input.eventType ?? null
          },
            responsePayload: {
            expectedExternalReference: currentReference,
            providerErrorClass: "REFERENCE",
            retryClass: "TERMINAL",
            providerExecutionPhase: "WEBHOOK"
          },
          status: "FAILED",
          errorMessage: "Supplier callback external reference does not match the current handoff."
        });
        throw new BadRequestException(
          "Supplier callback external reference does not match the current handoff."
        );
      }

      let signatureVerified = false;
      let signatureKeyRef: string | null = null;
      if (runtime.requireSignature) {
        if (!runtime.secretKey) {
          throw new BadRequestException(
            "Supplier webhook transport requires a configured secretKey in connector manifest."
          );
        }
        const secret = await this.resolveSupplierConnectorSecretTx(
          tx,
          current.tenantId,
          runtime.secretKey
        );
        if (!secret) {
          throw new BadRequestException("Supplier webhook signing secret was not found.");
        }
        const signature = input.signature?.trim() || "";
        if (!signature) {
          await this.recordSupplierReconciliationFailure(current, supplier, {
            source: "WEBHOOK",
            reason: "Supplier webhook signature is required.",
            code: "SIGNATURE_REQUIRED",
            providerErrorClass: "SIGNATURE",
            retryClass: "TERMINAL",
            providerExecutionPhase: "WEBHOOK",
            deliveryId,
            externalReference: incomingReference
          });
          await this.logSupplierConnectorExecution({
            tenantId: current.tenantId,
            storeId: current.storeId,
            connectorKey: connector.connectorKey,
            action: "replenishment_supplier_webhook_callback",
            requestPayload: {
              replenishmentJobId: current.id,
              deliveryId,
              eventType: input.eventType ?? null
            },
            responsePayload: {
              signatureVerified: false,
              providerErrorClass: "SIGNATURE",
              retryClass: "TERMINAL",
              providerExecutionPhase: "WEBHOOK"
            },
            status: "FAILED",
            errorMessage: "Supplier webhook signature is required."
          });
          throw new BadRequestException("Supplier webhook signature is required.");
        }
        const payload = this.buildSupplierWebhookVerificationPayload({
          deliveryId,
          supplierStatus: input.supplierStatus,
          externalReference: incomingReference,
          eventType: input.eventType?.trim() || null,
          payload: input.payload ?? null
        });
        const expected = createHmac("sha256", secret.value).update(payload).digest("hex");
        if (!verifyHexHmac(expected, signature)) {
          await this.recordSupplierReconciliationFailure(current, supplier, {
            source: "WEBHOOK",
            reason: "Supplier webhook signature verification failed.",
            code: "SIGNATURE_INVALID",
            providerErrorClass: "SIGNATURE",
            retryClass: "TERMINAL",
            providerExecutionPhase: "WEBHOOK",
            deliveryId,
            externalReference: incomingReference
          });
          await this.logSupplierConnectorExecution({
            tenantId: current.tenantId,
            storeId: current.storeId,
            connectorKey: connector.connectorKey,
            action: "replenishment_supplier_webhook_callback",
            requestPayload: {
              replenishmentJobId: current.id,
              deliveryId,
              eventType: input.eventType ?? null
            },
            responsePayload: {
              signatureVerified: false,
              signatureKey: secret.key,
              providerErrorClass: "SIGNATURE",
              retryClass: "TERMINAL",
              providerExecutionPhase: "WEBHOOK"
            },
            status: "FAILED",
            errorMessage: "Supplier webhook signature verification failed."
          });
          throw new BadRequestException("Supplier webhook signature verification failed.");
        }
        signatureVerified = true;
        signatureKeyRef = `${secret.key}:${secret.id}`;
      }

      const timestamp = new Date().toISOString();
      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            supplier: {
              ...supplier,
              supplierReference: currentReference ?? incomingReference,
              supplierStatus: resolvedWebhookPayload.supplierStatus,
              pendingCallback: false,
              callbackDeliveryId: deliveryId,
              callbackReceivedAt: timestamp,
              callbackEventType: resolvedWebhookPayload.eventType?.trim() || null,
              callbackPayload: input.payload ?? null,
              callbackSignatureVerified: signatureVerified,
              callbackSignatureKeyRef: signatureKeyRef,
              lastFailureAt: null,
              lastFailureSource: null,
              lastFailureReason: null,
              lastFailureCode: null,
              lastStatusSyncAt: timestamp,
              lastStatusSyncByActorId: this.resolveReplenishmentActorId(context),
              lastStatusNote: input.note ?? null,
              providerExecutionPhase: "WEBHOOK",
              replay: {
                ...replay,
                webhookDeliveries: this.appendReplayMarker(
                  replay.webhookDeliveries,
                  {
                    deliveryId,
                    processedAt: timestamp,
                    status: resolvedWebhookPayload.supplierStatus
                  },
                  runtime.replayWindowSize
                )
              },
              reconciliation: {
                source: "WEBHOOK",
                status: "MATCHED",
                processedAt: timestamp,
                deliveryId,
                signatureVerified,
                providerExecutionPhase: "WEBHOOK"
              }
            }
          })
        }
      });

      await this.logSupplierConnectorExecutionTx(tx, {
        tenantId: current.tenantId,
        storeId: current.storeId,
        connectorKey: connector.connectorKey,
        action: "replenishment_supplier_webhook_callback",
        requestPayload: {
          replenishmentJobId: current.id,
          deliveryId,
          supplierStatus: resolvedWebhookPayload.supplierStatus,
          externalReference: incomingReference,
          eventType: resolvedWebhookPayload.eventType ?? null,
          signatureProvided: Boolean(input.signature?.trim()),
          payload: input.payload ?? null,
          providerExecutionPhase: "WEBHOOK"
        },
        responsePayload: {
          status: resolvedWebhookPayload.supplierStatus,
          matchedReference: currentReference ?? incomingReference,
          signatureVerified,
          signatureKeyRef,
          providerErrorClass: null,
          retryClass: "NONE",
          providerExecutionPhase: "WEBHOOK"
        },
        status: "COMPLETED",
        errorMessage: null
      });

      return mapReplenishmentJob(updated);
    });
  }

  importReplenishmentSupplierUpdate(
    context: RequestContext,
    id: string,
    input: ImportInventoryReplenishmentSupplierUpdateDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const artifact = asRecord(current.artifact);
      const workflow = asRecord(artifact.workflow);
      const supplier = asRecord(workflow.supplier);
      const connectorKey =
        typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
          ? supplier.connectorKey.trim()
          : null;

      if (!connectorKey) {
        throw new BadRequestException("Supplier connector handoff is required before import reconciliation.");
      }

      const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
      const runtime = this.resolveSupplierConnectorRuntime(connector);
      if (runtime.mode !== "FILE_IMPORT") {
        throw new BadRequestException("This supplier connector does not use file-import reconciliation.");
      }
      const resolvedImportPayload = resolveInventorySupplierProviderImportPayload({
        providerAdapterKey: runtime.providerAdapter?.key ?? null,
        supplierStatus: input.supplierStatus,
        payload: input.payload ?? null,
        fileName: input.fileName ?? null
      });
      const importPayloadRecord = asRecord(input.payload);
      const importPayloadForChecksum = { ...importPayloadRecord };
      delete importPayloadForChecksum._staging;
      const rawChecksumPayload =
        typeof importPayloadRecord._checksumPayload === "string" && importPayloadRecord._checksumPayload.trim()
          ? importPayloadRecord._checksumPayload
          : null;
      delete importPayloadForChecksum._checksumPayload;
      const staging = asRecord(importPayloadRecord._staging);

      const importId = input.importId.trim();
      if (!importId) {
        throw new BadRequestException("importId is required for supplier import reconciliation.");
      }

      const replay = asRecord(supplier.replay);
      const processedImports = Array.isArray(replay.imports)
        ? replay.imports.map((item) => asRecord(item))
        : [];
      const duplicateImport = processedImports.find((item) => String(item.importId ?? "") === importId);
      if (duplicateImport) {
        const timestamp = new Date().toISOString();
        const updated = await tx.inventoryReplenishmentJob.update({
          where: { id },
          data: {
            artifact: this.withReplenishmentWorkflowMetadata(current, {
              supplier: {
                ...supplier,
                lastDuplicateImportId: importId,
                lastDuplicateImportAt: timestamp,
                reconciliation: {
                  source: "FILE_IMPORT",
                  status: "DUPLICATE",
                  processedAt: timestamp,
                  importId
                }
              }
            })
          }
        });

        await this.logSupplierConnectorExecutionTx(tx, {
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: connector.connectorKey,
          action: "replenishment_supplier_file_import",
          requestPayload: {
            replenishmentJobId: current.id,
            importId,
            fileName: input.fileName ?? null
          },
          responsePayload: {
            duplicate: true
          },
          status: "COMPLETED",
          errorMessage: null
        });

        return mapReplenishmentJob(updated);
      }

      const incomingReference = input.externalReference?.trim() || null;
      const currentReference =
        typeof supplier.supplierReference === "string" ? supplier.supplierReference : null;
      if (incomingReference && currentReference && incomingReference !== currentReference) {
        await this.recordSupplierReconciliationFailure(current, supplier, {
          source: "FILE_IMPORT",
          reason: "Supplier import external reference does not match the current handoff.",
          code: "REFERENCE_MISMATCH",
          providerErrorClass: "REFERENCE",
          retryClass: "TERMINAL",
          providerExecutionPhase: "FILE_DROP",
          importId,
          externalReference: incomingReference
        });
        await this.logSupplierConnectorExecution({
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: connector.connectorKey,
          action: "replenishment_supplier_file_import",
          requestPayload: {
            replenishmentJobId: current.id,
            externalReference: incomingReference,
            fileName: input.fileName ?? null
          },
          responsePayload: {
            expectedExternalReference: currentReference,
            providerErrorClass: "REFERENCE",
            retryClass: "TERMINAL",
            providerExecutionPhase: "FILE_DROP"
          },
          status: "FAILED",
          errorMessage: "Supplier import external reference does not match the current handoff."
        });
        throw new BadRequestException(
          "Supplier import external reference does not match the current handoff."
        );
      }

      let checksumVerified = false;
      if (runtime.requireChecksum) {
        const checksum = input.checksum?.trim() || "";
        if (!checksum) {
          await this.recordSupplierReconciliationFailure(current, supplier, {
            source: "FILE_IMPORT",
            reason: "Supplier import checksum is required.",
            code: "CHECKSUM_REQUIRED",
            providerErrorClass: "CHECKSUM",
            retryClass: "TERMINAL",
            providerExecutionPhase: "FILE_DROP",
            importId,
            externalReference: incomingReference
          });
          await this.logSupplierConnectorExecution({
            tenantId: current.tenantId,
            storeId: current.storeId,
            connectorKey: connector.connectorKey,
            action: "replenishment_supplier_file_import",
            requestPayload: {
              replenishmentJobId: current.id,
              importId,
              fileName: input.fileName ?? null
            },
            responsePayload: {
              checksumVerified: false,
              providerErrorClass: "CHECKSUM",
              retryClass: "TERMINAL",
              providerExecutionPhase: "FILE_DROP"
            },
            status: "FAILED",
            errorMessage: "Supplier import checksum is required."
          });
          throw new BadRequestException("Supplier import checksum is required.");
        }

        const payload = this.buildSupplierImportChecksumPayload({
          importId,
          supplierStatus: input.supplierStatus,
          externalReference: incomingReference,
          fileName: input.fileName?.trim() || null,
          payload: importPayloadForChecksum
        });
        const expected = createHash("sha256").update(rawChecksumPayload ?? payload).digest("hex");
        if (expected !== checksum) {
          await this.recordSupplierReconciliationFailure(current, supplier, {
            source: "FILE_IMPORT",
            reason: "Supplier import checksum verification failed.",
            code: "CHECKSUM_INVALID",
            providerErrorClass: "CHECKSUM",
            retryClass: "TERMINAL",
            providerExecutionPhase: "FILE_DROP",
            importId,
            externalReference: incomingReference
          });
          await this.logSupplierConnectorExecution({
            tenantId: current.tenantId,
            storeId: current.storeId,
            connectorKey: connector.connectorKey,
            action: "replenishment_supplier_file_import",
            requestPayload: {
              replenishmentJobId: current.id,
              importId,
              fileName: input.fileName ?? null
            },
            responsePayload: {
              checksumVerified: false,
              providerErrorClass: "CHECKSUM",
              retryClass: "TERMINAL",
              providerExecutionPhase: "FILE_DROP"
            },
            status: "FAILED",
            errorMessage: "Supplier import checksum verification failed."
          });
          throw new BadRequestException("Supplier import checksum verification failed.");
        }
        checksumVerified = true;
      }

      const timestamp = new Date().toISOString();
      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            supplier: {
              ...supplier,
              supplierReference: currentReference ?? incomingReference,
              supplierStatus: resolvedImportPayload.supplierStatus,
              pendingImport: false,
              importId,
              importReceivedAt: timestamp,
              importFileName: resolvedImportPayload.fileName?.trim() || null,
              importPayload: importPayloadForChecksum,
              importChecksumVerified: checksumVerified,
              deliveryArtifact:
                Object.keys(staging).length === 0
                  ? supplier.deliveryArtifact ?? null
                  : {
                      ...asRecord(supplier.deliveryArtifact),
                      staging
                    },
              lastFailureAt: null,
              lastFailureSource: null,
              lastFailureReason: null,
              lastFailureCode: null,
              lastStatusSyncAt: timestamp,
              lastStatusSyncByActorId: this.resolveReplenishmentActorId(context),
              lastStatusNote: input.note ?? null,
              providerExecutionPhase: "FILE_DROP",
              replay: {
                ...replay,
                imports: this.appendReplayMarker(
                  replay.imports,
                  {
                    importId,
                    processedAt: timestamp,
                    status: resolvedImportPayload.supplierStatus
                  },
                  runtime.replayWindowSize
                )
              },
              reconciliation: {
                source: "FILE_IMPORT",
                status: "MATCHED",
                processedAt: timestamp,
                importId,
                checksumVerified,
                providerExecutionPhase: "FILE_DROP"
              }
            }
          })
        }
      });

      await this.logSupplierConnectorExecutionTx(tx, {
        tenantId: current.tenantId,
        storeId: current.storeId,
        connectorKey: connector.connectorKey,
        action: "replenishment_supplier_file_import",
        requestPayload: {
          replenishmentJobId: current.id,
          importId,
          supplierStatus: resolvedImportPayload.supplierStatus,
          externalReference: incomingReference,
          fileName: resolvedImportPayload.fileName ?? null,
          checksumProvided: Boolean(input.checksum?.trim()),
          payload: importPayloadForChecksum,
          providerExecutionPhase: "FILE_DROP"
        },
        responsePayload: {
          status: resolvedImportPayload.supplierStatus,
          matchedReference: currentReference ?? incomingReference,
          checksumVerified,
          providerErrorClass: null,
          retryClass: "NONE",
          providerExecutionPhase: "FILE_DROP"
        },
        status: "COMPLETED",
        errorMessage: null
      });

      return mapReplenishmentJob(updated);
    });
  }

  getReplenishmentSupplierFilePickup(
    context: RequestContext,
    id: string
  ): Promise<InventorySupplierFilePickupDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const artifact = asRecord(current.artifact);
      const workflow = asRecord(artifact.workflow);
      const supplier = asRecord(workflow.supplier);
      const connectorKey =
        typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
          ? supplier.connectorKey.trim()
          : null;

      if (!connectorKey) {
        throw new BadRequestException("Supplier connector handoff is required before file pickup.");
      }

      const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
      const runtime = this.resolveSupplierConnectorRuntime(connector);
      if (runtime.mode !== "FILE_IMPORT") {
        throw new BadRequestException("This supplier connector does not use file pickup/drop transport.");
      }

      const deliveryArtifact = asRecord(supplier.deliveryArtifact);
      const fileName = typeof deliveryArtifact.fileName === "string" ? deliveryArtifact.fileName : null;
      const contentType =
        typeof deliveryArtifact.contentType === "string" ? deliveryArtifact.contentType : null;
      const content = typeof deliveryArtifact.content === "string" ? deliveryArtifact.content : null;
      if (!fileName || !contentType || !content) {
        throw new BadRequestException("No supplier file artifact is available for pickup.");
      }

      return {
        jobId: current.id,
        connectorKey,
        transportMode: "FILE_IMPORT",
        externalReference:
          typeof supplier.supplierReference === "string" ? supplier.supplierReference : null,
        fileName,
        contentType,
        pickupPath:
          typeof deliveryArtifact.pickupPath === "string" ? deliveryArtifact.pickupPath : null,
        dropPath: typeof deliveryArtifact.dropPath === "string" ? deliveryArtifact.dropPath : null,
        staging: asRecord(deliveryArtifact.staging),
        content
      };
    });
  }

  async dropReplenishmentSupplierFile(
    context: RequestContext,
    id: string,
    input: DropInventoryReplenishmentSupplierFileDto
  ): Promise<InventoryReplenishmentJobDto> {
    const prepared = await this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const artifact = asRecord(current.artifact);
      const workflow = asRecord(artifact.workflow);
      const supplier = asRecord(workflow.supplier);
      const connectorKey =
        typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
          ? supplier.connectorKey.trim()
          : null;

      if (!connectorKey) {
        throw new BadRequestException("Supplier connector handoff is required before file drop.");
      }

      const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
      const runtime = this.resolveSupplierConnectorRuntime(connector);
      if (runtime.mode !== "FILE_IMPORT") {
        throw new BadRequestException("This supplier connector does not use file pickup/drop transport.");
      }

      const deliveryArtifact = asRecord(supplier.deliveryArtifact);
      const fileName =
        input.fileName?.trim() ||
        (typeof deliveryArtifact.fileName === "string" ? deliveryArtifact.fileName : null) ||
        "supplier-drop.json";
      const contentType =
        input.contentType?.trim() ||
        (typeof deliveryArtifact.contentType === "string" ? deliveryArtifact.contentType : null) ||
        (runtime.importFormat === "csv" ? "text/csv" : "application/json");
      const payload =
        input.payload ??
        this.parseSupplierFileDropPayload(
          input.content?.trim() || null,
          contentType,
          runtime.importFormat ?? "json"
        );
      const normalizedPayload = payload ? asRecord(payload) : null;
      const externalReference =
        input.externalReference?.trim() ||
        (typeof normalizedPayload?.externalReference === "string"
          ? String(normalizedPayload.externalReference)
          : null) ||
        (typeof supplier.supplierReference === "string" ? supplier.supplierReference : null);
      const checksum =
        input.checksum?.trim() ||
        (runtime.requireChecksum
          ? createHash("sha256")
              .update(
                input.content?.trim() ||
                  this.buildSupplierImportChecksumPayload({
                    importId: input.importId.trim(),
                    supplierStatus: input.supplierStatus,
                    externalReference,
                    fileName,
                    payload: normalizedPayload
                  })
              )
              .digest("hex")
          : null);
      const staging = buildInventorySupplierProviderStageMetadata({
        connectorKey,
        providerAdapterKey: runtime.providerAdapter?.key ?? null,
        replenishmentJobId: current.id,
        fileName,
        contentType,
        pickupPath:
          typeof deliveryArtifact.pickupPath === "string" ? deliveryArtifact.pickupPath : runtime.pickupPath,
        dropPath:
          typeof deliveryArtifact.dropPath === "string" ? deliveryArtifact.dropPath : runtime.dropPath,
        content:
          input.content?.trim() ||
          JSON.stringify(normalizedPayload ?? {}, null, 2),
        externalReference
      });

      await this.logSupplierConnectorExecutionTx(tx, {
        tenantId: current.tenantId,
        storeId: current.storeId,
        connectorKey,
        action: "replenishment_supplier_file_drop",
        requestPayload: {
          replenishmentJobId: current.id,
          importId: input.importId.trim(),
          fileName,
          contentType,
          providerExecutionPhase: "FILE_DROP"
        },
        responsePayload: {
          externalReference,
          checksumComputed: Boolean(checksum),
          parsedFromContent: Boolean(input.content?.trim()),
          staging,
          providerErrorClass: null,
          retryClass: "NONE",
          providerExecutionPhase: "FILE_DROP"
        },
        status: "COMPLETED",
        errorMessage: null
      });

      return {
        importId: input.importId.trim(),
        supplierStatus: input.supplierStatus,
        externalReference,
        fileName,
        checksum,
        note: input.note ?? null,
        payload: {
          ...(normalizedPayload ?? {}),
          _staging: staging,
          _checksumPayload:
            input.content?.trim() ||
            JSON.stringify(normalizedPayload ?? {}, null, 2)
        }
      } satisfies ImportInventoryReplenishmentSupplierUpdateDto;
    });

    return this.importReplenishmentSupplierUpdate(context, id, prepared);
  }

  replayReplenishmentSupplierReconciliation(
    context: RequestContext,
    id: string,
    input: ReplayInventoryReplenishmentSupplierReconciliationDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const artifact = asRecord(current.artifact);
      const workflow = asRecord(artifact.workflow);
      const supplier = asRecord(workflow.supplier);
      const connectorKey =
        typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
          ? supplier.connectorKey.trim()
          : null;

      if (!connectorKey) {
        throw new BadRequestException("Supplier connector handoff is required before reconciliation replay.");
      }

      const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
      const runtime = this.resolveSupplierConnectorRuntime(connector);
      const requestedSource = input.source?.trim() || null;
      const source =
        requestedSource === "WEBHOOK" || requestedSource === "FILE_IMPORT"
          ? requestedSource
          : runtime.mode === "WEBHOOK"
            ? "WEBHOOK"
            : runtime.mode === "FILE_IMPORT"
              ? "FILE_IMPORT"
              : null;

      if (!source) {
        throw new BadRequestException("Supplier replay is supported only for webhook or file-import connectors.");
      }

      const timestamp = new Date().toISOString();
      const replayId = input.replayId?.trim() || `replay-${randomUUID()}`;
      const replay = asRecord(supplier.replay);
      const replayCount = Math.max(0, toNumber(supplier.replayCount, 0)) + 1;

      if (source === "WEBHOOK") {
        if (runtime.mode !== "WEBHOOK") {
          throw new BadRequestException("Requested replay source does not match supplier transport mode.");
        }
        const callbackDeliveryId =
          typeof supplier.callbackDeliveryId === "string" && supplier.callbackDeliveryId.trim()
            ? supplier.callbackDeliveryId.trim()
            : null;
        if (!callbackDeliveryId) {
          throw new BadRequestException("No processed supplier webhook callback is available for replay.");
        }

        const updated = await tx.inventoryReplenishmentJob.update({
          where: { id },
          data: {
            artifact: this.withReplenishmentWorkflowMetadata(current, {
              supplier: {
                ...supplier,
                pendingCallback: false,
                lastReplayAt: timestamp,
                lastReplaySource: "WEBHOOK",
                replayCount,
                lastStatusNote: input.note ?? supplier.lastStatusNote ?? null,
                replay: {
                  ...replay,
                  operatorReplays: this.appendReplayMarker(
                    replay.operatorReplays,
                    {
                      replayId,
                      source: "WEBHOOK",
                      processedAt: timestamp,
                      deliveryId: callbackDeliveryId
                    },
                    runtime.replayWindowSize
                  )
                },
                reconciliation: {
                  source: "WEBHOOK",
                  status: "REPLAYED",
                  processedAt: timestamp,
                  replayId,
                  deliveryId: callbackDeliveryId
                }
              }
            })
          }
        });

        await this.logSupplierConnectorExecutionTx(tx, {
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: connector.connectorKey,
          action: "replenishment_supplier_webhook_replay",
          requestPayload: {
            replenishmentJobId: current.id,
            replayId,
            callbackDeliveryId,
            note: input.note ?? null
          },
          responsePayload: {
            status: supplier.supplierStatus ?? null,
            replayed: true
          },
          status: "COMPLETED",
          errorMessage: null
        });

        return mapReplenishmentJob(updated);
      }

      if (runtime.mode !== "FILE_IMPORT") {
        throw new BadRequestException("Requested replay source does not match supplier transport mode.");
      }
      const importId =
        typeof supplier.importId === "string" && supplier.importId.trim()
          ? supplier.importId.trim()
          : null;
      if (!importId) {
        throw new BadRequestException("No processed supplier import is available for replay.");
      }

      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            supplier: {
              ...supplier,
              pendingImport: false,
              lastReplayAt: timestamp,
              lastReplaySource: "FILE_IMPORT",
              replayCount,
              lastStatusNote: input.note ?? supplier.lastStatusNote ?? null,
              replay: {
                ...replay,
                operatorReplays: this.appendReplayMarker(
                  replay.operatorReplays,
                  {
                    replayId,
                    source: "FILE_IMPORT",
                    processedAt: timestamp,
                    importId
                  },
                  runtime.replayWindowSize
                )
              },
              reconciliation: {
                source: "FILE_IMPORT",
                status: "REPLAYED",
                processedAt: timestamp,
                replayId,
                importId
              }
            }
          })
        }
      });

      await this.logSupplierConnectorExecutionTx(tx, {
        tenantId: current.tenantId,
        storeId: current.storeId,
        connectorKey: connector.connectorKey,
        action: "replenishment_supplier_file_replay",
        requestPayload: {
          replenishmentJobId: current.id,
          replayId,
          importId,
          note: input.note ?? null
        },
        responsePayload: {
          status: supplier.supplierStatus ?? null,
          replayed: true
        },
        status: "COMPLETED",
        errorMessage: null
      });

      return mapReplenishmentJob(updated);
    });
  }

  reopenReplenishmentSupplierDeadLetter(
    context: RequestContext,
    id: string,
    input: ReopenInventorySupplierDeadLetterDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const supplier = getReplenishmentSupplier(current);
      const isDeadLetter =
        typeof supplier.deadLetterAt === "string" ||
        typeof supplier.deadLetteredAt === "string" ||
        asRecord(supplier.reconciliation).status === "DEAD_LETTER" ||
        asRecord(supplier.reconciliation).status === "DEAD_LETTERED";
      if (!isDeadLetter) {
        throw new BadRequestException("Replenishment job is not in dead-letter state.");
      }

      const updated = await this.queueSupplierRetryTx(tx, current, context, {
        source: input.source ?? undefined,
        note: input.note ?? "Reopened dead-letter supplier artifact.",
        delayMinutes: input.delayMinutes,
        allowTerminalReopen: true,
        code:
          typeof supplier.deadLetterCode === "string"
            ? supplier.deadLetterCode
            : typeof supplier.lastFailureCode === "string"
              ? supplier.lastFailureCode
              : null,
        reason:
          typeof supplier.deadLetterReason === "string"
            ? supplier.deadLetterReason
            : typeof supplier.lastFailureReason === "string"
              ? supplier.lastFailureReason
              : null
      });
      return mapReplenishmentJob(updated);
    });
  }

  queueReplenishmentSupplierRetry(
    context: RequestContext,
    id: string,
    input: QueueInventoryReplenishmentSupplierRetryDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const updated = await this.queueSupplierRetryTx(tx, current, context, input);
      return mapReplenishmentJob(updated);
    });
  }

  queueReplenishmentSupplierRetrySweep(
    context: RequestContext,
    input: QueueInventoryReplenishmentSupplierRetrySweepDto
  ): Promise<InventorySupplierRetrySweepResultDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const storeId = input.storeId?.trim() || null;
      const limit = Math.max(1, Math.min(100, Number(input.limit ?? 25) || 25));
      const candidates = await tx.inventoryReplenishmentJob.findMany({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          status: { in: ["DISPATCHED", "RECEIVING", "RECEIVED"] }
        },
        orderBy: { updatedAt: "desc" },
        take: limit
      });

      const queuedJobIds: string[] = [];
      const skippedJobIds: string[] = [];

      for (const candidate of candidates) {
        try {
          const updated = await this.queueSupplierRetryTx(tx, candidate, context, {
            source: input.source,
            note: input.note ?? "Retry sweep queued reconciliation retry.",
            delayMinutes: input.delayMinutes
          });
          queuedJobIds.push(updated.id);
        } catch {
          skippedJobIds.push(candidate.id);
        }
      }

      return {
        considered: candidates.length,
        queued: queuedJobIds.length,
        skipped: skippedJobIds.length,
        queuedJobIds,
        skippedJobIds
      };
    });
  }

  runDueReplenishmentSupplierRetries(
    context: RequestContext,
    input: RunInventoryReplenishmentSupplierRetrySweepDto
  ): Promise<InventorySupplierRetryRunResultDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const storeId = input.storeId?.trim() || null;
      const limit = Math.max(1, Math.min(100, Number(input.limit ?? 25) || 25));
      const now = new Date();
      const candidates = await tx.inventoryReplenishmentJob.findMany({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          status: { in: ["DISPATCHED", "RECEIVING", "RECEIVED"] }
        },
        orderBy: { updatedAt: "desc" },
        take: limit
      });

      const processedJobIds: string[] = [];
      const skippedJobIds: string[] = [];

      for (const candidate of candidates) {
        try {
          const updated = await this.processDueSupplierRetryTx(tx, candidate, context, now, input);
          if (updated) {
            processedJobIds.push(updated.id);
          } else {
            skippedJobIds.push(candidate.id);
          }
        } catch {
          skippedJobIds.push(candidate.id);
        }
      }

      return {
        considered: candidates.length,
        processed: processedJobIds.length,
        skipped: skippedJobIds.length,
        processedJobIds,
        skippedJobIds
      };
    });
  }

  receiveReplenishmentJob(
    context: RequestContext,
    id: string,
    input: ReceiveInventoryReplenishmentJobDto
  ): Promise<InventoryReplenishmentJobReceiptDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      if (!current.warehouseId) {
        throw new BadRequestException("Replenishment job warehouse is required for receiving.");
      }
      if (!["DISPATCHED", "RECEIVING", "RECEIVED"].includes(current.status)) {
        throw new BadRequestException("Only dispatched replenishment jobs can be received.");
      }

      const artifact = asRecord(current.artifact);
      const workflow = asRecord(artifact.workflow);
      const supplier = asRecord(workflow.supplier);
      if (supplier.supplierStatus === "CANCELLED") {
        throw new BadRequestException("Cancelled supplier handoff cannot be received.");
      }
      const existingReceivingId =
        typeof workflow.receivingRecordId === "string" ? workflow.receivingRecordId : null;
      if (existingReceivingId) {
        const existingReceiving = await this.getReceivingRecordTx(tx, existingReceivingId);
        return {
          job: mapReplenishmentJob(current),
          receiving: existingReceiving
        };
      }

      const rows = this.mapReplenishmentExportRows(current);
      if (!rows.length) {
        throw new BadRequestException("Replenishment job has no rows to receive.");
      }

      const reference = input.reference?.trim() || `REPL-${current.id.slice(0, 8)}`;
      const receivingRecord = await tx.receivingRecord.create({
        data: {
          id: randomUUID(),
          tenantId: current.tenantId,
          warehouseId: current.warehouseId,
          reference,
          status: "OPEN",
          receivedBy: input.receivedBy ?? null,
          metadata: {
            replenishmentJobId: current.id,
            source: "replenishment_job"
          } as Prisma.InputJsonObject
        }
      });

      for (const row of rows) {
        const ingredient = await tx.ingredient.findFirst({
          where: {
            ...this.tenantWhere(current.tenantId),
            code: row.ingredientCode
          }
        });
        if (!ingredient) {
          throw new BadRequestException(`Ingredient ${row.ingredientCode} not found for replenishment receipt.`);
        }

        await tx.receivingLine.create({
          data: {
            id: randomUUID(),
            recordId: receivingRecord.id,
            ingredientId: ingredient.id,
            quantity: row.recommendedOrderQuantity,
            unitCost: row.lastUnitCost ?? null,
            metadata: {
              replenishmentJobId: current.id,
              targetQuantity: row.targetQuantity,
              recommendedOrderQuantity: row.recommendedOrderQuantity
            } as Prisma.InputJsonObject
          }
        });
      }

      const finalizedReceiving =
        input.autoComplete === false
          ? await this.getReceivingRecordTx(tx, receivingRecord.id)
          : await this.completeReceivingRecordTx(tx, receivingRecord.id, input.receivedBy ?? null);

      const timestamp = new Date().toISOString();
      const actorId = this.resolveReplenishmentActorId(context);
      const updatedJob = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          status: input.autoComplete === false ? "RECEIVING" : "RECEIVED",
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            receivingRecordId: finalizedReceiving.id,
            receivingReference: finalizedReceiving.reference,
            receivingStatus: finalizedReceiving.status,
            receivedAt: timestamp,
            receivedByActorId: actorId
          })
        }
      });

      return {
        job: mapReplenishmentJob(updatedJob),
        receiving: finalizedReceiving
      };
    });
  }

  archiveReplenishmentJob(context: RequestContext, id: string): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          status: "ARCHIVED",
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            archivedAt: new Date().toISOString(),
            archivedByActorId: this.resolveReplenishmentActorId(context)
          })
        }
      });
      return mapReplenishmentJob(updated);
    });
  }

  async getLedgerDrilldown(
    context: RequestContext,
    input: { tenantId?: string; warehouseId?: string; ingredientId?: string; limit?: number }
  ): Promise<InventoryLedgerDrilldownDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const limit = Math.min(input.limit ?? 50, 200);
      const where = {
        ...this.tenantWhere(tenantId),
        ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
        ...(input.ingredientId ? { ingredientId: input.ingredientId } : {})
      };
      const entries = (
        await tx.stockLedgerEntry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit
        })
      ).map(mapLedger);

      const byEntryType = entries.reduce<Record<string, { count: number; quantity: number }>>(
        (accumulator, entry) => {
          const bucket = accumulator[entry.entryType] ?? { count: 0, quantity: 0 };
          bucket.count += 1;
          bucket.quantity += entry.quantity;
          accumulator[entry.entryType] = bucket;
          return accumulator;
        },
        {}
      );

      const inboundQuantity = entries
        .filter((entry) => entry.quantity > 0)
        .reduce((sum, entry) => sum + entry.quantity, 0);
      const outboundQuantity = entries
        .filter((entry) => entry.quantity < 0)
        .reduce((sum, entry) => sum + Math.abs(entry.quantity), 0);

      return {
        tenantId,
        filters: {
          warehouseId: input.warehouseId ?? null,
          ingredientId: input.ingredientId ?? null,
          limit
        },
        totals: {
          entryCount: entries.length,
          inboundQuantity,
          outboundQuantity,
          netQuantity: inboundQuantity - outboundQuantity
        },
        byEntryType,
        entries
      };
    });
  }

  listWarehouses(context: RequestContext, tenantId?: string): Promise<InventoryWarehouseDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      (
        await tx.warehouse.findMany({
          where: this.tenantWhere(this.resolveTenantId(context, tenantId)),
          orderBy: { createdAt: "desc" }
        })
      ).map(mapWarehouse)
    );
  }

  createWarehouse(context: RequestContext, dto: CreateWarehouseDto): Promise<InventoryWarehouseDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, dto.tenantId);
      const warehouse = await tx.warehouse.create({
        data: {
          id: randomUUID(),
          tenantId,
          storeId: dto.storeId ?? null,
          code: dto.code.trim(),
          name: dto.name.trim(),
          kind: dto.kind ?? "GENERAL",
          notes: dto.notes ?? null,
          isActive: dto.isActive ?? true,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject
        }
      });
      return mapWarehouse(warehouse);
    });
  }

  updateWarehouse(
    context: RequestContext,
    id: string,
    dto: UpdateWarehouseDto
  ): Promise<InventoryWarehouseDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getWarehouseByIdTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const warehouse = await tx.warehouse.update({
        where: { id },
        data: {
          ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
          ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.kind !== undefined ? { kind: dto.kind.trim() } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.metadata !== undefined
            ? { metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject }
            : {})
        }
      });
      return mapWarehouse(warehouse);
    });
  }

  listIngredients(context: RequestContext, tenantId?: string): Promise<InventoryIngredientDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      (
        await tx.ingredient.findMany({
          where: this.tenantWhere(this.resolveTenantId(context, tenantId)),
          orderBy: { createdAt: "desc" }
        })
      ).map(mapIngredient)
    );
  }

  createIngredient(context: RequestContext, dto: CreateIngredientDto): Promise<InventoryIngredientDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, dto.tenantId);
      const ingredient = await tx.ingredient.create({
        data: {
          id: randomUUID(),
          tenantId,
          code: dto.code.trim(),
          name: dto.name.trim(),
          unit: dto.unit ?? "UNIT",
          lowStockThreshold: dto.lowStockThreshold ?? 0,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject
        }
      });
      return mapIngredient(ingredient);
    });
  }

  updateIngredient(
    context: RequestContext,
    id: string,
    dto: UpdateIngredientDto
  ): Promise<InventoryIngredientDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getIngredientByIdTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const ingredient = await tx.ingredient.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
          ...(dto.lowStockThreshold !== undefined
            ? { lowStockThreshold: dto.lowStockThreshold }
            : {}),
          ...(dto.metadata !== undefined
            ? { metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject }
            : {})
        }
      });
      return mapIngredient(ingredient);
    });
  }

  listItems(context: RequestContext, tenantId?: string): Promise<InventoryItemDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      (
        await tx.inventoryItem.findMany({
          where: this.tenantWhere(this.resolveTenantId(context, tenantId)),
          orderBy: { createdAt: "desc" }
        })
      ).map(mapItem)
    );
  }

  createItem(context: RequestContext, dto: CreateInventoryItemDto): Promise<InventoryItemDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, dto.tenantId);
      const warehouse = await this.getWarehouseByIdTx(tx, dto.warehouseId);
      if (warehouse.tenantId !== tenantId) {
        throw new BadRequestException("Warehouse tenant mismatch.");
      }

      const item = await tx.inventoryItem.create({
        data: {
          id: randomUUID(),
          tenantId,
          warehouseId: dto.warehouseId,
          ingredientId: dto.ingredientId,
          sku: dto.sku ?? null,
          onHand: dto.onHand ?? 0,
          reserved: dto.reserved ?? 0,
          reorderPoint: dto.reorderPoint ?? 0,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject
        }
      });
      return mapItem(item);
    });
  }

  updateItem(context: RequestContext, id: string, dto: UpdateInventoryItemDto): Promise<InventoryItemDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getItemByIdTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const item = await tx.inventoryItem.update({
        where: { id },
        data: {
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.onHand !== undefined ? { onHand: dto.onHand } : {}),
          ...(dto.reserved !== undefined ? { reserved: dto.reserved } : {}),
          ...(dto.reorderPoint !== undefined ? { reorderPoint: dto.reorderPoint } : {}),
          ...(dto.metadata !== undefined
            ? { metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject }
            : {})
        }
      });
      return mapItem(item);
    });
  }

  listRecipeBoms(context: RequestContext, tenantId?: string): Promise<RecipeBomDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      (
        await tx.recipeBom.findMany({
          where: this.tenantWhere(this.resolveTenantId(context, tenantId)),
          orderBy: { createdAt: "desc" }
        })
      ).map(mapBom)
    );
  }

  createRecipeBom(context: RequestContext, dto: CreateRecipeBomDto): Promise<RecipeBomDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, dto.tenantId);
      const bom = await tx.recipeBom.create({
        data: {
          id: randomUUID(),
          tenantId,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          ingredientId: dto.ingredientId,
          quantity: dto.quantity,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject
        }
      });
      return mapBom(bom);
    });
  }

  createReceivingRecord(context: RequestContext, dto: CreateReceivingDto): Promise<ReceivingRecordDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, dto.tenantId);
      const record = await tx.receivingRecord.create({
        data: {
          id: randomUUID(),
          tenantId,
          warehouseId: dto.warehouseId,
          reference: dto.reference.trim(),
          status: "OPEN",
          receivedBy: dto.receivedBy ?? null,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject
        }
      });

      for (const line of dto.lines ?? []) {
        await tx.receivingLine.create({
          data: {
            id: randomUUID(),
            recordId: record.id,
            ingredientId: line.ingredientId,
            quantity: line.quantity,
            unitCost: line.unitCost ?? null,
            metadata: (line.metadata ?? {}) as Prisma.InputJsonObject
          }
        });
      }

      return this.getReceivingRecordTx(tx, record.id);
    });
  }

  completeReceivingRecord(
    context: RequestContext,
    id: string,
    dto: CompleteReceivingDto
  ): Promise<ReceivingRecordDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const record = await this.getReceivingRecordTx(tx, id);
      this.resolveTenantId(context, record.tenantId);
      return this.completeReceivingRecordTx(tx, id, dto.receivedBy ?? null);
    });
  }

  createAdjustment(context: RequestContext, dto: CreateInventoryAdjustmentDto): Promise<InventoryAdjustmentDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, dto.tenantId);
      const current = await this.getOrCreateItemTx(tx, {
        tenantId,
        warehouseId: dto.warehouseId,
        ingredientId: dto.ingredientId
      });
      const delta =
        dto.adjustmentType === "SET"
          ? dto.quantity - current.onHand
          : dto.adjustmentType === "REMOVE"
            ? -Math.abs(dto.quantity)
            : Math.abs(dto.quantity);

      await this.applyStockDeltaTx(tx, {
        tenantId,
        warehouseId: dto.warehouseId,
        ingredientId: dto.ingredientId,
        delta,
        entryType: "ADJUSTMENT",
        sourceType: "manual_adjustment",
        sourceId: randomUUID(),
        metadata: {
          adjustmentType: dto.adjustmentType,
          reason: dto.reason ?? null,
          payload: dto.metadata ?? {}
        }
      });

      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          id: randomUUID(),
          tenantId,
          warehouseId: dto.warehouseId,
          ingredientId: dto.ingredientId,
          adjustmentType: dto.adjustmentType,
          quantity: dto.quantity,
          reason: dto.reason ?? null,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject
        }
      });

      return mapAdjustment(adjustment);
    });
  }

  createReservation(context: RequestContext, dto: CreateStockReservationDto): Promise<StockReservationDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, dto.tenantId);
      const item = await this.getItemByWarehouseIngredientTx(tx, dto.warehouseId, dto.ingredientId);
      if (!item || item.tenantId !== tenantId) {
        throw new NotFoundException("Inventory item not found.");
      }
      if (item.available < dto.quantity) {
        throw new BadRequestException("Not enough available stock to reserve.");
      }

      const reservation = await tx.stockReservation.create({
        data: {
          id: randomUUID(),
          tenantId,
          warehouseId: dto.warehouseId,
          ingredientId: dto.ingredientId,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          quantity: dto.quantity,
          status: "ACTIVE",
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject
        }
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          reserved: item.reserved + dto.quantity
        }
      });

      return mapReservation(reservation);
    });
  }

  releaseReservation(context: RequestContext, reservationId: string): Promise<StockReservationDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const reservation = await this.getReservationTx(tx, reservationId);
      this.resolveTenantId(context, reservation.tenantId);
      if (reservation.status !== "ACTIVE") {
        return reservation;
      }

      const item = await this.getItemByWarehouseIngredientTx(
        tx,
        reservation.warehouseId,
        reservation.ingredientId
      );
      if (!item) {
        throw new NotFoundException("Inventory item not found.");
      }

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          reserved: Math.max(item.reserved - reservation.quantity, 0)
        }
      });

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: {
          status: "RELEASED"
        }
      });

      return this.getReservationTx(tx, reservationId);
    });
  }

  consumeReservation(context: RequestContext, reservationId: string): Promise<StockReservationDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const reservation = await this.getReservationTx(tx, reservationId);
      this.resolveTenantId(context, reservation.tenantId);
      if (reservation.status !== "ACTIVE") {
        return reservation;
      }

      const item = await this.getItemByWarehouseIngredientTx(
        tx,
        reservation.warehouseId,
        reservation.ingredientId
      );
      if (!item) {
        throw new NotFoundException("Inventory item not found.");
      }

      const nextOnHand = Math.max(item.onHand - reservation.quantity, 0);
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          onHand: nextOnHand,
          reserved: Math.max(item.reserved - reservation.quantity, 0)
        }
      });

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: {
          status: "CONSUMED"
        }
      });

      await tx.stockLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId: reservation.tenantId,
          warehouseId: reservation.warehouseId,
          ingredientId: reservation.ingredientId,
          entryType: "CONSUME",
          quantity: -reservation.quantity,
          balanceAfter: nextOnHand,
          sourceType: "reservation",
          sourceId: reservation.id,
          metadata: { reservationId } as Prisma.InputJsonObject
        }
      });

      return this.getReservationTx(tx, reservationId);
    });
  }

  listReservations(context: RequestContext, tenantId?: string): Promise<StockReservationDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      (
        await tx.stockReservation.findMany({
          where: this.tenantWhere(this.resolveTenantId(context, tenantId)),
          orderBy: { createdAt: "desc" }
        })
      ).map(mapReservation)
    );
  }

  listLedgerEntries(context: RequestContext, tenantId?: string): Promise<StockLedgerEntryDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      (
        await tx.stockLedgerEntry.findMany({
          where: this.tenantWhere(this.resolveTenantId(context, tenantId)),
          orderBy: { createdAt: "desc" },
          take: 100
        })
      ).map(mapLedger)
    );
  }

  listStopListRules(context: RequestContext, tenantId?: string): Promise<StopListRuleDto[]> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      (
        await tx.stopListRule.findMany({
          where: this.tenantWhere(this.resolveTenantId(context, tenantId)),
          orderBy: { createdAt: "desc" }
        })
      ).map(mapStopRule)
    );
  }

  createStopListRule(context: RequestContext, dto: CreateStopListRuleDto): Promise<StopListRuleDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, dto.tenantId);
      const rule = await tx.stopListRule.create({
        data: {
          id: randomUUID(),
          tenantId,
          storeId: dto.storeId ?? null,
          warehouseId: dto.warehouseId ?? null,
          ingredientId: dto.ingredientId ?? null,
          sku: dto.sku ?? null,
          ruleType: dto.ruleType,
          threshold: dto.threshold ?? 0,
          isActive: dto.isActive ?? true,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject
        }
      });
      return mapStopRule(rule);
    });
  }

  updateStopListRule(
    context: RequestContext,
    id: string,
    dto: UpdateStopListRuleDto
  ): Promise<StopListRuleDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getStopRuleTx(tx, id);
      this.resolveTenantId(context, current.tenantId);
      const rule = await tx.stopListRule.update({
        where: { id },
        data: {
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.ruleType !== undefined ? { ruleType: dto.ruleType } : {}),
          ...(dto.threshold !== undefined ? { threshold: dto.threshold } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.metadata !== undefined
            ? { metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject }
            : {})
        }
      });
      return mapStopRule(rule);
    });
  }

  async getAvailability(
    context: RequestContext,
    input: { tenantId?: string; productId: string; variantId?: string | null; warehouseId: string }
  ): Promise<InventoryAvailabilityDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.resolveTenantId(context, input.tenantId);
      const variantId = input.variantId ?? null;
      const allRows = await tx.recipeBom.findMany({
        where: {
          ...this.tenantWhere(tenantId),
          productId: input.productId
        },
        orderBy: { createdAt: "desc" }
      });

      const fallbackRows = variantId
        ? allRows.filter((row) => row.variantId === variantId)
        : allRows.filter((row) => row.variantId === null);
      const effectiveRows =
        fallbackRows.length > 0 ? fallbackRows : allRows.filter((row) => row.variantId === null);

      const grouped = new Map<string, { ingredientId: string; quantity: number }>();
      for (const row of effectiveRows) {
        const quantity = toNumber(row.quantity);
        const current = grouped.get(row.ingredientId);
        grouped.set(row.ingredientId, {
          ingredientId: row.ingredientId,
          quantity: (current?.quantity ?? 0) + quantity
        });
      }

      const ingredientBreakdown: InventoryAvailabilityDto["ingredientBreakdown"] = [];
      let availableUnits = grouped.size ? Number.POSITIVE_INFINITY : 0;

      for (const entry of grouped.values()) {
        const [ingredient, item] = await Promise.all([
          tx.ingredient.findUnique({ where: { id: entry.ingredientId } }),
          tx.inventoryItem.findUnique({
            where: {
              warehouseId_ingredientId: {
                warehouseId: input.warehouseId,
                ingredientId: entry.ingredientId
              }
            }
          })
        ]);

        const onHand = item ? toNumber(item.onHand) : 0;
        const reserved = item ? toNumber(item.reserved) : 0;
        const available = onHand - reserved;
        ingredientBreakdown.push({
          ingredientId: entry.ingredientId,
          ingredientCode: ingredient?.code ?? entry.ingredientId,
          requiredQuantity: entry.quantity,
          onHand,
          reserved,
          available
        });
        availableUnits = Math.min(availableUnits, Math.floor(available / entry.quantity));
      }

      return {
        productId: input.productId,
        variantId,
        warehouseId: input.warehouseId,
        ingredientBreakdown,
        availableUnits: Number.isFinite(availableUnits) ? availableUnits : 0
      };
    });
  }

  async buildReservationPlanTx(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      storeId: string;
      items: Array<{
        productId: string;
        variantId: string | null;
        quantity: number;
      }>;
    }
  ): Promise<InventoryReservationPlanEntry[]> {
    if (!input.items.length) {
      return [];
    }

    const warehouses = await tx.warehouse.findMany({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        OR: [{ storeId: input.storeId }, { storeId: null }]
      },
      orderBy: { createdAt: "asc" }
    });
    const warehouse =
      [...warehouses].sort((left, right) => {
        const leftRank = left.storeId === input.storeId ? 0 : 1;
        const rightRank = right.storeId === input.storeId ? 0 : 1;
        return leftRank - rightRank;
      })[0] ?? null;

    if (!warehouse) {
      return [];
    }

    const ingredientTotals = new Map<string, number>();

    for (const item of input.items) {
      const bomRows = await tx.recipeBom.findMany({
        where: {
          tenantId: input.tenantId,
          productId: item.productId
        }
      });

      const variantRows = item.variantId
        ? bomRows.filter((row) => row.variantId === item.variantId)
        : [];
      const fallbackRows = bomRows.filter((row) => row.variantId === null);
      const effectiveRows = variantRows.length > 0 ? variantRows : fallbackRows;

      for (const row of effectiveRows) {
        const requiredQuantity = toNumber(row.quantity) * item.quantity;
        if (requiredQuantity <= 0) {
          continue;
        }
        ingredientTotals.set(
          row.ingredientId,
          (ingredientTotals.get(row.ingredientId) ?? 0) + requiredQuantity
        );
      }
    }

    const stopRules = await tx.stopListRule.findMany({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        ruleType: "LOW_STOCK"
      }
    });

    const reservationPlan: InventoryReservationPlanEntry[] = [];
    for (const [ingredientId, quantity] of ingredientTotals.entries()) {
      const item = await tx.inventoryItem.findUnique({
        where: {
          warehouseId_ingredientId: {
            warehouseId: warehouse.id,
            ingredientId
          }
        }
      });
      const available = toNumber(item?.onHand) - toNumber(item?.reserved);

      const stopThreshold = stopRules.reduce((highest, rule) => {
        const appliesToStore = rule.storeId === null || rule.storeId === input.storeId;
        const appliesToWarehouse = rule.warehouseId === null || rule.warehouseId === warehouse.id;
        const appliesToIngredient = rule.ingredientId === null || rule.ingredientId === ingredientId;
        if (!appliesToStore || !appliesToWarehouse || !appliesToIngredient) {
          return highest;
        }
        return Math.max(highest, toNumber(rule.threshold));
      }, 0);

      if (available < quantity || available <= stopThreshold) {
        throw new BadRequestException("Order cannot be placed because stock is unavailable.");
      }

      reservationPlan.push({
        warehouseId: warehouse.id,
        ingredientId,
        quantity
      });
    }

    return reservationPlan;
  }

  async reserveOrderInventoryTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string,
    reservations: InventoryReservationPlanEntry[]
  ): Promise<void> {
    for (const reservation of reservations) {
      const item = await this.getOrCreateItemTx(tx, {
        tenantId,
        warehouseId: reservation.warehouseId,
        ingredientId: reservation.ingredientId
      });

      await tx.stockReservation.create({
        data: {
          id: randomUUID(),
          tenantId,
          warehouseId: reservation.warehouseId,
          ingredientId: reservation.ingredientId,
          sourceType: "order",
          sourceId: orderId,
          quantity: reservation.quantity,
          status: "ACTIVE",
          metadata: { orderId } as Prisma.InputJsonObject
        }
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          reserved: item.reserved + reservation.quantity
        }
      });
    }
  }

  async releaseOrderInventoryReservationsTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string
  ): Promise<number> {
    const reservations = await tx.stockReservation.findMany({
      where: {
        tenantId,
        sourceType: "order",
        sourceId: orderId,
        status: "ACTIVE"
      }
    });

    for (const reservation of reservations) {
      const item = await this.getItemByWarehouseIngredientTx(
        tx,
        reservation.warehouseId,
        reservation.ingredientId
      );
      if (!item) {
        continue;
      }

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          reserved: Math.max(item.reserved - toNumber(reservation.quantity), 0)
        }
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: "RELEASED"
        }
      });
    }

    return reservations.length;
  }

  async consumeOrderInventoryReservationsTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string
  ): Promise<number> {
    const reservations = await tx.stockReservation.findMany({
      where: {
        tenantId,
        sourceType: "order",
        sourceId: orderId,
        status: "ACTIVE"
      }
    });

    for (const reservation of reservations) {
      const quantity = toNumber(reservation.quantity);
      const item = await this.getItemByWarehouseIngredientTx(
        tx,
        reservation.warehouseId,
        reservation.ingredientId
      );
      if (!item) {
        continue;
      }

      const nextOnHand = Math.max(item.onHand - quantity, 0);
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          onHand: nextOnHand,
          reserved: Math.max(item.reserved - quantity, 0)
        }
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: "CONSUMED"
        }
      });
      await tx.stockLedgerEntry.create({
        data: {
          id: randomUUID(),
          tenantId,
          warehouseId: reservation.warehouseId,
          ingredientId: reservation.ingredientId,
          entryType: "CONSUME",
          quantity: -quantity,
          balanceAfter: nextOnHand,
          sourceType: "reservation",
          sourceId: reservation.id,
          metadata: { orderId, reservationId: reservation.id } as Prisma.InputJsonObject
        }
      });
    }

    return reservations.length;
  }

  async getWarehouseById(context: RequestContext, id: string): Promise<InventoryWarehouseDto> {
    return this.dbContext.withRequestContext(context, async (tx) => this.getWarehouseByIdTx(tx, id));
  }

  async getIngredientById(context: RequestContext, id: string): Promise<InventoryIngredientDto> {
    return this.dbContext.withRequestContext(context, async (tx) => this.getIngredientByIdTx(tx, id));
  }

  async getItemById(context: RequestContext, id: string): Promise<InventoryItemDto> {
    return this.dbContext.withRequestContext(context, async (tx) => this.getItemByIdTx(tx, id));
  }

  async getReceivingRecord(context: RequestContext, id: string): Promise<ReceivingRecordDto> {
    return this.dbContext.withRequestContext(context, async (tx) => this.getReceivingRecordTx(tx, id));
  }

  async getReservation(context: RequestContext, id: string): Promise<StockReservationDto> {
    return this.dbContext.withRequestContext(context, async (tx) => this.getReservationTx(tx, id));
  }

  private async computeReplenishmentReportTx(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    input: { tenantId?: string; storeId?: string; warehouseId?: string }
  ): Promise<InventoryReplenishmentReportDto> {
    const tenantId = this.resolveTenantId(context, input.tenantId);
    const itemWhere = {
      ...this.tenantWhere(tenantId),
      ...(input.warehouseId ? { warehouseId: input.warehouseId } : {})
    };

    const [warehouses, ingredients, items, stopListRules, receivingRecords, receivingLines] =
      await Promise.all([
        tx.warehouse.findMany({ where: this.tenantWhere(tenantId) }),
        tx.ingredient.findMany({ where: this.tenantWhere(tenantId) }),
        tx.inventoryItem.findMany({ where: itemWhere, orderBy: { createdAt: "desc" } }),
        tx.stopListRule.findMany({
          where: {
            ...this.tenantWhere(tenantId),
            isActive: true,
            ...(input.storeId ? { storeId: input.storeId } : {})
          }
        }),
        tx.receivingRecord.findMany({
          where: {
            ...this.tenantWhere(tenantId),
            status: "COMPLETED"
          },
          orderBy: { completedAt: "desc" }
        }),
        tx.receivingLine.findMany({
          orderBy: { createdAt: "desc" }
        })
      ]);

    const warehouseMap = new Map(warehouses.map((item) => [item.id, item]));
    const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));
    const receivingRecordMap = new Map(receivingRecords.map((item) => [item.id, item]));

    const recommendations = items
      .map((item) => mapItem(item))
      .map((item) => {
        const ingredient = ingredientMap.get(item.ingredientId);
        const warehouse = warehouseMap.get(item.warehouseId);
        if (!ingredient || !warehouse) {
          return null;
        }

        const lowStockThreshold = toNumber(ingredient.lowStockThreshold);
        const targetQuantity = Math.max(item.reorderPoint, lowStockThreshold);
        const recommendedOrderQuantity = Math.max(targetQuantity - item.available, 0);
        if (recommendedOrderQuantity <= 0) {
          return null;
        }

        const applicableStopRules = stopListRules.filter((rule) => {
          const sameWarehouse = !rule.warehouseId || rule.warehouseId === item.warehouseId;
          const sameIngredient = !rule.ingredientId || rule.ingredientId === item.ingredientId;
          const sameSku = !rule.sku || rule.sku === item.sku;
          return sameWarehouse && sameIngredient && sameSku;
        });

        const lastReceivingLine = receivingLines.find((line) => {
          const record = receivingRecordMap.get(line.recordId);
          return (
            line.ingredientId === item.ingredientId &&
            record?.warehouseId === item.warehouseId &&
            record?.status === "COMPLETED"
          );
        });
        const lastReceivingRecord = lastReceivingLine
          ? receivingRecordMap.get(lastReceivingLine.recordId)
          : null;

        return {
          warehouseId: warehouse.id,
          warehouseCode: warehouse.code,
          warehouseName: warehouse.name,
          ingredientId: ingredient.id,
          ingredientCode: ingredient.code,
          ingredientName: ingredient.name,
          sku: item.sku,
          onHand: item.onHand,
          reserved: item.reserved,
          available: item.available,
          reorderPoint: item.reorderPoint,
          lowStockThreshold,
          targetQuantity,
          recommendedOrderQuantity,
          activeStopListRuleCount: applicableStopRules.length,
          lastCompletedReceivingAt: toIsoNullable(lastReceivingRecord?.completedAt),
          lastUnitCost: lastReceivingLine?.unitCost?.toString() ?? null
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => right.recommendedOrderQuantity - left.recommendedOrderQuantity);

    return {
      tenantId,
      storeId: input.storeId ?? null,
      warehouseId: input.warehouseId ?? null,
      generatedAt: new Date().toISOString(),
      summary: {
        recommendationCount: recommendations.length,
        totalRecommendedOrderQuantity: recommendations.reduce(
          (sum, item) => sum + item.recommendedOrderQuantity,
          0
        ),
        blockedByStopListCount: recommendations.filter((item) => item.activeStopListRuleCount > 0).length
      },
      recommendations
    };
  }

  private async transitionReplenishmentJobStatus(
    context: RequestContext,
    id: string,
    nextStatus: "APPROVED" | "DISPATCHED"
  ): Promise<InventoryReplenishmentJobDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.getReplenishmentJobModelTx(tx, id);
      this.resolveTenantId(context, current.tenantId);

      if (nextStatus === "APPROVED" && current.status !== "GENERATED") {
        throw new BadRequestException("Only generated replenishment jobs can be approved.");
      }
      if (nextStatus === "DISPATCHED" && current.status !== "APPROVED") {
        throw new BadRequestException("Only approved replenishment jobs can be dispatched.");
      }

      const timestamp = new Date().toISOString();
      const actorId = this.resolveReplenishmentActorId(context);
      const updated = await tx.inventoryReplenishmentJob.update({
        where: { id },
        data: {
          status: nextStatus,
          artifact: this.withReplenishmentWorkflowMetadata(
            current,
            nextStatus === "APPROVED"
              ? {
                  approvedAt: timestamp,
                  approvedByActorId: actorId
                }
              : {
                  dispatchedAt: timestamp,
                  dispatchedByActorId: actorId
                }
          )
        }
      });

      return mapReplenishmentJob(updated);
    });
  }

  private resolveTenantId(context: RequestContext, tenantId?: string): string {
    if (context.scope === "platform_admin") {
      return tenantId ?? "";
    }
    if (!context.tenantId) {
      throw new BadRequestException("Tenant context is required.");
    }
    if (tenantId && tenantId !== context.tenantId) {
      throw new BadRequestException("Cross-tenant inventory access is not allowed.");
    }
    return context.tenantId;
  }

  private tenantWhere(tenantId: string): { tenantId?: string } {
    return tenantId ? { tenantId } : {};
  }

  private resolveReplenishmentActorId(context: RequestContext): string | null {
    return context.scope === "device" ? context.deviceId ?? null : context.userId ?? null;
  }

  private async requireSupplierConnectorTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    connectorKey: string
  ) {
    const connector = await tx.integrationRegistryEntry.findFirst({
      where: {
        connectorKey,
        status: "ACTIVE",
        OR: [{ tenantId }, { tenantId: null }]
      },
      orderBy: { createdAt: "desc" }
    });
    if (!connector) {
      throw new BadRequestException("Active supplier connector was not found in integration registry.");
    }
    return connector;
  }

  private mapSupplierConnectorActivation(
    connector: {
      tenantId: string | null;
      connectorKey: string;
      version: string;
    },
    tenantId: string,
    activation:
      | {
          id: string;
          publicationId: string | null;
          status: string;
          approvedAt: Date | null;
          appliedAt: Date | null;
          revokedAt: Date | null;
        }
      | null
  ): InventorySupplierConnectorDto["activation"] {
    const tenantScoped = Boolean(connector.tenantId && connector.tenantId === tenantId);
    if (!tenantScoped) {
      return {
        required: false,
        implicit: true,
        status: "IMPLICIT",
        requestId: activation?.id ?? null,
        publicationId: activation?.publicationId ?? null,
        approvedAt: activation?.approvedAt?.toISOString() ?? null,
        appliedAt: activation?.appliedAt?.toISOString() ?? null,
        revokedAt: activation?.revokedAt?.toISOString() ?? null,
        reason: "Global/system connector remains implicitly active."
      };
    }

    if (!activation) {
      return {
        required: true,
        implicit: false,
        status: "MISSING",
        requestId: null,
        publicationId: null,
        approvedAt: null,
        appliedAt: null,
        revokedAt: null,
        reason: "Tenant-scoped supplier connector requires enterprise activation."
      };
    }

    return {
      required: true,
      implicit: false,
      status: String(activation.status),
      requestId: activation.id,
      publicationId: activation.publicationId,
      approvedAt: activation.approvedAt?.toISOString() ?? null,
      appliedAt: activation.appliedAt?.toISOString() ?? null,
      revokedAt: activation.revokedAt?.toISOString() ?? null,
      reason:
        String(activation.status).toUpperCase() === "APPLIED"
          ? "Tenant-scoped connector activation is applied."
          : `Tenant-scoped connector activation is ${String(activation.status).toLowerCase()}.`
    };
  }

  private async listLatestSupplierConnectorActivationsTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    connectors: Array<{
      connectorKey: string;
      version: string;
      tenantId: string | null;
    }>
  ) {
    const tenantScoped = connectors.filter((item) => item.tenantId && item.tenantId === tenantId);
    if (!tenantScoped.length) {
      return new Map<
        string,
        {
          id: string;
          publicationId: string | null;
          status: string;
          approvedAt: Date | null;
          appliedAt: Date | null;
          revokedAt: Date | null;
        }
      >();
    }
    const rows = await tx.integrationActivationRequest.findMany({
      where: {
        tenantId,
        targetKind: "SUPPLIER_CONNECTOR",
        OR: tenantScoped.map((item) => ({
          connectorKey: item.connectorKey,
          version: item.version
        }))
      },
      orderBy: { updatedAt: "desc" }
    });
    const latest = new Map<
      string,
      {
        id: string;
        publicationId: string | null;
        status: string;
        approvedAt: Date | null;
        appliedAt: Date | null;
        revokedAt: Date | null;
      }
    >();
    for (const row of rows) {
      const key = `${row.connectorKey}::${row.version}`;
      if (!latest.has(key)) {
        latest.set(key, {
          id: row.id,
          publicationId: row.publicationId,
          status: row.status,
          approvedAt: row.approvedAt,
          appliedAt: row.appliedAt,
          revokedAt: row.revokedAt
        });
      }
    }
    return latest;
  }

  private async buildSupplierExecutionReadinessSnapshotTx(
    tx: Prisma.TransactionClient,
    current: InventoryReplenishmentJobModel,
    connector: {
      id: string;
      tenantId: string | null;
      organizationId: string | null;
      connectorKey: string;
      version: string;
      status: string;
      manifest: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    }
  ): Promise<InventorySupplierExecutionReadinessDto> {
    const activationMap = await this.listLatestSupplierConnectorActivationsTx(tx, current.tenantId, [
      {
        connectorKey: connector.connectorKey,
        version: connector.version,
        tenantId: connector.tenantId
      }
    ]);
    const activation = activationMap.get(`${connector.connectorKey}::${connector.version}`) ?? null;
    const readiness = await this.evaluateSupplierConnectorReadinessTx(tx, current.tenantId, connector, activation);
    const runtime = this.resolveSupplierConnectorRuntime(connector);
    const manifest = asRecord(connector.manifest);
    const enterpriseRollout = asRecord(manifest.enterpriseRollout);
    const executionPolicyRecord = asRecord(enterpriseRollout.executionPolicy);
    const supplier = getReplenishmentSupplier(current);
    const blockingIssues = readiness.checks
      .filter((item) => item.status === "BLOCKED")
      .map((item) => item.message);
    const warnings = readiness.checks.filter((item) => item.status === "WARN").map((item) => item.message);
    const checks: InventorySupplierExecutionReadinessDto["checks"] = readiness.checks.map((item) => ({
      code: item.code,
      status: item.status,
      message: item.message
    }));
    const addCheck = (
      code: string,
      status: "READY" | "WARN" | "BLOCKED" | "SUSPENDED",
      message: string
    ) => {
      checks.push({ code, status, message });
      if (status === "BLOCKED" || status === "SUSPENDED") {
        blockingIssues.push(message);
      } else if (status === "WARN") {
        warnings.push(message);
      }
    };

    const executionPolicyStatus =
      normalizeExecutionPolicyStatus(
        executionPolicyRecord.state ??
          executionPolicyRecord.status ??
          executionPolicyRecord.executionStatus ??
          enterpriseRollout.executionPolicyStatus
      ) ?? null;
    const runtimeStatus =
      typeof connector.status === "string" && connector.status.trim() ? connector.status.trim().toUpperCase() : null;
    const requiredSecrets = new Set<string>();
    if (runtime.mode === "HTTP_PUSH" && runtime.auth?.secretKey) {
      requiredSecrets.add(runtime.auth.secretKey);
    }
    if (runtime.mode === "WEBHOOK" && runtime.secretKey) {
      requiredSecrets.add(runtime.secretKey);
    }
    const secretResolution = asRecord(executionPolicyRecord.secretResolution);
    if (Array.isArray(executionPolicyRecord.requiredSecrets)) {
      for (const key of executionPolicyRecord.requiredSecrets) {
        if (typeof key === "string" && key.trim()) {
          requiredSecrets.add(key.trim());
        }
      }
    }
    if (Array.isArray(secretResolution.requiredSecrets)) {
      for (const key of secretResolution.requiredSecrets) {
        if (typeof key === "string" && key.trim()) {
          requiredSecrets.add(key.trim());
        }
      }
    }
    const resolvedSecrets: string[] = [];
    const missingSecrets: string[] = [];
    for (const key of requiredSecrets) {
      const secret = await this.resolveSupplierConnectorSecretTx(tx, current.tenantId, key);
      if (secret) {
        resolvedSecrets.push(key);
      } else {
        missingSecrets.push(key);
      }
    }
    if (missingSecrets.length) {
      addCheck(
        "EXECUTION_POLICY_MISSING_SECRETS",
        "BLOCKED",
        `Runtime is missing required secrets: ${missingSecrets.join(", ")}.`
      );
    } else if (requiredSecrets.size) {
      addCheck("EXECUTION_POLICY_SECRETS_READY", "READY", "Required runtime secrets are resolved.");
    }

    const publicationLifecycle =
      asRecord(executionPolicyRecord.publicationLifecycle).actionRequired !== undefined
        ? asRecord(executionPolicyRecord.publicationLifecycle)
        : asRecord(asRecord(executionPolicyRecord.runtimeRollout).publicationLifecycle);
    if (publicationLifecycle.actionRequired === true) {
      addCheck(
        "EXECUTION_POLICY_PUBLICATION_BLOCKED",
        "BLOCKED",
        "Source publication lifecycle no longer allows external provider execution."
      );
    }

    const governanceStatus =
      typeof executionPolicyRecord.governanceStatus === "string" && executionPolicyRecord.governanceStatus.trim()
        ? executionPolicyRecord.governanceStatus.trim().toUpperCase()
        : typeof readiness.installation?.governanceStatus === "string" && readiness.installation.governanceStatus.trim()
          ? readiness.installation.governanceStatus.trim().toUpperCase()
          : null;
    if (governanceStatus === "BLOCKED") {
      addCheck(
        "EXECUTION_POLICY_GOVERNANCE_BLOCKED",
        "BLOCKED",
        typeof executionPolicyRecord.governanceReason === "string" && executionPolicyRecord.governanceReason.trim()
          ? executionPolicyRecord.governanceReason.trim()
          : "Runtime rollout governance is blocked."
      );
    } else if (governanceStatus === "WARN") {
      addCheck(
        "EXECUTION_POLICY_GOVERNANCE_WARN",
        "WARN",
        typeof executionPolicyRecord.governanceReason === "string" && executionPolicyRecord.governanceReason.trim()
          ? executionPolicyRecord.governanceReason.trim()
          : "Runtime rollout governance should be reviewed."
      );
    }

    const driftStatus =
      typeof executionPolicyRecord.driftStatus === "string" && executionPolicyRecord.driftStatus.trim()
        ? executionPolicyRecord.driftStatus.trim().toUpperCase()
        : typeof readiness.installation?.driftStatus === "string" && readiness.installation.driftStatus.trim()
          ? readiness.installation.driftStatus.trim().toUpperCase()
          : null;
    if (driftStatus === "DRIFTED") {
      addCheck(
        "EXECUTION_POLICY_SOURCE_DRIFTED",
        "BLOCKED",
        "Installed runtime source digest has drifted from the current source artifact."
      );
    }

    const deployment = asRecord(executionPolicyRecord.deployment);
    const environmentGate =
      typeof executionPolicyRecord.environmentGate === "string" && executionPolicyRecord.environmentGate.trim()
        ? executionPolicyRecord.environmentGate.trim()
        : typeof deployment.status === "string" && deployment.status.trim()
          ? deployment.status.trim()
        : null;
    if (environmentGate && environmentGate.toUpperCase() !== "READY") {
      addCheck(
        "EXECUTION_POLICY_ENVIRONMENT_GATE",
        "BLOCKED",
        `Runtime environment gate is '${environmentGate}'.`
      );
    }

    if (runtimeStatus && runtimeStatus !== "ACTIVE") {
      const suspended = runtimeStatus === "SUSPENDED";
      addCheck(
        suspended ? "RUNTIME_SUSPENDED" : "RUNTIME_NOT_ACTIVE",
        suspended ? "SUSPENDED" : "BLOCKED",
        `Installed runtime connector status is ${runtimeStatus}.`
      );
    }

    if (executionPolicyStatus === "SUSPENDED") {
      addCheck(
        "EXECUTION_POLICY_SUSPENDED",
        "SUSPENDED",
        typeof executionPolicyRecord.reason === "string" && executionPolicyRecord.reason.trim()
          ? executionPolicyRecord.reason.trim()
          : "Enterprise execution policy has suspended this runtime."
      );
    } else if (executionPolicyStatus === "BLOCKED") {
      addCheck(
        "EXECUTION_POLICY_BLOCKED",
        "BLOCKED",
        typeof executionPolicyRecord.reason === "string" && executionPolicyRecord.reason.trim()
          ? executionPolicyRecord.reason.trim()
          : "Enterprise execution policy blocks this runtime."
      );
    } else if (executionPolicyStatus === "WARN") {
      addCheck(
        "EXECUTION_POLICY_WARN",
        "WARN",
        typeof executionPolicyRecord.reason === "string" && executionPolicyRecord.reason.trim()
          ? executionPolicyRecord.reason.trim()
          : "Enterprise execution policy requires review before execution."
      );
    } else if (executionPolicyStatus === "READY") {
      addCheck("EXECUTION_POLICY_READY", "READY", "Enterprise execution policy allows runtime execution.");
    } else if (runtime.mode !== "SIMULATED" && readiness.providerPolicyKey) {
      addCheck(
        "EXECUTION_POLICY_MISSING",
        "WARN",
        "Enterprise execution policy snapshot is missing for this provider runtime."
      );
    }

    const status =
      checks.some((item) => item.status === "SUSPENDED")
        ? "SUSPENDED"
        : checks.some((item) => item.status === "BLOCKED")
          ? "BLOCKED"
          : checks.some((item) => item.status === "WARN")
            ? "WARN"
            : "READY";
    const explicitExecutable =
      typeof executionPolicyRecord.executable === "boolean" ? executionPolicyRecord.executable : null;
    const activationStatus =
      typeof readiness.activation?.status === "string" ? readiness.activation.status.trim().toUpperCase() : null;
    const provisionalExecutionAllowed =
      runtime.mode !== "SIMULATED" &&
      executionPolicyStatus === null &&
      status === "WARN" &&
      (activationStatus === "APPLIED" || activationStatus === "IMPLICIT");
    const canExecute =
      runtime.mode === "SIMULATED"
        ? true
        : explicitExecutable !== null
          ? explicitExecutable && status !== "BLOCKED" && status !== "SUSPENDED"
          : status === "READY" || provisionalExecutionAllowed;

    const executionPolicy = {
      status: executionPolicyStatus,
      executable: explicitExecutable,
      reason:
        typeof executionPolicyRecord.reason === "string" && executionPolicyRecord.reason.trim()
          ? executionPolicyRecord.reason.trim()
          : null,
      governanceStatus,
      governanceReason:
        typeof executionPolicyRecord.governanceReason === "string" && executionPolicyRecord.governanceReason.trim()
          ? executionPolicyRecord.governanceReason.trim()
          : readiness.installation?.governanceReason ?? null,
      driftStatus,
      sourceDigestCurrent:
        typeof executionPolicyRecord.sourceDigestCurrent === "string" ? executionPolicyRecord.sourceDigestCurrent : null,
      sourceDigestInstalled:
        typeof executionPolicyRecord.sourceDigestInstalled === "string"
          ? executionPolicyRecord.sourceDigestInstalled
          : null,
      requiredSecrets: [...requiredSecrets],
      resolvedSecrets,
      missingSecrets,
      environmentGate,
      publicationLifecycle,
      lastEvaluatedAt:
        typeof executionPolicyRecord.lastEvaluatedAt === "string"
          ? executionPolicyRecord.lastEvaluatedAt
          : typeof executionPolicyRecord.evaluatedAt === "string"
            ? executionPolicyRecord.evaluatedAt
            : null,
      suspendedAt:
        typeof executionPolicyRecord.suspendedAt === "string" ? executionPolicyRecord.suspendedAt : null,
      blockedAt:
        typeof executionPolicyRecord.blockedAt === "string" ? executionPolicyRecord.blockedAt : null
    };

    return {
      jobId: current.id,
      tenantId: current.tenantId,
      storeId: current.storeId,
      connectorKey: connector.connectorKey,
      transportMode: runtime.mode,
      status,
      canExecute,
      providerAdapterKey: runtime.providerAdapter?.key ?? readiness.providerAdapterKey ?? null,
      providerAdapterName: runtime.providerAdapter?.name ?? readiness.providerAdapterName ?? null,
      providerProfileKey: runtime.providerProfile?.key ?? readiness.providerProfileKey ?? null,
      providerPolicyKey: readiness.providerPolicyKey ?? null,
      providerPolicy: readiness.providerPolicy ?? null,
      providerCompatibility: {
        status: readiness.providerPolicySummary?.status ?? readiness.status,
        checks: readiness.checks,
        reason: readiness.reason
      },
      executionPolicy,
      blockingIssues: [...new Set(blockingIssues)],
      warnings: [...new Set(warnings)],
      checks,
      failure: {
        providerErrorClass:
          normalizeProviderErrorClass(supplier.providerErrorClass ?? supplier.lastProviderErrorClass) ?? null,
        retryClass: normalizeProviderRetryClass(supplier.retryClass ?? supplier.lastRetryClass) ?? null,
        providerExecutionPhase:
          normalizeProviderExecutionPhase(
            supplier.providerExecutionPhase ?? supplier.lastProviderExecutionPhase
          ) ?? null,
        deadLetterReasonCode:
          typeof supplier.deadLetterCode === "string"
            ? supplier.deadLetterCode
            : typeof supplier.lastFailureCode === "string"
              ? supplier.lastFailureCode
              : null
      },
      staging: asRecord(asRecord(supplier.deliveryArtifact).staging)
    };
  }

  private async evaluateSupplierConnectorReadinessTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    connector: {
      id: string;
      tenantId: string | null;
      organizationId: string | null;
      connectorKey: string;
      version: string;
      status: string;
      manifest: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    },
    activation:
      | {
          id: string;
          publicationId: string | null;
          status: string;
          approvedAt: Date | null;
          appliedAt: Date | null;
          revokedAt: Date | null;
        }
      | null = null
  ): Promise<InventorySupplierConnectorReadinessDto["items"][number]> {
    const manifest = asRecord(connector.manifest);
    const runtimeRecord = asRecord(manifest.runtime);
    const transport = asRecord(runtimeRecord.transport);
    const provider = asRecord(manifest.provider);
    const explicitAdapterKey =
      typeof (transport.providerAdapter ?? runtimeRecord.providerAdapter ?? provider.adapter ?? manifest.providerAdapter) ===
        "string" &&
      String(transport.providerAdapter ?? runtimeRecord.providerAdapter ?? provider.adapter ?? manifest.providerAdapter).trim()
        ? String(
            transport.providerAdapter ?? runtimeRecord.providerAdapter ?? provider.adapter ?? manifest.providerAdapter
          ).trim()
        : null;
    const explicitProfileKey =
      typeof (transport.providerProfile ?? runtimeRecord.providerProfile ?? provider.profile ?? manifest.providerProfile) ===
        "string" &&
      String(transport.providerProfile ?? runtimeRecord.providerProfile ?? provider.profile ?? manifest.providerProfile).trim()
        ? String(
            transport.providerProfile ?? runtimeRecord.providerProfile ?? provider.profile ?? manifest.providerProfile
          ).trim()
        : null;
    const runtime = this.resolveSupplierConnectorRuntime(connector);
    const checks: InventorySupplierConnectorReadinessDto["items"][number]["checks"] = [];
    const onboarding = {
      endpointRequired: runtime.mode === "HTTP_PUSH",
      endpointConfigured: Boolean(runtime.endpoint),
      authSecretRequired: runtime.mode === "HTTP_PUSH" && Boolean(runtime.auth),
      authSecretKeyRef: runtime.mode === "HTTP_PUSH" ? runtime.auth?.secretKey ?? null : null,
      authSecretResolved: false,
      callbackPathRequired: runtime.mode === "WEBHOOK",
      callbackPathConfigured: Boolean(runtime.callbackPath),
      signatureSecretRequired: runtime.mode === "WEBHOOK" && runtime.requireSignature,
      signatureSecretKeyRef: runtime.mode === "WEBHOOK" ? runtime.secretKey ?? null : null,
      signatureSecretResolved: false,
      importPathsRequired: runtime.mode === "FILE_IMPORT",
      pickupPathConfigured: Boolean(runtime.pickupPath),
      dropPathConfigured: Boolean(runtime.dropPath)
    };

    const addCheck = (
      code: string,
      status: "BLOCKED" | "WARN",
      message: string
    ) => checks.push({ code, status, message });

    if (explicitAdapterKey && !runtime.providerAdapter) {
      addCheck("PROVIDER_ADAPTER_UNKNOWN", "BLOCKED", `Provider adapter '${explicitAdapterKey}' is not registered.`);
    } else if (!runtime.providerAdapter && runtime.mode !== "SIMULATED") {
      addCheck("PROVIDER_ADAPTER_MISSING", "WARN", "Connector has no provider adapter declaration.");
    }

    if (explicitProfileKey && !runtime.providerProfile) {
      addCheck("PROVIDER_PROFILE_UNKNOWN", "BLOCKED", `Provider profile '${explicitProfileKey}' is not registered.`);
    } else if (!runtime.providerProfile && runtime.mode !== "SIMULATED") {
      addCheck("PROVIDER_PROFILE_MISSING", "WARN", "Connector has no provider profile declaration.");
    }

    if (runtime.mode === "HTTP_PUSH") {
      if (!runtime.endpoint) {
        addCheck("HTTP_PUSH_ENDPOINT_MISSING", "BLOCKED", "HTTP push connector requires endpoint.");
      }
      if (runtime.auth && !runtime.auth.secretKey) {
        addCheck("HTTP_PUSH_AUTH_SECRET_REF_MISSING", "BLOCKED", "HTTP push auth requires secretKey reference.");
      }
      if (runtime.auth?.secretKey) {
        onboarding.authSecretResolved = Boolean(
          await this.resolveSupplierConnectorSecretTx(tx, tenantId, runtime.auth.secretKey)
        );
        if (!onboarding.authSecretResolved) {
          addCheck(
            "HTTP_PUSH_AUTH_SECRET_NOT_FOUND",
            "BLOCKED",
            `HTTP push auth secret '${runtime.auth.secretKey}' was not found.`
          );
        }
      }
    }

    if (runtime.mode === "WEBHOOK") {
      if (!runtime.callbackPath) {
        addCheck("WEBHOOK_CALLBACK_PATH_MISSING", "BLOCKED", "Webhook connector requires callbackPath.");
      }
      if (runtime.requireSignature && !runtime.secretKey) {
        addCheck("WEBHOOK_SIGNATURE_SECRET_REF_MISSING", "BLOCKED", "Signed webhook connector requires secretKey.");
      }
      if (runtime.secretKey) {
        onboarding.signatureSecretResolved = Boolean(
          await this.resolveSupplierConnectorSecretTx(tx, tenantId, runtime.secretKey)
        );
        if (runtime.requireSignature && !onboarding.signatureSecretResolved) {
          addCheck(
            "WEBHOOK_SIGNATURE_SECRET_NOT_FOUND",
            "BLOCKED",
            `Webhook signature secret '${runtime.secretKey}' was not found.`
          );
        }
      }
    }

    if (runtime.mode === "FILE_IMPORT") {
      if (!runtime.pickupPath || !runtime.dropPath) {
        addCheck("FILE_IMPORT_PATHS_MISSING", "BLOCKED", "File import connector requires pickupPath and dropPath.");
      }
    }

    const activationState = this.mapSupplierConnectorActivation(connector, tenantId, activation);
    const installation = mapSupplierConnector(connector, activationState).installation;
    const providerCompatibility = evaluateInventorySupplierProviderRuntimeCompatibility({
      enforcementMode: "WARN_ONLY",
      providerAdapterKey: runtime.providerAdapter?.key ?? explicitAdapterKey,
      providerProfileKey: runtime.providerProfile?.key ?? explicitProfileKey,
      connectorTenantId: connector.tenantId,
      activationStatus: activationState?.status ?? null,
      publicationId: activationState?.publicationId ?? null,
      installationSource: installation?.source ?? null,
      installationPublicationId: installation?.publicationId ?? null,
      installationGovernanceStatus: installation?.governanceStatus ?? null,
      installationDriftStatus: installation?.driftStatus ?? null
    });
    for (const compatibilityCheck of providerCompatibility.checks) {
      if (compatibilityCheck.status !== "READY") {
        addCheck(compatibilityCheck.code, compatibilityCheck.status, compatibilityCheck.message);
      }
    }
    if (activationState?.required && activationState.status !== "APPLIED") {
      addCheck(
        "ACTIVATION_NOT_APPLIED",
        "BLOCKED",
        activationState.reason ?? "Tenant-scoped supplier connector activation is not applied."
      );
    }
    if (installation?.governanceStatus && installation.governanceStatus.toUpperCase() === "BLOCKED") {
      addCheck(
        "ROLLOUT_GOVERNANCE_BLOCKED",
        "BLOCKED",
        installation.governanceReason ?? "Installed runtime rollout governance is blocked."
      );
    } else if (installation?.driftStatus && installation.driftStatus.toUpperCase() === "DRIFTED") {
      addCheck(
        "ROLLOUT_SOURCE_DRIFTED",
        "WARN",
        installation.governanceReason ?? "Installed runtime has drifted from its current source artifact."
      );
    }

    const status = checks.some((item) => item.status === "BLOCKED")
      ? "BLOCKED"
      : checks.some((item) => item.status === "WARN")
        ? "WARN"
        : "READY";
    const reason = checks[0]?.message ?? "Connector is ready for supplier onboarding.";
    return {
      connectorKey: connector.connectorKey,
      version: connector.version,
      status,
      transportMode: runtime.mode,
      providerAdapterKey: runtime.providerAdapter?.key ?? explicitAdapterKey,
      providerAdapterName: runtime.providerAdapter?.name ?? null,
      providerAdapterVersion: runtime.providerAdapter?.version ?? null,
      providerAdapterVisibility: runtime.providerAdapter?.visibility ?? null,
      providerAdapterDefaultPolicyVisible: runtime.providerAdapter?.defaultPolicyVisible ?? null,
      providerAdapter:
        runtime.providerAdapter
          ? {
              key: runtime.providerAdapter.key,
              name: runtime.providerAdapter.name,
              version: runtime.providerAdapter.version,
              visibility: runtime.providerAdapter.visibility,
              defaultPolicyVisible: runtime.providerAdapter.defaultPolicyVisible,
              providerProfileKey: runtime.providerAdapter.providerProfileKey,
              payloadVariant: runtime.providerAdapter.payloadVariant
            }
          : null,
      providerProfileKey: runtime.providerProfile?.key ?? explicitProfileKey,
      providerProfileName: runtime.providerProfile?.name ?? null,
      providerProfileVersion: runtime.providerProfile?.version ?? null,
      providerProfileVisibility: runtime.providerProfile?.visibility ?? null,
      providerProfileDefaultPolicyVisible: runtime.providerProfile?.defaultPolicyVisible ?? null,
      providerProfile:
        runtime.providerProfile
          ? {
              key: runtime.providerProfile.key,
              name: runtime.providerProfile.name,
              version: runtime.providerProfile.version,
              visibility: runtime.providerProfile.visibility,
              defaultPolicyVisible: runtime.providerProfile.defaultPolicyVisible,
              payloadShape: runtime.providerProfile.payloadShape,
              transportMode: runtime.providerProfile.transportMode
            }
          : null,
      providerPolicyKey: providerCompatibility.policy?.key ?? null,
      providerPolicy:
        providerCompatibility.policy === null
          ? null
          : {
              key: providerCompatibility.policy.key,
              name: providerCompatibility.policy.name,
              riskLevel: providerCompatibility.policy.riskLevel,
              executionModel: providerCompatibility.policy.executionModel,
              preferredRetryExecution: providerCompatibility.policy.preferredRetryExecution
            },
      providerPolicySummary:
        providerCompatibility.policy === null
          ? null
          : {
              status: providerCompatibility.status,
              blockingIssueCount: providerCompatibility.blockingIssues.length,
              warningCount: providerCompatibility.warnings.length
            },
      reason,
      checks,
      onboarding,
      activation: activationState,
      installation
    };
  }

  private async ensureSupplierConnectorReadyForHandoffTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    connector: {
      id: string;
      tenantId: string | null;
      organizationId: string | null;
      connectorKey: string;
      version: string;
      status: string;
      manifest: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    }
  ) {
    const activations = await this.listLatestSupplierConnectorActivationsTx(tx, tenantId, [
      {
        connectorKey: connector.connectorKey,
        version: connector.version,
        tenantId: connector.tenantId
      }
    ]);
    const readiness = await this.evaluateSupplierConnectorReadinessTx(
      tx,
      tenantId,
      connector,
      activations.get(`${connector.connectorKey}::${connector.version}`) ?? null
    );
    if (readiness.status === "BLOCKED") {
      throw new BadRequestException(
        `Supplier connector '${connector.connectorKey}' is not ready: ${readiness.checks
          .filter((item) => item.status === "BLOCKED")
          .map((item) => item.message)
          .join(" ")}`
      );
    }
    return readiness;
  }

  private resolveSupplierConnectorRuntime(connector: {
    connectorKey: string;
    version: string;
    manifest: Prisma.JsonValue;
  }) {
    const manifest = asRecord(connector.manifest);
    const runtime = asRecord(manifest.runtime);
    const transport = asRecord(runtime.transport);
    const provider = asRecord(manifest.provider);
    const providerAdapterKeySource =
      transport.providerAdapter ?? runtime.providerAdapter ?? provider.adapter ?? manifest.providerAdapter;
    const providerAdapterKey =
      typeof providerAdapterKeySource === "string" && providerAdapterKeySource.trim()
        ? providerAdapterKeySource.trim()
        : null;
    const providerAdapter = resolveInventorySupplierProviderAdapter(providerAdapterKey);
    const adapterTransport = providerAdapter?.transport;
    const providerProfileKeySource =
      transport.providerProfile ??
      runtime.providerProfile ??
      provider.profile ??
      manifest.providerProfile ??
      providerAdapter?.providerProfileKey;
    const providerProfileKey =
      typeof providerProfileKeySource === "string" && providerProfileKeySource.trim()
        ? providerProfileKeySource.trim()
        : null;
    const providerProfile = resolveInventorySupplierProviderProfile(providerProfileKey);
    const providerPolicy = resolveInventorySupplierProviderRuntimePolicyForRuntime({
      providerAdapterKey,
      providerProfileKey
    });
    const profileTransport = providerProfile?.transport;
    const rawMode =
      transport.mode ??
      runtime.mode ??
      adapterTransport?.mode ??
      profileTransport?.mode ??
      (Array.isArray(manifest.supports) ? "SIMULATED" : "SIMULATED");
    const normalizedMode = String(rawMode ?? "SIMULATED").trim().toUpperCase();
    const mode =
      normalizedMode === "WEBHOOK"
        ? "WEBHOOK"
        : normalizedMode === "FILE_IMPORT"
          ? "FILE_IMPORT"
          : normalizedMode === "HTTP_PUSH"
            ? "HTTP_PUSH"
          : "SIMULATED";
    const callbackPathSource =
      transport.callbackPath ?? runtime.callbackPath ?? adapterTransport?.callbackPath ?? profileTransport?.callbackPath;
    const callbackPath =
      mode === "WEBHOOK"
        ? String(callbackPathSource ?? `/inventory/replenishment-jobs/:jobId/supplier-webhook`)
        : null;
    const importFormatSource =
      transport.importFormat ?? runtime.importFormat ?? adapterTransport?.importFormat ?? profileTransport?.importFormat;
    const importFormat =
      mode === "FILE_IMPORT"
        ? String(importFormatSource ?? "json").trim().toLowerCase()
        : null;
    const endpoint =
      mode === "HTTP_PUSH"
        ? String(transport.endpoint ?? runtime.endpoint ?? "").trim() || null
        : null;
    const method =
      mode === "HTTP_PUSH"
        ? String(transport.method ?? runtime.method ?? adapterTransport?.method ?? profileTransport?.method ?? "POST").trim().toUpperCase()
        : null;
    const timeoutMs =
      mode === "HTTP_PUSH"
        ? Math.max(
            1000,
            Math.min(
              30000,
              Number(transport.timeoutMs ?? runtime.timeoutMs ?? adapterTransport?.timeoutMs ?? profileTransport?.timeoutMs ?? 5000) ||
                5000
            )
          )
        : null;
    const acceptedStatusCodes =
      mode === "HTTP_PUSH"
        ? (
            Array.isArray(transport.acceptedStatusCodes)
              ? transport.acceptedStatusCodes
              : Array.isArray(runtime.acceptedStatusCodes)
                ? runtime.acceptedStatusCodes
                : Array.isArray(adapterTransport?.acceptedStatusCodes)
                  ? adapterTransport.acceptedStatusCodes
                : Array.isArray(profileTransport?.acceptedStatusCodes)
                  ? profileTransport.acceptedStatusCodes
                  : [200, 201, 202, 204]
          )
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599)
            .slice(0, 20)
        : [];
    const responseStatusField =
      mode === "HTTP_PUSH"
        ? String(
            transport.responseStatusField ??
              runtime.responseStatusField ??
              adapterTransport?.responseStatusField ??
              profileTransport?.responseStatusField ??
              "supplierStatus"
          ).trim() ||
          "supplierStatus"
        : null;
    const responseStatusMapSource = mode === "HTTP_PUSH"
      ? {
          ...asRecord(profileTransport?.responseStatusMap),
          ...asRecord(adapterTransport?.responseStatusMap),
          ...asRecord(runtime.responseStatusMap),
          ...asRecord(transport.responseStatusMap)
        }
      : {};
    const responseStatusMap =
      mode === "HTTP_PUSH"
        ? Object.entries(responseStatusMapSource).reduce<Record<string, string>>((accumulator, [key, value]) => {
            if (typeof value !== "string" || !value.trim()) {
              return accumulator;
            }
            accumulator[String(key)] = value.trim().toUpperCase();
            return accumulator;
          }, {})
        : {};
    const auth =
      mode === "HTTP_PUSH"
        ? {
            ...asRecord(profileTransport?.auth),
            ...asRecord(adapterTransport?.auth),
            ...asRecord(runtime.auth),
            ...asRecord(transport.auth)
          }
        : {};
    const authKindRaw = String(auth.kind ?? "").trim().toUpperCase();
    const authKind: "BEARER" | "HEADER" | null =
      authKindRaw === "BEARER" ? "BEARER" : authKindRaw === "HEADER" ? "HEADER" : null;
    const authHeaderName =
      authKind === "HEADER"
        ? String(auth.headerName ?? "x-api-key").trim().toLowerCase() || "x-api-key"
        : authKind === "BEARER"
          ? "authorization"
          : null;
    const authPrefix =
      authKind === "BEARER"
        ? String(auth.prefix ?? "Bearer").trim() || "Bearer"
        : authKind === "HEADER"
          ? String(auth.prefix ?? "").trim() || null
          : null;
    const authSecretKey =
      typeof auth.secretKey === "string" && auth.secretKey.trim()
        ? auth.secretKey.trim()
        : null;
    const retryPolicy = mode === "HTTP_PUSH"
      ? {
          ...asRecord(profileTransport?.retryPolicy),
          ...asRecord(adapterTransport?.retryPolicy),
          ...asRecord(runtime.retryPolicy ?? runtime.retry),
          ...asRecord(transport.retryPolicy ?? transport.retry)
        }
      : {};
    const retryEnabled =
      mode === "HTTP_PUSH"
        ? retryPolicy.enabled === true || retryPolicy.autoQueue === true
        : false;
    const retryStrategyRaw = String(retryPolicy.strategy ?? "FIXED").trim().toUpperCase();
    const retryStrategy: "FIXED" | "EXPONENTIAL" =
      retryStrategyRaw === "EXPONENTIAL" ? "EXPONENTIAL" : "FIXED";
    const retryInitialDelayInput =
      mode === "HTTP_PUSH"
        ? retryPolicy.initialDelayMs ??
          (retryPolicy.retryDelayMinutes !== undefined && retryPolicy.retryDelayMinutes !== null
            ? Number(retryPolicy.retryDelayMinutes) * 60 * 1000
            : 30000)
        : 0;
    const retryInitialDelayValue = Number(retryInitialDelayInput);
    const retryInitialDelayMs =
      mode === "HTTP_PUSH"
        ? Math.max(0, Math.min(3600000, Number.isFinite(retryInitialDelayValue) ? retryInitialDelayValue : 30000))
        : 0;
    const retryMaxDelayMs =
      mode === "HTTP_PUSH"
        ? Math.max(
            retryInitialDelayMs || 1000,
            Math.min(
              3600000,
              Number(retryPolicy.maxDelayMs ?? (retryInitialDelayMs || 30000)) || retryInitialDelayMs || 30000
            )
          )
        : 0;
    const retryMaxAttempts =
      mode === "HTTP_PUSH"
        ? Math.max(1, Math.min(20, Number(retryPolicy.maxAttempts ?? 3) || 3))
        : 1;
    const retryableHttpStatusCodes =
      mode === "HTTP_PUSH"
        ? (
            Array.isArray(retryPolicy.retryableHttpStatusCodes)
              ? retryPolicy.retryableHttpStatusCodes
              : Array.isArray(retryPolicy.retryableStatusCodes)
                ? retryPolicy.retryableStatusCodes
              : [408, 425, 429, 500, 502, 503, 504]
          )
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599)
            .slice(0, 20)
        : [];
    const retryOnNetworkError = retryPolicy.retryOnNetworkError !== false;
    const pickupPathSource =
      transport.pickupPath ?? runtime.pickupPath ?? adapterTransport?.pickupPath ?? profileTransport?.pickupPath;
    const pickupPath =
      mode === "FILE_IMPORT"
        ? String(pickupPathSource ?? `/inventory/replenishment-jobs/:jobId/supplier-file-pickup`)
        : null;
    const dropPathSource =
      transport.dropPath ?? runtime.dropPath ?? adapterTransport?.dropPath ?? profileTransport?.dropPath;
    const dropPath =
      mode === "FILE_IMPORT"
        ? String(dropPathSource ?? `/inventory/replenishment-jobs/:jobId/supplier-file-drop`)
        : null;
    const allowsPollingOverride =
      transport.allowsPolling ?? runtime.allowsPolling ?? adapterTransport?.allowsPolling ?? profileTransport?.allowsPolling;
    const allowsPolling =
      mode === "SIMULATED"
        ? true
        : typeof allowsPollingOverride === "boolean"
          ? allowsPollingOverride
          : mode === "HTTP_PUSH";
    const requireSignature =
      mode === "WEBHOOK"
        ? transport.requireSignature === true ||
          runtime.requireSignature === true ||
          adapterTransport?.requireSignature === true ||
          profileTransport?.requireSignature === true
        : false;
    const secretKey =
      typeof (transport.secretKey ?? runtime.secretKey) === "string" &&
      String(transport.secretKey ?? runtime.secretKey).trim()
        ? String(transport.secretKey ?? runtime.secretKey).trim()
        : null;
    const requireChecksum =
      mode === "FILE_IMPORT"
        ? transport.requireChecksum === true ||
          runtime.requireChecksum === true ||
          adapterTransport?.requireChecksum === true ||
          profileTransport?.requireChecksum === true
        : false;
    const replayWindowSize = Math.max(
      1,
      Math.min(50, Number(transport.replayWindowSize ?? runtime.replayWindowSize ?? 20) || 20)
    );

    return {
      mode,
      providerProfile:
        providerProfile === null
          ? null
          : {
              key: providerProfile.key,
              name: providerProfile.name,
              version: "1",
              visibility: "VISIBLE" as const,
              defaultPolicyVisible: true,
              payloadShape: providerProfile.payloadShape,
              transportMode: providerProfile.transport.mode
            },
      providerAdapter:
        providerAdapter === null
          ? null
          : {
              key: providerAdapter.key,
              name: providerAdapter.name,
              version: providerAdapter.version,
              visibility: providerAdapter.visibility,
              defaultPolicyVisible: providerAdapter.defaultPolicyVisible,
              providerProfileKey: providerAdapter.providerProfileKey,
              payloadVariant: providerAdapter.execution.payloadVariant
            },
      providerPolicy:
        providerPolicy === null
          ? null
          : {
              key: providerPolicy.key,
              name: providerPolicy.name,
              riskLevel: providerPolicy.riskLevel,
              executionModel: providerPolicy.executionModel,
              preferredRetryExecution: providerPolicy.runtime.preferredRetryExecution
            },
      payloadVariant: providerAdapter?.execution.payloadVariant ?? providerProfile?.payloadShape ?? "DEFAULT",
      externalReferencePrefix: providerAdapter?.execution.externalReferencePrefix ?? null,
      fileNamePrefix: providerAdapter?.execution.fileNamePrefix ?? null,
      callbackPath,
      importFormat,
      pickupPath,
      dropPath,
      endpoint,
      method,
      timeoutMs,
      acceptedStatusCodes: acceptedStatusCodes.length ? acceptedStatusCodes : [200, 201, 202, 204],
      responseStatusField,
      responseStatusMap,
      auth:
        mode === "HTTP_PUSH" && authKind && authHeaderName
          ? {
              kind: authKind,
              headerName: authHeaderName,
              prefix: authPrefix,
              secretKey: authSecretKey
            }
          : null,
      allowsPolling,
      requireSignature,
      secretKey,
      requireChecksum,
      replayWindowSize
      ,
      retryPolicy:
        mode === "HTTP_PUSH"
          ? {
              enabled: retryEnabled,
              strategy: retryStrategy,
              initialDelayMs: retryInitialDelayMs,
              maxDelayMs: retryMaxDelayMs,
              maxAttempts: retryMaxAttempts,
              retryableHttpStatusCodes:
                retryableHttpStatusCodes.length ? retryableHttpStatusCodes : [408, 425, 429, 500, 502, 503, 504],
              retryOnNetworkError,
              deadLetterStatus:
                typeof retryPolicy.deadLetterStatus === "string" && retryPolicy.deadLetterStatus.trim()
                  ? retryPolicy.deadLetterStatus.trim()
                  : "DEAD_LETTER"
            }
          : null
    } as const;
  }

  private async resolveSupplierConnectorSecretTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    key: string
  ) {
    const rows = await tx.secretRegistryEntry.findMany({
      where: { key },
      orderBy: { createdAt: "desc" }
    });
    const selected =
      rows.find((row) => row.tenantId === tenantId) ??
      rows.find((row) => row.tenantId === null && row.organizationId === null) ??
      null;

    if (!selected) {
      return null;
    }

    const envelope = asRecord(selected.valueEnvelope);
    const value = envelope.value;
    if (typeof value !== "string" || value.length === 0) {
      return null;
    }

    return {
      id: selected.id,
      key: selected.key,
      value
    };
  }

  private async resolveSupplierConnectorHttpPushAuthTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    runtime: ReturnType<InventoryService["resolveSupplierConnectorRuntime"]>
  ) {
    if (runtime.mode !== "HTTP_PUSH" || !runtime.auth) {
      return null;
    }

    if (!runtime.auth.secretKey) {
      throw new BadRequestException("Supplier HTTP push auth secret reference is not configured.");
    }

    const secret = await this.resolveSupplierConnectorSecretTx(tx, tenantId, runtime.auth.secretKey);
    if (!secret) {
      throw new BadRequestException("Supplier HTTP push auth secret was not found.");
    }

    return {
      kind: runtime.auth.kind as "BEARER" | "HEADER",
      headerName: runtime.auth.headerName,
      prefix: runtime.auth.prefix,
      keyRef: secret.key,
      value: secret.value
    } as const;
  }

  private buildSupplierWebhookVerificationPayload(input: {
    deliveryId: string;
    supplierStatus: string;
    externalReference: string | null;
    eventType: string | null;
    payload: Record<string, unknown> | null;
  }) {
    return stableJson({
      deliveryId: input.deliveryId,
      supplierStatus: input.supplierStatus,
      externalReference: input.externalReference,
      eventType: input.eventType,
      payload: input.payload ?? null
    });
  }

  private buildSupplierImportChecksumPayload(input: {
    importId: string;
    supplierStatus: string;
    externalReference: string | null;
    fileName: string | null;
    payload: Record<string, unknown> | null;
  }) {
    return stableJson({
      importId: input.importId,
      supplierStatus: input.supplierStatus,
      externalReference: input.externalReference,
      fileName: input.fileName,
      payload: input.payload ?? null
    });
  }

  private appendReplayMarker(
    currentValue: unknown,
    marker: Record<string, unknown>,
    limit: number
  ) {
    const entries = Array.isArray(currentValue)
      ? currentValue
          .filter((item) => item && typeof item === "object" && !Array.isArray(item))
          .map((item) => asRecord(item))
      : [];
    return [marker, ...entries].slice(0, limit);
  }

  private parseSupplierFileDropPayload(
    content: string | null,
    contentType: string,
    importFormat: string
  ): InventoryRecord | null {
    if (!content) {
      return null;
    }

    const normalizedContentType = contentType.trim().toLowerCase();
    const normalizedFormat = importFormat.trim().toLowerCase();
    if (normalizedContentType.includes("json") || normalizedFormat === "json") {
      const parsed = JSON.parse(content) as unknown;
      return asRecord(parsed);
    }

    if (normalizedContentType.includes("csv") || normalizedFormat === "csv") {
      const lines = content
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        return { rawContent: content };
      }
      const headers = lines[0].split(",").map((item) => item.trim());
      const values = lines[1].split(",").map((item) => item.trim());
      return headers.reduce<InventoryRecord>((accumulator, header, index) => {
        accumulator[header] = values[index] ?? null;
        return accumulator;
      }, {});
    }

    return {
      rawContent: content,
      contentType: normalizedContentType
    };
  }

  private async recordSupplierReconciliationFailureTx(
    tx: Prisma.TransactionClient,
    current: InventoryReplenishmentJobModel,
    supplier: InventoryRecord,
    input: {
      source: "WEBHOOK" | "FILE_IMPORT";
      reason: string;
      code: string;
      externalReference?: string | null;
      deliveryId?: string | null;
      importId?: string | null;
    }
  ) {
    const timestamp = new Date().toISOString();
    await tx.inventoryReplenishmentJob.update({
      where: { id: current.id },
      data: {
        artifact: this.withReplenishmentWorkflowMetadata(current, {
          supplier: {
            ...supplier,
            lastFailureAt: timestamp,
            lastFailureSource: input.source,
            lastFailureReason: input.reason,
            lastFailureCode: input.code,
            reconciliation: {
              source: input.source,
              status: "FAILED",
              processedAt: timestamp,
              reason: input.reason,
              code: input.code,
              externalReference: input.externalReference ?? null,
              deliveryId: input.deliveryId ?? null,
              importId: input.importId ?? null
            }
          }
        })
      }
    });
  }

  private async recordSupplierReconciliationFailure(
    current: InventoryReplenishmentJobModel,
    supplier: InventoryRecord,
    input: {
      source: "WEBHOOK" | "FILE_IMPORT";
      reason: string;
      code: string;
      providerErrorClass?: InventorySupplierProviderErrorClass | null;
      retryClass?: InventorySupplierProviderRetryClass | null;
      providerExecutionPhase?: InventorySupplierProviderExecutionPhase | null;
      externalReference?: string | null;
      deliveryId?: string | null;
      importId?: string | null;
    }
  ) {
    const timestamp = new Date().toISOString();
    await this.prisma.inventoryReplenishmentJob.update({
      where: { id: current.id },
      data: {
        artifact: this.withReplenishmentWorkflowMetadata(current, {
          supplier: {
            ...supplier,
            lastFailureAt: timestamp,
            lastFailureSource: input.source,
            lastFailureReason: input.reason,
            lastFailureCode: input.code,
            providerErrorClass: input.providerErrorClass ?? "UNKNOWN",
            retryClass: input.retryClass ?? "TERMINAL",
            providerExecutionPhase: input.providerExecutionPhase ?? (input.source === "WEBHOOK" ? "WEBHOOK" : "FILE_DROP"),
            reconciliation: {
              source: input.source,
              status: "FAILED",
              processedAt: timestamp,
              reason: input.reason,
              code: input.code,
              providerErrorClass: input.providerErrorClass ?? "UNKNOWN",
              retryClass: input.retryClass ?? "TERMINAL",
              providerExecutionPhase: input.providerExecutionPhase ?? (input.source === "WEBHOOK" ? "WEBHOOK" : "FILE_DROP"),
              externalReference: input.externalReference ?? null,
              deliveryId: input.deliveryId ?? null,
              importId: input.importId ?? null
            }
          }
        })
      }
    });
  }

  private async queueSupplierRetryTx(
    tx: Prisma.TransactionClient,
    current: InventoryReplenishmentJobModel,
    context: RequestContext,
    input: {
      source?: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH" | null;
      note?: string | null;
      delayMinutes?: number;
      delayMs?: number | null;
      autoQueued?: boolean;
      code?: string | null;
      reason?: string | null;
      allowTerminalReopen?: boolean;
    }
  ): Promise<InventoryReplenishmentJobModel> {
    const artifact = asRecord(current.artifact);
    const workflow = asRecord(artifact.workflow);
    const supplier = asRecord(workflow.supplier);
    const connectorKey =
      typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
        ? supplier.connectorKey.trim()
        : null;

    if (!connectorKey) {
      throw new BadRequestException("Supplier connector handoff is required before retry queueing.");
    }

    const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
    const runtime = this.resolveSupplierConnectorRuntime(connector);
    const reconciliation = asRecord(supplier.reconciliation);
    if (
      input.allowTerminalReopen !== true &&
      reconciliation.status === "DEAD_LETTER" ||
      (input.allowTerminalReopen !== true && typeof supplier.deadLetterAt === "string") ||
      (input.allowTerminalReopen !== true && typeof supplier.deadLetteredAt === "string")
    ) {
      throw new BadRequestException("Terminal supplier artifacts cannot be queued for retry.");
    }
    const source = this.resolveSupplierRetrySource(supplier, runtime.mode, input.source ?? null);
    if (!source) {
      throw new BadRequestException("No failed supplier reconciliation is available for retry queueing.");
    }

    const retryAttemptCount = Math.max(0, toNumber(supplier.retryAttemptCount, 0)) + 1;
    const delayMinutes = Math.max(0, Math.min(1440, Number(input.delayMinutes ?? 0) || 0));
    const delayMs =
      input.delayMs !== null && input.delayMs !== undefined
        ? Math.max(0, Math.min(86400000, Number(input.delayMs) || 0))
        : delayMinutes * 60 * 1000;
    const timestamp = new Date();
    const nextRetryAt = new Date(timestamp.getTime() + delayMs).toISOString();
    const replay = asRecord(supplier.replay);
    const updated = await tx.inventoryReplenishmentJob.update({
      where: { id: current.id },
      data: {
        artifact: this.withReplenishmentWorkflowMetadata(current, {
          supplier: {
            ...supplier,
            pendingCallback: source === "WEBHOOK",
            pendingImport: source === "FILE_IMPORT",
            pendingPush: source === "HTTP_PUSH",
            retryAttemptCount,
            retryQueuedCount: Math.max(0, toNumber(supplier.retryQueuedCount, 0)) + 1,
            lastRetryQueuedAt: timestamp.toISOString(),
            lastRetryQueuedSource: source,
            retryClass: "RETRYABLE",
            providerExecutionPhase: source === "HTTP_PUSH" ? "RETRY" : source === "WEBHOOK" ? "WEBHOOK" : "FILE_DROP",
            nextRetryAt,
            lastStatusNote: input.note ?? supplier.lastStatusNote ?? null,
            lastFailureCode: input.code ?? (typeof supplier.lastFailureCode === "string" ? supplier.lastFailureCode : null),
            lastFailureReason:
              input.reason ?? (typeof supplier.lastFailureReason === "string" ? supplier.lastFailureReason : null),
            deadLetterAt: null,
            deadLetteredAt: null,
            deadLetterCode: null,
            deadLetterReason: null,
            deadLetterStatus: null,
            replay: {
              ...replay,
              retryQueue: this.appendReplayMarker(
                replay.retryQueue,
                {
                  source,
                  queuedAt: timestamp.toISOString(),
                  nextRetryAt,
                  retryAttemptCount,
                  autoQueued: input.autoQueued === true
                },
                20
              )
            },
            reconciliation: {
              source,
              status: "RETRY_QUEUED",
              processedAt: timestamp.toISOString(),
              nextRetryAt,
              retryAttemptCount,
              retryClass: "RETRYABLE",
              code: input.code ?? null,
              reason: input.reason ?? null
            }
          }
        })
      }
    });

    await this.logSupplierConnectorExecutionTx(tx, {
      tenantId: current.tenantId,
      storeId: current.storeId,
      connectorKey: connector.connectorKey,
      action: "replenishment_supplier_retry_queued",
      requestPayload: {
        replenishmentJobId: current.id,
        source,
        delayMinutes,
        delayMs,
        note: input.note ?? null,
        reopenedDeadLetter: input.allowTerminalReopen === true,
        retryClass: "RETRYABLE",
        providerExecutionPhase: source === "HTTP_PUSH" ? "RETRY" : source === "WEBHOOK" ? "WEBHOOK" : "FILE_DROP"
      },
      responsePayload: {
        nextRetryAt,
        retryAttemptCount,
        code: input.code ?? null,
        autoQueued: input.autoQueued === true,
        reopenedDeadLetter: input.allowTerminalReopen === true,
        retryClass: "RETRYABLE",
        providerExecutionPhase: source === "HTTP_PUSH" ? "RETRY" : source === "WEBHOOK" ? "WEBHOOK" : "FILE_DROP"
      },
      status: "COMPLETED",
      errorMessage: null
    });

    return updated;
  }

  private resolveSupplierRetrySource(
    supplier: InventoryRecord,
    runtimeMode: "SIMULATED" | "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH",
    requestedSource: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH" | null
  ): "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH" | null {
    const reconciliation = asRecord(supplier.reconciliation);
    const hasFailure =
      reconciliation.status === "FAILED" ||
      reconciliation.status === "DEAD_LETTER" ||
      supplier.lastTransportStatus === "FAILED" ||
      supplier.lastFailureSource === "WEBHOOK" ||
      supplier.lastFailureSource === "FILE_IMPORT" ||
      supplier.lastFailureSource === "HTTP_PUSH";

    if (!hasFailure) {
      return null;
    }

    if (requestedSource) {
      return requestedSource;
    }

    const failedSource =
      supplier.lastFailureSource === "WEBHOOK" ||
      supplier.lastFailureSource === "FILE_IMPORT" ||
      supplier.lastFailureSource === "HTTP_PUSH"
        ? supplier.lastFailureSource
        : null;
    if (failedSource) {
      return failedSource;
    }

    if (runtimeMode === "WEBHOOK") {
      return "WEBHOOK";
    }
    if (runtimeMode === "FILE_IMPORT") {
      return "FILE_IMPORT";
    }
    if (runtimeMode === "HTTP_PUSH") {
      return "HTTP_PUSH";
    }

    return null;
  }

  private computeSupplierRetryDelayMs(
    policy: {
      strategy: "FIXED" | "EXPONENTIAL";
      initialDelayMs: number;
      maxDelayMs: number;
    },
    attempt: number
  ): number {
    const baseDelay = Math.max(0, policy.initialDelayMs);
    if (policy.strategy === "EXPONENTIAL") {
      const computed = baseDelay * 2 ** Math.max(0, attempt - 1);
      return Math.min(policy.maxDelayMs, computed);
    }
    return Math.min(policy.maxDelayMs, baseDelay);
  }

  private resolveHttpPushRetryDecision(
    supplier: InventoryRecord,
    runtime: ReturnType<InventoryService["resolveSupplierConnectorRuntime"]>,
    execution: InventorySupplierTransportHandoffExecution
  ) {
    if (runtime.mode !== "HTTP_PUSH" || !runtime.retryPolicy?.enabled || execution.status !== "FAILED") {
      return {
        shouldRetry: false,
        terminal: false,
        code: "HTTP_PUSH_FAILED",
        reason: execution.errorMessage ?? "HTTP push delivery failed.",
        attempt: Math.max(0, toNumber(supplier.retryAttemptCount, 0)),
        delayMs: 0
      } as const;
    }

    const currentAttempt = Math.max(0, toNumber(supplier.retryAttemptCount, 0));
    const nextAttempt = currentAttempt + 1;
    const responsePayload = asRecord(execution.responsePayload);
    const httpStatus = toNumber(responsePayload.httpStatus, 0);
    const normalizedMessage = (execution.errorMessage ?? "").toLowerCase();
    const responseRetryClass = normalizeProviderRetryClass(responsePayload.retryClass) ?? null;
    const responseErrorClass = normalizeProviderErrorClass(responsePayload.providerErrorClass) ?? null;
    const deadLetterReasonCode =
      typeof responsePayload.deadLetterReasonCode === "string" && responsePayload.deadLetterReasonCode.trim()
        ? responsePayload.deadLetterReasonCode.trim()
        : null;
    const networkFailure =
      normalizedMessage.includes("fetch failed") ||
      normalizedMessage.includes("network") ||
      normalizedMessage.includes("abort") ||
      normalizedMessage.includes("timeout");
    const retryableHttpStatus =
      httpStatus > 0 && runtime.retryPolicy.retryableHttpStatusCodes.includes(httpStatus);
    const retryable =
      responseRetryClass === "RETRYABLE" ||
      retryableHttpStatus ||
      (networkFailure && runtime.retryPolicy.retryOnNetworkError);
    const exhausted = nextAttempt >= runtime.retryPolicy.maxAttempts;

    if (!retryable) {
      return {
        shouldRetry: false,
        terminal: true,
        code: deadLetterReasonCode ?? responseErrorClass ?? `HTTP_PUSH_HTTP_${httpStatus || "FAILED"}`,
        reason: execution.errorMessage ?? "HTTP push delivery failed.",
        attempt: nextAttempt,
        delayMs: 0
      } as const;
    }

    if (exhausted) {
      return {
        shouldRetry: false,
        terminal: true,
        code: "HTTP_PUSH_RETRY_EXHAUSTED",
        reason: `HTTP push retry policy exhausted after ${currentAttempt} queued attempts.`,
        attempt: nextAttempt,
        delayMs: 0
      } as const;
    }

    return {
      shouldRetry: true,
      terminal: false,
      code:
        deadLetterReasonCode ??
        (retryableHttpStatus ? `HTTP_PUSH_HTTP_${httpStatus}` : responseErrorClass ?? "HTTP_PUSH_NETWORK_RETRY"),
      reason: execution.errorMessage ?? "HTTP push delivery failed.",
      attempt: nextAttempt,
      delayMs: this.computeSupplierRetryDelayMs(runtime.retryPolicy, nextAttempt)
    } as const;
  }

  private async markSupplierDeadLetterTx(
    tx: Prisma.TransactionClient,
    current: InventoryReplenishmentJobModel,
    connectorKey: string,
    supplier: InventoryRecord,
    input: {
      source: "HTTP_PUSH";
      code: string;
      reason: string;
      attempt?: number;
      deadLetterStatus?: string | null;
      note?: string | null;
      execution?: InventorySupplierTransportHandoffExecution | null;
    }
  ): Promise<InventoryReplenishmentJobModel> {
    const timestamp = new Date().toISOString();
    const replay = asRecord(supplier.replay);
    const updated = await tx.inventoryReplenishmentJob.update({
      where: { id: current.id },
      data: {
        artifact: this.withReplenishmentWorkflowMetadata(current, {
          supplier: {
            ...supplier,
            pendingPush: false,
            nextRetryAt: null,
            lastFailureAt: timestamp,
            lastFailureSource: input.source,
            lastFailureReason: input.reason,
            lastFailureCode: input.code,
            providerErrorClass:
              normalizeProviderErrorClass(asRecord(input.execution?.responsePayload).providerErrorClass) ?? "UNKNOWN",
            retryClass: "TERMINAL",
            providerExecutionPhase:
              normalizeProviderExecutionPhase(asRecord(input.execution?.responsePayload).providerExecutionPhase) ?? "RETRY",
            retryAttemptCount: Math.max(
              toNumber(supplier.retryAttemptCount, 0),
              Number(input.attempt ?? 0) || 0
            ),
            deadLetterAt: timestamp,
            deadLetteredAt: timestamp,
            deadLetterCode: input.code,
            deadLetterReason: input.reason,
            deadLetterStatus: input.deadLetterStatus ?? "DEAD_LETTER",
            lastStatusNote: input.note ?? supplier.lastStatusNote ?? null,
            deliveryArtifact:
              input.execution?.deliveryArtifact ?? (typeof supplier.deliveryArtifact === "object" ? supplier.deliveryArtifact : null),
            replay: {
              ...replay,
              deadLetters: this.appendReplayMarker(
                replay.deadLetters,
                {
                  source: input.source,
                  code: input.code,
                  reason: input.reason,
                  processedAt: timestamp
                },
                20
              )
            },
            reconciliation: {
              source: input.source,
              status: input.deadLetterStatus ?? "DEAD_LETTER",
              processedAt: timestamp,
              code: input.code,
              reason: input.reason,
              providerErrorClass:
                normalizeProviderErrorClass(asRecord(input.execution?.responsePayload).providerErrorClass) ?? "UNKNOWN",
              retryClass: "TERMINAL",
              providerExecutionPhase:
                normalizeProviderExecutionPhase(asRecord(input.execution?.responsePayload).providerExecutionPhase) ?? "RETRY"
            }
          }
        })
      }
    });

    await this.logSupplierConnectorExecutionTx(tx, {
      tenantId: current.tenantId,
      storeId: current.storeId,
      connectorKey,
      action: "replenishment_supplier_dead_lettered",
      requestPayload: {
        replenishmentJobId: current.id,
        source: input.source,
        code: input.code,
        retryClass: "TERMINAL",
        providerExecutionPhase:
          normalizeProviderExecutionPhase(asRecord(input.execution?.responsePayload).providerExecutionPhase) ?? "RETRY"
      },
      responsePayload: {
        reason: input.reason,
        retryAttemptCount: toNumber(supplier.retryAttemptCount, 0),
        providerErrorClass:
          normalizeProviderErrorClass(asRecord(input.execution?.responsePayload).providerErrorClass) ?? "UNKNOWN",
        retryClass: "TERMINAL",
        providerExecutionPhase:
          normalizeProviderExecutionPhase(asRecord(input.execution?.responsePayload).providerExecutionPhase) ?? "RETRY"
      },
      status: "FAILED",
      errorMessage: input.reason
    });

    return updated;
  }

  private async executeInventorySupplierHttpPushDelivery(
    execution: InventorySupplierTransportHandoffExecution,
    runtime: {
      endpoint: string | null;
      method: string | null;
      timeoutMs: number | null;
      acceptedStatusCodes: number[];
      responseStatusField: string | null;
      providerAdapter?: {
        key: string;
      } | null;
    },
    auth: {
      kind: "BEARER" | "HEADER";
      headerName: string;
      prefix: string | null;
      keyRef: string;
      value: string;
    } | null
  ): Promise<InventorySupplierTransportHandoffExecution> {
    const requestArtifact = asRecord(execution.deliveryArtifact);
    const endpoint = runtime.endpoint?.trim() || null;
    const method = runtime.method?.trim().toUpperCase() || "POST";
    const timeoutMs = Math.max(1000, Math.min(30000, Number(runtime.timeoutMs ?? 5000) || 5000));
    const acceptedStatusCodes = runtime.acceptedStatusCodes.length ? runtime.acceptedStatusCodes : [200, 201, 202, 204];
    const responseStatusField = runtime.responseStatusField?.trim() || "supplierStatus";
    if (!endpoint) {
      const classification = classifyInventorySupplierProviderHttpPushResult({
        providerAdapterKey:
          typeof requestArtifact.providerAdapterKey === "string"
            ? requestArtifact.providerAdapterKey
            : runtime.providerAdapter?.key ?? null,
        accepted: false,
        networkError: false
      });
      return {
        ...execution,
        status: "FAILED",
        errorMessage: "HTTP push endpoint is not configured.",
        responsePayload: {
          ...execution.responsePayload,
          providerErrorClass: classification.providerErrorClass,
          retryClass: classification.retryClass,
          providerExecutionPhase: classification.providerExecutionPhase,
          deadLetterReasonCode: classification.deadLetterReasonCode
        },
        deliveryArtifact: {
          ...requestArtifact,
          delivered: false,
          failedAt: new Date().toISOString(),
          timeoutMs,
          acceptedStatusCodes,
          responseStatusField,
          providerErrorClass: classification.providerErrorClass,
          retryClass: classification.retryClass,
          providerExecutionPhase: classification.providerExecutionPhase,
          deadLetterReasonCode: classification.deadLetterReasonCode
        }
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const requestHeaders: Record<string, string> = {
        "content-type":
          typeof requestArtifact.contentType === "string"
            ? requestArtifact.contentType
            : "application/json"
      };
      if (auth) {
        requestHeaders[auth.headerName] = auth.prefix ? `${auth.prefix} ${auth.value}` : auth.value;
      }
      const response = await fetch(endpoint, {
        method,
        headers: requestHeaders,
        body: typeof requestArtifact.body === "string" ? requestArtifact.body : null,
        signal: controller.signal
      });
      const responseText = await response.text();
      const responseBody = this.parseHttpPushResponseBody(responseText);
      const responseStatus =
        responseBody && typeof responseBody === "object"
          ? (responseBody as Record<string, unknown>)[responseStatusField]
          : null;
      const mappedSupplierStatus =
        this.normalizeSupplierTransportStatus(responseStatus) ??
        this.normalizeSupplierTransportStatus(
          responseBody && typeof responseBody === "object"
            ? (responseBody as Record<string, unknown>).supplierStatus
            : null
        ) ??
        this.normalizeSupplierTransportStatus(
          asRecord(requestArtifact.responseStatusMap)[String(response.status)] ?? null
        );
      const responseAccepted = acceptedStatusCodes.includes(response.status);
      const classification = classifyInventorySupplierProviderHttpPushResult({
        providerAdapterKey:
          typeof requestArtifact.providerAdapterKey === "string"
            ? requestArtifact.providerAdapterKey
            : runtime.providerAdapter?.key ?? null,
        httpStatus: response.status,
        accepted: responseAccepted,
        responseBody,
        supplierStatus: mappedSupplierStatus ?? null
      });
      const supplierStatus =
        classification.supplierStatus ?? mappedSupplierStatus ?? (responseAccepted ? "ACKNOWLEDGED" : execution.supplierStatus);

      return {
        ...execution,
        status: responseAccepted ? "COMPLETED" : "FAILED",
        errorMessage: responseAccepted ? null : `HTTP push delivery returned ${response.status}.`,
        supplierStatus,
        responsePayload: {
          ...execution.responsePayload,
          endpoint,
          method,
          timeoutMs,
          acceptedStatusCodes,
          responseStatusField,
          authKind: auth?.kind ?? null,
          authHeaderName: auth?.headerName ?? null,
          authKeyRef: auth?.keyRef ?? null,
          httpStatus: response.status,
          responseOk: responseAccepted,
          responseBody,
          providerErrorClass: responseAccepted ? null : classification.providerErrorClass,
          retryClass: classification.retryClass,
          providerExecutionPhase: classification.providerExecutionPhase,
          deadLetterReasonCode: classification.deadLetterReasonCode
        },
        deliveryArtifact: {
          ...requestArtifact,
          endpoint,
          method,
          timeoutMs,
          acceptedStatusCodes,
          responseStatusField,
          authKind: auth?.kind ?? null,
          authHeaderName: auth?.headerName ?? null,
          authApplied: Boolean(auth),
          authKeyRef: auth?.keyRef ?? null,
          deliveredAt: new Date().toISOString(),
          responseStatus: response.status,
          responseBody,
          providerErrorClass: responseAccepted ? null : classification.providerErrorClass,
          retryClass: classification.retryClass,
          providerExecutionPhase: classification.providerExecutionPhase,
          deadLetterReasonCode: classification.deadLetterReasonCode
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const classification = classifyInventorySupplierProviderHttpPushResult({
        providerAdapterKey:
          typeof requestArtifact.providerAdapterKey === "string"
            ? requestArtifact.providerAdapterKey
            : runtime.providerAdapter?.key ?? null,
        accepted: false,
        networkError: true
      });
      return {
        ...execution,
        status: "FAILED",
        errorMessage: `HTTP push delivery failed. ${message}`,
        responsePayload: {
          ...execution.responsePayload,
          endpoint,
          method,
          timeoutMs,
          acceptedStatusCodes,
          responseStatusField,
          authKind: auth?.kind ?? null,
          authHeaderName: auth?.headerName ?? null,
          authKeyRef: auth?.keyRef ?? null,
          responseOk: false,
          providerErrorClass: classification.providerErrorClass,
          retryClass: classification.retryClass,
          providerExecutionPhase: classification.providerExecutionPhase,
          deadLetterReasonCode: classification.deadLetterReasonCode
        },
        deliveryArtifact: {
          ...requestArtifact,
          endpoint,
          method,
          timeoutMs,
          acceptedStatusCodes,
          responseStatusField,
          authKind: auth?.kind ?? null,
          authHeaderName: auth?.headerName ?? null,
          authApplied: Boolean(auth),
          authKeyRef: auth?.keyRef ?? null,
          delivered: false,
          failedAt: new Date().toISOString(),
          error: message,
          providerErrorClass: classification.providerErrorClass,
          retryClass: classification.retryClass,
          providerExecutionPhase: classification.providerExecutionPhase,
          deadLetterReasonCode: classification.deadLetterReasonCode
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseHttpPushResponseBody(value: string): Record<string, unknown> | string | null {
    if (!value.trim()) {
      return null;
    }
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return value;
    }
  }

  private normalizeSupplierTransportStatus(
    value: unknown
  ): "SUBMITTED" | "ACKNOWLEDGED" | "IN_TRANSIT" | "DELIVERED" | null {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim().toUpperCase();
    return normalized === "SUBMITTED" ||
      normalized === "ACKNOWLEDGED" ||
      normalized === "IN_TRANSIT" ||
      normalized === "DELIVERED"
      ? normalized
      : null;
  }

  private async processDueSupplierRetryTx(
    tx: Prisma.TransactionClient,
    current: InventoryReplenishmentJobModel,
    context: RequestContext,
    now: Date,
    input: {
      source?: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH" | null;
      note?: string | null;
    }
  ): Promise<InventoryReplenishmentJobModel | null> {
    const artifact = asRecord(current.artifact);
    const workflow = asRecord(artifact.workflow);
    const supplier = asRecord(workflow.supplier);
    const connectorKey =
      typeof supplier.connectorKey === "string" && supplier.connectorKey.trim()
        ? supplier.connectorKey.trim()
        : null;
    if (!connectorKey) {
      return null;
    }

    const connector = await this.requireSupplierConnectorTx(tx, current.tenantId, connectorKey);
    const runtime = this.resolveSupplierConnectorRuntime(connector);
    const source = this.resolveSupplierRetrySource(supplier, runtime.mode, input.source ?? null);
    if (!source) {
      return null;
    }

    const reconciliation = asRecord(supplier.reconciliation);
    if (reconciliation.status !== "RETRY_QUEUED") {
      return null;
    }

    const nextRetryAt =
      typeof supplier.nextRetryAt === "string" && supplier.nextRetryAt.trim()
        ? new Date(supplier.nextRetryAt)
        : null;
    if (!nextRetryAt || Number.isNaN(nextRetryAt.getTime()) || nextRetryAt.getTime() > now.getTime()) {
      return null;
    }

    if (source === "HTTP_PUSH") {
      const executionReadiness = await this.buildSupplierExecutionReadinessSnapshotTx(tx, current, connector);
      if (!executionReadiness.canExecute) {
        await this.logSupplierConnectorExecutionTx(tx, {
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: connector.connectorKey,
          action: "replenishment_supplier_retry_due_blocked",
          requestPayload: {
            replenishmentJobId: current.id,
            source,
            note: input.note ?? null,
            providerExecutionPhase: "RETRY"
          },
          responsePayload: {
            status: executionReadiness.status,
            blockingIssues: executionReadiness.blockingIssues,
            warnings: executionReadiness.warnings,
            retryClass: "TERMINAL",
            providerErrorClass: "GOVERNANCE",
            providerExecutionPhase: "RETRY"
          },
          status: "FAILED",
          errorMessage:
            executionReadiness.blockingIssues[0] ??
            executionReadiness.warnings[0] ??
            "Supplier execution policy blocked due retry."
        });
        return null;
      }
    }

    if (source === "HTTP_PUSH") {
      if (runtime.mode !== "HTTP_PUSH") {
        return null;
      }

      const summary = asRecord(current.summary);
      const httpPushAuth = await this.resolveSupplierConnectorHttpPushAuthTx(tx, current.tenantId, runtime);
      const retryExecution = await this.executeInventorySupplierHttpPushDelivery(
        executeInventorySupplierTransportHandoff({
          replenishmentJobId: current.id,
          connectorKey: connector.connectorKey,
          supplierName:
            typeof supplier.supplierName === "string" && supplier.supplierName.trim()
              ? supplier.supplierName.trim()
              : connector.connectorKey,
          supplierReference:
            typeof supplier.supplierReference === "string" && supplier.supplierReference.trim()
              ? supplier.supplierReference.trim()
              : null,
          channel:
            typeof supplier.channel === "string" && supplier.channel.trim()
              ? supplier.channel.trim()
              : "API",
          recommendationCount: toNumber(summary.recommendationCount),
          totalRecommendedOrderQuantity: toNumber(summary.totalRecommendedOrderQuantity),
          transportMode: "HTTP_PUSH",
          endpoint: runtime.endpoint,
          method: runtime.method,
          timeoutMs: runtime.timeoutMs,
          acceptedStatusCodes: runtime.acceptedStatusCodes,
          responseStatusField: runtime.responseStatusField,
          responseStatusMap: runtime.responseStatusMap,
          authKind: runtime.auth?.kind ?? null,
          authHeaderName: runtime.auth?.headerName ?? null,
          providerProfileKey: runtime.providerProfile?.key ?? null,
          providerAdapterKey: runtime.providerAdapter?.key ?? null,
          payloadShape: runtime.providerProfile?.payloadShape ?? "DEFAULT",
          payloadVariant: runtime.payloadVariant ?? runtime.providerProfile?.payloadShape ?? "DEFAULT",
          externalReferencePrefix: runtime.externalReferencePrefix ?? null,
          fileNamePrefix: runtime.fileNamePrefix ?? null
        }),
        runtime,
        httpPushAuth
      );

      const retryProcessedCount = Math.max(0, toNumber(supplier.retryProcessedCount, 0)) + 1;
      const timestamp = now.toISOString();
      const replay = asRecord(supplier.replay);
      const transportAction = "replenishment_supplier_retry_due";

      if (retryExecution.status === "COMPLETED") {
        const updated = await tx.inventoryReplenishmentJob.update({
          where: { id: current.id },
          data: {
            artifact: this.withReplenishmentWorkflowMetadata(current, {
              supplier: {
                ...supplier,
                supplierReference:
                  retryExecution.externalReference ??
                  (typeof supplier.supplierReference === "string" ? supplier.supplierReference : null),
                supplierStatus: retryExecution.supplierStatus,
                pendingPush: false,
                nextRetryAt: null,
                lastRetryProcessedAt: timestamp,
                lastRetryProcessedSource: "HTTP_PUSH",
                retryProcessedCount,
                lastTransportAction: transportAction,
                lastTransportStatus: retryExecution.status,
                deliveryArtifact: retryExecution.deliveryArtifact ?? null,
                replay: {
                  ...replay,
                  retryDispatches: this.appendReplayMarker(
                    replay.retryDispatches,
                    {
                      source: "HTTP_PUSH",
                      processedAt: timestamp,
                      retryProcessedCount,
                      status: retryExecution.supplierStatus
                    },
                    20
                  )
                },
                reconciliation: {
                  source: "HTTP_PUSH",
                  status: "RETRY_COMPLETED",
                  processedAt: timestamp,
                  retryProcessedCount
                }
              }
            })
          }
        });

        await this.logSupplierConnectorExecutionTx(tx, {
          tenantId: current.tenantId,
          storeId: current.storeId,
          connectorKey: connector.connectorKey,
          action: transportAction,
          requestPayload: {
            replenishmentJobId: current.id,
            source: "HTTP_PUSH",
            note: input.note ?? null
          },
          responsePayload: {
            ...(retryExecution.responsePayload ?? {}),
            retryProcessedCount,
            deliveryArtifact: retryExecution.deliveryArtifact ?? null
          },
          status: "COMPLETED",
          errorMessage: null
        });

        return updated;
      }

      const failedState = await tx.inventoryReplenishmentJob.update({
        where: { id: current.id },
        data: {
          artifact: this.withReplenishmentWorkflowMetadata(current, {
            supplier: {
              ...supplier,
              pendingPush: true,
              lastRetryProcessedAt: timestamp,
              lastRetryProcessedSource: "HTTP_PUSH",
              retryProcessedCount,
              lastTransportAction: transportAction,
              lastTransportStatus: retryExecution.status,
              lastFailureAt: timestamp,
              lastFailureSource: "HTTP_PUSH",
              lastFailureReason: retryExecution.errorMessage ?? "HTTP push retry failed.",
              lastFailureCode: "HTTP_PUSH_RETRY_FAILED",
              deliveryArtifact: retryExecution.deliveryArtifact ?? null
            }
          })
        }
      });

      await this.logSupplierConnectorExecutionTx(tx, {
        tenantId: current.tenantId,
        storeId: current.storeId,
        connectorKey: connector.connectorKey,
        action: transportAction,
        requestPayload: {
          replenishmentJobId: current.id,
          source: "HTTP_PUSH",
          note: input.note ?? null
        },
        responsePayload: {
          ...(retryExecution.responsePayload ?? {}),
          retryProcessedCount,
          deliveryArtifact: retryExecution.deliveryArtifact ?? null
        },
        status: "FAILED",
        errorMessage: retryExecution.errorMessage ?? "HTTP push retry failed."
      });

      const failedSupplier = asRecord(asRecord(asRecord(failedState.artifact).workflow).supplier);
      const retryDecision = this.resolveHttpPushRetryDecision(failedSupplier, runtime, retryExecution);

      if (retryDecision.shouldRetry) {
        return this.queueSupplierRetryTx(tx, failedState, context, {
          source: "HTTP_PUSH",
          note: `Auto-queued HTTP push retry after due-run failure. ${retryDecision.reason}`,
          delayMs: retryDecision.delayMs,
          autoQueued: true,
          code: retryDecision.code,
          reason: retryDecision.reason
        });
      }

      return this.markSupplierDeadLetterTx(tx, failedState, connector.connectorKey, failedSupplier, {
        source: "HTTP_PUSH",
        code: retryDecision.code,
        reason: retryDecision.reason,
        attempt: retryDecision.attempt,
        deadLetterStatus: runtime.retryPolicy?.deadLetterStatus ?? "DEAD_LETTER",
        note: `HTTP push retry moved to dead letter. ${retryDecision.reason}`,
        execution: retryExecution
      });
    }

    const timestamp = now.toISOString();
    const replay = asRecord(supplier.replay);
    const retryProcessedCount = Math.max(0, toNumber(supplier.retryProcessedCount, 0)) + 1;
    const updated = await tx.inventoryReplenishmentJob.update({
      where: { id: current.id },
      data: {
        artifact: this.withReplenishmentWorkflowMetadata(current, {
          supplier: {
            ...supplier,
            pendingCallback: source === "WEBHOOK",
            pendingImport: source === "FILE_IMPORT",
            pendingPush: false,
            nextRetryAt: null,
            lastRetryProcessedAt: timestamp,
            lastRetryProcessedSource: source,
            retryProcessedCount,
            lastStatusNote: input.note ?? supplier.lastStatusNote ?? null,
            replay: {
              ...replay,
              retryDispatches: this.appendReplayMarker(
                replay.retryDispatches,
                {
                  source,
                  processedAt: timestamp,
                  retryProcessedCount
                },
                20
              )
            },
            reconciliation: {
              source,
              status: "RETRY_DISPATCHED",
              processedAt: timestamp,
              retryProcessedCount
            }
          }
        })
      }
    });

    await this.logSupplierConnectorExecutionTx(tx, {
      tenantId: current.tenantId,
      storeId: current.storeId,
      connectorKey: connector.connectorKey,
      action: "replenishment_supplier_retry_due",
      requestPayload: {
        replenishmentJobId: current.id,
        source,
        note: input.note ?? null
      },
      responsePayload: {
        retryProcessedCount,
        pendingCallback: source === "WEBHOOK",
        pendingImport: source === "FILE_IMPORT"
      },
      status: "COMPLETED",
      errorMessage: null
    });

    return updated;
  }

  private async logSupplierConnectorExecution(input: {
    tenantId: string;
    storeId: string | null;
    connectorKey: string;
    action: string;
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
    status: "COMPLETED" | "FAILED";
    errorMessage: string | null;
  }): Promise<void> {
    await this.prisma.connectorExecutionLog.create({
      data: {
        tenantId: input.tenantId,
        storeId: input.storeId,
        connectorKind: "SUPPLIER_ADAPTER",
        connectorKey: input.connectorKey,
        action: input.action,
        status: input.status,
        requestPayload: input.requestPayload as Prisma.InputJsonObject,
        responsePayload: input.responsePayload as Prisma.InputJsonObject,
        errorMessage: input.errorMessage,
        finishedAt: new Date()
      }
    });
  }

  private async logSupplierConnectorExecutionTx(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      storeId: string | null;
      connectorKey: string;
      action: string;
      requestPayload: Record<string, unknown>;
      responsePayload: Record<string, unknown>;
      status: "COMPLETED" | "FAILED";
      errorMessage: string | null;
    }
  ): Promise<void> {
    await tx.connectorExecutionLog.create({
      data: {
        tenantId: input.tenantId,
        storeId: input.storeId,
        connectorKind: "SUPPLIER_ADAPTER",
        connectorKey: input.connectorKey,
        action: input.action,
        status: input.status,
        requestPayload: input.requestPayload as Prisma.InputJsonObject,
        responsePayload: input.responsePayload as Prisma.InputJsonObject,
        errorMessage: input.errorMessage,
        finishedAt: new Date()
      }
    });
  }

  private async getReplenishmentJobModelTx(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<InventoryReplenishmentJobModel> {
    const job = await tx.inventoryReplenishmentJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException("Replenishment job not found.");
    }
    return job;
  }

  private withReplenishmentWorkflowMetadata(
    current: InventoryReplenishmentJobModel,
    patch: Record<string, unknown>
  ): Prisma.InputJsonObject {
    const artifact = asRecord(current.artifact);
    const workflow = asRecord(artifact.workflow);
    return {
      ...artifact,
      workflow: {
        ...workflow,
        ...patch
      }
    } as Prisma.InputJsonObject;
  }

  private mapReplenishmentExportRows(
    job: InventoryReplenishmentJobModel
  ): InventoryReplenishmentJobExportRowDto[] {
    const artifact = asRecord(job.artifact);
    const recommendations = Array.isArray(artifact.recommendations)
      ? artifact.recommendations
      : [];

    return recommendations
      .map((item) => asRecord(item))
      .map((item) => ({
        warehouseCode: String(item.warehouseCode ?? ""),
        warehouseName: String(item.warehouseName ?? ""),
        ingredientCode: String(item.ingredientCode ?? ""),
        ingredientName: String(item.ingredientName ?? ""),
        sku: item.sku ? String(item.sku) : null,
        available: toNumber(item.available),
        reorderPoint: toNumber(item.reorderPoint),
        targetQuantity: toNumber(item.targetQuantity),
        recommendedOrderQuantity: toNumber(item.recommendedOrderQuantity),
        lastUnitCost: item.lastUnitCost ? String(item.lastUnitCost) : null
      }));
  }

  private buildReplenishmentCsv(rows: InventoryReplenishmentJobExportRowDto[]): string {
    const header = [
      "warehouseCode",
      "warehouseName",
      "ingredientCode",
      "ingredientName",
      "sku",
      "available",
      "reorderPoint",
      "targetQuantity",
      "recommendedOrderQuantity",
      "lastUnitCost"
    ];
    const lines = rows.map((row) =>
      [
        row.warehouseCode,
        row.warehouseName,
        row.ingredientCode,
        row.ingredientName,
        row.sku,
        row.available,
        row.reorderPoint,
        row.targetQuantity,
        row.recommendedOrderQuantity,
        row.lastUnitCost
      ]
        .map(escapeCsvCell)
        .join(",")
    );

    return [header.join(","), ...lines].join("\n");
  }

  private async getWarehouseByIdTx(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<InventoryWarehouseDto> {
    const warehouse = await tx.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      throw new NotFoundException("Warehouse not found.");
    }
    return mapWarehouse(warehouse);
  }

  private async getIngredientByIdTx(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<InventoryIngredientDto> {
    const ingredient = await tx.ingredient.findUnique({ where: { id } });
    if (!ingredient) {
      throw new NotFoundException("Ingredient not found.");
    }
    return mapIngredient(ingredient);
  }

  private async getItemByIdTx(tx: Prisma.TransactionClient, id: string): Promise<InventoryItemDto> {
    const item = await tx.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException("Inventory item not found.");
    }
    return mapItem(item);
  }

  private async getItemByWarehouseIngredientTx(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    ingredientId: string
  ): Promise<InventoryItemDto | null> {
    const item = await tx.inventoryItem.findUnique({
      where: {
        warehouseId_ingredientId: {
          warehouseId,
          ingredientId
        }
      }
    });
    return item ? mapItem(item) : null;
  }

  private async getOrCreateItemTx(
    tx: Prisma.TransactionClient,
    input: { tenantId: string; warehouseId: string; ingredientId: string }
  ): Promise<InventoryItemDto> {
    const existing = await this.getItemByWarehouseIngredientTx(tx, input.warehouseId, input.ingredientId);
    if (existing) {
      return existing;
    }

    const item = await tx.inventoryItem.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        warehouseId: input.warehouseId,
        ingredientId: input.ingredientId,
        sku: null,
        onHand: 0,
        reserved: 0,
        reorderPoint: 0,
        metadata: {} as Prisma.InputJsonObject
      }
    });

    return mapItem(item);
  }

  private async getReceivingRecordTx(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<ReceivingRecordDto> {
    const record = await tx.receivingRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException("Receiving record not found.");
    }
    return mapReceivingRecord(record, await this.listReceivingLines(tx, id));
  }

  private async completeReceivingRecordTx(
    tx: Prisma.TransactionClient,
    id: string,
    receivedByOverride?: string | null
  ): Promise<ReceivingRecordDto> {
    const record = await this.getReceivingRecordTx(tx, id);
    if (record.status === "COMPLETED") {
      return record;
    }

    const receivedBy = receivedByOverride ?? record.receivedBy ?? null;
    for (const line of record.lines) {
      await this.applyStockDeltaTx(tx, {
        tenantId: record.tenantId,
        warehouseId: record.warehouseId,
        ingredientId: line.ingredientId,
        delta: line.quantity,
        entryType: "RECEIVING",
        sourceType: "receiving",
        sourceId: record.id,
        metadata: { receivingRecordId: record.id, receivedBy }
      });
    }

    await tx.receivingRecord.update({
      where: { id },
      data: {
        status: "COMPLETED",
        receivedBy,
        completedAt: new Date()
      }
    });

    return this.getReceivingRecordTx(tx, id);
  }

  private async listReceivingLines(
    tx: Prisma.TransactionClient,
    recordId: string
  ): Promise<ReceivingLineDto[]> {
    const lines = await tx.receivingLine.findMany({
      where: { recordId },
      orderBy: { createdAt: "asc" }
    });
    return lines.map(mapReceivingLine);
  }

  private async getReservationTx(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<StockReservationDto> {
    const reservation = await tx.stockReservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException("Reservation not found.");
    }
    return mapReservation(reservation);
  }

  private async getStopRuleTx(tx: Prisma.TransactionClient, id: string): Promise<StopListRuleDto> {
    const rule = await tx.stopListRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException("Stop-list rule not found.");
    }
    return mapStopRule(rule);
  }

  private async applyStockDeltaTx(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      warehouseId: string;
      ingredientId: string;
      delta: number;
      entryType: string;
      sourceType: string;
      sourceId: string;
      metadata: InventoryRecord;
    }
  ): Promise<void> {
    const item = await this.getOrCreateItemTx(tx, {
      tenantId: input.tenantId,
      warehouseId: input.warehouseId,
      ingredientId: input.ingredientId
    });
    const nextOnHand = item.onHand + input.delta;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        onHand: nextOnHand
      }
    });
    await tx.stockLedgerEntry.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        warehouseId: input.warehouseId,
        ingredientId: input.ingredientId,
        entryType: input.entryType,
        quantity: input.delta,
        balanceAfter: nextOnHand,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        metadata: input.metadata as Prisma.InputJsonObject
      }
    });
  }
}
