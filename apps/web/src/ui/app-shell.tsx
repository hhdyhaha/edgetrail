import { Link } from "@tanstack/react-router";
import { ChevronDown, Globe2, Lock } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { siteStatusLabel } from "#/i18n/locale";
import { LocaleSwitcher } from "#/i18n/locale-switcher";
import { m } from "#/paraglide/messages";
import { AppLogo } from "./app-logo";
import { ThemeToggle } from "./theme-toggle";

export type SiteContext = {
  id: string;
  name?: string;
  primaryDomain?: string;
  status?: string;
};

type SiteSwitcherSite = {
  id: string;
  name: string;
  primary_domain: string;
  status: string;
};

type AppShellProps = {
  action?: React.ReactNode;
  active?: "Overview" | "Sites" | "SiteDashboard" | "Realtime" | "Sources" | "Pages" | "Settings";
  children: React.ReactNode;
  siteContext?: SiteContext;
  siteId?: string;
  subtitle?: string;
  title?: string;
};

export function AppShell({
  action,
  children,
  siteContext,
  siteId,
  subtitle,
  title = m.app_title(),
}: AppShellProps) {
  const currentSiteId = siteContext?.id ?? siteId;
  const isSiteScope = Boolean(currentSiteId);
  const scopeTitle = siteContext?.primaryDomain ?? siteContext?.name ?? currentSiteId;
  const scopeSubtitle = isSiteScope ? m.app_shell_site_context() : m.app_shell_global_context();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherSites, setSwitcherSites] = useState<SiteSwitcherSite[]>([]);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/sites")
      .then((response) => response.json() as Promise<{ sites?: SiteSwitcherSite[] }>)
      .then((data) => {
        if (!cancelled) {
          setSwitcherSites(data.sites ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSwitcherSites([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSwitcherOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setIsSwitcherOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSwitcherOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isSwitcherOpen]);

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#181c23] dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto grid max-w-[1480px] gap-4 px-3 py-3 sm:gap-6 sm:px-4 sm:py-5 lg:grid-cols-[282px_1fr] xl:px-6">
        <aside className="flex min-h-0 max-w-full flex-col rounded-lg border border-[#dee3ea] bg-white p-4 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950 lg:min-h-[calc(100vh-2.5rem)]">
          <Link className="flex min-w-0 items-center gap-3" to="/app">
            <AppLogo className="h-8 w-8" />
            <span className="min-w-0">
              <span className="block truncate text-xl font-bold leading-5">{m.app_title()}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{m.app_tagline()}</span>
            </span>
          </Link>

          <div className="relative mt-6 sm:mt-8" ref={switcherRef}>
            <button
              aria-expanded={isSwitcherOpen}
              aria-haspopup="menu"
              aria-label={m.app_shell_switch_site()}
              className="block w-full max-w-full rounded-lg border-2 border-[#ec7124] bg-white p-4 text-left shadow-[0_4px_16px_rgba(236,113,36,0.08)] transition-colors hover:bg-[#fff8f3] dark:bg-slate-950 dark:hover:bg-orange-950/20"
              onClick={() => setIsSwitcherOpen((open) => !open)}
              type="button"
            >
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {m.app_shell_current_scope()}
              </div>
              <div className="mt-3 flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <Globe2 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    <span className="min-w-0 break-all text-sm font-bold leading-5 sm:truncate">
                      {scopeTitle ?? m.app_shell_all_sites()}
                    </span>
                  </div>
                  {siteContext?.name && siteContext.name !== scopeTitle ? (
                    <div className="mt-1 min-w-0 break-all pl-6 text-xs text-slate-500 dark:text-slate-400 sm:truncate">
                      {siteContext.name}
                    </div>
                  ) : null}
                </div>
                {siteContext?.status ? (
                  <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {siteStatusLabel(siteContext.status)}
                  </span>
                ) : null}
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="mt-3 text-xs font-semibold text-[#ec7124]">{scopeSubtitle}</div>
            </button>

            {isSwitcherOpen ? (
              <div
                className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-lg border border-[#dee3ea] bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950"
                role="menu"
              >
                <Link
                  className={`block rounded-md px-3 py-3 text-sm font-semibold transition-colors hover:bg-[#fff5ee] dark:hover:bg-slate-900 ${
                    isSiteScope ? "text-slate-600 dark:text-slate-300" : "text-[#ec7124]"
                  }`}
                  onClick={() => setIsSwitcherOpen(false)}
                  role="menuitem"
                  to="/app"
                >
                  {m.app_shell_all_sites()}
                </Link>
                {switcherSites.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {m.overview_no_sites_yet()}
                  </div>
                ) : (
                  switcherSites.map((site) => (
                    <Link
                      className={`block rounded-md px-3 py-3 transition-colors hover:bg-[#fff5ee] dark:hover:bg-slate-900 ${
                        site.id === currentSiteId
                          ? "bg-[#fff5ee] text-[#ec7124] dark:bg-orange-950/20"
                          : "text-[#181c23] dark:text-slate-50"
                      }`}
                      key={site.id}
                      onClick={() => setIsSwitcherOpen(false)}
                      params={{ siteId: site.id }}
                      role="menuitem"
                      to="/app/sites/$siteId"
                    >
                      <span className="block min-w-0 break-all text-sm font-semibold leading-5">
                        {site.primary_domain || site.name}
                      </span>
                      {site.name && site.name !== site.primary_domain ? (
                        <span className="mt-1 block min-w-0 break-all text-xs text-slate-500 dark:text-slate-400">
                          {site.name}
                        </span>
                      ) : null}
                    </Link>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#dee3ea] bg-white px-6 py-5 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
            <div className="min-w-0">
              {isSiteScope ? (
                <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{m.nav_sites()}</span>
                  <span>/</span>
                  <span className="max-w-[260px] truncate">{scopeTitle}</span>
                  <span>/</span>
                  <span className="text-[#ec7124]">{title}</span>
                </div>
              ) : null}
              <h1 className="text-2xl font-bold leading-7">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Lock className="h-3 w-3" />
                {m.privacy_cookie_free_no_raw_ip()}
              </span>
              {isSiteScope ? (
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[#dee3ea] bg-white px-4 text-sm font-semibold text-[#181c23] hover:bg-[#fff5ee] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                  to="/app"
                >
                  {m.app_shell_back_to_overview()}
                </Link>
              ) : null}
              {action}
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
