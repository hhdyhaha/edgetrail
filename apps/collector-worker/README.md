# EdgeTrail Analytics Collector Worker

Hono Worker responsible for `/script.js`, `/collect`, and `/health`. It validates site/domain config from D1, writes sanitized datapoints to Workers Analytics Engine, and enqueues sanitized messages for rollup/archive processing.

## Local Development

1. Copy `.dev.vars.example` to `.dev.vars` and set a local `HASH_SECRET`.
2. Apply the shared D1 migration before testing site lookups.
3. Run the worker:

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
wrangler secret put HASH_SECRET
```

Do not put `HASH_SECRET` in `vars`, logs, source code, D1, R2, or Workers Analytics Engine.
