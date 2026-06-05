import { describe, expect, it } from "vitest";
import appSiteLayoutSource from "../routes/app.sites.$siteId.tsx?raw";
import appSitesLayoutSource from "../routes/app.sites.tsx?raw";
import appLayoutSource from "../routes/app.tsx?raw";
import indexRouteSource from "../routes/index.tsx?raw";
import loginRouteSource from "../routes/login.tsx?raw";

describe("authenticated app layout route", () => {
  it.each([
    ["app.tsx", appLayoutSource],
    ["app.sites.tsx", appSitesLayoutSource],
    ["app.sites.$siteId.tsx", appSiteLayoutSource],
  ])("renders an Outlet in %s so nested app routes can display their pages", (_fileName, source) => {
    expect(source).toContain("Outlet");
    expect(source).toContain("<Outlet />");
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
