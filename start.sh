#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "PORT must be a number, got: $PORT" >&2; exit 1; }

META_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
DIST_DIR="$PROJECT_DIR/dist"

run() {
  local label="$1"
  shift
  printf '[timing] %s\n' "$label" >&2
  /usr/bin/time -p "$@"
}

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    run "install dependencies" npm ci --no-audit --no-fund
  else
    run "install dependencies" npm install --no-audit --no-fund
  fi

  has_build="$(run "detect build script" node -e 'const p=require(process.argv[1]);process.stdout.write(p.scripts&&p.scripts.build?"yes":"no")' "$PROJECT_DIR/package.json")"
  if [[ "$has_build" == "yes" ]]; then
    run "build project" npm run build
  fi
fi

if [[ -f "$PROJECT_DIR/site/index.html" ]]; then
  run "clean build output" rm -rf "$DIST_DIR"
  run "create build output" mkdir -p "$DIST_DIR"
  run "copy static source" cp -R "$PROJECT_DIR/site/." "$DIST_DIR/"
  SERVE_DIR="$DIST_DIR"
elif [[ -f "$DIST_DIR/index.html" ]]; then
  SERVE_DIR="$DIST_DIR"
elif [[ -f "$PROJECT_DIR/index.html" ]]; then
  SERVE_DIR="$PROJECT_DIR"
else
  echo "No site/index.html, dist/index.html, or index.html found in $PROJECT_DIR" >&2
  exit 1
fi

run "create metadata directory" mkdir -p "$META_DIR"
run "write deployment metadata" node -e '
const fs = require("node:fs");
const [file, project, directory] = process.argv.slice(1);
fs.writeFileSync(file, JSON.stringify({ project, directory }));
console.log(`Deployment output: ${directory}`);
' "$META_DIR/deployment-output.json" "$PROJECT_DIR" "$SERVE_DIR"

printf 'Project: %s\nServing: %s\nPort: %s\n' "$PROJECT_DIR" "$SERVE_DIR" "$PORT"
run "serve static site" node "$PROJECT_DIR/server.mjs" "$SERVE_DIR" "$PORT"
