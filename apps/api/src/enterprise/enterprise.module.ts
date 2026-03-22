import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { DatabaseModule } from "../database/database.module";
import { EnterpriseController } from "./enterprise.controller";
import { EnterpriseService } from "./enterprise.service";

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [EnterpriseController],
  providers: [EnterpriseService],
  exports: [EnterpriseService]
})
export class EnterpriseModule {}

export { EnterpriseController } from "./enterprise.controller";
export { EnterpriseService } from "./enterprise.service";
export { resetEnterpriseState } from "./enterprise.state";
