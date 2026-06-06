import {
  PRESENCE_ENDPOINT,
  type PresenceRole,
  type PresenceSnapshot,
  presenceSnapshotSchema,
} from "@edgetrail/shared";

export function buildPresenceWebSocketUrl({
  collectorOrigin,
  path,
  publicSiteId,
  role,
}: {
  collectorOrigin: string;
  path: string;
  publicSiteId: string;
  role: PresenceRole;
}): string {
  const url = new URL(PRESENCE_ENDPOINT, collectorOrigin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("site", publicSiteId);
  url.searchParams.set("path", path || "/");
  url.searchParams.set("role", role);
  return url.toString();
}

export function parsePresenceSnapshot(value: unknown): PresenceSnapshot | null {
  const parsed = presenceSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
