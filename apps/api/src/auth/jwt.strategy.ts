import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { ApiEnv } from "@exetron/config";
import type { JwtClaims, RequestContext } from "@exetron/types";
import { APP_ENV } from "../common/app-env.provider";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(APP_ENV) env: ApiEnv,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET
    });
  }

  async validate(payload: JwtClaims): Promise<RequestContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        storeAccess: true
      }
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User is not active.");
    }

    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((link) =>
          link.role.permissions.map((permissionLink) => permissionLink.permission.key)
        )
      )
    );

    return {
      userId: user.id,
      tenantId: user.tenantId,
      scope: user.isPlatformAdmin ? "platform_admin" : "tenant_member",
      roleIds: user.userRoles.map((link) => link.roleId),
      permissions,
      storeIds: user.storeAccess.map((link) => link.storeId)
    };
  }
}
