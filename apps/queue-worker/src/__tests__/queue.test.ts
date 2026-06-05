import { type QueueEventMessage, SCHEMA_VERSION } from "@edgetrail/shared";
import { describe, expect, it, vi } from "vitest";
import { processQueueBatch } from "../index";

function makeEvent(overrides: Partial<QueueEventMessage> = {}): QueueEventMessage {
  return {
    eventId: "event_1234567890abcdef",
    schemaVersion: SCHEMA_VERSION,
    siteId: "site_1",
    publicSiteId: "pub_1",
    eventName: "pageview",
    ingestedAt: "2026-06-05T12:00:00.000Z",
    clientTimestampMs: 1780660800000,
    siteHost: "example.com",
    path: "/",
    normalizedUrl: "https://example.com/",
    referrerDomain: "",
    country: "US",
    browser: "Chrome",
    os: "macOS",
    device: "desktop",
    visitorHash: "a".repeat(64),
    sessionHash: "b".repeat(64),
    value: 1,
    ...overrides,
  };
}

function createEnv() {
  const processed = new Set<string>();
  const db = {
    prepare(query: string) {
      const statement = {
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async first() {
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          if (query.includes("processed_queue_events")) {
            const eventId = String(statement.values[0]);
            if (processed.has(eventId)) {
              return { success: true, meta: { changes: 0 } };
            }
            processed.add(eventId);
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 1 } };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
  const put = vi.fn(() => Promise.resolve({} as R2Object));
  return {
    env: { DB: db, ARCHIVE_BUCKET: { put } as unknown as R2Bucket },
    put,
  };
}

describe("queue worker", () => {
  it("processes rollups and writes partitioned R2 archive", async () => {
    const { env, put } = createEnv();
    const result = await processQueueBatch([makeEvent()], env, "batch_1");
    expect(result.processed).toBe(1);
    expect(result.objectKeys[0]).toBe(
      "events/site_id=site_1/date=2026-06-05/events-batch_1.ndjson",
    );
    expect(put).toHaveBeenCalledOnce();
  });

  it("dedupes repeated event ids before side effects", async () => {
    const { env, put } = createEnv();
    const result = await processQueueBatch([makeEvent(), makeEvent()], env, "batch_2");
    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(put).toHaveBeenCalledOnce();
  });

  it("rejects raw UA fields in queue messages", async () => {
    const { env } = createEnv();
    await expect(
      processQueueBatch(
        [makeEvent({ userAgent: "raw" } as unknown as Partial<QueueEventMessage>)],
        env,
      ),
    ).rejects.toThrow();
  });
});
