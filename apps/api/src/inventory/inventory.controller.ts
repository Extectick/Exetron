import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { RequestContext } from "@exetron/types";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import {
  CompleteReceivingDto,
  CreateIngredientDto,
  CreateInventoryAdjustmentDto,
  CreateInventoryItemDto,
  CreateInventoryReplenishmentJobDto,
  CreateRecipeBomDto,
  CreateReceivingDto,
  CreateStockReservationDto,
  CreateStopListRuleDto,
  CreateWarehouseDto,
  HandoffInventoryReplenishmentJobDto,
  InventoryOperationsOverviewDto,
  InventorySupplierOperationsOverviewDto,
  InventorySupplierProviderRuntimeOverviewDto,
  InventoryAvailabilityDto,
  InventoryAdjustmentDto,
  InventoryLedgerDrilldownDto,
  InventoryLedgerDrilldownQueryDto,
  InventoryIngredientDto,
  InventoryItemDto,
  InventorySupplierConnectorExecutionDto,
  InventorySupplierConnectorDto,
  InventorySupplierConnectorReadinessDto,
  InventorySupplierProviderAdapterDto,
  InventorySupplierProviderRuntimePolicyDto,
  InventorySupplierProviderProfileDto,
  InventorySupplierFilePickupDto,
  InventorySupplierDeadLetterListQueryDto,
  InventorySupplierRetryWorkerStatusDto,
  InventorySupplierRetryWorkerPauseDto,
  InventorySupplierRetryWorkerResumeDto,
  InventorySupplierRetryWorkerRunNowDto,
  InventorySupplierConnectorQueryDto,
  InventorySupplierRetryRunResultDto,
  InventorySupplierRetrySweepResultDto,
  InventorySupplierExecutionReadinessDto,
  DispatchInventoryReplenishmentSupplierRetryDto,
  DropInventoryReplenishmentSupplierFileDto,
  ImportInventoryReplenishmentSupplierUpdateDto,
  InventoryReplenishmentJobExportQueryDto,
  InventoryReplenishmentJobReceiptDto,
  InventoryReplenishmentJobExportDto,
  InventoryReplenishmentReportDto,
  InventoryReplenishmentJobDto,
  InventoryReplenishmentReportQueryDto,
  InventoryWarehouseDto,
  ListInventoryQueryDto,
  RecipeBomDto,
  ReceivingRecordDto,
  StockLedgerEntryDto,
  StockReservationDto,
  StopListRuleDto,
  ReceiveInventoryReplenishmentJobDto,
  ReopenInventorySupplierDeadLetterDto,
  QueueInventoryReplenishmentSupplierRetryDto,
  QueueInventoryReplenishmentSupplierRetrySweepDto,
  ReplayInventoryReplenishmentSupplierReconciliationDto,
  RunInventoryReplenishmentSupplierRetrySweepDto,
  ProcessInventoryReplenishmentSupplierWebhookDto,
  SyncInventoryReplenishmentSupplierStatusDto,
  UpdateInventoryReplenishmentSupplierStatusDto,
  UpdateIngredientDto,
  UpdateInventoryItemDto,
  UpdateStopListRuleDto,
  UpdateWarehouseDto
} from "./inventory.dto";
import { InventoryPermissions, InventoryPermissionsGuard } from "./inventory.guard";
import { InventoryRetryWorkerService } from "./inventory-retry-worker.service";
import { InventoryService } from "./inventory.service";

@UseGuards(InventoryPermissionsGuard)
@Controller("inventory")
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryRetryWorkerService: InventoryRetryWorkerService
  ) {}

  @Get("overview")
  @InventoryPermissions("inventory.read")
  getOverview(@CurrentContext() context: RequestContext, @Query() query: ListInventoryQueryDto) {
    return this.inventoryService.getOverview(context, query);
  }

  @Get("operations-overview")
  @InventoryPermissions("inventory.read")
  getOperationsOverview(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<InventoryOperationsOverviewDto> {
    return this.inventoryService.getOperationsOverview(context, query);
  }

  @Get("replenishment-report")
  @InventoryPermissions("inventory.read")
  getReplenishmentReport(
    @CurrentContext() context: RequestContext,
    @Query() query: InventoryReplenishmentReportQueryDto
  ): Promise<InventoryReplenishmentReportDto> {
    return this.inventoryService.getReplenishmentReport(context, query);
  }

  @Get("ledger-drilldown")
  @InventoryPermissions("inventory.read")
  getLedgerDrilldown(
    @CurrentContext() context: RequestContext,
    @Query() query: InventoryLedgerDrilldownQueryDto
  ): Promise<InventoryLedgerDrilldownDto> {
    return this.inventoryService.getLedgerDrilldown(context, query);
  }

  @Get("replenishment-jobs")
  @InventoryPermissions("inventory.read")
  listReplenishmentJobs(
    @CurrentContext() context: RequestContext,
    @Query() query: InventoryReplenishmentReportQueryDto
  ): Promise<InventoryReplenishmentJobDto[]> {
    return this.inventoryService.listReplenishmentJobs(context, query);
  }

  @Get("supplier-connectors")
  @InventoryPermissions("inventory.read")
  listSupplierConnectors(
    @CurrentContext() context: RequestContext,
    @Query() query: InventorySupplierConnectorQueryDto
  ): Promise<InventorySupplierConnectorDto[]> {
    return this.inventoryService.listSupplierConnectors(context, query);
  }

  @Get("supplier-provider-profiles")
  @InventoryPermissions("inventory.read")
  listSupplierProviderProfiles(): InventorySupplierProviderProfileDto[] {
    return this.inventoryService.listSupplierProviderProfiles();
  }

  @Get("supplier-provider-adapters")
  @InventoryPermissions("inventory.read")
  listSupplierProviderAdapters(): InventorySupplierProviderAdapterDto[] {
    return this.inventoryService.listSupplierProviderAdapters();
  }

  @Get("supplier-provider-policies")
  @InventoryPermissions("inventory.read")
  listSupplierProviderPolicies(): InventorySupplierProviderRuntimePolicyDto[] {
    return this.inventoryService.listSupplierProviderPolicies();
  }

  @Get("supplier-connector-readiness")
  @InventoryPermissions("inventory.read")
  getSupplierConnectorReadiness(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<InventorySupplierConnectorReadinessDto> {
    return this.inventoryService.getSupplierConnectorReadiness(context, query);
  }

  @Get("supplier-connector-activation-state")
  @InventoryPermissions("inventory.read")
  listSupplierConnectorActivationState(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ) {
    return this.inventoryService.listSupplierConnectorActivationState(context, query);
  }

  @Get("supplier-retry-worker-status")
  @InventoryPermissions("inventory.read")
  getSupplierRetryWorkerStatus(): InventorySupplierRetryWorkerStatusDto {
    return this.inventoryRetryWorkerService.getStatus();
  }

  @Get("supplier-operations-overview")
  @InventoryPermissions("inventory.read")
  getSupplierOperationsOverview(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<InventorySupplierOperationsOverviewDto> {
    return this.inventoryService.getSupplierOperationsOverview(
      context,
      query,
      this.inventoryRetryWorkerService.getStatus()
    );
  }

  @Get("supplier-provider-runtime-overview")
  @InventoryPermissions("inventory.read")
  getSupplierProviderRuntimeOverview(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<InventorySupplierProviderRuntimeOverviewDto> {
    return this.inventoryService.getSupplierProviderRuntimeOverview(context, query);
  }

  @Get("supplier-dead-letters")
  @InventoryPermissions("inventory.read")
  listSupplierDeadLetters(
    @CurrentContext() context: RequestContext,
    @Query() query: InventorySupplierDeadLetterListQueryDto
  ): Promise<InventoryReplenishmentJobDto[]> {
    return this.inventoryService.listSupplierDeadLetters(context, query);
  }

  @Post("supplier-retry-worker/run-now")
  @InventoryPermissions("inventory.write")
  runSupplierRetryWorkerNow(
    @CurrentContext() context: RequestContext,
    @Body() dto: InventorySupplierRetryWorkerRunNowDto
  ): Promise<InventorySupplierRetryRunResultDto> {
    return this.inventoryRetryWorkerService.runNow(context, dto);
  }

  @Post("supplier-retry-worker/pause")
  @InventoryPermissions("inventory.write")
  pauseSupplierRetryWorker(
    @Body() dto: InventorySupplierRetryWorkerPauseDto
  ): InventorySupplierRetryWorkerStatusDto {
    return this.inventoryRetryWorkerService.pause(dto.reason ?? dto.note ?? null);
  }

  @Post("supplier-retry-worker/resume")
  @InventoryPermissions("inventory.write")
  resumeSupplierRetryWorker(
    @Body() dto: InventorySupplierRetryWorkerResumeDto
  ): InventorySupplierRetryWorkerStatusDto {
    return this.inventoryRetryWorkerService.resume(dto.reason ?? dto.note ?? null);
  }

  @Post("replenishment-jobs")
  @InventoryPermissions("inventory.write")
  createReplenishmentJob(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateInventoryReplenishmentJobDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.createReplenishmentJob(context, dto);
  }

  @Get("replenishment-jobs/:id")
  @InventoryPermissions("inventory.read")
  getReplenishmentJob(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.getReplenishmentJob(context, params.id);
  }

  @Post("replenishment-jobs/:id/approve")
  @InventoryPermissions("inventory.write")
  approveReplenishmentJob(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.approveReplenishmentJob(context, params.id);
  }

  @Post("replenishment-jobs/:id/dispatch")
  @InventoryPermissions("inventory.write")
  dispatchReplenishmentJob(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.dispatchReplenishmentJob(context, params.id);
  }

  @Get("replenishment-jobs/:id/export")
  @InventoryPermissions("inventory.read")
  exportReplenishmentJob(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Query() query: InventoryReplenishmentJobExportQueryDto
  ): Promise<InventoryReplenishmentJobExportDto> {
    return this.inventoryService.exportReplenishmentJob(context, params.id, query);
  }

  @Post("replenishment-jobs/:id/handoff")
  @InventoryPermissions("inventory.write")
  handoffReplenishmentJob(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: HandoffInventoryReplenishmentJobDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.handoffReplenishmentJob(context, params.id, dto);
  }

  @Post("replenishment-jobs/:id/supplier-status")
  @InventoryPermissions("inventory.write")
  updateReplenishmentSupplierStatus(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateInventoryReplenishmentSupplierStatusDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.updateReplenishmentSupplierStatus(context, params.id, dto);
  }

  @Post("replenishment-jobs/:id/supplier-sync")
  @InventoryPermissions("inventory.write")
  syncReplenishmentSupplierStatus(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: SyncInventoryReplenishmentSupplierStatusDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.syncReplenishmentSupplierStatus(context, params.id, dto);
  }

  @Post("replenishment-jobs/:id/supplier-webhook")
  @InventoryPermissions("inventory.write")
  processReplenishmentSupplierWebhook(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: ProcessInventoryReplenishmentSupplierWebhookDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.processReplenishmentSupplierWebhook(context, params.id, dto);
  }

  @Post("replenishment-jobs/:id/supplier-import")
  @InventoryPermissions("inventory.write")
  importReplenishmentSupplierUpdate(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: ImportInventoryReplenishmentSupplierUpdateDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.importReplenishmentSupplierUpdate(context, params.id, dto);
  }

  @Get("replenishment-jobs/:id/supplier-file-pickup")
  @InventoryPermissions("inventory.read")
  getReplenishmentSupplierFilePickup(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<InventorySupplierFilePickupDto> {
    return this.inventoryService.getReplenishmentSupplierFilePickup(context, params.id);
  }

  @Post("replenishment-jobs/:id/supplier-file-drop")
  @InventoryPermissions("inventory.write")
  dropReplenishmentSupplierFile(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: DropInventoryReplenishmentSupplierFileDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.dropReplenishmentSupplierFile(context, params.id, dto);
  }

  @Post("replenishment-jobs/:id/supplier-replay")
  @InventoryPermissions("inventory.write")
  replayReplenishmentSupplierReconciliation(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: ReplayInventoryReplenishmentSupplierReconciliationDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.replayReplenishmentSupplierReconciliation(context, params.id, dto);
  }

  @Post("replenishment-jobs/:id/supplier-retry-queue")
  @InventoryPermissions("inventory.write")
  queueReplenishmentSupplierRetry(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: QueueInventoryReplenishmentSupplierRetryDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.queueReplenishmentSupplierRetry(context, params.id, dto);
  }

  @Get("replenishment-jobs/:id/supplier-execution-readiness")
  @InventoryPermissions("inventory.read")
  getReplenishmentSupplierExecutionReadiness(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<InventorySupplierExecutionReadinessDto> {
    return this.inventoryService.getReplenishmentSupplierExecutionReadiness(context, params.id);
  }

  @Post("replenishment-jobs/:id/supplier-retry-dispatch")
  @InventoryPermissions("inventory.write")
  dispatchReplenishmentSupplierRetry(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: DispatchInventoryReplenishmentSupplierRetryDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.dispatchReplenishmentSupplierRetry(context, params.id, dto);
  }

  @Post("replenishment-jobs/:id/supplier-dead-letter-reopen")
  @InventoryPermissions("inventory.write")
  reopenReplenishmentSupplierDeadLetter(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: ReopenInventorySupplierDeadLetterDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.reopenReplenishmentSupplierDeadLetter(context, params.id, dto);
  }

  @Post("replenishment-jobs/supplier-retry-sweep")
  @InventoryPermissions("inventory.write")
  queueReplenishmentSupplierRetrySweep(
    @CurrentContext() context: RequestContext,
    @Body() dto: QueueInventoryReplenishmentSupplierRetrySweepDto
  ): Promise<InventorySupplierRetrySweepResultDto> {
    return this.inventoryService.queueReplenishmentSupplierRetrySweep(context, dto);
  }

  @Post("replenishment-jobs/supplier-retry-run-due")
  @InventoryPermissions("inventory.write")
  runDueReplenishmentSupplierRetries(
    @CurrentContext() context: RequestContext,
    @Body() dto: RunInventoryReplenishmentSupplierRetrySweepDto
  ): Promise<InventorySupplierRetryRunResultDto> {
    return this.inventoryService.runDueReplenishmentSupplierRetries(context, dto);
  }

  @Get("replenishment-jobs/:id/connector-executions")
  @InventoryPermissions("inventory.read")
  listReplenishmentConnectorExecutions(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<InventorySupplierConnectorExecutionDto[]> {
    return this.inventoryService.listReplenishmentConnectorExecutions(context, params.id);
  }

  @Post("replenishment-jobs/:id/receive")
  @InventoryPermissions("inventory.write")
  receiveReplenishmentJob(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: ReceiveInventoryReplenishmentJobDto
  ): Promise<InventoryReplenishmentJobReceiptDto> {
    return this.inventoryService.receiveReplenishmentJob(context, params.id, dto);
  }

  @Post("replenishment-jobs/:id/archive")
  @InventoryPermissions("inventory.write")
  archiveReplenishmentJob(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<InventoryReplenishmentJobDto> {
    return this.inventoryService.archiveReplenishmentJob(context, params.id);
  }

  @Get("warehouses")
  @InventoryPermissions("inventory.read")
  listWarehouses(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<InventoryWarehouseDto[]> {
    return this.inventoryService.listWarehouses(context, query.tenantId);
  }

  @Post("warehouses")
  @InventoryPermissions("inventory.write")
  createWarehouse(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateWarehouseDto
  ): Promise<InventoryWarehouseDto> {
    return this.inventoryService.createWarehouse(context, dto);
  }

  @Patch("warehouses/:id")
  @InventoryPermissions("inventory.write")
  updateWarehouse(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateWarehouseDto
  ): Promise<InventoryWarehouseDto> {
    return this.inventoryService.updateWarehouse(context, params.id, dto);
  }

  @Get("ingredients")
  @InventoryPermissions("inventory.read")
  listIngredients(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<InventoryIngredientDto[]> {
    return this.inventoryService.listIngredients(context, query.tenantId);
  }

  @Post("ingredients")
  @InventoryPermissions("inventory.write")
  createIngredient(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateIngredientDto
  ): Promise<InventoryIngredientDto> {
    return this.inventoryService.createIngredient(context, dto);
  }

  @Patch("ingredients/:id")
  @InventoryPermissions("inventory.write")
  updateIngredient(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateIngredientDto
  ): Promise<InventoryIngredientDto> {
    return this.inventoryService.updateIngredient(context, params.id, dto);
  }

  @Get("items")
  @InventoryPermissions("inventory.read")
  listItems(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<InventoryItemDto[]> {
    return this.inventoryService.listItems(context, query.tenantId);
  }

  @Post("items")
  @InventoryPermissions("inventory.write")
  createItem(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateInventoryItemDto
  ): Promise<InventoryItemDto> {
    return this.inventoryService.createItem(context, dto);
  }

  @Post("adjustments")
  @InventoryPermissions("inventory.write")
  createAdjustment(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateInventoryAdjustmentDto
  ): Promise<InventoryAdjustmentDto> {
    return this.inventoryService.createAdjustment(context, dto);
  }

  @Patch("items/:id")
  @InventoryPermissions("inventory.write")
  updateItem(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateInventoryItemDto
  ): Promise<InventoryItemDto> {
    return this.inventoryService.updateItem(context, params.id, dto);
  }

  @Get("recipe-boms")
  @InventoryPermissions("inventory.read")
  listRecipeBoms(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<RecipeBomDto[]> {
    return this.inventoryService.listRecipeBoms(context, query.tenantId);
  }

  @Post("recipe-boms")
  @InventoryPermissions("inventory.write")
  createRecipeBom(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateRecipeBomDto
  ): Promise<RecipeBomDto> {
    return this.inventoryService.createRecipeBom(context, dto);
  }

  @Post("receivings")
  @InventoryPermissions("inventory.write")
  createReceiving(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateReceivingDto
  ): Promise<ReceivingRecordDto> {
    return this.inventoryService.createReceivingRecord(context, dto);
  }

  @Post("receivings/:id/complete")
  @InventoryPermissions("inventory.write")
  completeReceiving(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: CompleteReceivingDto
  ): Promise<ReceivingRecordDto> {
    return this.inventoryService.completeReceivingRecord(context, params.id, dto);
  }

  @Get("reservations")
  @InventoryPermissions("inventory.read")
  listReservations(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<StockReservationDto[]> {
    return this.inventoryService.listReservations(context, query.tenantId);
  }

  @Post("reservations")
  @InventoryPermissions("inventory.write")
  createReservation(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateStockReservationDto
  ): Promise<StockReservationDto> {
    return this.inventoryService.createReservation(context, dto);
  }

  @Post("reservations/:id/release")
  @InventoryPermissions("inventory.write")
  releaseReservation(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<StockReservationDto> {
    return this.inventoryService.releaseReservation(context, params.id);
  }

  @Post("reservations/:id/consume")
  @InventoryPermissions("inventory.write")
  consumeReservation(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<StockReservationDto> {
    return this.inventoryService.consumeReservation(context, params.id);
  }

  @Get("ledger")
  @InventoryPermissions("inventory.read")
  listLedger(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<StockLedgerEntryDto[]> {
    return this.inventoryService.listLedgerEntries(context, query.tenantId);
  }

  @Get("stop-list-rules")
  @InventoryPermissions("inventory.read")
  listStopListRules(
    @CurrentContext() context: RequestContext,
    @Query() query: ListInventoryQueryDto
  ): Promise<StopListRuleDto[]> {
    return this.inventoryService.listStopListRules(context, query.tenantId);
  }

  @Post("stop-list-rules")
  @InventoryPermissions("inventory.write")
  createStopListRule(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateStopListRuleDto
  ): Promise<StopListRuleDto> {
    return this.inventoryService.createStopListRule(context, dto);
  }

  @Patch("stop-list-rules/:id")
  @InventoryPermissions("inventory.write")
  updateStopListRule(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateStopListRuleDto
  ): Promise<StopListRuleDto> {
    return this.inventoryService.updateStopListRule(context, params.id, dto);
  }

  @Get("availability")
  @InventoryPermissions("inventory.read")
  getAvailability(
    @CurrentContext() context: RequestContext,
    @Query()
    query: {
      tenantId?: string;
      productId: string;
      variantId?: string | null;
      warehouseId: string;
    }
  ): Promise<InventoryAvailabilityDto> {
    return this.inventoryService.getAvailability(context, query);
  }
}
