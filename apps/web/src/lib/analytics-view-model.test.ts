import { describe, expect, it } from "vitest";
import {
  buildDimensionRows,
  buildSummaryMetrics,
  buildTimeseriesPoints,
} from "./analytics-view-model";

describe("analytics dashboard view model", () => {
  it("derives summary metrics from Workers Analytics Engine rows", () => {
    const metrics = buildSummaryMetrics([
      {
        approximate_visits: "5",
        approximate_visitors: 3,
        pageviews: "12",
      },
    ]);

    expect(metrics).toEqual({
      pageviews: 12,
      visitors: 3,
      visits: 5,
      viewsPerVisit: 2.4,
    });
  });

  it("formats UTM rows using source, medium, and campaign", () => {
    expect(
      buildDimensionRows("utm", [
        {
          approximate_visitors: 4,
          pageviews: 9,
          utmCampaign: "launch",
          utmMedium: "cpc",
          utmSource: "google",
        },
      ]),
    ).toEqual([{ label: "google / cpc / launch", pageviews: 9, visitors: 4 }]);
  });

  it("drops empty timeseries buckets from charts", () => {
    expect(
      buildTimeseriesPoints([
        { approximate_visitors: 0, pageviews: 0, time_bucket: 1_780_000_000 },
        { approximate_visitors: 2, pageviews: 7, time_bucket: 1_780_086_400 },
      ]),
    ).toHaveLength(1);
  });
});
