import { Badge } from "@edgetrail/ui";
import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsDashboard } from "#/ui/analytics-dashboard";
import { ThemeToggle } from "#/ui/theme-toggle";

export const Route = createFileRoute("/share/$token")({ component: PublicShare });

function PublicShare() {
  const { token } = Route.useParams();

  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 text-[#181c23] dark:bg-slate-950 dark:text-slate-50">
      <section className="mx-auto max-w-[1400px] py-3">
        <header className="mb-6 flex flex-col gap-5 rounded-lg border border-[#dee3ea] bg-white px-6 py-5 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
          <div className="flex shrink-0 items-center gap-4">
            <span className="inline-flex h-7 w-7 rounded-md bg-[#ec7124]" />
            <div>
              <div className="text-xl font-bold leading-5">EdgeTrail</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Cloudflare-native</div>
            </div>
          </div>
          <div className="min-w-0 flex-1 md:px-8">
            <h1 className="text-2xl font-bold">Public analytics</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Read-only dashboard. Visitors and visits are approximate.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge>Read-only share</Badge>
            <ThemeToggle />
          </div>
        </header>
        <div>
          <AnalyticsDashboard mode="public" token={token} />
        </div>
      </section>
    </main>
  );
}
