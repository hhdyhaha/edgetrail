import { describe, expect, it } from "vitest";
import { buildDimensionSql, buildSummarySql, buildTimeseriesSql, sqlIdentifier } from "./sql";

const range = {
  start: new Date("2026-06-01T00:00:00Z"),
  end: new Date("2026-06-08T00:00:00Z"),
};

describe("Workers Analytics Engine SQL builders", () => {
  it("uses sampling-aware pageview counts and filters bots", () => {
    const sql = buildSummarySql("test_dataset", "site_1", range);
    expect(sql).toContain("SUM(_sample_interval) AS pageviews");
    expect(sql).toContain("blob9 != 'bot'");
    expect(sql).toContain("FROM test_dataset");
    expect(sql).toContain("timestamp >= toDateTime('2026-06-01 00:00:00')");
    expect(sql).toContain("timestamp < toDateTime('2026-06-08 00:00:00')");
    expect(sql).not.toContain("your-web-analytics-events");
    expect(sql).not.toContain("count() AS pageviews");
  });

  it("uses sampling-aware counts for timeseries", () => {
    const sql = buildTimeseriesSql("test_dataset", "site_1", range, 86_400);
    expect(sql).toContain("SUM(_sample_interval) AS pageviews");
    expect(sql).toContain("intDiv(toUnixTimestamp(timestamp), 86400)");
    expect(sql).toContain("GROUP BY time_bucket");
  });

  it("returns source, medium, and campaign for UTM dimensions", () => {
    const sql = buildDimensionSql("test_dataset", "site_1", range, "utm");
    expect(sql).toContain("blob10 AS utmSource");
    expect(sql).toContain("blob11 AS utmMedium");
    expect(sql).toContain("blob12 AS utmCampaign");
    expect(sql).toContain("GROUP BY utmSource, utmMedium, utmCampaign");
    expect(sql).toContain("SUM(_sample_interval) AS pageviews");
  });

  it("rejects unsafe dataset identifiers", () => {
    expect(sqlIdentifier("test_dataset_1")).toBe("test_dataset_1");
    expect(() => sqlIdentifier("dataset-with-dashes")).toThrow(
      "Invalid Workers Analytics Engine dataset identifier",
    );
    expect(() => sqlIdentifier("dataset;DROP TABLE events")).toThrow(
      "Invalid Workers Analytics Engine dataset identifier",
    );
  });
});
