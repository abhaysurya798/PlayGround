#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

: "${CAPTURE_URL:?Set CAPTURE_URL to the page to capture.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to an output directory outside the source.}"

case "$CAPTURE_DIR" in
  /*) ;;
  *) CAPTURE_DIR="$PROJECT_DIR/$CAPTURE_DIR" ;;
esac

run() {
  local label="$1"
  shift
  printf '[timing] %s\n' "$label" >&2
  /usr/bin/time -p "$@"
}

run "create capture directory" mkdir -p "$CAPTURE_DIR"
run "capture desktop and mobile" node "$PROJECT_DIR/capture.mjs" "$CAPTURE_URL" "$CAPTURE_DIR"
run "verify capture output" node -e '
const fs = require("node:fs");
const path = require("node:path");
const dir = process.argv[1];
for (const name of ["final-desktop.png", "final-mobile.png"]) {
  const file = path.join(dir, name);
  const size = fs.statSync(file).size;
  if (size < 2000) throw new Error(`${name} looks blank (${size} bytes)`);
  console.log(`${name}: ${size} bytes`);
}
' "$CAPTURE_DIR"

printf 'Captured %s\n' "$CAPTURE_DIR"
