import {
  MAX_WAE_BLOBS,
  MAX_WAE_BLOBS_BYTES,
  MAX_WAE_DOUBLES,
  MAX_WAE_INDEXES,
  type QueueEventMessage,
  SCHEMA_VERSION,
  STRING_LIMITS,
} from "@edgetrail/shared";

export type WaeDataPoint = {
  indexes: [string];
  blobs: string[];
  doubles: number[];
};

export const waeBlobFields = [
  "eventName",
  "siteHost",
  "path",
  "normalizedUrl",
  "referrerDomain",
  "country",
  "browser",
  "os",
  "device",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "visitorHash",
  "sessionHash",
  "language",
  "entryPath",
  "eventCategory",
  "eventLabel",
  "pageTitleHash",
  "schemaVersion",
] as const;

export const waeDoubleFields = [
  "value",
  "durationMs",
  "screenWidth",
  "screenHeight",
  "viewportWidth",
  "viewportHeight",
  "timezoneOffset",
  "scrollDepth",
  "loadTimeMs",
  "clientTimestampMs",
] as const;

export type WaeNumericInput = {
  value?: number;
  durationMs?: number;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  timezoneOffset?: number;
  scrollDepth?: number;
  loadTimeMs?: number;
  clientTimestampMs?: number;
};

export type WaeEventInput = QueueEventMessage & WaeNumericInput;

export function stripControlChars(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("");
}

export function truncateField(value: string | undefined, limit: number): string {
  return stripControlChars(value ?? "").slice(0, limit);
}

export function normalizeUrlForAnalytics(input: URL): string {
  const normalized = new URL(input);
  normalized.hash = "";
  for (const key of Array.from(normalized.searchParams.keys())) {
    if (!key.toLowerCase().startsWith("utm_")) {
      normalized.searchParams.delete(key);
    }
  }
  return truncateField(normalized.toString(), STRING_LIMITS.normalizedUrl);
}

export function getPath(input: URL): string {
  return truncateField(input.pathname || "/", STRING_LIMITS.path);
}

export function getReferrerDomain(referrer: string | undefined): string {
  if (!referrer) {
    return "";
  }
  try {
    return truncateField(new URL(referrer).hostname.toLowerCase(), STRING_LIMITS.referrerDomain);
  } catch {
    return "";
  }
}

export function toWaeDataPoint(event: WaeEventInput): WaeDataPoint {
  const blobs = [
    truncateField(event.eventName, STRING_LIMITS.eventName),
    truncateField(event.siteHost, STRING_LIMITS.siteHost),
    truncateField(event.path, STRING_LIMITS.path),
    truncateField(event.normalizedUrl, STRING_LIMITS.normalizedUrl),
    truncateField(event.referrerDomain, STRING_LIMITS.referrerDomain),
    truncateField(event.country, 8),
    truncateField(event.browser, 128),
    truncateField(event.os, 128),
    truncateField(event.device, 16),
    truncateField(event.utmSource, STRING_LIMITS.utm),
    truncateField(event.utmMedium, STRING_LIMITS.utm),
    truncateField(event.utmCampaign, STRING_LIMITS.utm),
    truncateField(event.visitorHash, 96),
    truncateField(event.sessionHash, 96),
    truncateField(event.language, STRING_LIMITS.language),
    truncateField(event.entryPath, STRING_LIMITS.path),
    truncateField(event.eventCategory, STRING_LIMITS.eventCategory),
    truncateField(event.eventLabel, STRING_LIMITS.eventLabel),
    truncateField(event.pageTitleHash, STRING_LIMITS.pageTitleHash),
    SCHEMA_VERSION,
  ];

  const doubles = [
    finiteOrZero(event.value),
    finiteOrZero(event.durationMs),
    finiteOrZero(event.screenWidth),
    finiteOrZero(event.screenHeight),
    finiteOrZero(event.viewportWidth),
    finiteOrZero(event.viewportHeight),
    finiteOrZero(event.timezoneOffset),
    finiteOrZero(event.scrollDepth),
    finiteOrZero(event.loadTimeMs),
    finiteOrZero(event.clientTimestampMs),
  ];

  assertWaePointShape({ indexes: [event.siteId], blobs, doubles });
  return { indexes: [event.siteId], blobs, doubles };
}

export function assertWaePointShape(point: WaeDataPoint): void {
  if (point.indexes.length !== MAX_WAE_INDEXES) {
    throw new Error("Workers Analytics Engine requires exactly one index");
  }
  if (point.blobs.length > MAX_WAE_BLOBS) {
    throw new Error("Workers Analytics Engine blob limit exceeded");
  }
  if (point.doubles.length > MAX_WAE_DOUBLES) {
    throw new Error("Workers Analytics Engine double limit exceeded");
  }
  const bytes = new TextEncoder().encode(point.blobs.join("")).byteLength;
  if (bytes > MAX_WAE_BLOBS_BYTES) {
    throw new Error("Workers Analytics Engine blob byte limit exceeded");
  }
}

function finiteOrZero(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}
