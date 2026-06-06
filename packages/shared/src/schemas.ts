import { z } from "zod";
import { SCHEMA_VERSION, STRING_LIMITS } from "./constants.js";

const finiteNumber = z.number().finite();
const optionalDimension = (max: number) => z.string().trim().max(max).optional();

export const deviceSchema = z.enum(["desktop", "mobile", "tablet", "bot", "unknown"]);

export const collectPayloadSchema = z
  .object({
    siteId: z.string().trim().min(1).max(128),
    eventName: z.enum(["pageview", "custom_event"]),
    url: z.string().url().max(2048),
    referrer: z.string().url().max(2048).optional().or(z.literal("")),
    title: z.string().max(512).optional(),
    language: optionalDimension(STRING_LIMITS.language),
    screenWidth: finiteNumber.optional(),
    screenHeight: finiteNumber.optional(),
    viewportWidth: finiteNumber.optional(),
    viewportHeight: finiteNumber.optional(),
    timezoneOffset: finiteNumber.optional(),
    durationMs: finiteNumber.nonnegative().optional(),
    scrollDepth: finiteNumber.min(0).max(100).optional(),
    eventCategory: optionalDimension(STRING_LIMITS.eventCategory),
    eventLabel: optionalDimension(STRING_LIMITS.eventLabel),
    value: finiteNumber.optional(),
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.eventName === "custom_event" && !payload.eventLabel && !payload.eventCategory) {
      ctx.addIssue({
        code: "custom",
        path: ["eventCategory"],
        message: "custom events require category or label metadata",
      });
    }
  });

export type CollectPayload = z.infer<typeof collectPayloadSchema>;

export const queueEventMessageSchema = z
  .object({
    eventId: z.string().min(16).max(128),
    schemaVersion: z.literal(SCHEMA_VERSION),
    siteId: z.string().min(1).max(128),
    publicSiteId: z.string().min(1).max(128),
    eventName: z.enum(["pageview", "custom_event"]),
    ingestedAt: z.string().datetime(),
    clientTimestampMs: finiteNumber.optional(),
    siteHost: z.string().max(STRING_LIMITS.siteHost),
    path: z.string().max(STRING_LIMITS.path),
    normalizedUrl: z.string().max(STRING_LIMITS.normalizedUrl),
    referrerDomain: z.string().max(STRING_LIMITS.referrerDomain),
    country: z.string().min(2).max(8),
    browser: z.string().max(128),
    os: z.string().max(128),
    device: deviceSchema,
    utmSource: optionalDimension(STRING_LIMITS.utm),
    utmMedium: optionalDimension(STRING_LIMITS.utm),
    utmCampaign: optionalDimension(STRING_LIMITS.utm),
    visitorHash: z.string().min(32).max(96),
    sessionHash: z.string().min(32).max(96),
    language: optionalDimension(STRING_LIMITS.language),
    entryPath: optionalDimension(STRING_LIMITS.path),
    eventCategory: optionalDimension(STRING_LIMITS.eventCategory),
    eventLabel: optionalDimension(STRING_LIMITS.eventLabel),
    pageTitleHash: optionalDimension(STRING_LIMITS.pageTitleHash),
    value: finiteNumber,
  })
  .strict();

export type QueueEventMessage = z.infer<typeof queueEventMessageSchema>;

export const presenceRoleSchema = z.enum(["tracker", "dashboard"]);
export type PresenceRole = z.infer<typeof presenceRoleSchema>;

export const presencePingSchema = z.object({ type: z.literal("ping") }).strict();
export const presencePongSchema = z.object({ type: z.literal("pong") }).strict();

export const presenceSnapshotSchema = z
  .object({
    type: z.literal("presence"),
    online: z.number().int().nonnegative(),
    tracked: z.number().int().nonnegative(),
    dashboards: z.number().int().nonnegative(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type PresenceSnapshot = z.infer<typeof presenceSnapshotSchema>;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const createSiteSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  primaryDomain: z.string().trim().min(1).max(253),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
});

export const createDomainSchema = z.object({
  domain: z.string().trim().min(1).max(253),
});

export const dateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{24,96}$/);

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
