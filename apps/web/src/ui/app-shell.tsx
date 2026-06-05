import { Link } from "@tanstack/react-router";
import { BarChart3, Lock, Settings, ShieldCheck } from "lucide-react";
import type * as React from "react";
import { ThemeToggle } from "./theme-toggle";

type AppShellProps = {
  action?: React.ReactNode;
  active?: "Overview" | "Sites" | "Settings";
  children: React.ReactNode;
  siteId?: string;
  subtitle?: string;
  title?: string;
};

export function AppShell({
  action,
  active = "Overview",
  children,
  siteId,
  subtitle,
  title = "Edge Analytics",
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#181c23] dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-5 lg:grid-cols-[238px_1fr] xl:px-6">
        <aside className="flex min-h-[calc(100vh-2.5rem)] flex-col rounded-lg border border-[#dee3ea] bg-white p-5 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
          <Link className="flex items-center gap-3" to="/app">
            <span className="inline-flex h-7 w-7 rounded-md bg-[#ec7124]" />
            <span>
              <span className="block text-xl font-bold leading-5">Edge Analytics</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Cloudflare-native</span>
            </span>
          </Link>

          <nav className="mt-10 grid gap-2 text-sm">
            <NavItem
              active={active === "Overview"}
              icon={<BarChart3 className="h-4 w-4" />}
              to="/app"
            >
              Overview
            </NavItem>
            <NavItem
              active={active === "Sites"}
              icon={<Settings className="h-4 w-4" />}
              to="/app/sites"
            >
              Sites
            </NavItem>
            {siteId ? (
              <NavItem
                active={active === "Settings"}
                icon={<ShieldCheck className="h-4 w-4" />}
                params={{ siteId }}
                to="/app/sites/$siteId/settings"
              >
                Settings
              </NavItem>
            ) : null}
          </nav>

          <div className="mt-10 border-t border-[#dee3ea] pt-7 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pipeline</div>
            <div className="mt-4 grid gap-5">
              {[
                ["Collector", "Live"],
                ["Queue", "Healthy"],
                ["D1 Rollup", "17 sec"],
                ["R2 Archive", "synced"],
              ].map(([label, value]) => (
                <div className="flex gap-3" key={label}>
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-600" />
                  <span>
                    <span className="block text-sm leading-4">{label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-8">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Privacy guardrails
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["No raw IP", "No raw UA", "No cookies"].map((label) => (
                <span
                  className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  key={label}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#dee3ea] bg-white px-6 py-5 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
            <div>
              <h1 className="text-2xl font-bold leading-7">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Lock className="h-3 w-3" />
                Cookie-free / no raw IP
              </span>
              {action}
              <ThemeToggle />
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

function NavItem({
  active,
  children,
  icon,
  params,
  to,
}: {
  active: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  params?: { siteId: string };
  to: "/app" | "/app/sites" | "/app/sites/$siteId/settings";
}) {
  return (
    <Link
      className={`flex items-center gap-3 rounded-md px-3 py-3 transition-colors ${
        active
          ? "bg-[#fff5ee] font-semibold text-[#181c23] dark:bg-orange-950/30 dark:text-slate-50"
          : "text-slate-600 hover:bg-[#fff5ee] hover:text-[#181c23] dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50"
      }`}
      params={params}
      to={to}
    >
      <span className={active ? "text-[#ec7124]" : "text-slate-500"}>{icon}</span>
      {children}
    </Link>
  );
}
