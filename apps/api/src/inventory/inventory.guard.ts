import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RequestContext } from "@exetron/types";

const INVENTORY_PERMISSIONS_KEY = "inventory_permissions";

export const InventoryPermissions = (...permissions: string[]) =>
  SetMetadata(INVENTORY_PERMISSIONS_KEY, permissions);

@Injectable()
export class InventoryPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(INVENTORY_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (!requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestContext }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication context is missing.");
    }

    if (user.scope === "platform_admin") {
      return true;
    }

    const missingPermissions = requiredPermissions.filter(
      (permission) => !user.permissions.includes(permission)
    );

    if (missingPermissions.length) {
      throw new ForbiddenException(
        `Missing required permissions: ${missingPermissions.join(", ")}`
      );
    }

    return true;
  }
}
