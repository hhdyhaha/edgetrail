import { describe, expect, it } from "vitest";
import { buildPresenceWebSocketUrl, parsePresenceSnapshot } from "./presence";

describe("dashboard presence helpers", () => {
  it("builds a collector WebSocket URL for private dashboard observers", () => {
    expect(
      buildPresenceWebSocketUrl({
        collectorOrigin: "https://collector.example.com",
        path: "/pricing",
        publicSiteId: "pub_123",
        role: "dashboard",
      }),
    ).toBe("wss://collector.example.com/presence?site=pub_123&path=%2Fpricing&role=dashboard");
  });

  it("accepts only typed realtime presence snapshots", () => {
    expect(
      parsePresenceSnapshot({
        type: "presence",
        online: 3,
        tracked: 3,
        dashboards: 1,
        updatedAt: "2026-06-06T00:00:00.000Z",
      }),
    ).toEqual({
      type: "presence",
      online: 3,
      tracked: 3,
      dashboards: 1,
      updatedAt: "2026-06-06T00:00:00.000Z",
    });

    expect(parsePresenceSnapshot({ type: "presence", online: "3" })).toBeNull();
  });
});
