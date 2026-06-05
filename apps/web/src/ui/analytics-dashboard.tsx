import { Badge, Card, MetricCard } from "@edgetrail/ui";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildDimensionRows,
  buildSummaryMetrics,
  buildTimeseriesPoints,
  type DimensionKind,
  dimensionConfigs,
  formatDecimal,
  formatInteger,
} from "#/lib/analytics-view-model";

type AnalyticsScope =
  | {
      mode: "private";
      siteId: string;
    }
  | {
      mode: "public";
      token: string;
    };

type AnalyticsPayload = {
  data?: unknown[];
  error?: string;
};

type AnalyticsData = {
  summary: unknown[];
  timeseries: unknown[];
  dimensions: Partial<Record<DimensionKind, unknown[]>>;
};

type DatePreset = "today" | "yesterday" | "7d" | "30d" | "custom";

type LoadState =
  | { status: "loading"; data?: AnalyticsData }
  | { status: "ready"; data: AnalyticsData }
  | { status: "error"; error: string; data?: AnalyticsData };

const analyticsKinds = [
  "summary",
  "timeseries",
  ...dimensionConfigs.map((config) => config.kind),
] as const;

export function AnalyticsDashboard(scope: AnalyticsScope) {
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [customStart, setCustomStart] = useState(() => recentIsoDate(7));
  const [customEnd, setCustomEnd] = useState(() => recentIsoDate(0));
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const basePath = analyticsBasePath(scope);

  const query = useMemo(() => {
    if (preset !== "custom") {
      return `range=${preset}`;
    }
    return `start=${encodeURIComponent(`${customStart}T00:00:00.000Z`)}&end=${encodeURIComponent(`${customEnd}T23:59:59.999Z`)}`;
  }, [customEnd, customStart, preset]);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ status: "loading", data: current.data }));

    void loadAnalytics(basePath, query, controller.signal)
      .then((data) => setState({ status: "ready", data }))
      .catch((error) => {
        if ((error as Error).name === "AbortError") {
          return;
        }
        setState((current) => ({
          status: "error",
          data: current.data,
          error: (error as Error).message,
        }));
      });

    return () => controller.abort();
  }, [basePath, query]);

  const data = state.data ?? emptyAnalyticsData();
  const summary = buildSummaryMetrics(data.summary);
  const timeseries = buildTimeseriesPoints(data.timeseries);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Range</span>
            <select
              className="h-10 rounded-md border border-[#dee3ea] bg-white px-3 text-sm outline-none focus:border-[#ec7124] dark:border-slate-800 dark:bg-slate-950"
              onChange={(event) => setPreset(event.target.value as DatePreset)}
              value={preset}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {preset === "custom" ? (
            <>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Start</span>
                <input
                  className="h-10 rounded-md border border-[#dee3ea] bg-white px-3 text-sm outline-none focus:border-[#ec7124] dark:border-slate-800 dark:bg-slate-950"
                  max={customEnd}
                  onChange={(event) => setCustomStart(event.target.value)}
                  type="date"
                  value={customStart}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-600 dark:text-slate-300">End</span>
                <input
                  className="h-10 rounded-md border border-[#dee3ea] bg-white px-3 text-sm outline-none focus:border-[#ec7124] dark:border-slate-800 dark:bg-slate-950"
                  min={customStart}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  type="date"
                  value={customEnd}
                />
              </label>
            </>
          ) : null}
        </div>
        <Badge>Workers Analytics Engine</Badge>
      </div>

      {state.status === "loading" ? (
        <div className="mt-6 rounded-lg border border-[#dee3ea] bg-white p-4 text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          Loading analytics...
        </div>
      ) : null}

      {state.status === "error" ? <AnalyticsError message={state.error} /> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Visitors"
          note="privacy-first approximate"
          tone="green"
          value={formatInteger(summary.visitors)}
        />
        <MetricCard
          label="Pageviews"
          note="all tracked views"
          tone="orange"
          value={formatInteger(summary.pageviews)}
        />
        <MetricCard
          label="Visits"
          note="privacy-first approximate"
          tone="blue"
          value={formatInteger(summary.visits)}
        />
        <MetricCard
          label="Views per visit"
          note="session quality"
          tone="purple"
          value={formatDecimal(summary.viewsPerVisit)}
        />
      </div>

      <Card className="mt-6 h-[22rem]">
        <div className="mb-4">
          <h2 className="text-lg font-bold">Traffic over time</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pageviews and visitors from Workers Analytics Engine.
          </p>
        </div>
        {timeseries.length > 0 ? (
          <ResponsiveContainer height="82%" width="100%">
            <AreaChart data={timeseries}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={32} stroke="#64748b" tickLine={false} />
              <YAxis allowDecimals={false} stroke="#64748b" tickLine={false} width={38} />
              <Tooltip
                contentStyle={{
                  border: "1px solid #dee3ea",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                }}
              />
              <Area
                dataKey="pageviews"
                fill="#fed7aa"
                stroke="#ec7124"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label="No timeseries data for selected range." />
        )}
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {dimensionConfigs.map((config) => (
          <DimensionTable
            key={config.kind}
            rows={buildDimensionRows(config.kind, data.dimensions[config.kind])}
            title={config.title}
          />
        ))}
      </div>
    </div>
  );
}

function DimensionTable({
  rows,
  title,
}: {
  rows: { label: string; pageviews: number; visitors: number }[];
  title: string;
}) {
  return (
    <Card>
      <h2 className="text-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState label="No data for selected range." />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="w-7/12 border-b border-[#dee3ea] py-2 pr-3 dark:border-slate-800">
                  Dimension
                </th>
                <th className="w-3/12 border-b border-[#dee3ea] py-2 pr-3 text-right dark:border-slate-800">
                  Pageviews
                </th>
                <th className="w-2/12 border-b border-[#dee3ea] py-2 text-right dark:border-slate-800">
                  Visitors
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className="border-b border-[#dee3ea] last:border-0 dark:border-slate-800"
                  key={row.label}
                >
                  <td className="truncate py-3 pr-3">{row.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatInteger(row.pageviews)}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatInteger(row.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AnalyticsError({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
      {errorMessage(message)}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="mt-4 rounded-md border border-dashed border-[#dee3ea] bg-[#fbfaf7] p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30">
      {label}
    </div>
  );
}

async function loadAnalytics(
  basePath: string,
  query: string,
  signal: AbortSignal,
): Promise<AnalyticsData> {
  const entries = await Promise.all(
    analyticsKinds.map(async (kind) => {
      const response = await fetch(`${basePath}/${kind}?${query}`, { signal });
      const payload = await readAnalyticsPayload(response);
      if (!response.ok) {
        throw new Error(payload.error ?? `analytics_${kind}_failed`);
      }
      return [kind, payload.data ?? []] as const;
    }),
  );

  const data = emptyAnalyticsData();
  for (const [kind, rows] of entries) {
    if (kind === "summary") {
      data.summary = rows;
    } else if (kind === "timeseries") {
      data.timeseries = rows;
    } else {
      data.dimensions[kind] = rows;
    }
  }
  return data;
}

function analyticsBasePath(scope: AnalyticsScope): string {
  return scope.mode === "private" ? `/api/sites/${scope.siteId}` : `/api/public/${scope.token}`;
}

async function readAnalyticsPayload(response: Response): Promise<AnalyticsPayload> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as AnalyticsPayload;
  } catch {
    return { error: response.status === 401 ? "401" : text };
  }
}

function emptyAnalyticsData(): AnalyticsData {
  return {
    dimensions: {},
    summary: [],
    timeseries: [],
  };
}

function errorMessage(message: string): string {
  if (message === "missing_cloudflare_query_config") {
    return "Missing server-side Cloudflare query configuration. Configure the analytics read credentials before WAE dashboard queries can run.";
  }
  if (message === "range_exceeds_wae_retention") {
    return "Selected range exceeds the Workers Analytics Engine retention window.";
  }
  if (message === "share_not_found") {
    return "This share link is disabled or unavailable.";
  }
  if (message === "Unauthorized" || message === "401") {
    return "Sign in is required before the private dashboard can load.";
  }
  return "Workers Analytics Engine query failed.";
}

function recentIsoDate(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}
