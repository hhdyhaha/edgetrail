import { MetricCard } from "@edgetrail/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
          New site
        </Link>
      }
      subtitle="Last 24 hours and site inventory."
      title="Overview"
    >
      {state.error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Sign in is required before the private dashboard can load.
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Sites"
          note="connected workspaces"
          tone="orange"
          value={state.sites.length}
        />
        <MetricCard label="24h pageviews" note="server-side query" tone="green" value="WAE" />
        <MetricCard label="7d visitors" note="privacy-first metric" tone="blue" value="Approx." />
        <MetricCard label="Last update" note="collector pipeline" tone="purple" value="Live" />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-[#dee3ea] bg-white p-6 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-bold">All-site traffic</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Workers Analytics Engine queries appear after read credentials are configured.
          </p>
          <div className="mt-8 h-56 rounded-lg border border-dashed border-[#dee3ea] bg-[#fbfaf7] dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
              WAE query surface
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#dee3ea] bg-white p-6 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-bold">Site inventory</h2>
          <div className="mt-5 grid gap-3">
            {state.sites.length === 0 ? (
              <div className="rounded-md border border-[#dee3ea] bg-[#fbfaf7] p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30">
                No sites yet.
              </div>
            ) : (
              state.sites.map((site) => (
                <div
                  className="flex items-center justify-between rounded-md border border-[#dee3ea] bg-[#fbfaf7] p-4 dark:border-slate-800 dark:bg-slate-900/30"
                  key={site.id}
                >
                  <span className="font-semibold">Site</span>
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
