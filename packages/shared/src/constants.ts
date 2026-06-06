export const SCHEMA_VERSION = "v1";

export const MAX_WAE_BLOBS = 20;
export const MAX_WAE_DOUBLES = 20;
export const MAX_WAE_INDEXES = 1;
export const MAX_WAE_BLOBS_BYTES = 16 * 1024;
export const WAE_RETENTION_DAYS = 90;

export const STRING_LIMITS = {
  path: 512,
  normalizedUrl: 1024,
  referrerDomain: 253,
  utm: 128,
  eventName: 128,
  eventCategory: 128,
  eventLabel: 128,
  language: 35,
  siteHost: 253,
  pageTitleHash: 96,
} as const;

export const DIMENSIONS = [
  "path",
  "referrer",
  "country",
  "device",
  "browser",
  "os",
  "utm_source",
  "utm_medium",
  "utm_campaign",
] as const;

export const TRACKER_GLOBAL = "edgeTrail";

export const COLLECT_ENDPOINT = "/collect";
