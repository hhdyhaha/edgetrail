import { env } from "cloudflare:workers";
import { createDefaultOrganization } from "@edgetrail/db";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (session) {
    await createDefaultOrganization(env.DB, session.user.id, session.user.name ?? "Workspace");
  }
  return session;
});
