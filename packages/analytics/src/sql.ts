import { type DateRange, WAE_DATASET } from "@edgetrail/shared";

export type DimensionKind =
  | "top-pages"
  | "referrers"
  | "countries"
  | "devices"
  | "browsers"
  | "os"
  | "utm";

const dimensionFields = {
  "top-pages": ["blob3", "path"],
  referrers: ["blob5", "referrerDomain"],
  countries: ["blob6", "country"],
  devices: ["blob9", "device"],
  browsers: ["blob7", "browser"],
  os: ["blob8", "os"],
} as const satisfies Record<Exclude<DimensionKind, "utm">, readonly [string, string]>;

export function buildSummarySql(siteId: string, range: DateRange): string {
  return `
SELECT
  SUM(_sample_interval) AS pageviews,
  count(DISTINCT blob13) AS approximate_visitors,
  count(DISTINCT blob14) AS approximate_visits
FROM ${WAE_DATASET}
WHERE
  index1 = ${sqlString(siteId)}
  AND blob1 = 'pageview'
  AND blob9 != 'bot'
  AND timestamp >= ${toUnixSeconds(range.start)}
  AND timestamp < ${toUnixSeconds(range.end)}
`.trim();
}

export function buildTimeseriesSql(
  siteId: string,
  range: DateRange,
  bucketSeconds: number,
): string {
  return `
SELECT
  intDiv(toUInt32(timestamp), ${bucketSeconds}) * ${bucketSeconds} AS time_bucket,
  SUM(_sample_interval) AS pageviews,
  count(DISTINCT blob13) AS approximate_visitors
FROM ${WAE_DATASET}
WHERE
  index1 = ${sqlString(siteId)}
  AND blob1 = 'pageview'
  AND blob9 != 'bot'
  AND timestamp >= ${toUnixSeconds(range.start)}
  AND timestamp < ${toUnixSeconds(range.end)}
GROUP BY time_bucket
ORDER BY time_bucket ASC
`.trim();
}

export function buildDimensionSql(siteId: string, range: DateRange, kind: DimensionKind): string {
  if (kind === "utm") {
    return `
SELECT
  blob10 AS utmSource,
  blob11 AS utmMedium,
  blob12 AS utmCampaign,
  SUM(_sample_interval) AS pageviews,
  count(DISTINCT blob13) AS approximate_visitors
FROM ${WAE_DATASET}
WHERE
  index1 = ${sqlString(siteId)}
  AND blob1 = 'pageview'
  AND blob9 != 'bot'
  AND timestamp >= ${toUnixSeconds(range.start)}
  AND timestamp < ${toUnixSeconds(range.end)}
GROUP BY utmSource, utmMedium, utmCampaign
ORDER BY pageviews DESC
LIMIT 20
`.trim();
  }

  const [field, alias] = dimensionFields[kind];
  return `
SELECT
  ${field} AS ${alias},
  SUM(_sample_interval) AS pageviews,
  count(DISTINCT blob13) AS approximate_visitors
FROM ${WAE_DATASET}
WHERE
  index1 = ${sqlString(siteId)}
  AND blob1 = 'pageview'
  AND blob9 != 'bot'
  AND timestamp >= ${toUnixSeconds(range.start)}
  AND timestamp < ${toUnixSeconds(range.end)}
GROUP BY ${alias}
ORDER BY pageviews DESC
LIMIT 20
`.trim();
}

export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
