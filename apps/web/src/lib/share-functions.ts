import { env } from "cloudflare:workers";
import { getEnabledShareLink } from "@edgetrail/db";
import { createServerFn } from "@tanstack/react-start";

export const getPublicShareAvailability = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => {
    if (!input.token) {
      throw new Error("Invalid share token");
    }
    return { token: input.token };
  })
  .handler(async ({ data }) => {
    const shareLink = await getEnabledShareLink(env.DB, data.token);
    return { available: Boolean(shareLink) };
  });
