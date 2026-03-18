import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { join } from "node:path";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BrandsModule } from "./brands/brands.module";
import { CategoriesModule } from "./categories/categories.module";
import { CommonModule } from "./common/common.module";
import { CustomizationModule } from "./customization/customization.module";
import { EnvironmentModule } from "./common/environment.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { DatabaseModule } from "./database/database.module";
import { DevicesModule } from "./devices/devices.module";
import { DomainEventsModule } from "./domain-events/domain-events.module";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module";
import { HealthController } from "./health.controller";
import { KitchenModule } from "./kitchen/kitchen.module";
import { KioskModule } from "./kiosk/kiosk.module";
import { ModifiersModule } from "./modifiers/modifiers.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { PosModule } from "./pos/pos.module";
import { PricingModule } from "./pricing/pricing.module";
import { ProductsModule } from "./products/products.module";
import { RolesModule } from "./roles/roles.module";
import { SettingsModule } from "./settings/settings.module";
import { StoresModule } from "./stores/stores.module";
import { TenantsModule } from "./tenants/tenants.module";
import { UsersModule } from "./users/users.module";
import { ObservabilityModule } from "./observability/observability.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")]
    }),
    EventEmitterModule.forRoot(),
    CommonModule,
    EnvironmentModule,
    ObservabilityModule,
    CustomizationModule,
    DatabaseModule,
    DomainEventsModule,
    AuthModule,
    AnalyticsModule,
    AuditModule,
    OnboardingModule,
    TenantsModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
    ModifiersModule,
    PricingModule,
    OrdersModule,
    PaymentsModule,
    KitchenModule,
    KioskModule,
    PosModule,
    StoresModule,
    UsersModule,
    RolesModule,
    DevicesModule,
    SettingsModule,
    FeatureFlagsModule
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    }
  ]
})
export class AppModule {}
