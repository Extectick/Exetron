import type {
  CustomizationChannel,
  PaymentMethodKind
} from "@exetron/types";

export interface CustomizationEvaluationInput {
  tenantId: string;
  storeId?: string | null;
  channel: CustomizationChannel;
  pointKey?: string | null;
  inputs?: Record<string, unknown> | null;
}

export interface EffectiveCustomizationState {
  settings: Record<string, Record<string, unknown>>;
  featureFlags: Record<string, boolean>;
  branding: Record<string, unknown> | null;
}

export interface RuleMatchContext extends CustomizationEvaluationInput {
  now: Date;
  featureFlags: Record<string, boolean>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

export function deepMergeRecord(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepMergeRecord(current, value);
      continue;
    }

    result[key] = value;
  }

  return result;
}

export function buildCustomizationScopeKey(input: {
  tenantId: string;
  storeId?: string | null;
  channel: CustomizationChannel;
  pointKey?: string | null;
}): string {
  return [
    `tenant:${input.tenantId}`,
    `channel:${input.channel}`,
    `store:${input.storeId ?? "*"}`,
    `point:${input.pointKey?.trim() || "*"}`
  ].join("|");
}

export function specificityScore(input: {
  storeId?: string | null;
  pointKey?: string | null;
}): number {
  return (input.storeId ? 1 : 0) + (input.pointKey?.trim() ? 2 : 0);
}

export function matchesCustomizationRule(
  conditions: Record<string, unknown> | null | undefined,
  context: RuleMatchContext
): boolean {
  if (!conditions) {
    return true;
  }

  if (conditions.always === false) {
    return false;
  }

  const paymentMethodIn = asStringArray(conditions.paymentMethodIn);
  if (paymentMethodIn.length > 0) {
    const paymentMethod = context.inputs?.paymentMethod;
    if (
      typeof paymentMethod !== "string" ||
      !paymentMethodIn.includes(paymentMethod as PaymentMethodKind)
    ) {
      return false;
    }
  }

  if (typeof conditions.customerNameProvided === "boolean") {
    const provided = typeof context.inputs?.customerName === "string"
      ? context.inputs.customerName.trim().length > 0
      : false;

    if (conditions.customerNameProvided !== provided) {
      return false;
    }
  }

  const weekdayIn = Array.isArray(conditions.weekdayIn)
    ? conditions.weekdayIn.filter(
        (item): item is number => typeof item === "number" && item >= 0 && item <= 6
      )
    : [];
  if (weekdayIn.length > 0 && !weekdayIn.includes(context.now.getUTCDay())) {
    return false;
  }

  const hourFrom = asNumber(conditions.hourFrom);
  const hourTo = asNumber(conditions.hourTo);
  const currentHour = context.now.getUTCHours();
  if (hourFrom !== null && currentHour < hourFrom) {
    return false;
  }
  if (hourTo !== null && currentHour >= hourTo) {
    return false;
  }

  if (isPlainObject(conditions.featureFlagEquals)) {
    for (const [key, value] of Object.entries(conditions.featureFlagEquals)) {
      if (typeof value !== "boolean") {
        continue;
      }

      if ((context.featureFlags[key] ?? false) !== value) {
        return false;
      }
    }
  }

  return true;
}

export function applyCustomizationRuleActions(
  state: EffectiveCustomizationState,
  actions: Record<string, unknown>
): EffectiveCustomizationState {
  const nextSettings = { ...state.settings };
  const nextFeatureFlags = { ...state.featureFlags };
  let nextBranding = state.branding ? { ...state.branding } : null;

  if (isPlainObject(actions.setSettings)) {
    for (const [key, value] of Object.entries(actions.setSettings)) {
      if (!isPlainObject(value)) {
        continue;
      }
      nextSettings[key] = value;
    }
  }

  if (isPlainObject(actions.patchSettings)) {
    for (const [key, value] of Object.entries(actions.patchSettings)) {
      if (!isPlainObject(value)) {
        continue;
      }

      nextSettings[key] = deepMergeRecord(nextSettings[key] ?? {}, value);
    }
  }

  if (isPlainObject(actions.setFeatureFlags)) {
    for (const [key, value] of Object.entries(actions.setFeatureFlags)) {
      if (typeof value === "boolean") {
        nextFeatureFlags[key] = value;
      }
    }
  }

  if (isPlainObject(actions.patchBranding)) {
    nextBranding = deepMergeRecord(nextBranding ?? {}, actions.patchBranding);
  }

  return {
    settings: nextSettings,
    featureFlags: nextFeatureFlags,
    branding: nextBranding
  };
}
