import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { ApiEnv } from "@exetron/config";
import type { AuthMeResponse, AuthTokensResponse } from "@exetron/contracts";
import type { JwtClaims, RequestContext } from "@exetron/types";
import crypto from "node:crypto";
import { APP_ENV } from "../common/app-env.provider";
import { PrismaService } from "../database/prisma.service";
import { PasswordService } from "./password.service";

type JwtTtl = `${number}${"m" | "h" | "d"}`;

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService
  ) {}

  async login(email: string, password: string): Promise<AuthTokensResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
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

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const validPassword = await this.passwordService.compare(
      password,
      user.passwordHash
    );

    if (!validPassword) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("User account is not active.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date()
      }
    });

    return this.issueTokens({
      id: user.id,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin,
      userRoles: user.userRoles.map((link) => ({
        id: link.role.id,
        permissions: link.role.permissions.map((permissionLink) => ({
          key: permissionLink.permission.key
        }))
      })),
      storeAccess: user.storeAccess.map((link) => ({ storeId: link.storeId }))
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
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
        }
      }
    });

    if (
      !session ||
      session.status !== "ACTIVE" ||
      session.expiresAt.getTime() < Date.now() ||
      session.userId !== payload.sub
    ) {
      throw new UnauthorizedException("Refresh session is invalid.");
    }

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        lastUsedAt: new Date()
      }
    });

    return this.issueTokens({
      id: session.user.id,
      tenantId: session.user.tenantId,
      isPlatformAdmin: session.user.isPlatformAdmin,
      userRoles: session.user.userRoles.map((link) => ({
        id: link.role.id,
        permissions: link.role.permissions.map((permissionLink) => ({
          key: permissionLink.permission.key
        }))
      })),
      storeAccess: session.user.storeAccess.map((link) => ({ storeId: link.storeId }))
    });
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshSession.updateMany({
      where: {
        tokenHash,
        status: "ACTIVE"
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date()
      }
    });

    return { success: true };
  }

  async me(context: RequestContext): Promise<AuthMeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: context.userId },
      include: {
        userRoles: true,
        storeAccess: true
      }
    });

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        isPlatformAdmin: user.isPlatformAdmin,
        roleIds: user.userRoles.map((link) => link.roleId),
        storeIds: user.storeAccess.map((link) => link.storeId),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      },
      claims: {
        sub: context.userId,
        tenantId: context.tenantId,
        scope: context.scope,
        roleIds: context.roleIds,
        storeIds: context.storeIds
      },
      permissions: context.permissions
    };
  }

  private async issueTokens(user: {
    id: string;
    tenantId: string | null;
    isPlatformAdmin: boolean;
    userRoles: Array<{ id: string; permissions: Array<{ key: string }> }>;
    storeAccess: Array<{ storeId: string }>;
  }): Promise<AuthTokensResponse> {
    const claims: JwtClaims = {
      sub: user.id,
      tenantId: user.tenantId,
      scope: user.isPlatformAdmin ? "platform_admin" : "tenant_member",
      roleIds: user.userRoles.map((role) => role.id),
      storeIds: user.storeAccess.map((store) => store.storeId)
    };

    const sessionId = crypto.randomUUID();
    const refreshPayload = {
      sub: user.id,
      sid: sessionId,
      typ: "refresh"
    };
    const accessTtl = this.env.JWT_ACCESS_TTL as JwtTtl;
    const refreshTtl = this.env.JWT_REFRESH_TTL as JwtTtl;

    const accessToken = await this.jwtService.signAsync(claims, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: accessTtl
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.env.JWT_REFRESH_SECRET,
      expiresIn: refreshTtl
    });

    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshExpiresAt = this.resolveExpiry(this.env.JWT_REFRESH_TTL);

    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.env.JWT_ACCESS_TTL,
      refreshExpiresIn: this.env.JWT_REFRESH_TTL
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<{
    sub: string;
    sid: string;
    typ: string;
  }> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      sid: string;
      typ: string;
    }>(refreshToken, {
      secret: this.env.JWT_REFRESH_SECRET
    });

    if (payload.typ !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    return payload;
  }

  private hashToken(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  private resolveExpiry(ttl: string): Date {
    const match = ttl.match(/^(\d+)([mhd])$/);

    if (!match) {
      return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier =
      unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;

    return new Date(Date.now() + amount * multiplier);
  }
}
