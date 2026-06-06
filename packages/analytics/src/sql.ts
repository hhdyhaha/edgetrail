import type { DateRange } from "@edgetrail/shared";

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

const sqlIdentifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function buildSummarySql(dataset: string, siteId: string, range: DateRange): string {
  return `
SELECT
  SUM(_sample_interval) AS pageviews,
  count(DISTINCT blob13) AS approximate_visitors,
  count(DISTINCT blob14) AS approximate_visits
FROM ${sqlIdentifier(dataset)}
WHERE
  index1 = ${sqlString(siteId)}
  AND blob1 = 'pageview'
  AND blob9 != 'bot'
  AND ${timestampRangeSql(range)}
`.trim();
}

export function buildTimeseriesSql(
  dataset: string,
  siteId: string,
  range: DateRange,
  bucketSeconds: number,
): string {
  return `
SELECT
  intDiv(toUnixTimestamp(timestamp), ${bucketSeconds}) * ${bucketSeconds} AS time_bucket,
  SUM(_sample_interval) AS pageviews,
  count(DISTINCT blob13) AS approximate_visitors
FROM ${sqlIdentifier(dataset)}
WHERE
  index1 = ${sqlString(siteId)}
  AND blob1 = 'pageview'
  AND blob9 != 'bot'
  AND ${timestampRangeSql(range)}
GROUP BY time_bucket
ORDER BY time_bucket ASC
`.trim();
}

export function buildDimensionSql(
  dataset: string,
  siteId: string,
  range: DateRange,
  kind: DimensionKind,
): string {
  if (kind === "utm") {
    return `
SELECT
  blob10 AS utmSource,
  blob11 AS utmMedium,
  blob12 AS utmCampaign,
  SUM(_sample_interval) AS pageviews,
  count(DISTINCT blob13) AS approximate_visitors
FROM ${sqlIdentifier(dataset)}
WHERE
  index1 = ${sqlString(siteId)}
  AND blob1 = 'pageview'
  AND blob9 != 'bot'
  AND ${timestampRangeSql(range)}
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
FROM ${sqlIdentifier(dataset)}
WHERE
  index1 = ${sqlString(siteId)}
  AND blob1 = 'pageview'
  AND blob9 != 'bot'
  AND ${timestampRangeSql(range)}
GROUP BY ${alias}
ORDER BY pageviews DESC
LIMIT 20
`.trim();
}

export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function sqlIdentifier(value: string): string {
  if (!sqlIdentifierPattern.test(value)) {
    throw new Error("Invalid Workers Analytics Engine dataset identifier");
  }
  return value;
}

function timestampRangeSql(range: DateRange): string {
  return [
    `timestamp >= toDateTime(${sqlString(formatUtcDateTime(range.start))})`,
    `timestamp < toDateTime(${sqlString(formatUtcDateTime(range.end))})`,
  ].join("\n  AND ");
}

function formatUtcDateTime(date: Date): string {
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "");
}
