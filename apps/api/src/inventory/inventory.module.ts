import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { InventoryController } from "./inventory.controller";
import { InventoryPermissionsGuard } from "./inventory.guard";
import { InventoryRetryWorkerService } from "./inventory-retry-worker.service";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryPermissionsGuard, InventoryRetryWorkerService],
  exports: [InventoryService]
})
export class InventoryModule {}

export { InventoryService } from "./inventory.service";
export type { InventoryReservationPlanEntry } from "./inventory.service";
