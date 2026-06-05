import { type QueueEventMessage, SCHEMA_VERSION } from "@edgetrail/shared";
import { describe, expect, it } from "vitest";
import {
  buildDimensionSql,
  buildSummarySql,
  buildTimeseriesSql,
  getReferrerDomain,
  normalizeUrlForAnalytics,
  toWaeDataPoint,
  waeBlobFields,
} from "../index";

const event: QueueEventMessage = {
  eventId: "event_1234567890abcdef",
  schemaVersion: SCHEMA_VERSION,
  siteId: "site_1",
  publicSiteId: "pub_1",
  eventName: "pageview",
  ingestedAt: "2026-06-05T00:00:00.000Z",
  clientTimestampMs: 1780617600000,
  siteHost: "example.com",
  path: "/pricing",
  normalizedUrl: "https://example.com/pricing?utm_source=google",
  referrerDomain: "google.com",
  country: "US",
  browser: "Chrome",
  os: "macOS",
  device: "desktop",
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "launch",
  visitorHash: "a".repeat(64),
  sessionHash: "b".repeat(64),
  language: "en-US",
  value: 1,
};

describe("analytics mapper", () => {
  it("uses the PRD ordered blob mapping", () => {
    const point = toWaeDataPoint(event);
    expect(point.indexes).toEqual(["site_1"]);
    expect(point.blobs).toHaveLength(20);
    expect(point.blobs[0]).toBe("pageview");
    expect(point.blobs[12]).toBe(event.visitorHash);
    expect(point.blobs[19]).toBe(SCHEMA_VERSION);
    expect(waeBlobFields[19]).toBe("schemaVersion");
  });

  it("normalizes URL by removing hash and non-UTM query", () => {
    const url = new URL("https://example.com/path?a=1&utm_source=google#section");
    expect(normalizeUrlForAnalytics(url)).toBe("https://example.com/path?utm_source=google");
  });

  it("extracts safe referrer domains", () => {
    expect(getReferrerDomain("https://www.google.com/search?q=x")).toBe("www.google.com");
    expect(getReferrerDomain("not a url")).toBe("");
  });

  it("does not leak raw IP, raw UA, raw title or PII in mapped output", () => {
    const point = toWaeDataPoint({
      ...event,
      pageTitleHash: "hash_only",
    });
    const serialized = JSON.stringify(point).toLowerCase();
    expect(serialized).not.toContain("useragent");
    expect(serialized).not.toContain("title");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("192.168");
  });
});

describe("WAE SQL builders", () => {
  const range = {
    start: new Date("2026-06-01T00:00:00.000Z"),
    end: new Date("2026-06-02T00:00:00.000Z"),
  };

  it("uses sampling-aware pageview counts", () => {
    const sql = buildSummarySql("site_1", range);
    expect(sql).toContain("SUM(_sample_interval) AS pageviews");
    expect(sql).not.toContain("count() AS pageviews");
    expect(sql).toContain("blob9 != 'bot'");
  });

  it("builds timeseries SQL with bucket grouping", () => {
    const sql = buildTimeseriesSql("site_1", range, 3600);
    expect(sql).toContain("intDiv(toUInt32(timestamp), 3600)");
    expect(sql).toContain("ORDER BY time_bucket ASC");
  });

  it("builds dimension SQL with top 20 limit", () => {
    const sql = buildDimensionSql("site_1", range, "browsers");
    expect(sql).toContain("blob7 AS browser");
    expect(sql).toContain("LIMIT 20");
    expect(sql).toContain("SUM(_sample_interval) AS pageviews");
  });
});
