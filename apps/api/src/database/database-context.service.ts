import { Injectable } from "@nestjs/common";
import type { RequestContext } from "@exetron/types";
import type { Prisma } from "@exetron/database";
import { PrismaService } from "./prisma.service";

@Injectable()
export class DatabaseContextService {
  constructor(private readonly prisma: PrismaService) {}

  async withRequestContext<TResult>(
    context: RequestContext | null,
    handler: (tx: Prisma.TransactionClient) => Promise<TResult>
  ): Promise<TResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "select set_config('app.current_tenant_id', $1, true)",
        context?.tenantId ?? ""
      );
      await tx.$executeRawUnsafe(
        "select set_config('app.current_scope', $1, true)",
        context?.scope ?? ""
      );
      await tx.$executeRawUnsafe(
        "select set_config('app.current_user_id', $1, true)",
        context?.userId ?? ""
      );

      return handler(tx);
    });
  }
}
