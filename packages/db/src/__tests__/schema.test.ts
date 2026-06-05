import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("D1 schema", () => {
  const migration = readFileSync(resolve("migrations/0000_initial.sql"), "utf8");

  it("does not create raw event storage tables", () => {
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS raw_/i);
    expect(migration).not.toMatch(/raw_pageview/i);
  });

  it("includes queue dedupe metadata without raw payload fields", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS processed_queue_events");
    const processedBlock = migration.slice(migration.indexOf("processed_queue_events"));
    expect(processedBlock).not.toContain("url");
    expect(processedBlock).not.toContain("user_agent");
    expect(processedBlock).not.toContain("visitor_hash");
  });
});
