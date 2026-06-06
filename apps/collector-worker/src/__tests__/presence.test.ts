import { describe, expect, it, vi } from "vitest";
import { buildPresenceSnapshot, PresenceRoom } from "../index";

describe("PresenceRoom state helpers", () => {
  it("counts tracked clients separately from dashboard observers", () => {
    const snapshot = buildPresenceSnapshot([
      openSocket("tracker"),
      openSocket("tracker"),
      openSocket("dashboard"),
      closedSocket("tracker"),
    ]);

    expect(snapshot).toEqual({
      type: "presence",
      online: 2,
      tracked: 2,
      dashboards: 1,
      updatedAt: expect.any(String),
    });
  });

  it("keeps per-site Durable Object snapshots isolated by input sockets", () => {
    expect(buildPresenceSnapshot([openSocket("tracker")]).online).toBe(1);
    expect(buildPresenceSnapshot([openSocket("tracker"), openSocket("tracker")]).online).toBe(2);
  });

  it("broadcasts after close without closing an already-closing socket again", async () => {
    const broadcastPresence = vi.fn();
    const context = {
      broadcastPresence,
    } as unknown as PresenceRoom;
    const closingSocket = {
      close: vi.fn(() => {
        throw new Error("already closing");
      }),
    } as unknown as WebSocket;

    await PresenceRoom.prototype.webSocketClose.call(context, closingSocket, 1000, "");

    expect(closingSocket.close).not.toHaveBeenCalled();
    expect(broadcastPresence).toHaveBeenCalledOnce();
  });
});

function openSocket(role: "tracker" | "dashboard"): WebSocket {
  return {
    deserializeAttachment: () => ({ role }),
    readyState: WebSocket.OPEN,
  } as WebSocket;
}

function closedSocket(role: "tracker" | "dashboard"): WebSocket {
  return {
    deserializeAttachment: () => ({ role }),
    readyState: WebSocket.CLOSED,
  } as WebSocket;
}
