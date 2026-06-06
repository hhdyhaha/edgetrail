import { beforeEach, describe, expect, it, vi } from "vitest";
import app, {
  clearSiteConfigCache,
  isAllowedOrigin,
  normalizeUserAgent,
  type PresenceRoom,
  sanitizeCollectPayload,
} from "../index";

const siteRows = [
  {
    id: "site_1",
    public_site_id: "pub_1",
    status: "active",
    primary_domain: "example.com",
  },
];

const domainRows = [{ domain: "example.com" }];

function createEnv() {
  const db = {
    prepare(query: string) {
      const statement = {
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async first() {
          if (query.includes("FROM sites")) {
            return siteRows.find((row) => row.public_site_id === statement.values[0]) ?? null;
          }
          return null;
        },
        async all() {
          if (query.includes("FROM site_domains")) {
            return { results: domainRows };
          }
          return { results: [] };
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        },
      };
      return statement;
    },
  } as unknown as D1Database;

  return {
    DB: db,
    ANALYTICS: { writeDataPoint: vi.fn() } as unknown as AnalyticsEngineDataset,
    DASHBOARD_ORIGIN: "https://dashboard.example.com",
    EVENT_QUEUE: { send: vi.fn(() => Promise.resolve()) } as unknown as Queue,
    HASH_SECRET: "test-secret",
    PRESENCE_ROOMS: {
      getByName: vi.fn(() => ({
        fetch: vi.fn(() => Response.json({ forwarded: true })),
      })),
    } as unknown as DurableObjectNamespace<PresenceRoom>,
  };
}

describe("collector worker", () => {
  beforeEach(() => {
    siteRows[0] = {
      id: "site_1",
      primary_domain: "example.com",
      public_site_id: "pub_1",
      status: "active",
    };
    clearSiteConfigCache();
  });

  it("serves the tracker script publicly", async () => {
    const response = await request("http://collector.test/script.js", {}, createEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/javascript");
    expect(await response.text()).toContain("edgeTrail");
  });

  it("allows branded preflight headers", async () => {
    const response = await request(
      "http://collector.test/collect",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "x-edgetrail-site": "pub_1",
        },
      },
      createEnv(),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("x-edgetrail-site");
  });

  it("rejects non-WebSocket presence requests before touching Durable Objects", async () => {
    const env = createEnv();
    const response = await request(
      "http://collector.test/presence?site=pub_1&role=tracker",
      {
        headers: {
          Origin: "https://example.com",
        },
      },
      env,
    );

    expect(response.status).toBe(426);
    expect(env.PRESENCE_ROOMS.getByName).not.toHaveBeenCalled();
  });

  it("forwards valid tracker presence upgrades to the site Durable Object", async () => {
    const env = createEnv();
    const response = await request(
      "http://collector.test/presence?site=pub_1&path=%2Fpricing&role=tracker",
      {
        headers: {
          Origin: "https://example.com",
          Upgrade: "websocket",
        },
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(env.PRESENCE_ROOMS.getByName).toHaveBeenCalledWith("pub_1");
  });

  it("rejects tracker presence upgrades from origins outside the site allowlist", async () => {
    const response = await request(
      "http://collector.test/presence?site=pub_1&role=tracker",
      {
        headers: {
          Origin: "https://evil.test",
          Upgrade: "websocket",
        },
      },
      createEnv(),
    );

    expect(response.status).toBe(403);
  });

  it("allows dashboard presence only from the configured dashboard origin", async () => {
    const env = createEnv();
    const response = await request(
      "http://collector.test/presence?site=pub_1&role=dashboard",
      {
        headers: {
          Origin: "https://dashboard.example.com",
          Upgrade: "websocket",
        },
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(env.PRESENCE_ROOMS.getByName).toHaveBeenCalledWith("pub_1");
  });

  it("rejects unknown or disabled sites for presence", async () => {
    const unknown = await request(
      "http://collector.test/presence?site=missing&role=tracker",
      {
        headers: {
          Origin: "https://example.com",
          Upgrade: "websocket",
        },
      },
      createEnv(),
    );
    expect(unknown.status).toBe(404);

    siteRows[0] = { ...siteRows[0], status: "deleted" };
    clearSiteConfigCache();
    const disabled = await request(
      "http://collector.test/presence?site=pub_1&role=tracker",
      {
        headers: {
          Origin: "https://example.com",
          Upgrade: "websocket",
        },
      },
      createEnv(),
    );
    expect(disabled.status).toBe(403);
    siteRows[0] = { ...siteRows[0], status: "active" };
  });

  it("returns 204 and writes WAE plus queue for a valid collect request", async () => {
    const env = createEnv();
    const response = await request(
      "http://collector.test/collect",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://example.com",
          "User-Agent": "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36",
          "CF-Connecting-IP": "203.0.113.4",
          "CF-IPCountry": "US",
        },
        body: JSON.stringify({
          siteId: "pub_1",
          eventName: "pageview",
          url: "https://example.com/pricing?x=1&utm_source=google",
          referrer: "https://google.com/search?q=edge",
          language: "en-US",
          screenWidth: 1440,
          screenHeight: 900,
          viewportWidth: 1280,
          viewportHeight: 800,
          timezoneOffset: -480,
          schemaVersion: "v1",
        }),
      },
      env,
    );

    expect(response.status).toBe(204);
    expect(env.ANALYTICS.writeDataPoint).toHaveBeenCalledOnce();
    expect(env.EVENT_QUEUE.send).toHaveBeenCalledOnce();
  });

  it("rejects invalid payloads", async () => {
    const response = await request(
      "http://collector.test/collect",
      { method: "POST", body: JSON.stringify({ siteId: "pub_1" }) },
      createEnv(),
    );
    expect(response.status).toBe(400);
  });

  it("rejects invalid origins", async () => {
    const response = await request(
      "http://collector.test/collect",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://evil.test" },
        body: JSON.stringify({
          siteId: "pub_1",
          eventName: "pageview",
          url: "https://example.com/",
          schemaVersion: "v1",
        }),
      },
      createEnv(),
    );
    expect(response.status).toBe(403);
  });

  it("normalizes bot user agents to bot device", () => {
    expect(normalizeUserAgent("Googlebot/2.1").device).toBe("bot");
  });

  it("uses specific CORS origins only", () => {
    expect(isAllowedOrigin("https://example.com", ["example.com"])).toBe(true);
    expect(isAllowedOrigin("https://other.com", ["example.com"])).toBe(false);
  });

  it("sanitizes payload without raw IP, raw UA, or title", async () => {
    const sanitized = await sanitizeCollectPayload({
      payload: {
        siteId: "pub_1",
        eventName: "pageview",
        url: "https://example.com/",
        title: "Secret page title",
        schemaVersion: "v1",
      },
      request: new Request("https://collector.test", {
        headers: {
          "User-Agent": "Raw Browser String",
          "CF-Connecting-IP": "203.0.113.4",
        },
      }),
      env: createEnv(),
      siteConfig: {
        siteId: "site_1",
        publicSiteId: "pub_1",
        status: "active",
        primaryDomain: "example.com",
        allowedDomains: ["example.com"],
      },
    });

    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain("203.0.113.4");
    expect(serialized).not.toContain("Raw Browser String");
    expect(serialized).not.toContain("Secret page title");
    expect(sanitized.pageTitleHash).toHaveLength(64);
  });
});

function request(input: string, init: RequestInit, env: ReturnType<typeof createEnv>) {
  return app.fetch(new Request(input, init), env, {
    passThroughOnException: vi.fn(),
    waitUntil: vi.fn(),
  } as unknown as ExecutionContext);
}
