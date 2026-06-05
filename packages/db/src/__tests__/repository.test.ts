import { describe, expect, it } from "vitest";
import {
  addSiteDomain,
  assertSiteAccess,
  createDefaultOrganization,
  createShareLink,
  createSite,
  type D1Like,
  disableShareLink,
  getEnabledShareLink,
  getSiteConfigByPublicId,
  listShareLinksForSite,
  listSiteDomains,
} from "../repository";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  plan: string;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type SiteRow = {
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

type DomainRow = {
  id: string;
  site_id: string;
  domain: string;
  verified_at: string;
  created_at: string;
};

type ShareLinkRow = {
  id: string;
  site_id: string;
  token: string;
  enabled: number;
  expires_at: string | null;
  created_at: string;
};

class InMemoryD1 implements D1Like {
  organizations: OrganizationRow[] = [];
  members: MemberRow[] = [];
  sites: SiteRow[] = [];
  domains: DomainRow[] = [];
  shareLinks: ShareLinkRow[] = [];

  prepare(query: string) {
    const db = this;
    const statement = {
      values: [] as unknown[],
      bind(...values: unknown[]) {
        statement.values = values;
        return statement;
      },
      async first<T = unknown>() {
        return firstForQuery<T>(db, query, statement.values);
      },
      async all<T = unknown>() {
        return { results: allForQuery<T>(db, query, statement.values) };
      },
      async run() {
        runQuery(db, query, statement.values);
        return { success: true, meta: { changes: 1 } };
      },
    };
    return statement;
  }
}

describe("D1 repository helpers", () => {
  it("creates one default organization for a first-time authenticated user", async () => {
    const db = new InMemoryD1();

    const first = await createDefaultOrganization(db, "user_1", "Ada");
    const second = await createDefaultOrganization(db, "user_1", "Ada");

    expect(db.organizations).toHaveLength(1);
    expect(db.members).toEqual([
      expect.objectContaining({ organization_id: db.organizations[0]?.id, role: "owner" }),
    ]);
    expect(second).toEqual(first);
  });

  it("creates sites with normalized primary domain and immediately trusted domain", async () => {
    const db = new InMemoryD1();
    const organization = (await createDefaultOrganization(db, "user_1", "Ada")) as OrganizationRow;

    const site = await createSite(db, {
      organizationId: organization.id,
      name: "Docs",
      primaryDomain: "https://Example.com/path",
      timezone: "UTC",
    });

    expect(site.public_site_id).toMatch(/^pub_/);
    expect(site.primary_domain).toBe("example.com");
    await addSiteDomain(db, site.id, "https://Blog.Example.com/articles");
    expect(await listSiteDomains(db, site.id)).toEqual([
      expect.objectContaining({ domain: "example.com", verified_at: expect.any(String) }),
      expect.objectContaining({ domain: "blog.example.com", verified_at: expect.any(String) }),
    ]);
    await expect(assertSiteAccess(db, "user_2", site.id)).rejects.toThrow("Forbidden");
  });

  it("resolves collector site config from public id and disabled share links stay unavailable", async () => {
    const db = new InMemoryD1();
    const organization = (await createDefaultOrganization(db, "user_1", "Ada")) as OrganizationRow;
    const site = await createSite(db, {
      organizationId: organization.id,
      name: "Docs",
      primaryDomain: "example.com",
      timezone: "UTC",
    });

    const config = await getSiteConfigByPublicId(db, site.public_site_id);
    expect(config).toEqual({
      siteId: site.id,
      publicSiteId: site.public_site_id,
      status: "active",
      primaryDomain: "example.com",
      allowedDomains: ["example.com"],
    });

    const shareLink = (await createShareLink(db, site.id)) as ShareLinkRow;
    expect(await getEnabledShareLink(db, shareLink.token)).toEqual(
      expect.objectContaining({ site_id: site.id, token: shareLink.token }),
    );

    await disableShareLink(db, site.id, shareLink.id);
    expect(await getEnabledShareLink(db, shareLink.token)).toBeNull();
    expect(await listShareLinksForSite(db, site.id)).toEqual([
      expect.objectContaining({
        id: shareLink.id,
        token: shareLink.token,
        enabled: 0,
      }),
    ]);
  });
});

function firstForQuery<T>(db: InMemoryD1, query: string, values: unknown[]): T | null {
  if (query.includes("SELECT organizations.*")) {
    const userId = String(values[0]);
    const member = db.members.find((row) => row.user_id === userId);
    return (
      member ? db.organizations.find((row) => row.id === member.organization_id) : null
    ) as T | null;
  }
  if (query.includes("SELECT * FROM organizations WHERE id = ?")) {
    return (db.organizations.find((row) => row.id === values[0]) ?? null) as T | null;
  }
  if (query.includes("SELECT id FROM organization_members")) {
    const [userId, organizationId] = values.map(String);
    return (db.members.find(
      (row) => row.user_id === userId && row.organization_id === organizationId,
    ) ?? null) as T | null;
  }
  if (query.includes("SELECT sites.*") && query.includes("sites.id = ?")) {
    const [userId, siteId] = values.map(String);
    const site = db.sites.find((row) => row.id === siteId);
    const hasAccess = site
      ? db.members.some(
          (row) => row.user_id === userId && row.organization_id === site.organization_id,
        )
      : false;
    return (hasAccess ? site : null) as T | null;
  }
  if (query.includes("SELECT * FROM sites WHERE id = ?")) {
    return (db.sites.find((row) => row.id === values[0]) ?? null) as T | null;
  }
  if (query.includes("FROM sites WHERE public_site_id")) {
    const site = db.sites.find((row) => row.public_site_id === values[0]);
    return site
      ? ({
          id: site.id,
          public_site_id: site.public_site_id,
          status: site.status,
          primary_domain: site.primary_domain,
        } as T)
      : null;
  }
  if (query.includes("SELECT * FROM share_links WHERE token = ?")) {
    return (db.shareLinks.find((row) => row.token === values[0]) ?? null) as T | null;
  }
  if (query.includes("SELECT share_links.*, sites.organization_id")) {
    const [token, now] = values.map(String);
    const share = db.shareLinks.find(
      (row) =>
        row.token === token && row.enabled === 1 && (!row.expires_at || row.expires_at > now),
    );
    const site = share ? db.sites.find((row) => row.id === share.site_id) : null;
    return (share && site ? { ...share, organization_id: site.organization_id } : null) as T | null;
  }
  return null;
}

function allForQuery<T>(db: InMemoryD1, query: string, values: unknown[]): T[] {
  if (query.includes("SELECT organizations.*")) {
    const userId = String(values[0]);
    const organizationIds = new Set(
      db.members.filter((row) => row.user_id === userId).map((row) => row.organization_id),
    );
    return db.organizations.filter((row) => organizationIds.has(row.id)) as T[];
  }
  if (query.includes("SELECT sites.*")) {
    const userId = String(values[0]);
    const organizationIds = new Set(
      db.members.filter((row) => row.user_id === userId).map((row) => row.organization_id),
    );
    return db.sites.filter((row) => organizationIds.has(row.organization_id)) as T[];
  }
  if (query.includes("SELECT domain FROM site_domains")) {
    const siteId = String(values[0]);
    return db.domains
      .filter((row) => row.site_id === siteId)
      .map((row) => ({ domain: row.domain })) as T[];
  }
  if (query.includes("SELECT id, site_id, domain")) {
    const siteId = String(values[0]);
    return db.domains.filter((row) => row.site_id === siteId) as T[];
  }
  if (query.includes("SELECT id, site_id, token")) {
    const siteId = String(values[0]);
    return db.shareLinks.filter((row) => row.site_id === siteId) as T[];
  }
  return [];
}

function runQuery(db: InMemoryD1, query: string, values: unknown[]): void {
  if (query.includes("INSERT INTO organizations")) {
    const [id, name, slug, ownerUserId, createdAt, updatedAt] = values.map(String);
    db.organizations.push({
      id,
      name,
      slug,
      owner_user_id: ownerUserId,
      plan: "free",
      created_at: createdAt,
      updated_at: updatedAt,
    });
  } else if (query.includes("INSERT INTO organization_members")) {
    const [id, organizationId, userId, createdAt] = values.map(String);
    db.members.push({
      id,
      organization_id: organizationId,
      user_id: userId,
      role: "owner",
      created_at: createdAt,
    });
  } else if (query.includes("INSERT INTO sites")) {
    const [id, organizationId, name, publicSiteId, primaryDomain, timezone, createdAt, updatedAt] =
      values.map(String);
    db.sites.push({
      id,
      organization_id: organizationId,
      name,
      public_site_id: publicSiteId,
      primary_domain: primaryDomain,
      timezone,
      status: "active",
      created_at: createdAt,
      updated_at: updatedAt,
    });
  } else if (query.includes("INSERT OR IGNORE INTO site_domains")) {
    const [id, siteId, domain, verifiedAt, createdAt] = values.map(String);
    if (!db.domains.some((row) => row.site_id === siteId && row.domain === domain)) {
      db.domains.push({
        id,
        site_id: siteId,
        domain,
        verified_at: verifiedAt,
        created_at: createdAt,
      });
    }
  } else if (query.includes("INSERT INTO share_links")) {
    const [id, siteId, token, createdAt] = values.map(String);
    db.shareLinks.push({
      id,
      site_id: siteId,
      token,
      enabled: 1,
      expires_at: null,
      created_at: createdAt,
    });
  } else if (query.includes("UPDATE share_links SET enabled = 0")) {
    const [id, siteId] = values.map(String);
    const share = db.shareLinks.find((row) => row.id === id && row.site_id === siteId);
    if (share) {
      share.enabled = 0;
    }
  }
}
