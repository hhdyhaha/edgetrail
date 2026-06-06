import { MetricCard } from "@edgetrail/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { m } from "#/paraglide/messages";
import { AppShell } from "#/ui/app-shell";

export const Route = createFileRoute("/app/")({ component: AppDashboard });

type SiteSummary = {
  id: string;
};

function AppDashboard() {
  const [state, setState] = useState<{ sites: SiteSummary[]; error?: string }>({ sites: [] });

  useEffect(() => {
    void fetch("/api/sites")
      .then((response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        return response.json() as Promise<{ sites?: SiteSummary[] }>;
      })
      .then((data) => setState({ sites: data.sites ?? [] }))
      .catch((error) => setState({ sites: [], error: error.message }));
  }, []);

  return (
    <AppShell
      action={
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#181c23] px-4 text-sm font-semibold text-white hover:bg-[#252b35] dark:bg-white dark:text-[#181c23]"
          to="/app/sites/new"
        >
          {m.overview_new_site()}
        </Link>
      }
      subtitle={m.overview_subtitle()}
      title={m.overview_title()}
    >
      {state.error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {m.overview_private_error()}
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard
          label={m.metric_sites()}
          note={m.metric_connected_workspaces()}
          tone="orange"
          value={state.sites.length}
        />
        <MetricCard
          label={m.metric_24h_pageviews()}
          note={m.metric_server_side_query()}
          tone="green"
          value="WAE"
        />
        <MetricCard
          label={m.metric_7d_visitors()}
          note={m.metric_privacy_first()}
          tone="blue"
          value={m.metric_approx()}
        />
        <MetricCard
          label={m.metric_last_update()}
          note={m.metric_collector_pipeline()}
          tone="purple"
          value={m.app_shell_live()}
        />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-[#dee3ea] bg-white p-6 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-bold">{m.overview_all_site_traffic()}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {m.overview_wae_config_notice()}
          </p>
          <div className="mt-8 h-56 rounded-lg border border-dashed border-[#dee3ea] bg-[#fbfaf7] dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
              {m.overview_wae_query_surface()}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#dee3ea] bg-white p-6 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-bold">{m.overview_site_inventory()}</h2>
          <div className="mt-5 grid gap-3">
            {state.sites.length === 0 ? (
              <div className="rounded-md border border-[#dee3ea] bg-[#fbfaf7] p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30">
                {m.overview_no_sites_yet()}
              </div>
            ) : (
              state.sites.map((site) => (
                <div
                  className="flex items-center justify-between rounded-md border border-[#dee3ea] bg-[#fbfaf7] p-4 dark:border-slate-800 dark:bg-slate-900/30"
                  key={site.id}
                >
                  <span className="font-semibold">{m.overview_site_label()}</span>
                  <span className="text-sm text-slate-500">{site.id}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
