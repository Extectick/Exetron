import type {
  PaymentMethodKind,
  PaymentOperationKind,
  PaymentProviderType
} from "@exetron/types";
import {
  simulateProviderResult,
  type PaymentProviderSettings
} from "./payment-runtime.util";

export interface PaymentAdapterConfig {
  providerKey: string;
  providerType: PaymentProviderType;
  method: PaymentMethodKind;
  settings?: PaymentProviderSettings | null;
  secrets?: Record<string, string> | null;
}

export interface PaymentAdapterExecutionResult {
  executionMode: "SYNC" | "WEBHOOK";
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  externalReference: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  responsePayload: Record<string, unknown>;
}

export interface PaymentWebhookResolution {
  signatureValid: boolean;
  eventType: string;
  externalReference: string | null;
  outcome: "SUCCEEDED" | "FAILED";
  errorCode: string | null;
  errorMessage: string | null;
  entityType: "PAYMENT_ATTEMPT" | "PAYMENT_OPERATION";
  payload: Record<string, unknown>;
}

function resolveAdapterMode(settings?: PaymentProviderSettings | null): "SYNC" | "WEBHOOK" {
  const raw = String(settings?.adapterMode ?? "").trim().toUpperCase();
  return raw === "WEBHOOK" || raw === "ASYNC" ? "WEBHOOK" : "SYNC";
}

function buildExternalReference(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function executePaymentProviderAttempt(
  config: PaymentAdapterConfig
): PaymentAdapterExecutionResult {
  const settings = config.settings ?? null;
  const adapterMode = resolveAdapterMode(settings);
  if (adapterMode === "WEBHOOK") {
    const externalReference = buildExternalReference(config.providerKey);
    return {
      executionMode: "WEBHOOK",
      status: "PENDING",
      externalReference,
      errorCode: null,
      errorMessage: null,
      responsePayload: {
        providerKey: config.providerKey,
        providerType: config.providerType,
        executionMode: "WEBHOOK",
        awaitingWebhook: true,
        externalReference
      }
    };
  }

  const simulated = simulateProviderResult({
    providerKey: config.providerKey,
    providerType: config.providerType,
    method: config.method,
    settings
  });
  return {
    executionMode: "SYNC",
    status: simulated.status,
    externalReference: simulated.externalReference,
    errorCode: simulated.errorCode,
    errorMessage: simulated.errorMessage,
    responsePayload: simulated.responsePayload
  };
}

export function executePaymentOperation(
  config: PaymentAdapterConfig & {
    kind: PaymentOperationKind;
    amount: string;
  }
): PaymentAdapterExecutionResult {
  const adapterMode = resolveAdapterMode(config.settings);
  if (adapterMode === "WEBHOOK") {
    const externalReference = buildExternalReference(`${config.providerKey}-${config.kind.toLowerCase()}`);
    return {
      executionMode: "WEBHOOK",
      status: "PENDING",
      externalReference,
      errorCode: null,
      errorMessage: null,
      responsePayload: {
        providerKey: config.providerKey,
        providerType: config.providerType,
        kind: config.kind,
        amount: config.amount,
        executionMode: "WEBHOOK",
        awaitingWebhook: true,
        externalReference
      }
    };
  }

  const prefix = `${config.providerKey}-${config.kind.toLowerCase()}`;
  return {
    executionMode: "SYNC",
    status: "SUCCEEDED",
    externalReference: buildExternalReference(prefix),
    errorCode: null,
    errorMessage: null,
    responsePayload: {
      providerKey: config.providerKey,
      providerType: config.providerType,
      kind: config.kind,
      amount: config.amount,
      executionMode: "SYNC",
      completed: true
    }
  };
}

export function resolvePaymentWebhook(
  config: PaymentAdapterConfig,
  input: {
    signature?: string | null;
    eventType: string;
    payload: Record<string, unknown>;
  }
): PaymentWebhookResolution {
  const secret = config.secrets?.webhookSecret ?? config.settings?.webhookSecret ?? null;
  const signatureValid = !secret || input.signature === secret;
  const outcomeToken = String(input.payload.outcome ?? "SUCCEEDED").toUpperCase();
  const entityTypeToken = String(input.payload.entityType ?? "PAYMENT_ATTEMPT").toUpperCase();

  return {
    signatureValid,
    eventType: input.eventType,
    externalReference:
      typeof input.payload.externalReference === "string" ? input.payload.externalReference : null,
    outcome: outcomeToken === "FAILED" ? "FAILED" : "SUCCEEDED",
    errorCode: typeof input.payload.errorCode === "string" ? input.payload.errorCode : null,
    errorMessage: typeof input.payload.errorMessage === "string" ? input.payload.errorMessage : null,
    entityType: entityTypeToken === "PAYMENT_OPERATION" ? "PAYMENT_OPERATION" : "PAYMENT_ATTEMPT",
    payload: input.payload
  };
}
