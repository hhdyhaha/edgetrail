import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { TRACKER_SCRIPT } from "../index";

describe("tracker script", () => {
  it("stays below the MVP gzip size target", () => {
    expect(gzipSync(TRACKER_SCRIPT).byteLength).toBeLessThan(3 * 1024);
  });

  it("uses sendBeacon with fetch keepalive fallback", () => {
    expect(TRACKER_SCRIPT).toContain("sendBeacon");
    expect(TRACKER_SCRIPT).toContain("keepalive");
  });

  it("uses simple POST bodies so browser tracking does not require CORS preflight", () => {
    expect(TRACKER_SCRIPT).not.toContain("Content-Type");
    expect(TRACKER_SCRIPT).not.toContain("application/json");
    expect(TRACKER_SCRIPT).not.toContain("new Blob");
  });

  it("tracks History API route changes and does not use MutationObserver", () => {
    expect(TRACKER_SCRIPT).toContain("pushState");
    expect(TRACKER_SCRIPT).toContain("replaceState");
    expect(TRACKER_SCRIPT).toContain("popstate");
    expect(TRACKER_SCRIPT).not.toContain("MutationObserver");
  });

  it("exposes the manual custom event API", () => {
    const oldGlobal = "edge" + "Analytics";

    expect(TRACKER_SCRIPT).toContain("edgeTrail");
    expect(TRACKER_SCRIPT).not.toContain(oldGlobal);
    expect(TRACKER_SCRIPT).toContain("custom_event");
  });
});
