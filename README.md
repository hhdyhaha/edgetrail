# EdgeTrail Analytics

English | [中文](./README.zh-CN.md)

EdgeTrail Analytics is a privacy-first, self-hostable web analytics MVP built
for Cloudflare.

It is meant for indie tools, content sites, and small SaaS products that want
simple traffic analytics without cookie tracking, raw IP storage, or handing
their visitor data to a third-party analytics platform.

## What It Does

EdgeTrail gives you a small analytics stack that runs on Cloudflare:

- A web dashboard where you sign in with Google, create sites, manage allowed
  domains, copy the tracking script, and view analytics.
- A tiny browser tracker served from your own collector worker.
- A collector worker that validates incoming events, removes risky data, writes
  analytics rows, sends sanitized events to a queue, and maintains realtime
  presence through Durable Objects.
- A queue worker that updates daily D1 rollups and archives event batches to R2
  as NDJSON.
- Private dashboards for signed-in users and optional read-only public share
  links.

The dashboard currently shows online visitors, pageviews, approximate visitors, approximate
visits, views per visit, traffic over time, top pages, referrers, countries,
devices, browsers, operating systems, and UTM sources.

## Why Cloudflare

The project is designed around Cloudflare-native services:

- **Workers** run the web app, collector, and queue consumer.
- **D1** stores users, organizations, sites, share links, daily rollups, archive
  metadata, and processed queue event IDs.
- **Workers Analytics Engine** stores the queryable event stream for dashboard
  reports.
- **Durable Objects** keep hibernatable WebSocket connections for realtime
  online counts.
- **Queues** decouple event collection from rollup and archive work.
- **R2** stores sanitized event archives.

This keeps the runtime close to the edge, avoids a separate analytics server,
and makes the project easier to self-host inside one Cloudflare account.

## Privacy Model

EdgeTrail is privacy-first by design:

- No cookie-based visitor tracking.
- No raw IP storage.
- No full raw User-Agent storage.
- No cross-site visitor ID.
- Visitor and session IDs are HMAC hashes scoped to a site and short time
  windows.
- Page titles are hashed before they enter the event pipeline.
- The tracker strips URL hash fragments and keeps only UTM query parameters for
  analytics.
- The collector accepts events only from domains allowed for that site.

Analytics such as visitors and visits are approximate because they come from a
privacy-preserving event model and Workers Analytics Engine queries.

## Monorepo Layout

```txt
apps/
  web/                TanStack Start dashboard on Cloudflare Workers
  collector-worker/   Hono collector for /script.js, /collect, /presence, and /health
  queue-worker/       Cloudflare Queue consumer for D1 rollups and R2 archives

packages/
  analytics/          Workers Analytics Engine mapping, SQL, and query client
  db/                 Drizzle D1 schema, migrations, and repository helpers
  shared/             Zod schemas, constants, time helpers, and redaction
  tracker/            Zero-dependency browser tracking script
  ui/                 Shared React UI primitives
  config/             Shared TypeScript config
```

## How Data Flows

```txt
Visitor browser
  -> loads /script.js from collector-worker
  -> sends pageview or custom_event to /collect
  -> opens /presence as a hibernatable WebSocket
  -> collector validates site, origin, domain, and payload
  -> collector sanitizes and hashes sensitive values
  -> collector writes a datapoint to Workers Analytics Engine
  -> collector enqueues the sanitized event
  -> collector routes presence connections to a per-site Durable Object
  -> queue-worker deduplicates the event
  -> queue-worker updates D1 daily rollups
  -> queue-worker writes NDJSON archives to R2
  -> web dashboard queries Workers Analytics Engine server-side
  -> private dashboard observes realtime presence over WebSocket
```

## Requirements

- Node.js and pnpm
- A Cloudflare account
- Wrangler
- Cloudflare D1
- Cloudflare Workers Analytics Engine
- Cloudflare Queues
- Cloudflare R2
- Google OAuth credentials for the dashboard login

This repository uses public placeholder Cloudflare resource names in committed
`wrangler.jsonc` files. Real resource names, resource IDs, API tokens, OAuth
secrets, and local state must stay outside git.

## Configuration Boundary

Keep local/test and production configuration in separate layers:

| Layer | Files or storage | Purpose |
| --- | --- | --- |
| Committed templates | `wrangler.jsonc`, `.dev.vars.example` | Public binding shape, required secret names, localhost defaults, and placeholder production bindings. |
| Local runtime | `wrangler.local.jsonc`, `.dev.vars` | Ignored files for local or staging resources, localhost URLs, and local/test secrets. |
| Production runtime | `wrangler.production.local.jsonc` and Cloudflare Worker secrets | Ignored private production bindings, real resource IDs, production origins, OAuth credentials, and API tokens. |

For Google OAuth, use one OAuth client for local/test with:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Use a separate production OAuth client for the deployed dashboard origin and
callback. Do not copy production OAuth client secrets into local `.dev.vars`.

## Local Setup

Install dependencies:

```sh
pnpm install
```

Generate Cloudflare binding types:

```sh
pnpm cf-typegen
```

Create local Wrangler config files from the committed placeholders:

```sh
cp apps/web/wrangler.jsonc apps/web/wrangler.local.jsonc
cp apps/collector-worker/wrangler.jsonc apps/collector-worker/wrangler.local.jsonc
cp apps/queue-worker/wrangler.jsonc apps/queue-worker/wrangler.local.jsonc
```

Then replace the placeholder resource names and IDs in those ignored local
files with your own development or staging resources. Keep local names visibly
local, for example `edgetrail-local`, `edgetrail-events-local`, and
`edgetrail-archive-local`. For local realtime presence, keep the collector
`DASHBOARD_ORIGIN` pointed at the web dev origin, usually
`http://localhost:3000`.

Create local secrets from the examples:

```sh
cp apps/web/.dev.vars.example apps/web/.dev.vars
cp apps/collector-worker/.dev.vars.example apps/collector-worker/.dev.vars
```

Fill the web app secrets:

- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID` from the local/test OAuth client
- `GOOGLE_CLIENT_SECRET` from the local/test OAuth client
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `WAE_DATASET` for a local or staging Workers Analytics Engine dataset

Fill the collector secret:

- `HASH_SECRET`

Apply the D1 migration to your development database before creating sites:

```sh
pnpm --filter web exec wrangler d1 migrations apply <your-dev-d1-name> --local --config wrangler.local.jsonc
```

Run the local services in separate terminals:

```sh
pnpm dev:web:local
pnpm dev:collector:local
pnpm dev:queue:local
```

By default, the web app runs on `http://localhost:3000` and the collector uses
the local Wrangler port shown by Wrangler.

## Using the MVP

1. Sign in to the dashboard with Google.
2. Create a site with its primary domain.
3. Copy the generated tracking script from the site settings page.
4. Add the script to the target website.
5. Make sure the target website origin matches an allowed domain.
6. Open the target website and confirm the collector returns `204` for
   `/collect`.
7. View analytics in the private dashboard.
8. Optionally create a read-only public share link.

The generated script is scoped to the site's public site ID and sends pageviews
automatically. It also exposes `window.edgeTrail.track(label, metadata)` for
custom events.

## Quality Gates

Run the main checks from the repository root:

```sh
pnpm check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` runs Biome formatting and lint checks. `pnpm test` runs the
workspace test suites, including shared validation, tracker behavior, analytics
SQL, D1 repository helpers, collector behavior, queue processing, i18n, API
permissions, and dashboard view-model tests.

## Deployment Boundary

Production deployment is intentionally not automatic.

Before deploying your own copy, create real Cloudflare resources, replace the
placeholder production bindings in private deployment config, set Wrangler
secrets, apply production D1 migrations, and verify the full collector to
dashboard flow in your own account.

Create private production deployment configs from the committed examples:

```sh
cp apps/web/wrangler.production.example.jsonc apps/web/wrangler.production.local.jsonc
cp apps/collector-worker/wrangler.production.example.jsonc apps/collector-worker/wrangler.production.local.jsonc
cp apps/queue-worker/wrangler.production.example.jsonc apps/queue-worker/wrangler.production.local.jsonc
```

Fill only the ignored `wrangler.production.local.jsonc` files with real Worker
names, production origins, D1 IDs, Queue names, R2 bucket names, and Workers
Analytics Engine dataset names. Do not put secret values in those files; keep
secrets in Cloudflare Worker secrets.

Production secrets must be set on the production Worker environment, not in
local files. For example, run secret commands with `--env production` for the
production environment.

Once the private configs and secrets are ready, deploy from the repository root:

```sh
pnpm deploy:production
```

The deploy script refuses to run if any private production config still contains
obvious placeholder values such as `your-edgetrail`, `replace-with`, or
`example.com`.

Do not commit:

- `.dev.vars`
- `.env`
- `wrangler.local.jsonc`
- `wrangler.production.local.jsonc`
- Cloudflare API tokens
- Google OAuth secrets
- Better Auth secrets
- real production database IDs, queue names, bucket names, Workers Analytics
  Engine dataset names, or private operation notes

## License

MIT
