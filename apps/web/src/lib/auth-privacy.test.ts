import { describe, expect, it } from "vitest";
import { stripSessionNetworkFields } from "./auth-privacy";

describe("auth privacy hooks", () => {
  it("removes session IP address and raw user agent before persistence", () => {
    expect(
      stripSessionNetworkFields({
        id: "session_1",
        ipAddress: "203.0.113.1",
        token: "session-token",
        userAgent: "Mozilla/5.0 raw browser string",
      }),
    ).toEqual({
      data: {
        id: "session_1",
        ipAddress: null,
        token: "session-token",
        userAgent: null,
      },
    });
  });
});
