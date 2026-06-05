export type AnalyticsRow = Record<string, unknown>;

export type SummaryMetrics = {
  pageviews: number;
  visitors: number;
  visits: number;
  viewsPerVisit: number;
};

export type TimeseriesPoint = {
  label: string;
  pageviews: number;
  visitors: number;
};

export type DimensionKind =
  | "top-pages"
  | "referrers"
  | "countries"
  | "devices"
  | "browsers"
  | "os"
  | "utm";

export type DimensionRow = {
  label: string;
  pageviews: number;
  visitors: number;
};

export const dimensionConfigs = [
  { kind: "top-pages", title: "Top pages" },
  { kind: "referrers", title: "Referrers" },
  { kind: "countries", title: "Countries" },
  { kind: "devices", title: "Devices" },
  { kind: "browsers", title: "Browsers" },
  { kind: "os", title: "Operating systems" },
  { kind: "utm", title: "UTM source / medium / campaign" },
] as const satisfies readonly { kind: DimensionKind; title: string }[];

export function buildSummaryMetrics(rows: unknown[] | undefined): SummaryMetrics {
  const row = asRow(rows?.[0]);
  const pageviews = toNumber(row.pageviews);
  const visitors = toNumber(row.approximate_visitors);
  const visits = toNumber(row.approximate_visits);
  return {
    pageviews,
    visitors,
    visits,
    viewsPerVisit: visits === 0 ? 0 : pageviews / visits,
  };
}

export function buildTimeseriesPoints(rows: unknown[] | undefined): TimeseriesPoint[] {
  return (
    rows
      ?.map((row) => {
        const value = asRow(row);
        const timestampSeconds = toNumber(value.time_bucket);
        return {
          label: timestampSeconds ? formatBucket(timestampSeconds) : "Unknown",
          pageviews: toNumber(value.pageviews),
          visitors: toNumber(value.approximate_visitors),
        };
      })
      .filter((row) => row.pageviews > 0 || row.visitors > 0) ?? []
  );
}

export function buildDimensionRows(
  kind: DimensionKind,
  rows: unknown[] | undefined,
): DimensionRow[] {
  return (
    rows
      ?.map((row) => {
        const value = asRow(row);
        return {
          label: dimensionLabel(kind, value),
          pageviews: toNumber(value.pageviews),
          visitors: toNumber(value.approximate_visitors),
        };
      })
      .filter((row) => row.pageviews > 0 || row.visitors > 0) ?? []
  );
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatDecimal(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}

function dimensionLabel(kind: DimensionKind, row: AnalyticsRow): string {
  if (kind === "utm") {
    return [
      stringValue(row.utmSource, "(none)"),
      stringValue(row.utmMedium, "(none)"),
      stringValue(row.utmCampaign, "(none)"),
    ].join(" / ");
  }
  if (kind === "top-pages") {
    return stringValue(row.path, "/");
  }
  if (kind === "referrers") {
    return stringValue(row.referrerDomain, "Direct / none");
  }
  if (kind === "countries") {
    return stringValue(row.country, "Unknown");
  }
  if (kind === "devices") {
    return stringValue(row.device, "Unknown");
  }
  if (kind === "browsers") {
    return stringValue(row.browser, "Unknown");
  }
  return stringValue(row.os, "Unknown");
}

function asRow(value: unknown): AnalyticsRow {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnalyticsRow) : {};
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function formatBucket(timestampSeconds: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
  }).format(new Date(timestampSeconds * 1000));
}
