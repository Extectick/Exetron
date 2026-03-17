export interface AvailabilityWindowLike {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface CatalogAvailabilityInput {
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isVisible: boolean;
  isAvailable: boolean;
  isOutOfStock: boolean;
  windows?: AvailabilityWindowLike[];
  currentWeekday: number;
  currentMinuteOfDay: number;
}

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

export function parseClockTime(value: string): number {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    throw new Error(`Invalid clock value: ${value}`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function resolveCurrentSlot(date: Date, timezone: string): {
  weekday: number;
  minuteOfDay: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);
  const weekdayToken = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hourToken = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minuteToken = parts.find((part) => part.type === "minute")?.value ?? "00";

  return {
    weekday: weekdayMap[weekdayToken] ?? 0,
    minuteOfDay: Number(hourToken) * 60 + Number(minuteToken)
  };
}

export function isWithinAvailabilityWindows(
  windows: AvailabilityWindowLike[],
  currentWeekday: number,
  currentMinuteOfDay: number
): boolean {
  if (!windows.length) {
    return true;
  }

  return windows.some((window) => {
    const start = parseClockTime(window.startTime);
    const end = parseClockTime(window.endTime);

    if (start === end) {
      return window.weekday === currentWeekday;
    }

    if (start < end) {
      return (
        window.weekday === currentWeekday &&
        currentMinuteOfDay >= start &&
        currentMinuteOfDay < end
      );
    }

    const nextWeekday = (window.weekday + 1) % 7;

    return (
      (window.weekday === currentWeekday && currentMinuteOfDay >= start) ||
      (nextWeekday === currentWeekday && currentMinuteOfDay < end)
    );
  });
}

export function isCatalogEntryAvailable(input: CatalogAvailabilityInput): boolean {
  if (input.status !== "ACTIVE") {
    return false;
  }

  if (!input.isVisible || !input.isAvailable || input.isOutOfStock) {
    return false;
  }

  return isWithinAvailabilityWindows(
    input.windows ?? [],
    input.currentWeekday,
    input.currentMinuteOfDay
  );
}
