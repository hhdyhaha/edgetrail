import { buildSummarySql } from "@edgetrail/analytics";
import { describe, expect, it } from "vitest";

describe("web API invariants", () => {
  it("summary SQL is sampling-aware for dashboard pageviews", () => {
    const sql = buildSummarySql("test_dataset", "site_1", {
      start: new Date("2026-06-01T00:00:00Z"),
      end: new Date("2026-06-02T00:00:00Z"),
    });
    expect(sql).toContain("SUM(_sample_interval)");
    expect(sql).toContain("blob9 != 'bot'");
  });
});
