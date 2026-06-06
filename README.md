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

Production deploys, production D1 migrations, production Queue/R2 changes, domain changes, and secret mutation require explicit user confirmation.
