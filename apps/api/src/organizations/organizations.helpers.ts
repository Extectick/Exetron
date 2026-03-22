import { Prisma } from "@exetron/database";
import type { RequestContext } from "@exetron/types";
import type { JsonRecord, ResolveContextRequest } from "./organizations.dto";

export function asObject(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

export function asNullableJson(
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

export function asInputJson(value: unknown): Prisma.InputJsonObject {
  return asObject(value) as Prisma.InputJsonObject;
}

export function readManagedStatus(
  value: Prisma.JsonValue | null | undefined,
  fallback: string = "ACTIVE"
): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const source = value as Record<string, unknown>;
  const meta = source.__meta && typeof source.__meta === "object" && !Array.isArray(source.__meta)
    ? (source.__meta as Record<string, unknown>)
    : null;
  const status = meta?.status ?? source.status;

  return typeof status === "string" ? status : fallback;
}

export function setManagedStatus(
  value: unknown,
  status: string,
  extra?: Record<string, unknown>
): Prisma.InputJsonObject {
  const source = asObject(value);
  const meta = asObject(source.__meta);

  return {
    ...source,
    __meta: {
      ...meta,
      ...(extra ?? {}),
      status
    }
  } as Prisma.InputJsonObject;
}

export function resolveContext(request: ResolveContextRequest, tenantId?: string): RequestContext {
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

export function asUuidOrNull(value: string | null | undefined): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}
