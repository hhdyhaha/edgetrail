# EdgeTrail Analytics

Privacy-first web analytics, built for Cloudflare.

EdgeTrail Analytics is a Cloudflare-native, self-hostable web analytics MVP built as a clean-slate pnpm workspace.

## Apps

- `apps/web`: TanStack Start dashboard, Google-only Better Auth, site management, analytics APIs, public share.
- `apps/collector-worker`: Hono collector for `/script.js`, `/collect`, and `/health`.
- `apps/queue-worker`: Cloudflare Queue consumer for D1 rollups and R2 NDJSON archives.

## Packages

- `packages/shared`: Zod schemas, constants, time ranges, redaction.
- `packages/analytics`: Workers Analytics Engine mapper, SQL builders, SQL API client.
- `packages/db`: Drizzle D1 schema, migrations, repository helpers.
- `packages/tracker`: zero-runtime-dependency browser tracker.
- `packages/ui`: shared React UI primitives.
- `packages/config`: shared TypeScript config.

## Local Verification

```sh
pnpm install
pnpm cf-typegen
pnpm check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Local Cloudflare Config

The committed `wrangler.jsonc` files intentionally use public placeholder
resource names. Keep real Cloudflare resource names, D1 database IDs, Queue
names, R2 bucket names, and Workers Analytics Engine datasets in ignored local
files.

For local development, copy each app's `wrangler.jsonc` to
`wrangler.local.jsonc`, replace placeholders with your own development
resources, and keep secrets in `.dev.vars`.

```sh
cp apps/web/wrangler.jsonc apps/web/wrangler.local.jsonc
cp apps/collector-worker/wrangler.jsonc apps/collector-worker/wrangler.local.jsonc
cp apps/queue-worker/wrangler.jsonc apps/queue-worker/wrangler.local.jsonc
```

Then run local development with the local config scripts:

```sh
pnpm dev:web:local
pnpm dev:collector:local
pnpm dev:queue:local
```

Production deploys, production D1 migrations, production Queue/R2 changes, domain changes, and secret mutation require explicit user confirmation.
