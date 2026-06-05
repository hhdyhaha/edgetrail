import { DIMENSIONS, type QueueEventMessage, toIsoDate } from "@edgetrail/shared";

export type D1Like = {
  prepare(query: string): D1PreparedStatementLike;
};

export type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: unknown }>;
};

export type SiteConfig = {
  siteId: string;
  publicSiteId: string;
  status: string;
  primaryDomain: string;
  allowedDomains: string[];
};

export type SiteRow = {
  id: string;
  organization_id: string;
  name: string;
  public_site_id: string;
  primary_domain: string;
  timezone: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getSiteConfigByPublicId(
  db: D1Like,
  publicSiteId: string,
): Promise<SiteConfig | null> {
  const site = await db
    .prepare(
      "SELECT id, public_site_id, status, primary_domain FROM sites WHERE public_site_id = ? LIMIT 1",
    )
    .bind(publicSiteId)
    .first<{ id: string; public_site_id: string; status: string; primary_domain: string }>();
  if (!site) {
    return null;
  }
  const domains = await db
    .prepare("SELECT domain FROM site_domains WHERE site_id = ?")
    .bind(site.id)
    .all<{ domain: string }>();
  return {
    siteId: site.id,
    publicSiteId: site.public_site_id,
    status: site.status,
    primaryDomain: site.primary_domain,
    allowedDomains: uniqueDomains([
      site.primary_domain,
      ...domains.results.map((row) => row.domain),
    ]),
  };
}

export async function createDefaultOrganization(db: D1Like, userId: string, userName: string) {
  const existing = await db
    .prepare(
      "SELECT organizations.* FROM organizations INNER JOIN organization_members ON organization_members.organization_id = organizations.id WHERE organization_members.user_id = ? LIMIT 1",
    )
    .bind(userId)
    .first();
  if (existing) {
    return existing;
  }
  const now = new Date().toISOString();
  const organizationId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const slug = `${slugify(userName || "workspace")}-${organizationId.slice(0, 8)}`;
  await db
    .prepare(
      "INSERT INTO organizations (id, name, slug, owner_user_id, plan, created_at, updated_at) VALUES (?, ?, ?, ?, 'free', ?, ?)",
    )
    .bind(
      organizationId,
      userName ? `${userName}'s workspace` : "Default workspace",
      slug,
      userId,
      now,
      now,
    )
    .run();
  await db
    .prepare(
      "INSERT INTO organization_members (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)",
    )
    .bind(memberId, organizationId, userId, now)
    .run();
  return db.prepare("SELECT * FROM organizations WHERE id = ?").bind(organizationId).first();
}

export async function listOrganizationsForUser(db: D1Like, userId: string) {
  return (
    await db
      .prepare(
        "SELECT organizations.* FROM organizations INNER JOIN organization_members ON organization_members.organization_id = organizations.id WHERE organization_members.user_id = ? ORDER BY organizations.created_at ASC",
      )
      .bind(userId)
      .all()
  ).results;
}

export async function assertOrganizationAccess(db: D1Like, userId: string, organizationId: string) {
  const member = await db
    .prepare(
      "SELECT id FROM organization_members WHERE user_id = ? AND organization_id = ? LIMIT 1",
    )
    .bind(userId, organizationId)
    .first();
  if (!member) {
    throw new Error("Forbidden");
  }
}

export async function createSite(
  db: D1Like,
  input: { organizationId: string; name: string; primaryDomain: string; timezone: string },
): Promise<SiteRow> {
  const now = new Date().toISOString();
  const siteId = crypto.randomUUID();
  const publicSiteId = `pub_${crypto.randomUUID().replaceAll("-", "")}`;
  await db
    .prepare(
      "INSERT INTO sites (id, organization_id, name, public_site_id, primary_domain, timezone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)",
    )
    .bind(
      siteId,
      input.organizationId,
      input.name,
      publicSiteId,
      normalizeDomain(input.primaryDomain),
      input.timezone,
      now,
      now,
    )
    .run();
  await addSiteDomain(db, siteId, input.primaryDomain, now);
  const created = await getSiteById(db, siteId);
  if (!created) {
    throw new Error("Failed to create site");
  }
  return created;
}

export async function getSiteById(db: D1Like, siteId: string): Promise<SiteRow | null> {
  return db.prepare("SELECT * FROM sites WHERE id = ? LIMIT 1").bind(siteId).first<SiteRow>();
}

export async function listSitesForUser(db: D1Like, userId: string): Promise<SiteRow[]> {
  return (
    await db
      .prepare(
        "SELECT sites.* FROM sites INNER JOIN organization_members ON organization_members.organization_id = sites.organization_id WHERE organization_members.user_id = ? ORDER BY sites.created_at DESC",
      )
      .bind(userId)
      .all<SiteRow>()
  ).results;
}

export async function assertSiteAccess(
  db: D1Like,
  userId: string,
  siteId: string,
): Promise<SiteRow> {
  const site = await db
    .prepare(
      "SELECT sites.* FROM sites INNER JOIN organization_members ON organization_members.organization_id = sites.organization_id WHERE organization_members.user_id = ? AND sites.id = ? LIMIT 1",
    )
    .bind(userId, siteId)
    .first<SiteRow>();
  if (!site) {
    throw new Error("Forbidden");
  }
  return site;
}

export async function addSiteDomain(
  db: D1Like,
  siteId: string,
  domain: string,
  verifiedAt?: string,
) {
  const now = verifiedAt ?? new Date().toISOString();
  await db
    .prepare(
      "INSERT OR IGNORE INTO site_domains (id, site_id, domain, verified_at, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(crypto.randomUUID(), siteId, normalizeDomain(domain), now, now)
    .run();
}

export async function listSiteDomains(db: D1Like, siteId: string) {
  return (
    await db
      .prepare(
        "SELECT id, site_id, domain, verified_at, created_at FROM site_domains WHERE site_id = ?",
      )
      .bind(siteId)
      .all()
  ).results;
}

export async function createShareLink(db: D1Like, siteId: string) {
  const token = createToken();
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO share_links (id, site_id, token, enabled, expires_at, created_at) VALUES (?, ?, ?, 1, NULL, ?)",
    )
    .bind(crypto.randomUUID(), siteId, token, now)
    .run();
  return db.prepare("SELECT * FROM share_links WHERE token = ?").bind(token).first();
}

export async function listShareLinksForSite(db: D1Like, siteId: string) {
  return (
    await db
      .prepare(
        "SELECT id, site_id, token, enabled, expires_at, created_at FROM share_links WHERE site_id = ? ORDER BY created_at DESC",
      )
      .bind(siteId)
      .all()
  ).results;
}

export async function disableShareLink(db: D1Like, siteId: string, linkId: string) {
  await db
    .prepare("UPDATE share_links SET enabled = 0 WHERE id = ? AND site_id = ?")
    .bind(linkId, siteId)
    .run();
}

export async function getEnabledShareLink(db: D1Like, token: string) {
  return db
    .prepare(
      "SELECT share_links.*, sites.organization_id FROM share_links INNER JOIN sites ON sites.id = share_links.site_id WHERE share_links.token = ? AND share_links.enabled = 1 AND (share_links.expires_at IS NULL OR share_links.expires_at > ?) LIMIT 1",
    )
    .bind(token, new Date().toISOString())
    .first<{ site_id: string; token: string; organization_id: string }>();
}

export async function insertProcessedQueueEvent(
  db: D1Like,
  event: QueueEventMessage,
): Promise<boolean> {
  const result = await db
    .prepare(
      "INSERT OR IGNORE INTO processed_queue_events (event_id, site_id, event_date, processed_at) VALUES (?, ?, ?, ?)",
    )
    .bind(
      event.eventId,
      event.siteId,
      toIsoDate(new Date(event.ingestedAt)),
      new Date().toISOString(),
    )
    .run();
  return Boolean((result.meta as { changes?: number } | undefined)?.changes ?? true);
}

export async function incrementRollups(db: D1Like, event: QueueEventMessage): Promise<void> {
  const date = toIsoDate(new Date(event.ingestedAt));
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO daily_site_stats (id, site_id, date, pageviews, visitors, visits, bounces, avg_duration_ms, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?) ON CONFLICT(site_id, date) DO UPDATE SET pageviews = pageviews + excluded.pageviews, updated_at = excluded.updated_at",
    )
    .bind(crypto.randomUUID(), event.siteId, date, event.eventName === "pageview" ? 1 : 0, now, now)
    .run();

  for (const [dimension, value] of getDimensionValues(event)) {
    await db
      .prepare(
        "INSERT INTO daily_dimension_stats (id, site_id, date, dimension, dimension_value, pageviews, visitors, visits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?) ON CONFLICT(site_id, date, dimension, dimension_value) DO UPDATE SET pageviews = pageviews + excluded.pageviews, updated_at = excluded.updated_at",
      )
      .bind(
        crypto.randomUUID(),
        event.siteId,
        date,
        dimension,
        value,
        event.eventName === "pageview" ? 1 : 0,
        now,
        now,
      )
      .run();
  }
}

export async function recordArchiveObject(
  db: D1Like,
  input: { siteId: string; date: string; objectKey: string; eventCount: number; checksum?: string },
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO archive_objects (id, site_id, date, object_key, event_count, checksum, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'created', ?, ?) ON CONFLICT(object_key) DO UPDATE SET event_count = excluded.event_count, checksum = excluded.checksum, updated_at = excluded.updated_at",
    )
    .bind(
      crypto.randomUUID(),
      input.siteId,
      input.date,
      input.objectKey,
      input.eventCount,
      input.checksum ?? null,
      now,
      now,
    )
    .run();
}

export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function uniqueDomains(domains: string[]): string[] {
  return Array.from(new Set(domains.map(normalizeDomain).filter(Boolean)));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getDimensionValues(event: QueueEventMessage): [string, string][] {
  const values: Partial<Record<(typeof DIMENSIONS)[number], string | undefined>> = {
    path: event.path,
    referrer: event.referrerDomain,
    country: event.country,
    device: event.device,
    browser: event.browser,
    os: event.os,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
  };
  return DIMENSIONS.flatMap((dimension) => {
    const value = values[dimension];
    return value ? [[dimension, value]] : [];
  });
}
