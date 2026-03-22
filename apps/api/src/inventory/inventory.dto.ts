import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from "class-validator";

export type InventoryRecord = Record<string, unknown>;

export interface InventoryWarehouseDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  code: string;
  name: string;
  kind: string;
  notes: string | null;
  isActive: boolean;
  metadata: InventoryRecord;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryIngredientDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  unit: string;
  lowStockThreshold: number;
  metadata: InventoryRecord;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDto {
  id: string;
  tenantId: string;
  warehouseId: string;
  ingredientId: string;
  sku: string | null;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  available: number;
  metadata: InventoryRecord;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeBomDto {
  id: string;
  tenantId: string;
  productId: string;
  variantId: string | null;
  ingredientId: string;
  quantity: number;
  metadata: InventoryRecord;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivingLineDto {
  ingredientId: string;
  quantity: number;
  unitCost: string | null;
  metadata?: InventoryRecord;
}

export interface ReceivingRecordDto {
  id: string;
  tenantId: string;
  warehouseId: string;
  reference: string;
  status: string;
  receivedBy: string | null;
  completedAt: string | null;
  metadata: InventoryRecord;
  lines: ReceivingLineDto[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAdjustmentDto {
  id: string;
  tenantId: string;
  warehouseId: string;
  ingredientId: string;
  adjustmentType: string;
  quantity: number;
  reason: string | null;
  metadata: InventoryRecord;
  createdAt: string;
}

export interface StockReservationDto {
  id: string;
  tenantId: string;
  warehouseId: string;
  ingredientId: string;
  sourceType: string;
  sourceId: string;
  quantity: number;
  status: string;
  expiresAt: string | null;
  metadata: InventoryRecord;
  createdAt: string;
  updatedAt: string;
}

export interface StockLedgerEntryDto {
  id: string;
  tenantId: string;
  warehouseId: string;
  ingredientId: string;
  entryType: string;
  quantity: number;
  balanceAfter: number;
  sourceType: string;
  sourceId: string;
  metadata: InventoryRecord;
  createdAt: string;
}

export interface StopListRuleDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  warehouseId: string | null;
  ingredientId: string | null;
  sku: string | null;
  ruleType: string;
  threshold: number;
  isActive: boolean;
  metadata: InventoryRecord;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAvailabilityDto {
  productId: string;
  variantId: string | null;
  warehouseId: string;
  ingredientBreakdown: Array<{
    ingredientId: string;
    ingredientCode: string;
    requiredQuantity: number;
    onHand: number;
    reserved: number;
    available: number;
  }>;
  availableUnits: number;
}

export interface InventoryOperationsOverviewDto {
  tenantId: string;
  storeId: string | null;
  summary: {
    warehouseCount: number;
    activeWarehouseCount: number;
    ingredientCount: number;
    itemCount: number;
    lowStockItemCount: number;
    reservationCount: number;
    activeReservationCount: number;
    receivingCount: number;
    openReceivingCount: number;
    completedReceivingCount: number;
    stopListRuleCount: number;
    activeStopListRuleCount: number;
    ledgerEntryCount: number;
  };
  quantities: {
    onHand: number;
    reserved: number;
    available: number;
  };
  statuses: {
    reservations: Record<string, number>;
    receivings: Record<string, number>;
  };
  latest: {
    receiving: ReceivingRecordDto | null;
    reservation: StockReservationDto | null;
    lowStockItem: InventoryItemDto | null;
    stopListRule: StopListRuleDto | null;
    ledgerEntry: StockLedgerEntryDto | null;
  };
  coverage: {
    warehouseIds: string[];
    ingredientIds: string[];
    skuList: string[];
  };
}

export interface InventoryReplenishmentRecommendationDto {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  sku: string | null;
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number;
  lowStockThreshold: number;
  targetQuantity: number;
  recommendedOrderQuantity: number;
  activeStopListRuleCount: number;
  lastCompletedReceivingAt: string | null;
  lastUnitCost: string | null;
}

export interface InventoryReplenishmentReportDto {
  tenantId: string;
  storeId: string | null;
  warehouseId: string | null;
  generatedAt: string;
  summary: {
    recommendationCount: number;
    totalRecommendedOrderQuantity: number;
    blockedByStopListCount: number;
  };
  recommendations: InventoryReplenishmentRecommendationDto[];
}

export interface InventoryLedgerDrilldownDto {
  tenantId: string;
  filters: {
    warehouseId: string | null;
    ingredientId: string | null;
    limit: number;
  };
  totals: {
    entryCount: number;
    inboundQuantity: number;
    outboundQuantity: number;
    netQuantity: number;
  };
  byEntryType: Record<string, { count: number; quantity: number }>;
  entries: StockLedgerEntryDto[];
}

export interface InventoryReplenishmentJobDto {
  id: string;
  tenantId: string;
  storeId: string | null;
  warehouseId: string | null;
  status: string;
  summary: {
    recommendationCount: number;
    totalRecommendedOrderQuantity: number;
    blockedByStopListCount: number;
  };
  artifact: InventoryRecord;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryReplenishmentJobExportRowDto {
  warehouseCode: string;
  warehouseName: string;
  ingredientCode: string;
  ingredientName: string;
  sku: string | null;
  available: number;
  reorderPoint: number;
  targetQuantity: number;
  recommendedOrderQuantity: number;
  lastUnitCost: string | null;
}

export interface InventoryReplenishmentJobExportDto {
  jobId: string;
  status: string;
  generatedAt: string;
  filename: string;
  contentType: string;
  rowCount: number;
  rows: InventoryReplenishmentJobExportRowDto[];
  content: string;
}

export interface InventoryReplenishmentJobReceiptDto {
  job: InventoryReplenishmentJobDto;
  receiving: ReceivingRecordDto;
}

export interface InventorySupplierConnectorExecutionDto {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  connectorKind: "SUPPLIER_ADAPTER";
  connectorKey: string;
  action: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  requestPayload: InventoryRecord | null;
  responsePayload: InventoryRecord | null;
  errorMessage: string | null;
  providerErrorClass?: string | null;
  retryClass?: string | null;
  providerExecutionPhase?: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface InventorySupplierConnectorDto {
  id: string;
  tenantId: string | null;
  organizationId: string | null;
  connectorKey: string;
  version: string;
  status: string;
  manifest: InventoryRecord;
  providerAdapterKey?: string | null;
  providerAdapterName?: string | null;
  providerAdapterVersion?: string | null;
  providerAdapterVisibility?: string | null;
  providerAdapterDefaultPolicyVisible?: boolean | null;
  providerAdapter?: InventoryRecord | null;
  providerProfileKey?: string | null;
  providerProfileName?: string | null;
  providerProfileVersion?: string | null;
  providerProfileVisibility?: string | null;
  providerProfileDefaultPolicyVisible?: boolean | null;
  providerProfile?: InventoryRecord | null;
  providerPolicyKey?: string | null;
  providerPolicy?: InventoryRecord | null;
  providerPolicySummary?: InventoryRecord | null;
  activation?: {
    required: boolean;
    implicit: boolean;
    status: string;
    requestId: string | null;
    publicationId: string | null;
    approvedAt: string | null;
    appliedAt: string | null;
    revokedAt: string | null;
    reason: string | null;
  } | null;
  installation?: {
    source: string | null;
    activationRequestId: string | null;
    publicationId: string | null;
    connectorTemplateId: string | null;
    sourceRegistryEntryId: string | null;
    installedAt: string | null;
    installMode: string | null;
    targetStoreId: string | null;
    governanceStatus?: string | null;
    governanceReason?: string | null;
    driftStatus?: string | null;
    lastGovernanceEvaluationAt?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventorySupplierProviderProfileDto {
  key: string;
  name: string;
  description: string;
  transportMode: "HTTP_PUSH" | "WEBHOOK" | "FILE_IMPORT";
  payloadShape: "DEFAULT" | "ORDER_ENVELOPE" | "FILE_BATCH";
  providerPolicyKey?: string | null;
  providerPolicy?: InventoryRecord | null;
  providerPolicySummary?: InventoryRecord | null;
  defaults: InventoryRecord;
  id?: string;
  providerProfileKey?: string;
  providerProfileName?: string;
  providerProfileVersion?: string | null;
  providerProfileVisibility?: string | null;
  providerProfileDefaultPolicyVisible?: boolean | null;
  status?: string | null;
  defaultPolicy?: InventoryRecord | null;
  defaultPolicySummary?: InventoryRecord | null;
}

export interface InventorySupplierProviderAdapterDto {
  key: string;
  name: string;
  description: string;
  version: string;
  visibility: "VISIBLE" | "INTERNAL";
  defaultPolicyVisible: boolean;
  providerProfileKey: string;
  transportMode: "HTTP_PUSH" | "WEBHOOK" | "FILE_IMPORT";
  providerPolicyKey?: string | null;
  providerPolicy?: InventoryRecord | null;
  providerPolicySummary?: InventoryRecord | null;
  payloadVariant:
    | "DEFAULT"
    | "ORDER_ENVELOPE"
    | "FILE_BATCH"
    | "FRESHLANE_ORDER"
    | "WAREDROP_BATCH"
    | "SIGNAL_EVENT";
  defaults: InventoryRecord;
  id?: string;
  providerAdapterKey?: string;
  providerAdapterName?: string;
  providerAdapterVersion?: string;
  providerAdapterVisibility?: string;
  providerAdapterDefaultPolicyVisible?: boolean;
  status?: string | null;
  defaultPolicy?: InventoryRecord | null;
  defaultPolicySummary?: InventoryRecord | null;
}

export interface InventorySupplierProviderRuntimePolicyDto {
  key: string;
  name: string;
  description: string;
  riskLevel: "STANDARD" | "ELEVATED" | "STRICT";
  executionModel: "INLINE_PUSH" | "FILE_EXCHANGE" | "SIGNED_CALLBACK";
  adapterKeys: string[];
  profileKeys: string[];
  distribution: InventoryRecord;
  activation: InventoryRecord;
  runtime: InventoryRecord;
  summary: InventoryRecord;
}

export interface InventorySupplierOperationsOverviewDto {
  tenantId: string;
  storeId: string | null;
  summary: {
    connectorCount: number;
    supplierJobCount: number;
    retryQueuedCount: number;
    retryDispatchedCount: number;
    retryCompletedCount: number;
    deadLetterCount: number;
    terminalCount: number;
    pendingCallbackCount: number;
    pendingImportCount: number;
    pendingPushCount: number;
    failedCount: number;
  };
  byTransportMode: Record<string, number>;
  byConnector: Array<{
    connectorKey: string;
    transportMode: string;
    totalJobs: number;
    retryQueuedCount: number;
    deadLetterCount: number;
    failedCount: number;
    latestSupplierStatus: string | null;
    latestExecutionAt: string | null;
  }>;
  recentFailures: Array<{
    jobId: string;
    connectorKey: string | null;
    transportMode: string;
    code: string | null;
    reason: string | null;
    failedAt: string | null;
    retryState: string | null;
  }>;
  dueRetries: Array<{
    jobId: string;
    connectorKey: string | null;
    source: string | null;
    nextRetryAt: string;
    retryAttemptCount: number;
    terminal: boolean;
  }>;
  deadLetters: Array<{
    jobId: string;
    connectorKey: string | null;
    code: string | null;
    reason: string | null;
    deadLetterAt: string;
  }>;
  worker: InventorySupplierRetryWorkerStatusDto;
}

export interface InventorySupplierProviderRuntimeOverviewDto {
  tenantId: string;
  storeId: string | null;
  summary: {
    connectorCount: number;
    runtimeGroupCount: number;
    supplierJobCount: number;
    readyExecutionCount: number;
    warnExecutionCount: number;
    blockedExecutionCount: number;
    suspendedExecutionCount: number;
    retryableFailureCount: number;
    terminalFailureCount: number;
  };
  items: Array<{
    providerAdapterKey: string | null;
    providerAdapterName: string | null;
    providerProfileKey: string | null;
    providerPolicyKey: string | null;
    transportMode: string;
    executionPolicyStatus: string | null;
    connectorCount: number;
    supplierJobCount: number;
    successCount: number;
    failedCount: number;
    retryableFailureCount: number;
    terminalFailureCount: number;
    latestExecutionAt: string | null;
    failureClasses: Record<string, number>;
    retryClasses: Record<string, number>;
    executionPhases: Record<string, number>;
  }>;
}

export interface InventorySupplierConnectorActivationStateDto {
  connectorKey: string;
  version: string;
  tenantId: string | null;
  activationRequired: boolean;
  activationStatus: string;
  activationState: string;
  activationRequestId: string | null;
  activationPublicationId: string | null;
  readiness: string;
  reason: string | null;
  appliedAt: string | null;
  approvedAt: string | null;
  revokedAt: string | null;
  installationSource?: string | null;
  installedRegistryEntryId?: string | null;
  installedAt?: string | null;
  installMode?: string | null;
  installationTargetStoreId?: string | null;
  rolloutGovernanceStatus?: string | null;
  rolloutGovernanceReason?: string | null;
  rolloutDriftStatus?: string | null;
  providerPolicyKey?: string | null;
  providerPolicySummary?: InventoryRecord | null;
}

export interface InventorySupplierConnectorReadinessDto {
  tenantId: string;
  storeId: string | null;
  summary: {
    connectorCount: number;
    readyCount: number;
    blockedCount: number;
    warnCount: number;
  };
  items: Array<{
    connectorKey: string;
    version: string;
    status: "READY" | "BLOCKED" | "WARN";
    transportMode: string;
    providerAdapterKey: string | null;
    providerAdapterName: string | null;
    providerAdapterVersion: string | null;
    providerAdapterVisibility: string | null;
    providerAdapterDefaultPolicyVisible: boolean | null;
    providerAdapter: InventoryRecord | null;
    providerProfileKey: string | null;
    providerProfileName: string | null;
    providerProfileVersion: string | null;
    providerProfileVisibility: string | null;
    providerProfileDefaultPolicyVisible: boolean | null;
    providerProfile: InventoryRecord | null;
    providerPolicyKey: string | null;
    providerPolicy: InventoryRecord | null;
    providerPolicySummary: InventoryRecord | null;
    reason: string | null;
    checks: Array<{
      code: string;
      status: "BLOCKED" | "WARN";
      message: string;
    }>;
    onboarding: {
      endpointRequired: boolean;
      endpointConfigured: boolean;
      authSecretRequired: boolean;
      authSecretKeyRef: string | null;
      authSecretResolved: boolean;
      callbackPathRequired: boolean;
      callbackPathConfigured: boolean;
      signatureSecretRequired: boolean;
      signatureSecretKeyRef: string | null;
      signatureSecretResolved: boolean;
      importPathsRequired: boolean;
      pickupPathConfigured: boolean;
      dropPathConfigured: boolean;
    };
    activation?: {
      required: boolean;
      implicit: boolean;
      status: string;
      requestId: string | null;
      publicationId: string | null;
      approvedAt: string | null;
      appliedAt: string | null;
      revokedAt: string | null;
      reason: string | null;
    } | null;
    installation?: {
      source: string | null;
      activationRequestId: string | null;
      publicationId: string | null;
      connectorTemplateId: string | null;
      sourceRegistryEntryId: string | null;
      installedAt: string | null;
      installMode: string | null;
      targetStoreId: string | null;
      governanceStatus?: string | null;
      governanceReason?: string | null;
      driftStatus?: string | null;
      lastGovernanceEvaluationAt?: string | null;
    } | null;
  }>;
}

export interface InventorySupplierExecutionReadinessDto {
  jobId: string;
  tenantId: string;
  storeId: string | null;
  connectorKey: string | null;
  transportMode: string | null;
  status: "READY" | "WARN" | "BLOCKED" | "SUSPENDED";
  canExecute: boolean;
  providerAdapterKey: string | null;
  providerAdapterName: string | null;
  providerProfileKey: string | null;
  providerPolicyKey: string | null;
  providerPolicy: InventoryRecord | null;
  providerCompatibility: InventoryRecord | null;
  executionPolicy: InventoryRecord | null;
  blockingIssues: string[];
  warnings: string[];
  checks: Array<{
    code: string;
    status: "READY" | "WARN" | "BLOCKED" | "SUSPENDED";
    message: string;
  }>;
  failure: {
    providerErrorClass: string | null;
    retryClass: string | null;
    providerExecutionPhase: string | null;
    deadLetterReasonCode: string | null;
  };
  staging: InventoryRecord | null;
}

export class ListInventoryQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

export class InventoryReplenishmentReportQueryDto extends ListInventoryQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

export class InventoryLedgerDrilldownQueryDto extends ListInventoryQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CreateInventoryReplenishmentJobDto extends InventoryReplenishmentReportQueryDto {}

export class InventoryReplenishmentJobExportQueryDto {
  @ApiPropertyOptional({ enum: ["csv", "json"], default: "csv" })
  @IsOptional()
  @IsIn(["csv", "json"])
  format?: "csv" | "json";
}

export class InventorySupplierConnectorQueryDto extends ListInventoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  connectorKey?: string;
}

export class InventorySupplierDeadLetterListQueryDto extends ListInventoryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class HandoffInventoryReplenishmentJobDto {
  @ApiProperty()
  @IsString()
  supplierName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierReference?: string;

  @ApiPropertyOptional({ default: "MANUAL" })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  connectorKey?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateInventoryReplenishmentSupplierStatusDto {
  @ApiProperty({ enum: ["SUBMITTED", "ACKNOWLEDGED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] })
  @IsString()
  @IsIn(["SUBMITTED", "ACKNOWLEDGED", "IN_TRANSIT", "DELIVERED", "CANCELLED"])
  supplierStatus!: "SUBMITTED" | "ACKNOWLEDGED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class SyncInventoryReplenishmentSupplierStatusDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class ProcessInventoryReplenishmentSupplierWebhookDto {
  @ApiProperty()
  @IsString()
  deliveryId!: string;

  @ApiProperty({ enum: ["SUBMITTED", "ACKNOWLEDGED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] })
  @IsString()
  @IsIn(["SUBMITTED", "ACKNOWLEDGED", "IN_TRANSIT", "DELIVERED", "CANCELLED"])
  supplierStatus!: "SUBMITTED" | "ACKNOWLEDGED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  externalReference?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  eventType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  signature?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  @IsOptional()
  @IsObject()
  payload?: InventoryRecord | null;
}

export class ImportInventoryReplenishmentSupplierUpdateDto {
  @ApiProperty()
  @IsString()
  importId!: string;

  @ApiProperty({ enum: ["SUBMITTED", "ACKNOWLEDGED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] })
  @IsString()
  @IsIn(["SUBMITTED", "ACKNOWLEDGED", "IN_TRANSIT", "DELIVERED", "CANCELLED"])
  supplierStatus!: "SUBMITTED" | "ACKNOWLEDGED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  externalReference?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  fileName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  checksum?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  @IsOptional()
  @IsObject()
  payload?: InventoryRecord | null;
}

export class ReplayInventoryReplenishmentSupplierReconciliationDto {
  @ApiPropertyOptional({ enum: ["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"], nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"])
  source?: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  replayId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class QueueInventoryReplenishmentSupplierRetryDto {
  @ApiPropertyOptional({ enum: ["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"], nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"])
  source?: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 1440, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  delayMinutes?: number;
}

export class DispatchInventoryReplenishmentSupplierRetryDto {
  @ApiPropertyOptional({ enum: ["MANUAL", "WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"], nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(["MANUAL", "WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"])
  source?: "MANUAL" | "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class QueueInventoryReplenishmentSupplierRetrySweepDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ enum: ["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"], nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"])
  source?: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 1440, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  delayMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class InventorySupplierRetrySweepResultDto {
  @ApiProperty()
  considered!: number;

  @ApiProperty()
  queued!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty({ type: [String] })
  queuedJobIds!: string[];

  @ApiProperty({ type: [String] })
  skippedJobIds!: string[];
}

export class RunInventoryReplenishmentSupplierRetrySweepDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ enum: ["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"], nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"])
  source?: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class InventorySupplierRetryRunResultDto {
  @ApiProperty()
  considered!: number;

  @ApiProperty()
  processed!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty({ type: [String] })
  processedJobIds!: string[];

  @ApiProperty({ type: [String] })
  skippedJobIds!: string[];
}

export class InventorySupplierRetryWorkerStatusDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  paused!: boolean;

  @ApiProperty()
  running!: boolean;

  @ApiProperty({ nullable: true })
  tenantId!: string | null;

  @ApiProperty({ nullable: true })
  storeId!: string | null;

  @ApiProperty({ enum: ["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"], nullable: true })
  source!: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH" | null;

  @ApiProperty()
  intervalMs!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty({ nullable: true })
  lastRunAt!: string | null;

  @ApiProperty({ nullable: true })
  lastSuccessAt!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  lastResult!: Record<string, number> | null;

  @ApiProperty({ nullable: true })
  lastError!: string | null;

  @ApiProperty({ nullable: true })
  pauseReason!: string | null;

  @ApiProperty({ nullable: true })
  lastPausedAt!: string | null;

  @ApiProperty({ nullable: true })
  lastResumedAt!: string | null;
}

export class InventorySupplierRetryWorkerPauseDto {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  tenantId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class InventorySupplierRetryWorkerResumeDto {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  tenantId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class InventorySupplierRetryWorkerRunNowDto {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  tenantId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ enum: ["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"], nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"])
  source?: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ReopenInventorySupplierDeadLetterDto {
  @ApiPropertyOptional({ enum: ["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"], nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(["WEBHOOK", "FILE_IMPORT", "HTTP_PUSH"])
  source?: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 1440, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  delayMinutes?: number;
}

export class InventorySupplierFilePickupDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  connectorKey!: string;

  @ApiProperty()
  transportMode!: "FILE_IMPORT";

  @ApiProperty({ nullable: true })
  externalReference!: string | null;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty({ nullable: true })
  pickupPath!: string | null;

  @ApiProperty({ nullable: true })
  dropPath!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  staging?: InventoryRecord | null;

  @ApiProperty()
  content!: string;
}

export class DropInventoryReplenishmentSupplierFileDto {
  @ApiProperty()
  @IsString()
  importId!: string;

  @ApiProperty({ enum: ["SUBMITTED", "ACKNOWLEDGED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] })
  @IsString()
  @IsIn(["SUBMITTED", "ACKNOWLEDGED", "IN_TRANSIT", "DELIVERED", "CANCELLED"])
  supplierStatus!: "SUBMITTED" | "ACKNOWLEDGED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  externalReference?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  fileName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  contentType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  checksum?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  @IsOptional()
  @IsObject()
  payload?: InventoryRecord | null;
}

export class ReceiveInventoryReplenishmentJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  receivedBy?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoComplete?: boolean;
}

export class CreateWarehouseDto {
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

  @ApiPropertyOptional({ default: "GENERAL" })
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class UpdateWarehouseDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class CreateIngredientDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ default: "UNIT" })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  lowStockThreshold?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class UpdateIngredientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lowStockThreshold?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class CreateInventoryItemDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  ingredientId!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  onHand?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  reserved?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  reorderPoint?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  onHand?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reserved?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reorderPoint?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class CreateRecipeBomDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  ingredientId!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class CreateReceivingLineDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  ingredientId!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  unitCost?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class CreateReceivingDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsString()
  reference!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  receivedBy?: string | null;

  @ApiPropertyOptional({ type: [CreateReceivingLineDto] })
  @IsOptional()
  @IsArray()
  lines?: CreateReceivingLineDto[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class CompleteReceivingDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  receivedBy?: string | null;
}

export class CreateInventoryAdjustmentDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  ingredientId!: string;

  @ApiProperty({ enum: ["ADD", "REMOVE", "SET"] })
  @IsIn(["ADD", "REMOVE", "SET"])
  adjustmentType!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class CreateStockReservationDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  ingredientId!: string;

  @ApiProperty()
  @IsString()
  sourceType!: string;

  @ApiProperty()
  @IsString()
  sourceId!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class CreateStopListRuleDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  warehouseId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  ingredientId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiProperty()
  @IsString()
  ruleType!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}

export class UpdateStopListRuleDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruleType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: InventoryRecord | null;
}
