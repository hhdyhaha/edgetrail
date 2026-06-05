import { env } from "cloudflare:workers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@edgetrail/db/schema";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/d1";
import { stripSessionNetworkFields } from "./auth-privacy";

export const auth = betterAuth({
  account: {
    encryptOAuthTokens: true,
  },
  advanced: {
    ipAddress: {
      disableIpTracking: true,
    },
  },
  appName: "EdgeTrail",
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(drizzle(env.DB, { schema }), {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => stripSessionNetworkFields(session),
      },
      update: {
        before: async (session) => stripSessionNetworkFields(session),
      },
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  plugins: [tanstackStartCookies()],
});
