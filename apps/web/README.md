# EdgeTrail Analytics Web

TanStack Start dashboard deployed as a Cloudflare Worker. It owns marketing, Google-only Better Auth, site management, private analytics APIs, and public share dashboards.

## Local Development

1. Copy `.dev.vars.example` to `.dev.vars` and fill real local values.
2. Apply the D1 migration from the repo root or this app directory.
3. Run the web worker:

```sh
pnpm dev
```

Local development is the test environment. Keep `.dev.vars` on localhost/test
OAuth credentials and use the top-level bindings in `wrangler.jsonc`.

Production values live under `env.production` in `wrangler.jsonc` and in
Cloudflare Worker secrets. The committed production resource names and IDs are
open-source placeholders; replace them in your deployment workflow or private
copy before deploying. Keep private Workers Analytics Engine dataset names in
Worker secrets or ignored local config, not in committed source. Do not copy
production OAuth secrets into local `.dev.vars`.

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
wrangler secret put BETTER_AUTH_SECRET --env production
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
wrangler secret put CLOUDFLARE_API_TOKEN --env production
wrangler secret put WAE_DATASET --env production
```

Production deploys must use the production environment:

```sh
pnpm run deploy
```

Do not commit `.dev.vars`, `.env`, Cloudflare API tokens, Better Auth secrets, OAuth client secrets, or private WAE dataset names.
