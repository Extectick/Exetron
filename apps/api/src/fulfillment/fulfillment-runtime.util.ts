import type {
  DeliveryZoneDto,
  DineInConfigDto,
  DineInTableDto,
  FulfillmentProviderExtensionDto,
  FulfillmentSelectionDto,
  FulfillmentSnapshotDto,
  PickupConfigDto,
  StoreFulfillmentConfigDto
} from "@exetron/contracts";
import type { FulfillmentMode, FulfillmentStatus } from "@exetron/types";
import { formatCents, parseMoneyToCents } from "../pricing/money.util";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asFulfillmentMode(value: unknown): FulfillmentMode | null {
  return value === "DELIVERY" || value === "PICKUP" || value === "DINE_IN" ? value : null;
}

function asFulfillmentStatus(value: unknown): FulfillmentStatus | null {
  return value === "PENDING" ||
    value === "SCHEDULED" ||
    value === "PREPARING" ||
    value === "READY_FOR_PICKUP" ||
    value === "OUT_FOR_DELIVERY" ||
    value === "DELIVERED" ||
    value === "PICKED_UP" ||
    value === "TABLE_ASSIGNED" ||
    value === "SERVED"
    ? value
    : null;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toMoney(value: unknown, fallback: string): string {
  return typeof value === "string" && parseMoneyToCents(value) !== null ? value : fallback;
}

function normalizeDeliveryZones(value: unknown): DeliveryZoneDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry, index) => ({
      code: typeof entry.code === "string" && entry.code.trim() ? entry.code : `zone-${index + 1}`,
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name : `Zone ${index + 1}`,
      postalCodes: asStringArray(entry.postalCodes),
      fee: toMoney(entry.fee, "0.00"),
      etaMinMinutes: toNumber(entry.etaMinMinutes, 20),
      etaMaxMinutes: toNumber(entry.etaMaxMinutes, 40),
      slaMinutes: toNumber(entry.slaMinutes, 60),
      isActive: entry.isActive !== false
    }));
}

function normalizePickup(value: unknown): PickupConfigDto {
  const input = asRecord(value);
  return {
    enabled: input?.enabled !== false,
    leadTimeMinutes: toNumber(input?.leadTimeMinutes, 20),
    promisedWindowMinutes: toNumber(input?.promisedWindowMinutes, 15),
    instructions:
      typeof input?.instructions === "string" && input.instructions.trim()
        ? input.instructions
        : null
  };
}

function normalizeTables(value: unknown): DineInTableDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry, index) => ({
      code: typeof entry.code === "string" && entry.code.trim() ? entry.code : `table-${index + 1}`,
      label: typeof entry.label === "string" && entry.label.trim() ? entry.label : `Table ${index + 1}`,
      capacity: toNumber(entry.capacity, 2),
      isActive: entry.isActive !== false
    }));
}

function normalizeDineIn(value: unknown): DineInConfigDto {
  const input = asRecord(value);
  return {
    enabled: input?.enabled === true,
    leadTimeMinutes: toNumber(input?.leadTimeMinutes, 15),
    tables: normalizeTables(input?.tables)
  };
}

function normalizeProviders(value: unknown): FulfillmentProviderExtensionDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry, index) => ({
      providerKey:
        typeof entry.providerKey === "string" && entry.providerKey.trim()
          ? entry.providerKey
          : `manual-${index + 1}`,
      providerType: entry.providerType === "EXTERNAL_PLACEHOLDER" ? "EXTERNAL_PLACEHOLDER" : "MANUAL",
      enabled: entry.enabled !== false
    }));
}

export function resolveStoreFulfillmentConfig(
  storeId: string,
  raw: unknown
): StoreFulfillmentConfigDto {
  const input = asRecord(raw);
  const enabledModes = Array.isArray(input?.enabledModes)
    ? input.enabledModes
        .map((mode) => asFulfillmentMode(mode))
        .filter((mode): mode is FulfillmentMode => mode !== null)
    : ["DELIVERY", "PICKUP"];
  const uniqueModes = [...new Set(enabledModes)] as FulfillmentMode[];
  const defaultMode = (asFulfillmentMode(input?.defaultMode) ?? uniqueModes[0] ?? "DELIVERY") as FulfillmentMode;

  return {
    storeId,
    enabledModes: uniqueModes.length ? uniqueModes : ["DELIVERY"],
    defaultMode,
    deliveryZones: normalizeDeliveryZones(input?.deliveryZones),
    pickup: normalizePickup(input?.pickup),
    dineIn: normalizeDineIn(input?.dineIn),
    providers: normalizeProviders(input?.providers)
  };
}

export function normalizeFulfillmentSelection(
  value: unknown
): FulfillmentSelectionDto | null {
  const input = asRecord(value);
  const mode = asFulfillmentMode(input?.mode);
  if (!mode) {
    return null;
  }

  return {
    mode,
    zoneCode: typeof input?.zoneCode === "string" && input.zoneCode.trim() ? input.zoneCode : null,
    addressLine1:
      typeof input?.addressLine1 === "string" && input.addressLine1.trim() ? input.addressLine1 : null,
    addressLine2:
      typeof input?.addressLine2 === "string" && input.addressLine2.trim() ? input.addressLine2 : null,
    postalCode:
      typeof input?.postalCode === "string" && input.postalCode.trim() ? input.postalCode : null,
    contactless: input?.contactless === true,
    pickupSlotLabel:
      typeof input?.pickupSlotLabel === "string" && input.pickupSlotLabel.trim()
        ? input.pickupSlotLabel
        : null,
    tableCode:
      typeof input?.tableCode === "string" && input.tableCode.trim() ? input.tableCode : null,
    guestCount: typeof input?.guestCount === "number" && input.guestCount > 0 ? input.guestCount : null,
    instructions:
      typeof input?.instructions === "string" && input.instructions.trim() ? input.instructions : null
  };
}

function shiftIso(base: Date, minutes: number): string {
  return new Date(base.getTime() + minutes * 60 * 1000).toISOString();
}

export function quoteFulfillment(
  config: StoreFulfillmentConfigDto,
  selection: FulfillmentSelectionDto,
  now = new Date()
): {
  status: FulfillmentStatus;
  fee: string;
  promisedAt: string | null;
  etaAt: string | null;
  selection: FulfillmentSelectionDto;
} {
  if (!config.enabledModes.includes(selection.mode)) {
    throw new Error(`Fulfillment mode ${selection.mode} is disabled for this store.`);
  }

  if (selection.mode === "DELIVERY") {
    const zone =
      config.deliveryZones.find((item) => item.code === selection.zoneCode && item.isActive) ??
      config.deliveryZones.find(
        (item) =>
          item.isActive &&
          selection.postalCode !== null &&
          item.postalCodes.includes(selection.postalCode)
      );

    if (!zone) {
      throw new Error("Delivery selection does not match an active delivery zone.");
    }

    return {
      status: "PENDING",
      fee: zone.fee,
      promisedAt: shiftIso(now, zone.slaMinutes),
      etaAt: shiftIso(now, zone.etaMaxMinutes),
      selection: {
        ...selection,
        zoneCode: zone.code
      }
    };
  }

  if (selection.mode === "PICKUP") {
    if (!config.pickup.enabled) {
      throw new Error("Pickup is disabled for this store.");
    }

    return {
      status: "SCHEDULED",
      fee: "0.00",
      promisedAt: shiftIso(now, config.pickup.leadTimeMinutes),
      etaAt: shiftIso(now, config.pickup.leadTimeMinutes),
      selection
    };
  }

  if (!config.dineIn.enabled) {
    throw new Error("Dine-in is disabled for this store.");
  }

  const table = config.dineIn.tables.find(
    (item) => item.code === selection.tableCode && item.isActive
  );
  if (!table) {
    throw new Error("Selected dine-in table is not active for this store.");
  }

  return {
    status: "TABLE_ASSIGNED",
    fee: "0.00",
    promisedAt: shiftIso(now, config.dineIn.leadTimeMinutes),
    etaAt: shiftIso(now, config.dineIn.leadTimeMinutes),
    selection: {
      ...selection,
      tableCode: table.code
    }
  };
}

export function mapFulfillmentSnapshot(input: {
  mode: string | null;
  status: string | null;
  fee: string | null;
  promisedAt: Date | null;
  etaAt: Date | null;
  payload: unknown;
}): FulfillmentSnapshotDto {
  const selection = normalizeFulfillmentSelection(input.payload);
  const payloadRecord = asRecord(input.payload);
  const courier = asRecord(payloadRecord?.courier);

  return {
    mode: asFulfillmentMode(input.mode),
    status: asFulfillmentStatus(input.status),
    fee: input.fee && parseMoneyToCents(input.fee) !== null ? input.fee : "0.00",
    promisedAt: input.promisedAt?.toISOString() ?? null,
    etaAt: input.etaAt?.toISOString() ?? null,
    details: selection,
    courier: courier
      ? {
          courierName:
            typeof courier.courierName === "string" && courier.courierName.trim()
              ? courier.courierName
              : null,
          courierPhone:
            typeof courier.courierPhone === "string" && courier.courierPhone.trim()
              ? courier.courierPhone
              : null,
          courierExternalId:
            typeof courier.courierExternalId === "string" && courier.courierExternalId.trim()
              ? courier.courierExternalId
              : null
        }
      : null
  };
}

export function stringifyMoneySum(values: Array<string | null | undefined>): string {
  const cents = values.reduce((sum, value) => sum + (parseMoneyToCents(value) ?? 0), 0);
  return formatCents(cents);
}
