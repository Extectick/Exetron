import type {
  AvailabilityWindowDto,
  AvailabilityWindowInput
} from "@exetron/contracts";
import type { AvailabilityTargetType } from "@exetron/types";
import type { Prisma } from "@exetron/database";

type AvailabilityWindowRecord = {
  id: string;
  tenantId: string;
  storeId: string | null;
  targetType: AvailabilityTargetType;
  targetId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
};

export function decimalToString(
  value: { toFixed: (digits?: number) => string } | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  return value.toFixed(2);
}

export function mapAvailabilityWindow(
  window: AvailabilityWindowRecord
): AvailabilityWindowDto {
  return {
    id: window.id,
    tenantId: window.tenantId,
    storeId: window.storeId,
    targetType: window.targetType,
    targetId: window.targetId,
    weekday: window.weekday,
    startTime: window.startTime,
    endTime: window.endTime,
    createdAt: window.createdAt.toISOString(),
    updatedAt: window.updatedAt.toISOString()
  };
}

export function groupAvailabilityWindows(
  windows: AvailabilityWindowRecord[]
): Map<string, AvailabilityWindowDto[]> {
  const grouped = new Map<string, AvailabilityWindowDto[]>();

  for (const window of windows) {
    const key = `${window.targetType}:${window.targetId}`;
    const existing = grouped.get(key) ?? [];
    existing.push(mapAvailabilityWindow(window));
    grouped.set(key, existing);
  }

  return grouped;
}

export async function replaceAvailabilityWindows(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    targetType: AvailabilityTargetType;
    targetId: string;
    windows: AvailabilityWindowInput[];
  }
): Promise<void> {
  await tx.availabilityWindow.deleteMany({
    where: {
      targetType: input.targetType,
      targetId: input.targetId
    }
  });

  if (!input.windows.length) {
    return;
  }

  await tx.availabilityWindow.createMany({
    data: input.windows.map((window) => ({
      tenantId: input.tenantId,
      storeId: window.storeId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      weekday: window.weekday,
      startTime: window.startTime,
      endTime: window.endTime
    }))
  });
}
