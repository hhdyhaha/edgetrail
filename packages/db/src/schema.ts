import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerUserId: text("owner_user_id").notNull(),
  plan: text("plan").notNull().default("free"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const organizationMembers = sqliteTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_idx").on(table.organizationId, table.userId),
  ],
);

export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  publicSiteId: text("public_site_id").notNull().unique(),
  primaryDomain: text("primary_domain").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const siteDomains = sqliteTable(
  "site_domains",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").notNull(),
    domain: text("domain").notNull(),
    verifiedAt: text("verified_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("site_domains_site_domain_idx").on(table.siteId, table.domain)],
);

export const shareLinks = sqliteTable("share_links", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  token: text("token").notNull().unique(),
  enabled: integer("enabled").notNull().default(1),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").notNull(),
    name: text("name").notNull(),
    eventName: text("event_name").notNull(),
    matchType: text("match_type").notNull().default("exact"),
    matchValue: text("match_value"),
    interactive: integer("interactive").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("goals_site_name_idx").on(table.siteId, table.name)],
);

export const dailySiteStats = sqliteTable(
  "daily_site_stats",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").notNull(),
    date: text("date").notNull(),
    pageviews: integer("pageviews").notNull().default(0),
    visitors: integer("visitors").notNull().default(0),
    visits: integer("visits").notNull().default(0),
    bounces: integer("bounces").notNull().default(0),
    avgDurationMs: integer("avg_duration_ms").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("daily_site_stats_site_date_idx").on(table.siteId, table.date)],
);

export const dailyDimensionStats = sqliteTable(
  "daily_dimension_stats",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").notNull(),
    date: text("date").notNull(),
    dimension: text("dimension").notNull(),
    dimensionValue: text("dimension_value").notNull(),
    pageviews: integer("pageviews").notNull().default(0),
    visitors: integer("visitors").notNull().default(0),
    visits: integer("visits").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("daily_dimension_stats_unique_idx").on(
      table.siteId,
      table.date,
      table.dimension,
      table.dimensionValue,
    ),
  ],
);

export const archiveObjects = sqliteTable(
  "archive_objects",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").notNull(),
    date: text("date").notNull(),
    objectKey: text("object_key").notNull().unique(),
    eventCount: integer("event_count").notNull().default(0),
    checksum: text("checksum"),
    status: text("status").notNull().default("created"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("archive_objects_site_date_object_idx").on(
      table.siteId,
      table.date,
      table.objectKey,
    ),
  ],
);

export const processedQueueEvents = sqliteTable("processed_queue_events", {
  eventId: text("event_id").primaryKey(),
  siteId: text("site_id").notNull(),
  eventDate: text("event_date").notNull(),
  processedAt: text("processed_at").notNull(),
});
