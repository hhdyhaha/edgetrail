#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

WEB_CONFIG="$ROOT_DIR/apps/web/wrangler.production.local.jsonc"
COLLECTOR_CONFIG="$ROOT_DIR/apps/collector-worker/wrangler.production.local.jsonc"
QUEUE_CONFIG="$ROOT_DIR/apps/queue-worker/wrangler.production.local.jsonc"

require_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "Missing private deployment config: $file" >&2
    echo "Copy the matching wrangler.production.example.jsonc to wrangler.production.local.jsonc and fill private values." >&2
    exit 1
  fi
}

reject_placeholders() {
  local file="$1"
  if grep -Eq 'your-edgetrail|replace-with|00000000-0000-0000-0000-000000000001|example\.com' "$file"; then
    echo "Refusing to deploy with placeholder values in: $file" >&2
    exit 1
  fi
}

require_file "$WEB_CONFIG"
require_file "$COLLECTOR_CONFIG"
require_file "$QUEUE_CONFIG"

reject_placeholders "$WEB_CONFIG"
reject_placeholders "$COLLECTOR_CONFIG"
reject_placeholders "$QUEUE_CONFIG"

echo "Deploying collector worker..."
(cd "$ROOT_DIR/apps/collector-worker" && pnpm exec wrangler deploy --config wrangler.production.local.jsonc --minify)

echo "Building web worker with private production bindings..."
(cd "$ROOT_DIR/apps/web" && CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH=./wrangler.production.local.jsonc pnpm run build)

echo "Deploying web worker..."
(cd "$ROOT_DIR/apps/web" && pnpm exec wrangler deploy --config dist/server/wrangler.json)

echo "Deploying queue worker..."
(cd "$ROOT_DIR/apps/queue-worker" && pnpm exec wrangler deploy --config wrangler.production.local.jsonc)

echo "Production deployment complete."
