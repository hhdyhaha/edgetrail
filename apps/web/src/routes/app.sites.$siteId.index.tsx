import { createFileRoute, Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages";
import { AnalyticsDashboard } from "#/ui/analytics-dashboard";
import { AppShell } from "#/ui/app-shell";

export const Route = createFileRoute("/app/sites/$siteId/")({ component: SiteDashboard });

function SiteDashboard() {
  const { siteId } = Route.useParams();

  return (
    <AppShell
      action={
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#dee3ea] bg-white px-4 text-sm font-semibold text-[#181c23] hover:bg-[#fff5ee] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
          params={{ siteId }}
          to="/app/sites/$siteId/settings"
        >
          {m.nav_settings()}
        </Link>
      }
      siteId={siteId}
      subtitle={m.site_dashboard_subtitle()}
      title={m.site_dashboard_title()}
    >
      <AnalyticsDashboard mode="private" siteId={siteId} />
    </AppShell>
  );
}
