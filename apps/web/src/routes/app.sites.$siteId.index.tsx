import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { m } from "#/paraglide/messages";
import { AnalyticsDashboard } from "#/ui/analytics-dashboard";
import { AppShell, type SiteContext } from "#/ui/app-shell";

export const Route = createFileRoute("/app/sites/$siteId/")({ component: SiteDashboard });

type SiteDetails = {
  site?: {
    id: string;
    name: string;
    primary_domain: string;
    status: string;
  };
};

function SiteDashboard() {
  const { siteId } = Route.useParams();
  const [siteContext, setSiteContext] = useState<SiteContext>({ id: siteId });

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/sites/${siteId}`)
      .then((response) => response.json() as Promise<SiteDetails>)
      .then((details) => {
        if (cancelled || !details.site) {
          return;
        }
        setSiteContext({
          id: details.site.id,
          name: details.site.name,
          primaryDomain: details.site.primary_domain,
          status: details.site.status,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  return (
    <AppShell
      active="SiteDashboard"
      action={
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#dee3ea] bg-white px-4 text-sm font-semibold text-[#181c23] hover:bg-[#fff5ee] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
          params={{ siteId }}
          to="/app/sites/$siteId/settings"
        >
          {m.nav_settings()}
        </Link>
      }
      siteContext={siteContext}
      siteId={siteId}
      subtitle={m.site_dashboard_subtitle()}
      title={m.site_dashboard_title()}
    >
      <AnalyticsDashboard mode="private" siteId={siteId} />
    </AppShell>
  );
}
