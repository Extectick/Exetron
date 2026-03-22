import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

export { OrganizationsController } from "./organizations.controller";
export { OrganizationsService } from "./organizations.service";
export { resetOrganizationsState } from "./organizations.state";

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService]
})
export class OrganizationsModule {}
