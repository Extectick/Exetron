import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min
} from "class-validator";
import { Type } from "class-transformer";
import { Prisma } from "@exetron/database";
import type { RequestContext } from "@exetron/types";
import { AuditModule, AuditService } from "../audit/audit.module";
import { CommonModule } from "../common/common.module";
import { AccessControlService } from "../common/access-control.service";
import { decimalToString } from "../common/catalog-helpers";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { DatabaseContextService } from "../database/database-context.service";
import { DatabaseModule } from "../database/database.module";
import { PrismaService } from "../database/prisma.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";
import {
  asJsonRecord,
  BILLING_STATE_KEY,
  BillingAccountRecord,
  BillingBootstrapInput,
  BillingEntitlementRecord,
  BillingInvoiceRecord,
  BillingOverviewDto,
  BillingPlanRecord,
  BillingQuotaRecord,
  BillingResellerRecord,
  BillingState,
  BillingSubscriptionRecord,
  BillingTrialRecord,
  emptyBillingState,
  newId,
  readBillingState,
  toBillingJson,
  toIso
} from "./billing-state.util";

class TenantQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

class CreateBillingPlanDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: "0.00" })
  @IsOptional()
  @IsNumberString()
  priceAmount?: string;

  @ApiPropertyOptional({ example: "RUB" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: "MONTHLY" })
  @IsOptional()
  @IsString()
  intervalKey?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  entitlements?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  quotas?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

class UpdateBillingPlanDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "0.00" })
  @IsOptional()
  @IsNumberString()
  priceAmount?: string;

  @ApiPropertyOptional({ example: "RUB" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: "MONTHLY" })
  @IsOptional()
  @IsString()
  intervalKey?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  status?: "ACTIVE" | "ARCHIVED";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  entitlements?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  quotas?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

class CreateBillingSubscriptionDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  planId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  billingAccountId?: string;

  @ApiPropertyOptional({ enum: ["TRIAL", "ACTIVE", "GRACE", "SUSPENDED", "CANCELLED"] })
  @IsOptional()
  @IsString()
  status?: BillingSubscriptionRecord["status"];

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  currentPeriodDays?: number;
}

class IssueBillingInvoiceDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  billingAccountId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string | null;

  @ApiProperty()
  @IsString()
  subtotalAmount!: string;

  @ApiProperty()
  @IsString()
  totalAmount!: string;

  @ApiProperty({ type: [Object] })
  @IsObject({ each: true })
  lines!: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

class UpsertBillingEntitlementDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string | null;

  @ApiProperty()
  @IsString()
  key!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeType?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  scopeId?: string | null;

  @ApiProperty({ type: Object })
  @IsObject()
  value!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

class UpsertBillingQuotaDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string | null;

  @ApiProperty()
  @IsString()
  key!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeType?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  scopeId?: string | null;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  limitValue!: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  usedValue?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  resetAt?: string | null;
}

class CreateBillingResellerDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

class BillingBootstrapDto implements BillingBootstrapInput {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty()
  @IsString()
  planCode!: string;

  @ApiProperty()
  @IsString()
  planName!: string;

  @ApiPropertyOptional({ example: "0.00" })
  @IsOptional()
  @IsNumberString()
  planPriceAmount?: string;

  @ApiPropertyOptional({ example: "RUB" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: "MONTHLY" })
  @IsOptional()
  @IsString()
  intervalKey?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  trialDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resellerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resellerName?: string;
}

function mapBillingOverview(
  state: BillingState,
  tenantId: string
): BillingOverviewDto {
  const subscriptionStatusRank: Record<BillingSubscriptionRecord["status"], number> = {
    ACTIVE: 5,
    TRIAL: 4,
    GRACE: 3,
    SUSPENDED: 2,
    CANCELLED: 1
  };
  const billingAccount = state.accounts.find((account) => account.tenantId === tenantId) ?? null;
  const activeSubscription =
    state.subscriptions
      .filter((subscription) => subscription.tenantId === tenantId)
      .sort((left, right) => {
        const statusDelta =
          subscriptionStatusRank[right.status] - subscriptionStatusRank[left.status];
        if (statusDelta !== 0) {
          return statusDelta;
        }

        const updatedDelta = right.updatedAt.localeCompare(left.updatedAt);
        if (updatedDelta !== 0) {
          return updatedDelta;
        }

        const periodEndDelta = right.currentPeriodEnd.localeCompare(left.currentPeriodEnd);
        if (periodEndDelta !== 0) {
          return periodEndDelta;
        }

        return right.createdAt.localeCompare(left.createdAt);
      })[0] ?? null;
  const activeTrial =
    state.trials.filter((trial) => trial.tenantId === tenantId).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    )[0] ?? null;
  const activePlan = activeSubscription
    ? state.plans.find((plan) => plan.id === activeSubscription.planId) ?? null
    : state.plans.filter((plan) => plan.status === "ACTIVE")[0] ?? null;

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    activePlan,
    activeSubscription,
    activeTrial,
    billingAccount,
    ...state
  };
}

function asRequiredJson(
  value: Record<string, unknown> | Array<Record<string, unknown>> | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function asOptionalJson(
  value: Record<string, unknown> | Array<Record<string, unknown>> | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function mapBillingPlanModel(
  plan: Prisma.BillingPlanGetPayload<Record<string, never>>
): BillingPlanRecord {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    status: plan.status as BillingPlanRecord["status"],
    priceAmount: decimalToString(plan.priceAmount) ?? "0.00",
    currency: plan.currency,
    intervalKey: plan.intervalKey,
    entitlements: asJsonRecord(plan.entitlements) ?? {},
    quotas: asJsonRecord(plan.quotas) ?? {},
    metadata: asJsonRecord(plan.metadata),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString()
  };
}

function mapBillingAccountModel(
  account: Prisma.BillingAccountGetPayload<Record<string, never>>
): BillingAccountRecord {
  return {
    id: account.id,
    tenantId: account.tenantId,
    resellerAccountId: account.resellerAccountId,
    status: account.status,
    defaultPaymentTerms: account.defaultPaymentTerms,
    metadata: asJsonRecord(account.metadata),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString()
  };
}

function mapSubscriptionModel(
  subscription: Prisma.SubscriptionGetPayload<Record<string, never>>
): BillingSubscriptionRecord {
  return {
    id: subscription.id,
    tenantId: subscription.tenantId,
    billingAccountId: subscription.billingAccountId,
    planId: subscription.planId,
    status: subscription.status as BillingSubscriptionRecord["status"],
    startedAt: subscription.startedAt.toISOString(),
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
    metadata: asJsonRecord(subscription.metadata),
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString()
  };
}

function mapInvoiceModel(
  invoice: Prisma.InvoiceGetPayload<Record<string, never>>
): BillingInvoiceRecord {
  return {
    id: invoice.id,
    tenantId: invoice.tenantId,
    billingAccountId: invoice.billingAccountId,
    subscriptionId: invoice.subscriptionId,
    number: invoice.number,
    status: invoice.status as BillingInvoiceRecord["status"],
    currency: invoice.currency,
    subtotalAmount: decimalToString(invoice.subtotalAmount) ?? "0.00",
    totalAmount: decimalToString(invoice.totalAmount) ?? "0.00",
    dueAt: invoice.dueAt?.toISOString() ?? null,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    lines: Array.isArray(invoice.lines) ? (invoice.lines as Array<Record<string, unknown>>) : [],
    metadata: asJsonRecord(invoice.metadata),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString()
  };
}

function mapEntitlementModel(
  entitlement: Prisma.EntitlementGrantGetPayload<Record<string, never>>
): BillingEntitlementRecord {
  return {
    id: entitlement.id,
    tenantId: entitlement.tenantId,
    subscriptionId: entitlement.subscriptionId,
    key: entitlement.key,
    scopeType: entitlement.scopeType,
    scopeId: entitlement.scopeId,
    value: asJsonRecord(entitlement.value) ?? {},
    source: entitlement.source,
    createdAt: entitlement.createdAt.toISOString(),
    updatedAt: entitlement.updatedAt.toISOString()
  };
}

function mapQuotaModel(
  quota: Prisma.QuotaCounterGetPayload<Record<string, never>>
): BillingQuotaRecord {
  return {
    id: quota.id,
    tenantId: quota.tenantId,
    subscriptionId: quota.subscriptionId,
    key: quota.key,
    scopeType: quota.scopeType,
    scopeId: quota.scopeId,
    limitValue: quota.limitValue,
    usedValue: quota.usedValue,
    resetAt: quota.resetAt?.toISOString() ?? null,
    createdAt: quota.createdAt.toISOString(),
    updatedAt: quota.updatedAt.toISOString()
  };
}

function mapTrialModel(
  trial: Prisma.TrialGrantGetPayload<Record<string, never>>
): BillingTrialRecord {
  return {
    id: trial.id,
    tenantId: trial.tenantId,
    subscriptionId: trial.subscriptionId,
    status: trial.status as BillingTrialRecord["status"],
    startedAt: trial.startedAt.toISOString(),
    endsAt: trial.endsAt.toISOString(),
    convertedAt: trial.convertedAt?.toISOString() ?? null,
    createdAt: trial.createdAt.toISOString(),
    updatedAt: trial.updatedAt.toISOString()
  };
}

function mapResellerModel(
  reseller: Prisma.ResellerAccountGetPayload<Record<string, never>>
): BillingResellerRecord {
  return {
    id: reseller.id,
    code: reseller.code,
    name: reseller.name,
    status: reseller.status,
    metadata: asJsonRecord(reseller.metadata),
    createdAt: reseller.createdAt.toISOString(),
    updatedAt: reseller.updatedAt.toISOString()
  };
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService
  ) {}

  overview(context: RequestContext, query: TenantQueryDto): Promise<BillingOverviewDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, query.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      return mapBillingOverview(state, tenantId);
    });
  }

  listPlans(context: RequestContext, query: TenantQueryDto): Promise<BillingPlanRecord[]> {
    return this.loadAndSelect(context, query, (state) => state.plans);
  }

  createPlan(context: RequestContext, dto: CreateBillingPlanDto): Promise<BillingPlanRecord> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      const now = toIso(new Date());
      const plan: BillingPlanRecord = {
        id: newId(),
        code: dto.code.trim(),
        name: dto.name.trim(),
        status: "ACTIVE",
        priceAmount: dto.priceAmount ?? "0.00",
        currency: dto.currency ?? "RUB",
        intervalKey: dto.intervalKey ?? "MONTHLY",
        entitlements: dto.entitlements ?? {},
        quotas: dto.quotas ?? {},
        metadata: dto.metadata ?? null,
        createdAt: now,
        updatedAt: now
      };
      state.plans = [plan, ...state.plans.filter((item) => item.id !== plan.id)];
      await this.saveStateTx(tx, tenantId, state);
      await this.recordTx(tx, tenantId, "billing.plan_created", "billing_plan", plan.id, {
        code: plan.code
      }, context);
      return plan;
    });
  }

  updatePlan(
    context: RequestContext,
    planId: string,
    dto: UpdateBillingPlanDto
  ): Promise<BillingPlanRecord> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(
        context,
        (dto as { tenantId?: string }).tenantId ?? context.tenantId
      );
      const state = await this.loadStateTx(tx, tenantId);
      const current = state.plans.find((plan) => plan.id === planId);
      if (!current) {
        throw new BadRequestException("Billing plan was not found.");
      }

      const next: BillingPlanRecord = {
        ...current,
        code: dto.code ?? current.code,
        name: dto.name ?? current.name,
        status: dto.status ?? current.status,
        priceAmount: dto.priceAmount ?? current.priceAmount,
        currency: dto.currency ?? current.currency,
        intervalKey: dto.intervalKey ?? current.intervalKey,
        entitlements: dto.entitlements ?? current.entitlements,
        quotas: dto.quotas ?? current.quotas,
        metadata: dto.metadata ?? current.metadata,
        updatedAt: toIso(new Date())
      };

      state.plans = state.plans.map((plan) => (plan.id === planId ? next : plan));
      await this.saveStateTx(tx, tenantId, state);
      await this.recordTx(
        tx,
        tenantId,
        "billing.plan_updated",
        "billing_plan",
        planId,
        {
          code: next.code,
          name: next.name,
          status: next.status,
          priceAmount: next.priceAmount,
          currency: next.currency,
          intervalKey: next.intervalKey
        },
        context
      );
      return next;
    });
  }

  listSubscriptions(
    context: RequestContext,
    query: TenantQueryDto
  ): Promise<BillingSubscriptionRecord[]> {
    return this.loadAndSelect(context, query, (state) => state.subscriptions);
  }

  createSubscription(
    context: RequestContext,
    dto: CreateBillingSubscriptionDto
  ): Promise<BillingSubscriptionRecord> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      const plan = state.plans.find((item) => item.id === dto.planId);
      if (!plan) {
        throw new BadRequestException("Billing plan was not found.");
      }
      const account = await this.ensureAccountTx(tx, tenantId, state, dto.billingAccountId);
      const now = new Date();
      const periodDays = dto.currentPeriodDays ?? 30;
      const subscription: BillingSubscriptionRecord = {
        id: newId(),
        tenantId,
        billingAccountId: account.id,
        planId: plan.id,
        status: dto.status ?? "ACTIVE",
        startedAt: now.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: new Date(now.getTime() + periodDays * 86_400_000).toISOString(),
        cancelledAt: null,
        metadata: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      state.subscriptions = [subscription, ...state.subscriptions];
      await this.saveStateTx(tx, tenantId, state);
      await this.recordTx(
        tx,
        tenantId,
        "billing.subscription_created",
        "billing_subscription",
        subscription.id,
        { planId: plan.id, billingAccountId: account.id },
        context
      );
      return subscription;
    });
  }

  listInvoices(context: RequestContext, query: TenantQueryDto): Promise<BillingInvoiceRecord[]> {
    return this.loadAndSelect(context, query, (state) => state.invoices);
  }

  issueInvoice(
    context: RequestContext,
    dto: IssueBillingInvoiceDto
  ): Promise<BillingInvoiceRecord> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      const account = await this.ensureAccountTx(tx, tenantId, state, dto.billingAccountId);
      const invoice: BillingInvoiceRecord = {
        id: newId(),
        tenantId,
        billingAccountId: account.id,
        subscriptionId: dto.subscriptionId ?? null,
        number: `INV-${Date.now()}`,
        status: "ISSUED",
        currency: "RUB",
        subtotalAmount: dto.subtotalAmount,
        totalAmount: dto.totalAmount,
        dueAt: dto.dueAt ?? null,
        issuedAt: toIso(new Date()),
        paidAt: null,
        lines: dto.lines,
        metadata: null,
        createdAt: toIso(new Date()),
        updatedAt: toIso(new Date())
      };

      state.invoices = [invoice, ...state.invoices];
      await this.saveStateTx(tx, tenantId, state);
      await this.recordTx(tx, tenantId, "billing.invoice_issued", "billing_invoice", invoice.id, {
        number: invoice.number
      }, context);
      return invoice;
    });
  }

  listEntitlements(
    context: RequestContext,
    query: TenantQueryDto
  ): Promise<BillingEntitlementRecord[]> {
    return this.loadAndSelect(context, query, (state) => state.entitlements);
  }

  upsertEntitlement(
    context: RequestContext,
    dto: UpsertBillingEntitlementDto
  ): Promise<BillingEntitlementRecord> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      const now = toIso(new Date());
      const current = state.entitlements.find(
        (item) =>
          item.tenantId === tenantId &&
          item.key === dto.key &&
          item.scopeType === (dto.scopeType ?? "TENANT") &&
          item.scopeId === (dto.scopeId ?? null)
      );

      const entitlement: BillingEntitlementRecord = {
        id: current?.id ?? newId(),
        tenantId,
        subscriptionId: dto.subscriptionId ?? current?.subscriptionId ?? null,
        key: dto.key,
        scopeType: dto.scopeType ?? "TENANT",
        scopeId: dto.scopeId ?? null,
        value: dto.value,
        source: dto.source ?? "MANUAL",
        createdAt: current?.createdAt ?? now,
        updatedAt: now
      };

      state.entitlements = [
        entitlement,
        ...state.entitlements.filter((item) => item.id !== entitlement.id)
      ];
      await this.saveStateTx(tx, tenantId, state);
      await this.recordTx(
        tx,
        tenantId,
        "billing.entitlement_upserted",
        "billing_entitlement",
        entitlement.id,
        { key: entitlement.key },
        context
      );
      return entitlement;
    });
  }

  listQuotas(context: RequestContext, query: TenantQueryDto): Promise<BillingQuotaRecord[]> {
    return this.loadAndSelect(context, query, (state) => state.quotas);
  }

  upsertQuota(context: RequestContext, dto: UpsertBillingQuotaDto): Promise<BillingQuotaRecord> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      const now = toIso(new Date());
      const current = state.quotas.find(
        (item) =>
          item.tenantId === tenantId &&
          item.key === dto.key &&
          item.scopeType === (dto.scopeType ?? "TENANT") &&
          item.scopeId === (dto.scopeId ?? null)
      );

      const quota: BillingQuotaRecord = {
        id: current?.id ?? newId(),
        tenantId,
        subscriptionId: dto.subscriptionId ?? current?.subscriptionId ?? null,
        key: dto.key,
        scopeType: dto.scopeType ?? "TENANT",
        scopeId: dto.scopeId ?? null,
        limitValue: dto.limitValue,
        usedValue: dto.usedValue ?? current?.usedValue ?? 0,
        resetAt: dto.resetAt ?? current?.resetAt ?? null,
        createdAt: current?.createdAt ?? now,
        updatedAt: now
      };

      state.quotas = [quota, ...state.quotas.filter((item) => item.id !== quota.id)];
      await this.saveStateTx(tx, tenantId, state);
      await this.recordTx(tx, tenantId, "billing.quota_upserted", "billing_quota", quota.id, {
        key: quota.key
      }, context);
      return quota;
    });
  }

  listResellers(context: RequestContext, query: TenantQueryDto): Promise<BillingResellerRecord[]> {
    return this.loadAndSelect(context, query, (state) => state.resellers);
  }

  createReseller(
    context: RequestContext,
    dto: CreateBillingResellerDto
  ): Promise<BillingResellerRecord> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      const now = toIso(new Date());
      const reseller: BillingResellerRecord = {
        id: newId(),
        code: dto.code.trim(),
        name: dto.name.trim(),
        status: "ACTIVE",
        metadata: dto.metadata ?? null,
        createdAt: now,
        updatedAt: now
      };

      state.resellers = [reseller, ...state.resellers.filter((item) => item.code !== reseller.code)];
      await this.saveStateTx(tx, tenantId, state);
      await this.recordTx(
        tx,
        tenantId,
        "billing.reseller_created",
        "billing_reseller",
        reseller.id,
        { code: reseller.code },
        context
      );
      return reseller;
    });
  }

  bootstrap(
    context: RequestContext,
    dto: BillingBootstrapDto
  ): Promise<BillingOverviewDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      const now = toIso(new Date());
      const plan = this.ensurePlan(state, {
        code: dto.planCode,
        name: dto.planName,
        priceAmount: dto.planPriceAmount,
        currency: dto.currency,
        intervalKey: dto.intervalKey
      });
      const account = await this.ensureAccountTx(tx, tenantId, state, null);
      const trial = this.ensureTrial(state, tenantId, dto.trialDays ?? 30);
      const subscription = this.ensureSubscription(state, tenantId, account.id, plan.id, trial.endsAt);
      if (dto.resellerCode) {
        const reseller = this.ensureReseller(state, dto.resellerCode, dto.resellerName ?? dto.resellerCode);
        account.resellerAccountId = reseller.id;
      }

      await this.saveStateTx(tx, tenantId, state);
      await this.recordTx(tx, tenantId, "billing.bootstrap_completed", "billing_account", account.id, {
        planId: plan.id,
        trialId: trial.id,
        subscriptionId: subscription.id
      }, context);

      return mapBillingOverview(state, tenantId);
    });
  }

  private async loadAndSelect<T>(
    context: RequestContext,
    query: TenantQueryDto,
    selector: (state: BillingState) => T
  ): Promise<T> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const tenantId = this.accessControl.resolveTenantId(context, query.tenantId);
      const state = await this.loadStateTx(tx, tenantId);
      return selector(state);
    });
  }

  private async loadStateTx(
    tx: Prisma.TransactionClient,
    tenantId: string
  ): Promise<BillingState> {
    const [
      plans,
      accounts,
      subscriptions,
      invoices,
      entitlements,
      quotas,
      trials,
      resellers
    ] = await Promise.all([
      tx.billingPlan.findMany({ orderBy: { createdAt: "asc" } }),
      tx.billingAccount.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      tx.subscription.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      tx.invoice.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      tx.entitlementGrant.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      tx.quotaCounter.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      tx.trialGrant.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      tx.resellerAccount.findMany({ orderBy: { createdAt: "asc" } })
    ]);

    return {
      plans: plans.map(mapBillingPlanModel),
      accounts: accounts.map(mapBillingAccountModel),
      subscriptions: subscriptions.map(mapSubscriptionModel),
      invoices: invoices.map(mapInvoiceModel),
      entitlements: entitlements.map(mapEntitlementModel),
      quotas: quotas.map(mapQuotaModel),
      trials: trials.map(mapTrialModel),
      resellers: resellers.map(mapResellerModel)
    };
  }

  private async saveStateTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    state: BillingState
  ): Promise<void> {
    for (const plan of state.plans) {
      await tx.billingPlan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          status: plan.status,
          priceAmount: plan.priceAmount,
          currency: plan.currency,
          intervalKey: plan.intervalKey,
          entitlements: asRequiredJson(plan.entitlements),
          quotas: asRequiredJson(plan.quotas),
          metadata: asOptionalJson(plan.metadata)
        },
        create: {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          status: plan.status,
          priceAmount: plan.priceAmount,
          currency: plan.currency,
          intervalKey: plan.intervalKey,
          entitlements: asRequiredJson(plan.entitlements),
          quotas: asRequiredJson(plan.quotas),
          metadata: asOptionalJson(plan.metadata)
        }
      });
    }

    for (const reseller of state.resellers) {
      await tx.resellerAccount.upsert({
        where: { code: reseller.code },
        update: {
          name: reseller.name,
          status: reseller.status,
          metadata: asOptionalJson(reseller.metadata)
        },
        create: {
          id: reseller.id,
          code: reseller.code,
          name: reseller.name,
          status: reseller.status,
          metadata: asOptionalJson(reseller.metadata)
        }
      });
    }

    await tx.invoice.deleteMany({ where: { tenantId } });
    await tx.entitlementGrant.deleteMany({ where: { tenantId } });
    await tx.quotaCounter.deleteMany({ where: { tenantId } });
    await tx.subscription.deleteMany({ where: { tenantId } });
    await tx.trialGrant.deleteMany({ where: { tenantId } });
    await tx.billingAccount.deleteMany({ where: { tenantId } });
    await tx.tenantSetting.deleteMany({ where: { tenantId, key: BILLING_STATE_KEY } });

    for (const account of state.accounts.filter((item) => item.tenantId === tenantId)) {
      await tx.billingAccount.create({
        data: {
          id: account.id,
          tenantId: account.tenantId,
          resellerAccountId: account.resellerAccountId,
          status: account.status,
          defaultPaymentTerms: account.defaultPaymentTerms,
          metadata: asOptionalJson(account.metadata)
        }
      });
    }

    for (const subscription of state.subscriptions.filter((item) => item.tenantId === tenantId)) {
      await tx.subscription.create({
        data: {
          id: subscription.id,
          tenantId: subscription.tenantId,
          billingAccountId: subscription.billingAccountId,
          planId: subscription.planId,
          status: subscription.status,
          startedAt: new Date(subscription.startedAt),
          currentPeriodStart: new Date(subscription.currentPeriodStart),
          currentPeriodEnd: new Date(subscription.currentPeriodEnd),
          cancelledAt: subscription.cancelledAt ? new Date(subscription.cancelledAt) : null,
          metadata: asOptionalJson(subscription.metadata)
        }
      });
    }

    for (const invoice of state.invoices.filter((item) => item.tenantId === tenantId)) {
      await tx.invoice.create({
        data: {
          id: invoice.id,
          tenantId: invoice.tenantId,
          billingAccountId: invoice.billingAccountId,
          subscriptionId: invoice.subscriptionId,
          number: invoice.number,
          status: invoice.status,
          currency: invoice.currency,
          subtotalAmount: invoice.subtotalAmount,
          totalAmount: invoice.totalAmount,
          dueAt: invoice.dueAt ? new Date(invoice.dueAt) : null,
          issuedAt: invoice.issuedAt ? new Date(invoice.issuedAt) : null,
          paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
          lines: asRequiredJson(invoice.lines),
          metadata: asOptionalJson(invoice.metadata)
        }
      });
    }

    for (const entitlement of state.entitlements.filter((item) => item.tenantId === tenantId)) {
      await tx.entitlementGrant.create({
        data: {
          id: entitlement.id,
          tenantId: entitlement.tenantId,
          subscriptionId: entitlement.subscriptionId,
          key: entitlement.key,
          scopeType: entitlement.scopeType,
          scopeId: entitlement.scopeId,
          value: asRequiredJson(entitlement.value),
          source: entitlement.source
        }
      });
    }

    for (const quota of state.quotas.filter((item) => item.tenantId === tenantId)) {
      await tx.quotaCounter.create({
        data: {
          id: quota.id,
          tenantId: quota.tenantId,
          subscriptionId: quota.subscriptionId,
          key: quota.key,
          scopeType: quota.scopeType,
          scopeId: quota.scopeId,
          limitValue: quota.limitValue,
          usedValue: quota.usedValue,
          resetAt: quota.resetAt ? new Date(quota.resetAt) : null
        }
      });
    }

    for (const trial of state.trials.filter((item) => item.tenantId === tenantId)) {
      await tx.trialGrant.create({
        data: {
          id: trial.id,
          tenantId: trial.tenantId,
          subscriptionId: trial.subscriptionId,
          status: trial.status,
          startedAt: new Date(trial.startedAt),
          endsAt: new Date(trial.endsAt),
          convertedAt: trial.convertedAt ? new Date(trial.convertedAt) : null
        }
      });
    }
  }

  private async ensureAccountTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    state: BillingState,
    billingAccountId: string | null | undefined
  ): Promise<BillingAccountRecord> {
    const current =
      (billingAccountId
        ? state.accounts.find((item) => item.id === billingAccountId)
        : state.accounts.find((item) => item.tenantId === tenantId)) ?? null;

    if (current) {
      return current;
    }

    const now = toIso(new Date());
    const account: BillingAccountRecord = {
      id: newId(),
      tenantId,
      resellerAccountId: null,
      status: "ACTIVE",
      defaultPaymentTerms: null,
      metadata: null,
      createdAt: now,
      updatedAt: now
    };

    state.accounts = [account, ...state.accounts];
    await this.saveStateTx(tx, tenantId, state);
    return account;
  }

  private ensurePlan(
    state: BillingState,
    input: {
      code: string;
      name: string;
      priceAmount?: string;
      currency?: string;
      intervalKey?: string;
    }
  ): BillingPlanRecord {
    const current = state.plans.find((plan) => plan.code === input.code) ?? null;
    const now = toIso(new Date());
    const plan: BillingPlanRecord = current ?? {
      id: newId(),
      code: input.code.trim(),
      name: input.name.trim(),
      status: "ACTIVE",
      priceAmount: input.priceAmount ?? "0.00",
      currency: input.currency ?? "RUB",
      intervalKey: input.intervalKey ?? "MONTHLY",
      entitlements: {},
      quotas: {},
      metadata: null,
      createdAt: now,
      updatedAt: now
    };

    if (current) {
      plan.name = input.name.trim();
      plan.priceAmount = input.priceAmount ?? plan.priceAmount;
      plan.currency = input.currency ?? plan.currency;
      plan.intervalKey = input.intervalKey ?? plan.intervalKey;
      plan.updatedAt = now;
    }

    if (!current) {
      state.plans = [plan, ...state.plans];
    }

    return plan;
  }

  private ensureTrial(
    state: BillingState,
    tenantId: string,
    trialDays: number
  ): BillingTrialRecord {
    const current = state.trials.find((trial) => trial.tenantId === tenantId) ?? null;
    if (current) {
      return current;
    }

    const now = new Date();
    const trial: BillingTrialRecord = {
      id: newId(),
      tenantId,
      subscriptionId: null,
      status: "ACTIVE",
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + trialDays * 86_400_000).toISOString(),
      convertedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    state.trials = [trial, ...state.trials];
    return trial;
  }

  private ensureSubscription(
    state: BillingState,
    tenantId: string,
    billingAccountId: string,
    planId: string,
    currentPeriodEnd: string
  ): BillingSubscriptionRecord {
    const current = state.subscriptions.find((item) => item.tenantId === tenantId) ?? null;
    if (current) {
      return current;
    }

    const now = toIso(new Date());
    const subscription: BillingSubscriptionRecord = {
      id: newId(),
      tenantId,
      billingAccountId,
      planId,
      status: "TRIAL",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd,
      cancelledAt: null,
      metadata: null,
      createdAt: now,
      updatedAt: now
    };

    state.subscriptions = [subscription, ...state.subscriptions];
    return subscription;
  }

  private ensureReseller(
    state: BillingState,
    code: string,
    name: string
  ): BillingResellerRecord {
    const current = state.resellers.find((item) => item.code === code) ?? null;
    if (current) {
      return current;
    }

    const now = toIso(new Date());
    const reseller: BillingResellerRecord = {
      id: newId(),
      code,
      name,
      status: "ACTIVE",
      metadata: null,
      createdAt: now,
      updatedAt: now
    };

    state.resellers = [reseller, ...state.resellers];
    return reseller;
  }

  private async recordTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    eventName: string,
    aggregate: string,
    aggregateId: string,
    payload: Record<string, unknown>,
    context: RequestContext
  ): Promise<void> {
    await this.audit.recordTx(tx, {
      tenantId,
      actorType: context.scope === "device" ? "DEVICE" : "USER",
      actorId: context.scope === "device" && context.deviceId ? context.deviceId : context.userId,
      action: eventName,
      entityType: aggregate,
      entityId: aggregateId,
      payload
    });

    await this.domainEvents.record(tx, {
      tenantId,
      eventName,
      aggregate,
      aggregateId,
      payload
    });
  }
}

@ApiTags("billing")
@Controller("billing")
class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("overview")
  @Permissions("billing.read")
  overview(
    @CurrentContext() context: RequestContext,
    @Query() query: TenantQueryDto
  ): Promise<BillingOverviewDto> {
    return this.billingService.overview(context, query);
  }

  @Get("plans")
  @Permissions("billing.read")
  listPlans(
    @CurrentContext() context: RequestContext,
    @Query() query: TenantQueryDto
  ): Promise<BillingPlanRecord[]> {
    return this.billingService.listPlans(context, query);
  }

  @Post("plans")
  @Permissions("billing.write")
  createPlan(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateBillingPlanDto
  ): Promise<BillingPlanRecord> {
    return this.billingService.createPlan(context, dto);
  }

  @Patch("plans/:id")
  @Permissions("billing.write")
  updatePlan(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: UpdateBillingPlanDto
  ): Promise<BillingPlanRecord> {
    return this.billingService.updatePlan(context, params.id, dto);
  }

  @Get("subscriptions")
  @Permissions("billing.read")
  listSubscriptions(
    @CurrentContext() context: RequestContext,
    @Query() query: TenantQueryDto
  ): Promise<BillingSubscriptionRecord[]> {
    return this.billingService.listSubscriptions(context, query);
  }

  @Post("subscriptions")
  @Permissions("billing.write")
  createSubscription(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateBillingSubscriptionDto
  ): Promise<BillingSubscriptionRecord> {
    return this.billingService.createSubscription(context, dto);
  }

  @Get("invoices")
  @Permissions("billing.read")
  listInvoices(
    @CurrentContext() context: RequestContext,
    @Query() query: TenantQueryDto
  ): Promise<BillingInvoiceRecord[]> {
    return this.billingService.listInvoices(context, query);
  }

  @Post("invoices")
  @Permissions("billing.write")
  issueInvoice(
    @CurrentContext() context: RequestContext,
    @Body() dto: IssueBillingInvoiceDto
  ): Promise<BillingInvoiceRecord> {
    return this.billingService.issueInvoice(context, dto);
  }

  @Get("entitlements")
  @Permissions("billing.read")
  listEntitlements(
    @CurrentContext() context: RequestContext,
    @Query() query: TenantQueryDto
  ): Promise<BillingEntitlementRecord[]> {
    return this.billingService.listEntitlements(context, query);
  }

  @Post("entitlements")
  @Permissions("billing.write")
  upsertEntitlement(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertBillingEntitlementDto
  ): Promise<BillingEntitlementRecord> {
    return this.billingService.upsertEntitlement(context, dto);
  }

  @Get("quotas")
  @Permissions("billing.read")
  listQuotas(
    @CurrentContext() context: RequestContext,
    @Query() query: TenantQueryDto
  ): Promise<BillingQuotaRecord[]> {
    return this.billingService.listQuotas(context, query);
  }

  @Post("quotas")
  @Permissions("billing.write")
  upsertQuota(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertBillingQuotaDto
  ): Promise<BillingQuotaRecord> {
    return this.billingService.upsertQuota(context, dto);
  }

  @Get("resellers")
  @Permissions("billing.read")
  listResellers(
    @CurrentContext() context: RequestContext,
    @Query() query: TenantQueryDto
  ): Promise<BillingResellerRecord[]> {
    return this.billingService.listResellers(context, query);
  }

  @Post("resellers")
  @Permissions("billing.write")
  createReseller(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateBillingResellerDto
  ): Promise<BillingResellerRecord> {
    return this.billingService.createReseller(context, dto);
  }

  @Post("bootstrap")
  @Permissions("billing.write")
  bootstrap(
    @CurrentContext() context: RequestContext,
    @Body() dto: BillingBootstrapDto
  ): Promise<BillingOverviewDto> {
    return this.billingService.bootstrap(context, dto);
  }
}

@Module({
  imports: [CommonModule, DatabaseModule, AuditModule, DomainEventsModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService]
})
export class BillingModule {}
