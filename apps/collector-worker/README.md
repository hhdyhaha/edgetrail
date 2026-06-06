# EdgeTrail Analytics Collector Worker

Hono Worker responsible for `/script.js`, `/collect`, and `/health`. It validates site/domain config from D1, writes sanitized datapoints to Workers Analytics Engine, and enqueues sanitized messages for rollup/archive processing.

## Local Development

1. Copy `.dev.vars.example` to `.dev.vars` and set a local `HASH_SECRET`.
2. Copy `wrangler.jsonc` to the ignored `wrangler.local.jsonc` if the local file
   does not exist yet.
3. Keep local `DASHBOARD_ORIGIN` set to the web dev origin, usually
   `http://localhost:3000`.
4. Use local or staging names for D1, Workers Analytics Engine, and Queue
   bindings in `wrangler.local.jsonc`.
5. Apply the shared D1 migration before testing site lookups.
6. Run the worker:

```sh
pnpm dev
```

## Quality Gates

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm cf-typegen
```

## Production Secret

`HASH_SECRET` is declared as a required Wrangler secret. Configure it with:

```sh
wrangler secret put HASH_SECRET --env production
```

Do not put `HASH_SECRET` in `vars`, logs, source code, D1, R2, or Workers Analytics Engine.
