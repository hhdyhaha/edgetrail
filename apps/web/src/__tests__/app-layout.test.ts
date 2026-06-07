import { describe, expect, it } from "vitest";
import routerSource from "../router.tsx?raw";
import rootRouteSource from "../routes/__root.tsx?raw";
import appSiteDashboardSource from "../routes/app.sites.$siteId.index.tsx?raw";
import appSiteSettingsSource from "../routes/app.sites.$siteId.settings.tsx?raw";
import appSiteLayoutSource from "../routes/app.sites.$siteId.tsx?raw";
import appSitesLayoutSource from "../routes/app.sites.tsx?raw";
import appLayoutSource from "../routes/app.tsx?raw";
import indexRouteSource from "../routes/index.tsx?raw";
import loginRouteSource from "../routes/login.tsx?raw";
import shareRouteSource from "../routes/share.$token.tsx?raw";
import serverSource from "../server.ts?raw";
import analyticsDashboardSource from "../ui/analytics-dashboard.tsx?raw";
import appShellSource from "../ui/app-shell.tsx?raw";

describe("authenticated app layout route", () => {
  it.each([
    ["app.tsx", appLayoutSource],
    ["app.sites.tsx", appSitesLayoutSource],
    ["app.sites.$siteId.tsx", appSiteLayoutSource],
  ])("renders an Outlet in %s so nested app routes can display their pages", (_fileName, source) => {
    expect(source).toContain("Outlet");
    expect(source).toContain("<Outlet />");
  });

  it("keeps site switching in the current scope card instead of sidebar nav groups", () => {
    expect(appShellSource).toContain("siteContext");
    expect(appShellSource).toContain("app_shell_current_scope");
    expect(appShellSource).toContain('fetch("/api/sites")');
    expect(appShellSource).toContain("aria-expanded");
    expect(appShellSource).toContain("app_shell_switch_site");
    expect(appShellSource).toContain('to="/app/sites/$siteId"');
    expect(appShellSource).not.toContain("app_shell_global_nav");
    expect(appShellSource).not.toContain("app_shell_current_project_nav");
    expect(appShellSource).not.toContain("app_shell_pipeline");
    expect(appShellSource).not.toContain("app_shell_privacy_guardrails");
  });

  it("keeps the scope card compact and non-overflowing on mobile", () => {
    expect(appShellSource).toContain("min-h-0");
    expect(appShellSource).toContain("lg:min-h-[calc(100vh-2.5rem)]");
    expect(appShellSource).not.toContain("flex min-h-[calc(100vh-2.5rem)]");
    expect(appShellSource).toContain("break-all");
    expect(appShellSource).toContain("max-w-full");
  });

  it("passes fetched site identity into single-site dashboard shells", () => {
    expect(appSiteDashboardSource).toContain("setSiteContext");
    expect(appSiteDashboardSource).toContain("fetch(`/api/sites/");
    expect(appSiteDashboardSource).toContain("siteId");
    expect(appSiteDashboardSource).toContain("siteContext={siteContext}");
    expect(appSiteSettingsSource).toContain("siteContext={siteContext}");
  });

  it("keeps long settings content inside scrollable mobile containers", () => {
    expect(appSiteSettingsSource).toContain("min-w-0");
    expect(appSiteSettingsSource).toContain("max-w-full");
    expect(appSiteSettingsSource).toContain("overflow-x-auto");
  });
});

describe("root app entry route", () => {
  it("redirects root traffic to login instead of rendering a marketing landing page", () => {
    expect(indexRouteSource).toContain("redirect");
    expect(indexRouteSource).toContain('to: "/login"');
    expect(indexRouteSource).not.toContain("Cloudflare-native web analytics");
  });
});

describe("login route", () => {
  it("sends authenticated users into the app shell", () => {
    expect(loginRouteSource).toContain("beforeLoad");
    expect(loginRouteSource).toContain("getSession");
    expect(loginRouteSource).toContain('to: "/app"');
  });
});

describe("localized routing shell", () => {
  it("uses Paraglide router rewrites instead of duplicating locale route files", () => {
    expect(routerSource).toContain("deLocalizeUrl");
    expect(routerSource).toContain("localizeUrl");
    expect(routerSource).toContain("rewrite");
  });

  it("sets the document language from the current Paraglide locale", () => {
    expect(rootRouteSource).toContain("getLocale()");
    expect(rootRouteSource).toContain("m.root_description()");
    expect(rootRouteSource).not.toContain('rel: "canonical", href: "/"');
  });

  it("bypasses Paraglide middleware for API routes", () => {
    expect(serverSource).toContain('pathname === "/api"');
    expect(serverSource).toContain('pathname.startsWith("/api/")');
    expect(serverSource).toContain("paraglideMiddleware");
  });

  it("renders language controls on login, app shell, and public share pages", () => {
    expect(loginRouteSource).toContain("LocaleSwitcher");
    expect(appShellSource).toContain("LocaleSwitcher");
    expect(shareRouteSource).toContain("LocaleSwitcher");
  });

  it("keeps API fetches unlocalized in the app UI", () => {
    expect(appShellSource).not.toContain("/zh/api");
    expect(shareRouteSource).not.toContain("/zh/api");
  });

  it("checks public share availability before mounting analytics API queries", () => {
    expect(shareRouteSource).toContain("getPublicShareAvailability");
    expect(shareRouteSource).toContain("share.available");
    expect(shareRouteSource).toContain("analytics_share_not_found");
  });

  it("keeps realtime presence scoped to private site dashboards", () => {
    expect(analyticsDashboardSource).toContain("buildPresenceWebSocketUrl");
    expect(analyticsDashboardSource).toContain("parsePresenceSnapshot");
    expect(analyticsDashboardSource).toContain("analytics_online_now");
    expect(analyticsDashboardSource).toContain('scope.mode !== "private"');
    expect(analyticsDashboardSource).toContain("!target");
    expect(analyticsDashboardSource).toContain('status: "unavailable"');
  });
});
