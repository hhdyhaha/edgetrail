import { DurableObject } from "cloudflare:workers";
import {
  getPath,
  getReferrerDomain,
  normalizeUrlForAnalytics,
  toWaeDataPoint,
} from "@edgetrail/analytics";
import { getSiteConfigByPublicId, normalizeDomain, type SiteConfig } from "@edgetrail/db";
import {
  COLLECT_ENDPOINT,
  type CollectPayload,
  collectPayloadSchema,
  PRESENCE_ENDPOINT,
  type PresenceRole,
  type PresenceSnapshot,
  presenceRoleSchema,
  type QueueEventMessage,
  queueEventMessageSchema,
  redactObject,
  SCHEMA_VERSION,
} from "@edgetrail/shared";
import { TRACKER_SCRIPT } from "@edgetrail/tracker";
import Bowser from "bowser";
import { Hono } from "hono";

type CollectorBindings = {
  DB: D1Database;
  ANALYTICS: AnalyticsEngineDataset;
  EVENT_QUEUE: Queue<QueueEventMessage>;
  HASH_SECRET: string;
  DASHBOARD_ORIGIN?: string;
  PRESENCE_ROOMS: DurableObjectNamespace<PresenceRoom>;
};

type CollectorEnv = {
  Bindings: CollectorBindings;
};

const siteCache = new Map<string, { expiresAt: number; value: SiteConfig | null }>();
const cacheTtlMs = 60_000;

const app = new Hono<CollectorEnv>();

app.get("/health", (c) => c.json({ ok: true, service: "collector-worker" }));

app.get(
  "/script.js",
  () =>
    new Response(TRACKER_SCRIPT, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "application/javascript; charset=utf-8",
      },
    }),
);

app.options(COLLECT_ENDPOINT, async (c) => {
  const publicSiteId = c.req.header("x-edgetrail-site") ?? "";
  const origin = c.req.header("Origin") ?? "";
  const config = publicSiteId ? await getCachedSiteConfig(c.env, publicSiteId) : null;
  if (!config || !isAllowedOrigin(origin, config.allowedDomains)) {
    return c.body(null, 403);
  }
  return c.body(null, 204, corsHeaders(origin));
});

app.get(PRESENCE_ENDPOINT, async (c) => {
  if ((c.req.header("Upgrade") ?? "").toLowerCase() !== "websocket") {
    return c.json({ error: "websocket_required" }, 426);
  }

  const url = new URL(c.req.url);
  const publicSiteId = url.searchParams.get("site") ?? "";
  const role = presenceRoleSchema.safeParse(url.searchParams.get("role"));
  if (!publicSiteId || !role.success) {
    return c.json({ error: "invalid_presence_request" }, 400);
  }

  const siteConfig = await getCachedSiteConfig(c.env, publicSiteId);
  if (!siteConfig) {
    return c.json({ error: "unknown_site" }, 404);
  }
  if (siteConfig.status !== "active") {
    return c.json({ error: "site_disabled" }, 403);
  }

  const origin = c.req.header("Origin") ?? "";
  if (
    !isAllowedPresenceOrigin({
      allowedDomains: siteConfig.allowedDomains,
      dashboardOrigin: c.env.DASHBOARD_ORIGIN,
      origin,
      role: role.data,
    })
  ) {
    return c.json({ error: "invalid_origin" }, 403);
  }

  const room = c.env.PRESENCE_ROOMS.getByName(siteConfig.publicSiteId);
  return room.fetch(c.req.raw);
});

app.post(COLLECT_ENDPOINT, async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const parsed = collectPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "invalid_payload" }, 400);
  }

  const origin = c.req.header("Origin") ?? "";
  const siteConfig = await getCachedSiteConfig(c.env, parsed.data.siteId);
  if (!siteConfig) {
    return c.json({ error: "unknown_site" }, 404);
  }
  if (siteConfig.status !== "active") {
    return c.json({ error: "site_disabled" }, 403);
  }
  if (!isAllowedOrigin(origin, siteConfig.allowedDomains)) {
    return c.json({ error: "invalid_origin" }, 403);
  }

  const payloadHost = normalizeDomain(new URL(parsed.data.url).hostname);
  if (!siteConfig.allowedDomains.includes(payloadHost)) {
    return c.json({ error: "invalid_payload_domain" }, 403, corsHeaders(origin));
  }

  const sanitized = await sanitizeCollectPayload({
    payload: parsed.data,
    request: c.req.raw,
    env: c.env,
    siteConfig,
  });

  c.env.ANALYTICS.writeDataPoint(toWaeDataPoint(sanitized));
  c.executionCtx.waitUntil(c.env.EVENT_QUEUE.send(sanitized));

  return c.body(null, 204, corsHeaders(origin));
});

export async function sanitizeCollectPayload({
  payload,
  request,
  env,
  siteConfig,
}: {
  payload: CollectPayload;
  request: Request;
  env: CollectorBindings;
  siteConfig: SiteConfig;
}): Promise<QueueEventMessage> {
  const url = new URL(payload.url);
  const normalizedUrl = normalizeUrlForAnalytics(url);
  const normalizedUserAgent = normalizeUserAgent(request.headers.get("User-Agent") ?? "");
  const ingestedAt = new Date().toISOString();
  const clientTimestampMs = Date.now();
  const ip =
    request.headers.get("CF-Connecting-IP") ?? request.headers.get("x-forwarded-for") ?? "";
  const country = request.headers.get("CF-IPCountry") || "XX";
  const visitorHash = await hmacHex(
    env.HASH_SECRET,
    `${siteConfig.siteId}|${ip}|${normalizedUserAgent.hashInput}|${ingestedAt.slice(0, 10)}`,
  );
  const sessionHash = await hmacHex(
    env.HASH_SECRET,
    `${siteConfig.siteId}|${ip}|${normalizedUserAgent.hashInput}|${ingestedAt.slice(0, 13)}`,
  );
  const pageTitleHash = payload.title
    ? await hmacHex(env.HASH_SECRET, `${siteConfig.siteId}|${payload.title}`)
    : undefined;

  const queueMessage: QueueEventMessage = {
    eventId: await hmacHex(
      env.HASH_SECRET,
      `${siteConfig.siteId}|${payload.eventName}|${normalizedUrl}|${visitorHash}|${sessionHash}|${clientTimestampMs}`,
    ),
    schemaVersion: SCHEMA_VERSION,
    siteId: siteConfig.siteId,
    publicSiteId: siteConfig.publicSiteId,
    eventName: payload.eventName,
    ingestedAt,
    clientTimestampMs,
    siteHost: url.hostname.toLowerCase(),
    path: getPath(url),
    normalizedUrl,
    referrerDomain: getReferrerDomain(payload.referrer),
    country,
    browser: normalizedUserAgent.browser,
    os: normalizedUserAgent.os,
    device: normalizedUserAgent.device,
    utmSource: url.searchParams.get("utm_source") ?? undefined,
    utmMedium: url.searchParams.get("utm_medium") ?? undefined,
    utmCampaign: url.searchParams.get("utm_campaign") ?? undefined,
    visitorHash,
    sessionHash,
    language: payload.language,
    entryPath: getPath(url),
    eventCategory: payload.eventCategory,
    eventLabel: payload.eventLabel,
    pageTitleHash,
    value: payload.value ?? 1,
  };

  return queueEventMessageSchema.parse(queueMessage);
}

export function isAllowedOrigin(origin: string, allowedDomains: string[]): boolean {
  if (!origin) {
    return false;
  }
  try {
    return allowedDomains.includes(normalizeDomain(new URL(origin).hostname));
  } catch {
    return false;
  }
}

export function isAllowedPresenceOrigin({
  allowedDomains,
  dashboardOrigin,
  origin,
  role,
}: {
  allowedDomains: string[];
  dashboardOrigin?: string;
  origin: string;
  role: PresenceRole;
}): boolean {
  if (role === "tracker") {
    return isAllowedOrigin(origin, allowedDomains);
  }
  return Boolean(dashboardOrigin && sameOrigin(origin, dashboardOrigin));
}

export async function getCachedSiteConfig(
  env: Pick<CollectorBindings, "DB">,
  publicSiteId: string,
  now = Date.now(),
): Promise<SiteConfig | null> {
  const cached = siteCache.get(publicSiteId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  const value = await getSiteConfigByPublicId(env.DB, publicSiteId);
  siteCache.set(publicSiteId, { value, expiresAt: now + cacheTtlMs });
  return value;
}

export function clearSiteConfigCache(): void {
  siteCache.clear();
}

export function normalizeUserAgent(rawUserAgent: string): {
  browser: string;
  os: string;
  device: QueueEventMessage["device"];
  hashInput: string;
} {
  const parser = Bowser.getParser(rawUserAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const platform = parser.getPlatform();
  const raw = rawUserAgent.toLowerCase();
  const isBot = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit/.test(raw);
  const device = isBot ? "bot" : mapDevice(platform.type);
  const browserName = browser.name ?? "Unknown";
  const browserVersion = browser.version?.split(".")[0] ?? "0";
  const osName = os.name ?? "Unknown";
  return {
    browser: `${browserName} ${browserVersion}`,
    os: osName,
    device,
    hashInput: `${browserName}/${browserVersion}|${osName}|${device}|${isBot}`,
  };
}

function mapDevice(value: string | undefined): QueueEventMessage["device"] {
  if (value === "mobile" || value === "tablet" || value === "desktop") {
    return value;
  }
  return "unknown";
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Headers": "Content-Type, x-edgetrail-site",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

type PresenceSocketAttachment = {
  role: PresenceRole;
  path: string;
  connectedAt: number;
};

type PresenceSocket = Pick<WebSocket, "deserializeAttachment" | "readyState">;

const presencePingText = JSON.stringify({ type: "ping" });
const presencePongText = JSON.stringify({ type: "pong" });

export class PresenceRoom extends DurableObject<CollectorBindings> {
  constructor(ctx: DurableObjectState, env: CollectorBindings) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(presencePingText, presencePongText),
    );
  }

  async fetch(request: Request): Promise<Response> {
    if ((request.headers.get("Upgrade") ?? "").toLowerCase() !== "websocket") {
      return Response.json({ error: "websocket_required" }, { status: 426 });
    }

    const url = new URL(request.url);
    const role = presenceRoleSchema.safeParse(url.searchParams.get("role"));
    if (!role.success) {
      return Response.json({ error: "invalid_presence_role" }, { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    const attachment: PresenceSocketAttachment = {
      connectedAt: Date.now(),
      path: normalizePresencePath(url.searchParams.get("path")),
      role: role.data,
    };

    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server, [`role:${role.data}`]);
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message !== "string") {
      return;
    }
    if (message === presencePingText || safeJsonType(message) === "ping") {
      ws.send(presencePongText);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    void ws;
    void code;
    void reason;
    this.broadcastPresence();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close(1011, "presence_error");
    } catch {}
    this.broadcastPresence();
  }

  private broadcastPresence(): void {
    const payload = JSON.stringify(buildPresenceSnapshot(this.ctx.getWebSockets()));
    for (const ws of this.ctx.getWebSockets("role:dashboard")) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

export function buildPresenceSnapshot(
  sockets: Iterable<PresenceSocket>,
  now = new Date(),
): PresenceSnapshot {
  let tracked = 0;
  let dashboards = 0;
  for (const socket of sockets) {
    if (socket.readyState !== WebSocket.OPEN) {
      continue;
    }
    const role = presenceRoleFromSocket(socket);
    if (role === "tracker") {
      tracked += 1;
    } else if (role === "dashboard") {
      dashboards += 1;
    }
  }
  return {
    dashboards,
    online: tracked,
    tracked,
    type: "presence",
    updatedAt: now.toISOString(),
  };
}

function presenceRoleFromSocket(socket: PresenceSocket): PresenceRole | null {
  try {
    const attachment = socket.deserializeAttachment() as Partial<PresenceSocketAttachment> | null;
    const parsed = presenceRoleSchema.safeParse(attachment?.role);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function normalizePresencePath(value: string | null): string {
  const path = value?.trim() || "/";
  return path.startsWith("/") ? path.slice(0, 512) : `/${path.slice(0, 511)}`;
}

function safeJsonType(value: string): string | null {
  try {
    const parsed = JSON.parse(value) as { type?: unknown };
    return typeof parsed.type === "string" ? parsed.type : null;
  } catch {
    return null;
  }
}

function sameOrigin(origin: string, allowedOrigin: string): boolean {
  if (!origin) {
    return false;
  }
  try {
    return new URL(origin).origin === new URL(allowedOrigin).origin;
  } catch {
    return false;
  }
}

app.onError((error, c) => {
  // biome-ignore lint/suspicious/noConsole: Worker error logs are redacted before emission.
  console.error(JSON.stringify(redactObject({ message: error.message, name: error.name })));
  return c.json({ error: "collector_error" }, 500);
});

export default app;
