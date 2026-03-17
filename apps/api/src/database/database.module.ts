import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { DatabaseContextService } from "./database-context.service";

@Global()
@Module({
  providers: [PrismaService, DatabaseContextService],
  exports: [PrismaService, DatabaseContextService]
})
export class DatabaseModule {}
