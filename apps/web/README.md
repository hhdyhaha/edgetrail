# Edge Analytics Web

TanStack Start dashboard deployed as a Cloudflare Worker. It owns marketing, Google-only Better Auth, site management, private analytics APIs, and public share dashboards.

## Local Development

1. Copy `.dev.vars.example` to `.dev.vars` and fill real local values.
2. Apply the D1 migration from the repo root or this app directory.
3. Run the web worker:

```sh
pnpm dev
```

The app expects the collector to be reachable at `COLLECTOR_ORIGIN` from `wrangler.jsonc`.

## Quality Gates

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm cf-typegen
```

## Production Secrets

Use Cloudflare/Wrangler secrets for the required values declared in `wrangler.jsonc`:

```sh
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_API_TOKEN
```

Do not commit `.dev.vars`, `.env`, Cloudflare API tokens, Better Auth secrets, or OAuth client secrets.
