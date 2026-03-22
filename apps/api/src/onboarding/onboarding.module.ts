import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Injectable,
  Module,
  Post
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  DeviceDto,
  KioskAccessTokenDto,
  OnboardingBootstrapDeviceDto,
  OnboardingBootstrapRequest,
  OnboardingBootstrapResponse,
  StoreDto,
  TenantDto
} from "@exetron/contracts";
import type { ApiEnv } from "@exetron/config";
import type { Prisma } from "@exetron/database";
import type { DeviceKind, RequestContext } from "@exetron/types";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateNested
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { BillingModule, BillingService } from "../billing/billing.module";
import { APP_ENV } from "../common/app-env.provider";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { DatabaseContextService } from "../database/database-context.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";
import {
  createDeviceBootstrapSecret
} from "../devices/device-bootstrap-secret.util";
import {
  KIOSK_ACCESS_TOKEN_TTL,
  KIOSK_ACCESS_TOKEN_TTL_MS,
  resolveKioskAccessTokenSecret,
  type KioskAccessTokenClaims
} from "../kiosk/kiosk-access-token.util";

class OnboardingTenantDto {
  @ApiProperty({ example: "northwind" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({ example: "Northwind Foods" })
  @IsString()
  name!: string;
}

class OnboardingStoreDto {
  @ApiProperty({ example: "novosibirsk-1" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty({ example: "Novosibirsk Flagship" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "Asia/Novosibirsk" })
  @IsString()
  timezone!: string;
}

class OnboardingDeviceDto {
  @ApiProperty({ example: "KIOSK-001" })
  @IsString()
  @Matches(/^[A-Za-z0-9-_]+$/)
  code!: string;

  @ApiProperty({ example: "Guest Kiosk" })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ["POS", "KIOSK", "KITCHEN", "BOARD", "BACKOFFICE"] })
  @IsIn(["POS", "KIOSK", "KITCHEN", "BOARD", "BACKOFFICE"])
  type!: DeviceKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  issueKioskAccessToken?: boolean;
}

class OnboardingBootstrapDto implements OnboardingBootstrapRequest {
  @ApiProperty({ type: OnboardingTenantDto })
  @ValidateNested()
  @Type(() => OnboardingTenantDto)
  tenant!: OnboardingTenantDto;

  @ApiProperty({ type: OnboardingStoreDto })
  @ValidateNested()
  @Type(() => OnboardingStoreDto)
  store!: OnboardingStoreDto;

  @ApiPropertyOptional({ type: [OnboardingDeviceDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OnboardingDeviceDto)
  devices?: OnboardingDeviceDto[];
}

@Injectable()
class OnboardingService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    private readonly jwtService: JwtService,
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly billingService: BillingService
  ) {}

  createBootstrap(
    context: RequestContext,
    dto: OnboardingBootstrapDto
  ): Promise<OnboardingBootstrapResponse> {
    this.accessControl.requirePlatformAdmin(context);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: dto.tenant.slug,
          name: dto.tenant.name
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: tenant.id,
        actorType: "USER",
        actorId: context.userId,
        action: "tenant.created",
        entityType: "tenant",
        entityId: tenant.id,
        payload: { slug: tenant.slug }
      });

      await this.domainEvents.record(tx, {
        tenantId: tenant.id,
        eventName: "tenant.created",
        aggregate: "tenant",
        aggregateId: tenant.id,
        payload: { slug: tenant.slug, name: tenant.name }
      });

      const store = await tx.store.create({
        data: {
          tenantId: tenant.id,
          code: dto.store.code,
          name: dto.store.name,
          timezone: dto.store.timezone
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: tenant.id,
        storeId: store.id,
        actorType: "USER",
        actorId: context.userId,
        action: "store.created",
        entityType: "store",
        entityId: store.id,
        payload: { code: store.code, name: store.name }
      });

      await this.domainEvents.record(tx, {
        tenantId: tenant.id,
        eventName: "store.created",
        aggregate: "store",
        aggregateId: store.id,
        payload: { code: store.code, name: store.name }
      });

      const devices: OnboardingBootstrapDeviceDto[] = [];
      for (const input of dto.devices ?? []) {
        devices.push(await this.registerDevice(tx, context, tenant.id, store.id, input));
      }

      await this.audit.recordTx(tx, {
        tenantId: tenant.id,
        storeId: store.id,
        actorType: "USER",
        actorId: context.userId,
        action: "onboarding.bootstrap_completed",
        entityType: "tenant",
        entityId: tenant.id,
        payload: {
          storeId: store.id,
          deviceIds: devices.map((entry) => entry.device.id)
        }
      });

      await this.domainEvents.record(tx, {
        tenantId: tenant.id,
        eventName: "onboarding.bootstrap_completed",
        aggregate: "tenant",
        aggregateId: tenant.id,
        payload: {
          tenantId: tenant.id,
          storeId: store.id,
          deviceIds: devices.map((entry) => entry.device.id)
        }
      });

      return {
        tenant: this.toTenantDto(tenant),
        store: this.toStoreDto(store),
        devices
      };
    }).then(async (response) => {
      await this.billingService.bootstrap(
        {
          ...context,
          tenantId: response.tenant.id
        },
        {
          tenantId: response.tenant.id,
          planCode: "starter",
          planName: "Starter",
          planPriceAmount: "0.00",
          currency: "RUB",
          intervalKey: "MONTHLY",
          trialDays: 14
        }
      );

      return response;
    });
  }

  private async registerDevice(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    tenantId: string,
    storeId: string,
    input: OnboardingDeviceDto
  ): Promise<OnboardingBootstrapDeviceDto> {
    if (input.issueKioskAccessToken && input.type !== "KIOSK") {
      throw new BadRequestException(
        "Kiosk access tokens can only be requested for kiosk devices during onboarding."
      );
    }

    const { bootstrapSecret, apiKeyHash } = createDeviceBootstrapSecret();
    const device = await tx.device.create({
      data: {
        tenantId,
        storeId,
        code: input.code,
        name: input.name,
        type: input.type,
        status: "ACTIVE",
        apiKeyHash
      }
    });

    await this.audit.recordTx(tx, {
      tenantId,
      storeId,
      actorType: "USER",
      actorId: context.userId,
      action: "device.registered",
      entityType: "device",
      entityId: device.id,
      payload: { code: device.code }
    });

    await this.domainEvents.record(tx, {
      tenantId,
      eventName: "device.registered",
      aggregate: "device",
      aggregateId: device.id,
      payload: { code: device.code, bootstrapSecret }
    });

    return {
      device: this.toDeviceDto(device),
      bootstrapSecret,
      kioskAccessToken:
        input.type === "KIOSK" && input.issueKioskAccessToken
          ? await this.issueKioskAccessToken(device)
          : null
    };
  }

  private async issueKioskAccessToken(
    device: {
      id: string;
      tenantId: string;
      storeId: string;
      code: string;
      type: string;
    }
  ): Promise<KioskAccessTokenDto> {
    const claims: KioskAccessTokenClaims = {
      sub: device.id,
      tenantId: device.tenantId,
      storeId: device.storeId,
      code: device.code,
      type: "KIOSK",
      scope: "kiosk_public"
    };
    const accessToken = await this.jwtService.signAsync(claims, {
      secret: resolveKioskAccessTokenSecret(this.env.JWT_ACCESS_SECRET),
      expiresIn: KIOSK_ACCESS_TOKEN_TTL
    });
    const expiresAt = new Date(Date.now() + KIOSK_ACCESS_TOKEN_TTL_MS).toISOString();

    return {
      deviceId: device.id,
      accessToken,
      expiresAt,
      kioskPath: `/kiosk/${device.id}?token=${encodeURIComponent(accessToken)}`
    };
  }

  private toTenantDto(tenant: {
    id: string;
    slug: string;
    name: string;
    status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
    createdAt: Date;
    updatedAt: Date;
  }): TenantDto {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString()
    };
  }

  private toStoreDto(store: {
    id: string;
    tenantId: string;
    brandId: string | null;
    code: string;
    name: string;
    timezone: string;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    createdAt: Date;
    updatedAt: Date;
  }): StoreDto {
    return {
      id: store.id,
      tenantId: store.tenantId,
      brandId: store.brandId,
      code: store.code,
      name: store.name,
      timezone: store.timezone,
      status: store.status,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString()
    };
  }

  private toDeviceDto(device: {
    id: string;
    tenantId: string;
    storeId: string;
    code: string;
    name: string;
    type: DeviceKind;
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "RETIRED";
    createdAt: Date;
    updatedAt: Date;
  }): DeviceDto {
    return {
      id: device.id,
      tenantId: device.tenantId,
      storeId: device.storeId,
      code: device.code,
      name: device.name,
      type: device.type,
      status: device.status,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString()
    };
  }
}

@ApiTags("onboarding")
@Controller("onboarding")
class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post("bootstrap")
  @Permissions("tenants.write", "stores.write", "devices.write")
  createBootstrap(
    @CurrentContext() context: RequestContext,
    @Body() dto: OnboardingBootstrapDto
  ): Promise<OnboardingBootstrapResponse> {
    return this.onboardingService.createBootstrap(context, dto);
  }
}

@Module({
  imports: [AuditModule, BillingModule, DomainEventsModule, JwtModule.register({})],
  controllers: [OnboardingController],
  providers: [OnboardingService]
})
export class OnboardingModule {}
