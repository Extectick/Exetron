import { ForbiddenException, Injectable } from "@nestjs/common";
import type { RequestContext } from "@exetron/types";

@Injectable()
export class AccessControlService {
  requirePlatformAdmin(context: RequestContext): void {
    if (context.scope !== "platform_admin") {
      throw new ForbiddenException("Platform admin scope is required.");
    }
  }

  resolveTenantId(
    context: RequestContext,
    tenantId?: string | null,
    options?: { required?: boolean }
  ): string {
    if (context.scope === "platform_admin") {
      if (!tenantId && options?.required !== false) {
        throw new ForbiddenException("Tenant id is required for this operation.");
      }

      return tenantId ?? "";
    }

    if (!context.tenantId) {
      throw new ForbiddenException("Tenant context is missing.");
    }

    if (tenantId && tenantId !== context.tenantId) {
      throw new ForbiddenException("Cross-tenant access is not allowed.");
    }

    return context.tenantId;
  }

  tenantWhere(context: RequestContext, tenantId?: string | null) {
    if (context.scope === "platform_admin") {
      return tenantId ? { tenantId } : {};
    }

    if (!context.tenantId) {
      throw new ForbiddenException("Tenant context is missing.");
    }

    if (tenantId && tenantId !== context.tenantId) {
      throw new ForbiddenException("Cross-tenant access is not allowed.");
    }

    return { tenantId: context.tenantId };
  }

  enforceStoreAccess(context: RequestContext, storeId: string): void {
    if (context.scope === "platform_admin") {
      return;
    }

    if (context.storeIds.length && !context.storeIds.includes(storeId)) {
      throw new ForbiddenException("Store access is not allowed.");
    }
  }

  storeFilter(context: RequestContext) {
    if (context.scope === "platform_admin" || context.storeIds.length === 0) {
      return undefined;
    }

    return {
      in: context.storeIds
    };
  }
}
