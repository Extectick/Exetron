import crypto from "node:crypto";
import { Prisma } from "@exetron/database";

export type BillingPlanStatus = "ACTIVE" | "ARCHIVED";
export type BillingSubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "GRACE"
  | "SUSPENDED"
  | "CANCELLED";
export type BillingInvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";
export type BillingTrialStatus = "ACTIVE" | "CONVERTED" | "EXPIRED";

export interface BillingPlanRecord {
  id: string;
  code: string;
  name: string;
  status: BillingPlanStatus;
  priceAmount: string;
  currency: string;
  intervalKey: string;
  entitlements: Record<string, unknown>;
  quotas: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingAccountRecord {
  id: string;
  tenantId: string;
  resellerAccountId: string | null;
  status: string;
  defaultPaymentTerms: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSubscriptionRecord {
  id: string;
  tenantId: string;
  billingAccountId: string;
  planId: string;
  status: BillingSubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoiceRecord {
  id: string;
  tenantId: string;
  billingAccountId: string;
  subscriptionId: string | null;
  number: string;
  status: BillingInvoiceStatus;
  currency: string;
  subtotalAmount: string;
  totalAmount: string;
  dueAt: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  lines: Array<Record<string, unknown>>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingEntitlementRecord {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  key: string;
  scopeType: string;
  scopeId: string | null;
  value: Record<string, unknown>;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingQuotaRecord {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  key: string;
  scopeType: string;
  scopeId: string | null;
  limitValue: number;
  usedValue: number;
  resetAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingTrialRecord {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  status: BillingTrialStatus;
  startedAt: string;
  endsAt: string;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingResellerRecord {
  id: string;
  code: string;
  name: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingState {
  plans: BillingPlanRecord[];
  accounts: BillingAccountRecord[];
  subscriptions: BillingSubscriptionRecord[];
  invoices: BillingInvoiceRecord[];
  entitlements: BillingEntitlementRecord[];
  quotas: BillingQuotaRecord[];
  trials: BillingTrialRecord[];
  resellers: BillingResellerRecord[];
}

export interface BillingOverviewDto extends BillingState {
  tenantId: string;
  generatedAt: string;
  activePlan: BillingPlanRecord | null;
  activeSubscription: BillingSubscriptionRecord | null;
  activeTrial: BillingTrialRecord | null;
  billingAccount: BillingAccountRecord | null;
}

export interface BillingBootstrapInput {
  tenantId: string;
  planCode: string;
  planName: string;
  planPriceAmount?: string;
  currency?: string;
  intervalKey?: string;
  trialDays?: number;
  resellerCode?: string;
  resellerName?: string;
}

export interface CreateBillingPlanInput {
  code: string;
  name: string;
  priceAmount?: string;
  currency?: string;
  intervalKey?: string;
  entitlements?: Record<string, unknown>;
  quotas?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

export interface CreateBillingSubscriptionInput {
  tenantId: string;
  planId: string;
  billingAccountId?: string;
  status?: BillingSubscriptionStatus;
  currentPeriodDays?: number;
}

export interface IssueBillingInvoiceInput {
  tenantId: string;
  billingAccountId: string;
  subscriptionId?: string | null;
  subtotalAmount: string;
  totalAmount: string;
  lines: Array<Record<string, unknown>>;
  dueAt?: string | null;
}

export interface UpsertBillingEntitlementInput {
  tenantId: string;
  subscriptionId?: string | null;
  key: string;
  scopeType?: string;
  scopeId?: string | null;
  value: Record<string, unknown>;
  source?: string;
}

export interface UpsertBillingQuotaInput {
  tenantId: string;
  subscriptionId?: string | null;
  key: string;
  scopeType?: string;
  scopeId?: string | null;
  limitValue: number;
  usedValue?: number;
  resetAt?: string | null;
}

export interface CreateBillingResellerInput {
  code: string;
  name: string;
  metadata?: Record<string, unknown> | null;
}

export const BILLING_STATE_KEY = "billing.state";

export function emptyBillingState(): BillingState {
  return {
    plans: [],
    accounts: [],
    subscriptions: [],
    invoices: [],
    entitlements: [],
    quotas: [],
    trials: [],
    resellers: []
  };
}

export function readBillingState(value: Prisma.JsonValue | null | undefined): BillingState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyBillingState();
  }

  const source = value as Partial<BillingState>;
  return {
    plans: Array.isArray(source.plans) ? (source.plans as BillingPlanRecord[]) : [],
    accounts: Array.isArray(source.accounts) ? (source.accounts as BillingAccountRecord[]) : [],
    subscriptions: Array.isArray(source.subscriptions)
      ? (source.subscriptions as BillingSubscriptionRecord[])
      : [],
    invoices: Array.isArray(source.invoices) ? (source.invoices as BillingInvoiceRecord[]) : [],
    entitlements: Array.isArray(source.entitlements)
      ? (source.entitlements as BillingEntitlementRecord[])
      : [],
    quotas: Array.isArray(source.quotas) ? (source.quotas as BillingQuotaRecord[]) : [],
    trials: Array.isArray(source.trials) ? (source.trials as BillingTrialRecord[]) : [],
    resellers: Array.isArray(source.resellers)
      ? (source.resellers as BillingResellerRecord[])
      : []
  };
}

export function toBillingJson(state: BillingState): Prisma.InputJsonObject {
  return state as unknown as Prisma.InputJsonObject;
}

export function asJsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function toIso(value: Date): string {
  return value.toISOString();
}
