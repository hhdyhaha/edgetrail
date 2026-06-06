import { env } from "cloudflare:workers";
import {
  buildDimensionSql,
  buildSummarySql,
  buildTimeseriesSql,
  type DimensionKind,
  MissingWaeConfigError,
  queryWorkersAnalyticsEngine,
  WaeSqlQueryError,
} from "@edgetrail/analytics";
import {
  addSiteDomain,
  assertOrganizationAccess,
  assertSiteAccess,
  createDefaultOrganization,
  createShareLink,
  createSite,
  disableShareLink,
  getEnabledShareLink,
  getSiteById,
  listOrganizationsForUser,
  listShareLinksForSite,
  listSiteDomains,
  listSitesForUser,
} from "@edgetrail/db";
import {
  assertWithinWaeRetention,
  chooseBucketSeconds,
  createDomainSchema,
  createOrganizationSchema,
  createSiteSchema,
  dateRangeSchema,
  resolvePresetRange,
} from "@edgetrail/shared";
import { auth } from "#/lib/auth";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type ApiContext = {
  request: Request;
  pathname: string;
  method: string;
  parts: string[];
};

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/api/, "") || "/";
  const ctx: ApiContext = {
    request,
    pathname,
    method: request.method,
    parts: pathname.split("/").filter(Boolean),
  };

  try {
    if (ctx.parts[0] === "public") {
      return await handlePublicApi(ctx);
    }

    const user = await requireUser(request);
    await createDefaultOrganization(env.DB, user.id, user.name ?? "Workspace");

    if (ctx.pathname === "/me" && ctx.method === "GET") {
      const organizations = await listOrganizationsForUser(env.DB, user.id);
      return json({ user, organizations });
    }

    if (ctx.parts[0] === "organizations") {
      return await handleOrganizations(ctx, user);
    }

    if (ctx.parts[0] === "sites") {
      return await handleSites(ctx, user);
    }

    return json({ error: "not_found" }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleOrganizations(ctx: ApiContext, user: SessionUser): Promise<Response> {
  if (ctx.parts.length === 1 && ctx.method === "GET") {
    return json({ organizations: await listOrganizationsForUser(env.DB, user.id) });
  }
  if (ctx.parts.length === 1 && ctx.method === "POST") {
    const input = createOrganizationSchema.parse(await ctx.request.json());
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO organizations (id, name, slug, owner_user_id, plan, created_at, updated_at) VALUES (?, ?, ?, ?, 'free', ?, ?)",
    )
      .bind(id, input.name, `${slugify(input.name)}-${id.slice(0, 8)}`, user.id, now, now)
      .run();
    await env.DB.prepare(
      "INSERT INTO organization_members (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)",
    )
      .bind(crypto.randomUUID(), id, user.id, now)
      .run();
    return json(
      {
        organization: await env.DB.prepare("SELECT * FROM organizations WHERE id = ?")
          .bind(id)
          .first(),
      },
      201,
    );
  }
  return json({ error: "not_found" }, 404);
}

async function handleSites(ctx: ApiContext, user: SessionUser): Promise<Response> {
  if (ctx.parts.length === 1 && ctx.method === "GET") {
    return json({ sites: await listSitesForUser(env.DB, user.id) });
  }

  if (ctx.parts.length === 1 && ctx.method === "POST") {
    const input = createSiteSchema.parse(await ctx.request.json());
    await assertOrganizationAccess(env.DB, user.id, input.organizationId);
    const site = await createSite(env.DB, input);
    return json({ site, trackingScript: trackingScript(site.public_site_id) }, 201);
  }

  const siteId = ctx.parts[1];
  if (!siteId) {
    return json({ error: "not_found" }, 404);
  }
  const site = await assertSiteAccess(env.DB, user.id, siteId);

  if (ctx.parts.length === 2 && ctx.method === "GET") {
    return json({
      site,
      domains: await listSiteDomains(env.DB, siteId),
      shareLinks: await listShareLinksForSite(env.DB, siteId),
      trackingScript: trackingScript(site.public_site_id),
    });
  }

  if (ctx.parts.length === 2 && ctx.method === "PATCH") {
    const body = (await ctx.request.json()) as { name?: string; status?: string };
    await env.DB.prepare(
      "UPDATE sites SET name = COALESCE(?, name), status = COALESCE(?, status), updated_at = ? WHERE id = ?",
    )
      .bind(body.name ?? null, body.status ?? null, new Date().toISOString(), siteId)
      .run();
    return json({ site: await getSiteById(env.DB, siteId) });
  }

  if (ctx.parts.length === 2 && ctx.method === "DELETE") {
    await env.DB.prepare("UPDATE sites SET status = 'deleted', updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), siteId)
      .run();
    return json({ ok: true });
  }

  if (ctx.parts[2] === "domains" && ctx.method === "POST") {
    const input = createDomainSchema.parse(await ctx.request.json());
    await addSiteDomain(env.DB, siteId, input.domain);
    return json({ domains: await listSiteDomains(env.DB, siteId) }, 201);
  }

  if (ctx.parts[2] === "domains" && ctx.parts[3] && ctx.method === "DELETE") {
    await env.DB.prepare("DELETE FROM site_domains WHERE site_id = ? AND id = ?")
      .bind(siteId, ctx.parts[3])
      .run();
    return json({ ok: true });
  }

  if (ctx.parts[2] === "script" && ctx.method === "GET") {
    return json({ trackingScript: trackingScript(site.public_site_id) });
  }

  if (ctx.parts[2] === "share-links" && ctx.method === "POST") {
    return json({ shareLink: await createShareLink(env.DB, siteId) }, 201);
  }

  if (ctx.parts[2] === "share-links" && ctx.parts[3] && ctx.method === "DELETE") {
    await disableShareLink(env.DB, siteId, ctx.parts[3]);
    return json({ ok: true });
  }

  const analyticsKind = analyticsKindFromPath(ctx.parts[2]);
  if (analyticsKind && ctx.method === "GET") {
    return handlePrivateAnalytics(siteId, analyticsKind, ctx.request);
  }

  return json({ error: "not_found" }, 404);
}

async function handlePublicApi(ctx: ApiContext): Promise<Response> {
  const token = ctx.parts[1];
  const analyticsKind = analyticsKindFromPath(ctx.parts[2]);
  if (!token || !analyticsKind || ctx.method !== "GET") {
    return json({ error: "not_found" }, 404);
  }
  const shareLink = await getEnabledShareLink(env.DB, token);
  if (!shareLink) {
    return json({ error: "share_not_found" }, 404);
  }
  return handlePrivateAnalytics(shareLink.site_id, analyticsKind, ctx.request);
}

async function handlePrivateAnalytics(
  siteId: string,
  kind: "summary" | "timeseries" | DimensionKind,
  request: Request,
): Promise<Response> {
  const range = parseRange(request);
  assertWithinWaeRetention(range);
  try {
    const waeConfig = getWaeQueryConfig();
    let sql: string;
    if (kind === "summary") {
      sql = buildSummarySql(waeConfig.dataset, siteId, range);
    } else if (kind === "timeseries") {
      sql = buildTimeseriesSql(waeConfig.dataset, siteId, range, chooseBucketSeconds(range));
    } else {
      sql = buildDimensionSql(waeConfig.dataset, siteId, range, kind);
    }
    const result = await queryWorkersAnalyticsEngine(waeConfig, sql);
    return json({ data: result.data, meta: result.meta, approximate: true });
  } catch (error) {
    if (error instanceof MissingWaeConfigError) {
      return json({ error: "missing_cloudflare_query_config", approximate: true }, 503);
    }
    if (error instanceof WaeSqlQueryError) {
      // biome-ignore lint/suspicious/noConsole: Worker error logs are sanitized before emission.
      console.error(
        JSON.stringify({
          code: "wae_sql_query_failed",
          message: error.message,
          status: error.status,
        }),
      );
      return json({ error: "wae_sql_query_failed", approximate: true }, 502);
    }
    throw error;
  }
}

function getWaeQueryConfig() {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN || !env.WAE_DATASET) {
    throw new MissingWaeConfigError();
  }
  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    dataset: env.WAE_DATASET,
  };
}

function parseRange(request: Request) {
  const url = new URL(request.url);
  const preset = url.searchParams.get("range");
  if (preset === "today" || preset === "yesterday" || preset === "7d" || preset === "30d") {
    return resolvePresetRange(preset);
  }
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (start && end) {
    const parsed = dateRangeSchema.parse({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
    });
    return { start: new Date(parsed.start), end: new Date(parsed.end) };
  }
  return resolvePresetRange("7d");
}

async function requireUser(request: Request): Promise<SessionUser> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session.user;
}

function analyticsKindFromPath(value: string | undefined) {
  if (
    value === "summary" ||
    value === "timeseries" ||
    value === "top-pages" ||
    value === "referrers" ||
    value === "countries" ||
    value === "devices" ||
    value === "browsers" ||
    value === "os" ||
    value === "utm"
  ) {
    return value;
  }
  return null;
}

function trackingScript(publicSiteId: string): string {
  const origin = env.COLLECTOR_ORIGIN || "https://collect.example.com";
  return `<script defer src="${origin}/script.js" data-site="${publicSiteId}"></script>`;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function errorResponse(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }
  if (error instanceof Error && error.message === "Forbidden") {
    return json({ error: "forbidden" }, 403);
  }
  if (error instanceof Error && error.message.includes("retention")) {
    return json({ error: "range_exceeds_wae_retention" }, 400);
  }
  return json({ error: "server_error" }, 500);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
