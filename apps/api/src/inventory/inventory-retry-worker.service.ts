import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { RequestContext } from "@exetron/types";
import type { InventorySupplierRetryRunResultDto, InventorySupplierRetryWorkerRunNowDto } from "./inventory.dto";
import { InventoryService } from "./inventory.service";

type InventorySupplierRetryWorkerStatus = {
  enabled: boolean;
  paused: boolean;
  running: boolean;
  tenantId: string | null;
  storeId: string | null;
  source: "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH" | null;
  intervalMs: number;
  limit: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastResult: {
    considered: number;
    processed: number;
    skipped: number;
  } | null;
  lastError: string | null;
  pauseReason: string | null;
  lastPausedAt: string | null;
  lastResumedAt: string | null;
};

@Injectable()
export class InventoryRetryWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryRetryWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly status: InventorySupplierRetryWorkerStatus;
  private readonly scheduleEnabled: boolean;

  constructor(private readonly inventoryService: InventoryService) {
    this.scheduleEnabled = this.resolveScheduleEnabled();
    this.status = {
      enabled: true,
      paused: false,
      running: false,
      tenantId: this.readEnv("INVENTORY_SUPPLIER_RETRY_WORKER_TENANT_ID"),
      storeId: this.readEnv("INVENTORY_SUPPLIER_RETRY_WORKER_STORE_ID"),
      source: this.resolveSource(),
      intervalMs: this.resolveIntervalMs(),
      limit: this.resolveLimit(),
      lastRunAt: null,
      lastSuccessAt: null,
      lastResult: null,
      lastError: null,
      pauseReason: null,
      lastPausedAt: null,
      lastResumedAt: null
    };
  }

  onModuleInit(): void {
    if (!this.scheduleEnabled) {
      return;
    }
    if (!this.status.tenantId) {
      this.status.lastError =
        "INVENTORY_SUPPLIER_RETRY_WORKER_TENANT_ID is required when worker is enabled.";
      this.logger.warn(this.status.lastError);
      return;
    }

    this.timer = setInterval(() => {
      void this.tickScheduledRun();
    }, this.status.intervalMs);
    this.logger.log(
      `Started inventory retry worker for tenant ${this.status.tenantId} with interval ${this.status.intervalMs}ms.`
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStatus() {
    return { ...this.status };
  }

  pause(reason: string | null) {
    this.status.enabled = false;
    this.status.paused = true;
    this.status.pauseReason = reason ?? "Paused by operator.";
    this.status.lastPausedAt = new Date().toISOString();
    return this.getStatus();
  }

  resume(reason: string | null) {
    this.status.enabled = true;
    this.status.paused = false;
    this.status.pauseReason = reason ?? null;
    this.status.lastResumedAt = new Date().toISOString();
    this.status.lastError = null;
    return this.getStatus();
  }

  async runNow(
    context: RequestContext,
    input: InventorySupplierRetryWorkerRunNowDto
  ): Promise<InventorySupplierRetryRunResultDto> {
    return this.executeRun(context, input);
  }

  private async tickScheduledRun(): Promise<void> {
    if (this.status.running || !this.scheduleEnabled || !this.status.tenantId || this.status.paused) {
      return;
    }

    try {
      await this.executeRun(this.buildWorkerContext(), {
        tenantId: this.status.tenantId,
        storeId: this.status.storeId,
        source: this.status.source ?? undefined,
        note: "Inventory retry worker processed due retries.",
        limit: this.status.limit
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status.lastError = message;
      this.logger.error(`Inventory retry worker run failed: ${message}`);
    }
  }

  private async executeRun(
    context: RequestContext,
    input: InventorySupplierRetryWorkerRunNowDto
  ): Promise<InventorySupplierRetryRunResultDto> {
    if (this.status.running || !this.status.enabled) {
      return {
        considered: 0,
        processed: 0,
        skipped: 0,
        processedJobIds: [],
        skippedJobIds: []
      };
    }

    const tenantId = input.tenantId ?? this.status.tenantId ?? context.tenantId ?? null;
    if (!tenantId) {
      throw new Error("Inventory retry worker tenant context is not configured.");
    }

    this.status.running = true;
    this.status.lastRunAt = new Date().toISOString();
    try {
      const result = await this.inventoryService.runDueReplenishmentSupplierRetries(context, {
        tenantId,
        storeId: input.storeId ?? this.status.storeId,
        source: input.source ?? this.status.source ?? undefined,
        note: input.note ?? "Inventory retry worker processed due retries.",
        limit: input.limit ?? this.status.limit
      });
      this.status.lastSuccessAt = new Date().toISOString();
      this.status.lastResult = {
        considered: result.considered,
        processed: result.processed,
        skipped: result.skipped
      };
      this.status.lastError = null;
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status.lastError = message;
      this.logger.error(`Inventory retry worker run failed: ${message}`);
      throw error;
    } finally {
      this.status.running = false;
    }
  }

  private buildWorkerContext(): RequestContext {
    return {
      userId: "inventory-retry-worker",
      tenantId: this.status.tenantId,
      scope: "tenant_member",
      roleIds: [],
      permissions: ["inventory.read", "inventory.write"],
      storeIds: this.status.storeId ? [this.status.storeId] : []
    };
  }

  private resolveScheduleEnabled(): boolean {
    return this.readEnv("INVENTORY_SUPPLIER_RETRY_WORKER_ENABLED") === "true";
  }

  private resolveSource(): "WEBHOOK" | "FILE_IMPORT" | "HTTP_PUSH" | null {
    const value = this.readEnv("INVENTORY_SUPPLIER_RETRY_WORKER_SOURCE");
    return value === "WEBHOOK" || value === "FILE_IMPORT" || value === "HTTP_PUSH" ? value : null;
  }

  private resolveIntervalMs(): number {
    const parsed = Number(this.readEnv("INVENTORY_SUPPLIER_RETRY_WORKER_INTERVAL_MS"));
    return Number.isFinite(parsed) && parsed >= 1000 ? Math.floor(parsed) : 30000;
  }

  private resolveLimit(): number {
    const parsed = Number(this.readEnv("INVENTORY_SUPPLIER_RETRY_WORKER_LIMIT"));
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(100, Math.floor(parsed)) : 25;
  }

  private readEnv(key: string): string | null {
    const value = process.env[key]?.trim();
    return value ? value : null;
  }
}

export type { InventorySupplierRetryWorkerStatus };
