import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiRequest } from "../api";

const mocks = vi.hoisted(() => {
  const state = {
    session: null as { user: { id: string; name: string; email: string } } | null,
  };
  return {
    state,
    createDefaultOrganization: vi.fn(),
    listOrganizationsForUser: vi.fn(),
    listSitesForUser: vi.fn(),
    assertOrganizationAccess: vi.fn(),
    assertSiteAccess: vi.fn(),
    createSite: vi.fn(),
    getSiteById: vi.fn(),
    listSiteDomains: vi.fn(),
    listShareLinksForSite: vi.fn(),
    addSiteDomain: vi.fn(),
    createShareLink: vi.fn(),
    disableShareLink: vi.fn(),
    getEnabledShareLink: vi.fn(),
    queryWorkersAnalyticsEngine: vi.fn(),
  };
});

vi.mock("cloudflare:workers", () => ({
  env: {
    DB: { prepare: vi.fn() },
    BETTER_AUTH_URL: "http://localhost:3000",
    COLLECTOR_ORIGIN: "http://localhost:8787",
    BETTER_AUTH_SECRET: "test-better-auth-secret",
    GOOGLE_CLIENT_ID: "test-google-client",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    CLOUDFLARE_ACCOUNT_ID: "test-account-id",
    CLOUDFLARE_API_TOKEN: "test-api-token",
  },
}));

vi.mock("#/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => mocks.state.session),
    },
  },
}));

vi.mock("@edgetrail/db", () => ({
  createDefaultOrganization: mocks.createDefaultOrganization,
  listOrganizationsForUser: mocks.listOrganizationsForUser,
  listSitesForUser: mocks.listSitesForUser,
  assertOrganizationAccess: mocks.assertOrganizationAccess,
  assertSiteAccess: mocks.assertSiteAccess,
  createSite: mocks.createSite,
  getSiteById: mocks.getSiteById,
  listSiteDomains: mocks.listSiteDomains,
  listShareLinksForSite: mocks.listShareLinksForSite,
  addSiteDomain: mocks.addSiteDomain,
  createShareLink: mocks.createShareLink,
  disableShareLink: mocks.disableShareLink,
  getEnabledShareLink: mocks.getEnabledShareLink,
}));

vi.mock("@edgetrail/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@edgetrail/analytics")>();
  return {
    ...actual,
    queryWorkersAnalyticsEngine: mocks.queryWorkersAnalyticsEngine,
  };
});

describe("web API permission and public surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.session = {
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
    };
    mocks.createDefaultOrganization.mockResolvedValue({ id: "org_1" });
    mocks.listOrganizationsForUser.mockResolvedValue([{ id: "org_1", name: "Ada workspace" }]);
    mocks.listSitesForUser.mockResolvedValue([{ id: "site_1", name: "Docs" }]);
    mocks.assertSiteAccess.mockResolvedValue({
      id: "site_1",
      public_site_id: "pub_1",
      organization_id: "org_1",
    });
    mocks.listSiteDomains.mockResolvedValue([]);
    mocks.listShareLinksForSite.mockResolvedValue([
      { id: "share_1", token: "share_token", enabled: 1 },
    ]);
    mocks.getEnabledShareLink.mockResolvedValue({
      site_id: "site_1",
      token: "share_token",
      organization_id: "org_secret",
    });
    mocks.queryWorkersAnalyticsEngine.mockResolvedValue({
      data: [{ pageviews: 7, approximate_visitors: 3, approximate_visits: 4 }],
      meta: { sampled: false },
    });
  });

  afterEach(() => {
    mocks.state.session = null;
  });

  it("rejects unauthenticated private APIs before organization side effects", async () => {
    mocks.state.session = null;

    const response = await handleApiRequest(new Request("http://app.test/api/sites"));

    expect(response.status).toBe(401);
    expect(mocks.createDefaultOrganization).not.toHaveBeenCalled();
  });

  it("creates a default organization before returning the authenticated user payload", async () => {
    const response = await handleApiRequest(new Request("http://app.test/api/me"));

    expect(response.status).toBe(200);
    expect(mocks.createDefaultOrganization).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      "Ada",
    );
    await expect(response.json()).resolves.toEqual({
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
      organizations: [{ id: "org_1", name: "Ada workspace" }],
    });
  });

  it("turns cross-organization site access failures into 403", async () => {
    mocks.assertSiteAccess.mockRejectedValue(new Error("Forbidden"));

    const response = await handleApiRequest(new Request("http://app.test/api/sites/site_other"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
  });

  it("returns share links with authenticated site details", async () => {
    const response = await handleApiRequest(new Request("http://app.test/api/sites/site_1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      site: { id: "site_1", public_site_id: "pub_1", organization_id: "org_1" },
      domains: [],
      shareLinks: [{ id: "share_1", token: "share_token", enabled: 1 }],
      trackingScript:
        '<script defer src="http://localhost:8787/script.js" data-site="pub_1"></script>',
    });
  });

  it("serves public analytics without auth and without organization or secret fields", async () => {
    mocks.state.session = null;

    const response = await handleApiRequest(
      new Request("http://app.test/api/public/share_token/summary?range=7d"),
    );
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(200);
    expect(mocks.createDefaultOrganization).not.toHaveBeenCalled();
    expect(body).toContain("pageviews");
    expect(body).not.toContain("organization");
    expect(body).not.toContain("owner");
    expect(body).not.toContain("CLOUDFLARE");
    expect(body).not.toContain("test-api-token");
    expect(body).not.toContain("test-google-secret");
  });

  it("returns 404 for disabled or missing public share tokens", async () => {
    mocks.state.session = null;
    mocks.getEnabledShareLink.mockResolvedValue(null);

    const response = await handleApiRequest(
      new Request("http://app.test/api/public/share_token/summary?range=7d"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "share_not_found" });
  });
});
