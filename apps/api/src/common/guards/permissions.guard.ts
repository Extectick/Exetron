import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RequestContext } from "@exetron/types";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (!requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: RequestContext }>();
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
