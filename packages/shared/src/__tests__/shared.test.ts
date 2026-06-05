import { describe, expect, it } from "vitest";
import {
  collectPayloadSchema,
  queueEventMessageSchema,
  redactObject,
  resolvePresetRange,
  SCHEMA_VERSION,
} from "../index";

describe("shared contracts", () => {
  it("accepts the MVP collect payload", () => {
    const parsed = collectPayloadSchema.parse({
      siteId: "pub_123",
      eventName: "pageview",
      url: "https://example.com/pricing?utm_source=google",
      referrer: "",
      language: "en-US",
      screenWidth: 1440,
      screenHeight: 900,
      viewportWidth: 1280,
      viewportHeight: 760,
      timezoneOffset: -480,
      schemaVersion: SCHEMA_VERSION,
    });

    expect(parsed.siteId).toBe("pub_123");
  });

  it("rejects arbitrary custom props", () => {
    const result = collectPayloadSchema.safeParse({
      siteId: "pub_123",
      eventName: "pageview",
      url: "https://example.com",
      props: { email: "person@example.com" },
      schemaVersion: SCHEMA_VERSION,
    });

    expect(result.success).toBe(false);
  });

  it("locks queue messages to sanitized fields", () => {
    const result = queueEventMessageSchema.safeParse({
      eventId: "event_1234567890abcdef",
      schemaVersion: SCHEMA_VERSION,
      siteId: "site_1",
      publicSiteId: "pub_1",
      eventName: "pageview",
      ingestedAt: new Date().toISOString(),
      siteHost: "example.com",
      path: "/",
      normalizedUrl: "https://example.com/",
      referrerDomain: "",
      country: "US",
      browser: "Chrome",
      os: "macOS",
      device: "desktop",
      visitorHash: "a".repeat(64),
      sessionHash: "b".repeat(64),
      value: 1,
      userAgent: "raw",
    });

    expect(result.success).toBe(false);
  });

  it("redacts nested sensitive values", () => {
    expect(
      redactObject({
        message: "failed",
        rawUserAgent: "secret browser string",
        nested: { email: "person@example.com" },
      }),
    ).toEqual({
      message: "failed",
      rawUserAgent: "[REDACTED]",
      nested: { email: "[REDACTED]" },
    });
  });

  it("resolves a stable last 7 days range", () => {
    const range = resolvePresetRange("7d", new Date("2026-06-05T10:00:00.000Z"));
    expect(range.start.toISOString()).toBe("2026-05-30T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-06-06T00:00:00.000Z");
  });
});
