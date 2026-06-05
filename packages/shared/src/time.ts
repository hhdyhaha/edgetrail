import { WAE_RETENTION_DAYS } from "./constants.js";

export type DatePreset = "today" | "yesterday" | "7d" | "30d";

export type DateRange = {
  start: Date;
  end: Date;
};

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function getUtcDayRange(now = new Date()): DateRange {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function resolvePresetRange(preset: DatePreset, now = new Date()): DateRange {
  const today = getUtcDayRange(now);
  if (preset === "today") {
    return today;
  }
  if (preset === "yesterday") {
    const start = new Date(today.start.getTime() - 24 * 60 * 60 * 1000);
    return { start, end: today.start };
  }
  const days = preset === "30d" ? 30 : 7;
  return {
    start: new Date(today.end.getTime() - days * 24 * 60 * 60 * 1000),
    end: today.end,
  };
}

export function assertWithinWaeRetention(range: DateRange, now = new Date()): void {
  const earliest = new Date(now.getTime() - WAE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  if (range.start < earliest) {
    throw new Error("Date range exceeds Workers Analytics Engine retention window");
  }
  if (range.end <= range.start) {
    throw new Error("Date range end must be after start");
  }
}

export function chooseBucketSeconds(range: DateRange): number {
  const hours = (range.end.getTime() - range.start.getTime()) / (60 * 60 * 1000);
  if (hours <= 48) {
    return 60 * 60;
  }
  if (hours <= 24 * 14) {
    return 6 * 60 * 60;
  }
  return 24 * 60 * 60;
}
