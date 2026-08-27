#!/usr/bin/env bash
# Copy the canonical web app files from the repo root into the iOS app bundle
# (ComfyUIMobile/Web). Run this whenever index.html / style.css / app.js / the
# manifest / sw.js / icons change, so the native wrapper ships the latest UI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$(dirname "$0")/ComfyUIMobile/Web"

mkdir -p "$DEST"
cp "$ROOT/index.html" "$ROOT/style.css" "$ROOT/app.js" "$ROOT/manifest.webmanifest" "$ROOT/sw.js" "$DEST/"
rm -rf "$DEST/icons"
cp -R "$ROOT/icons" "$DEST/icons"

echo "Synced web assets into $DEST"
