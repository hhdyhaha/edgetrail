import { Badge, Card } from "@edgetrail/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { siteStatusLabel } from "#/i18n/locale";
import { m } from "#/paraglide/messages";
import { AppShell } from "#/ui/app-shell";

type Site = {
  id: string;
  name: string;
  primary_domain: string;
  status: string;
};

export const Route = createFileRoute("/app/sites/")({ component: SitesPage });

function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    void fetch("/api/sites")
      .then((response) => response.json() as Promise<{ sites?: Site[] }>)
      .then((data) => setSites(data.sites ?? []));
  }, []);

  return (
    <AppShell
      action={
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#181c23] px-4 text-sm font-semibold text-white hover:bg-[#252b35] dark:bg-white dark:text-[#181c23]"
          to="/app/sites/new"
        >
          {m.sites_add_site()}
        </Link>
      }
      active="Sites"
      subtitle={m.sites_subtitle()}
      title={m.sites_title()}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 rounded-lg border border-[#dee3ea] bg-white px-5 py-4 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
          <div className="text-sm font-semibold text-[#181c23] dark:text-slate-50">
            {m.sites_inventory_title()}
          </div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {m.sites_inventory_description()}
          </div>
        </div>
        <Badge>{m.sites_active_count({ count: sites.length })}</Badge>
      </div>

      <Card className="overflow-hidden p-0">
        {sites.length === 0 ? (
          <div className="p-8">
            <h2 className="text-xl font-bold">{m.sites_empty_title()}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {m.sites_empty_description()}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#dee3ea] text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-7 py-5">{m.sites_column_site()}</th>
                  <th className="px-7 py-5">{m.sites_column_domain()}</th>
                  <th className="px-7 py-5">{m.sites_column_status()}</th>
                  <th className="px-7 py-5">{m.sites_column_share()}</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr
                    className="border-b border-[#dee3ea] last:border-0 hover:bg-[#fff5ee]/60 dark:border-slate-800 dark:hover:bg-slate-900/50"
                    key={site.id}
                  >
                    <td className="px-7 py-5">
                      <Link
                        className="font-bold text-[#181c23] hover:text-[#ec7124] dark:text-slate-50"
                        params={{ siteId: site.id }}
                        to="/app/sites/$siteId"
                      >
                        {site.name}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">
                        {m.sites_public_id({ id: site.id })}
                      </div>
                    </td>
                    <td className="px-7 py-5">{site.primary_domain}</td>
                    <td className="px-7 py-5">
                      <Badge tone={site.status === "active" ? "green" : "orange"}>
                        {siteStatusLabel(site.status)}
                      </Badge>
                    </td>
                    <td className="px-7 py-5">
                      <Badge tone="slate">{m.sites_configured_settings()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
