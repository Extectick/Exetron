import { Prisma } from "@exetron/database";
import type { RequestContext } from "@exetron/types";

export type JsonRecord = Record<string, unknown>;

export function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map((item) => asObject(item)) : [];
}

export function asInputJson(value: unknown): Prisma.InputJsonObject {
  return asObject(value) as Prisma.InputJsonObject;
}

export function asNullableInputJson(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === null) {
    return Prisma.JsonNull;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Prisma.InputJsonObject;
  }

  return undefined;
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function asUuidOrNull(value: string | null | undefined): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function resolveContext(
  request: { user?: Partial<RequestContext> & { sub?: string; userId?: string } },
  tenantId?: string
): RequestContext {
  const user = request.user;
  return {
    userId: user?.userId ?? user?.sub ?? "local-dev",
    tenantId: user?.tenantId ?? tenantId ?? null,
    scope: user?.scope ?? "platform_admin",
    roleIds: user?.roleIds ?? [],
    permissions: user?.permissions ?? [],
    storeIds: user?.storeIds ?? [],
    deviceId: user?.deviceId
  };
}

export function mapDates<T extends Record<string, unknown>>(record: T, keys: string[]) {
  const copy = { ...record } as Record<string, unknown>;
  for (const key of keys) {
    const value = copy[key];
    copy[key] = value instanceof Date ? value.toISOString() : value;
  }
  return copy;
}

