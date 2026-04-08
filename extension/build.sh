#!/bin/bash
set -e

OUT_DIR="dist"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/icons" "$OUT_DIR/popup"

# Bundle TypeScript files
npx esbuild src/background.ts --bundle --outfile="$OUT_DIR/background.js" --format=esm --target=es2020
npx esbuild src/content.ts --bundle --outfile="$OUT_DIR/content.js" --format=iife --target=es2020
npx esbuild src/popup/popup.ts --bundle --outfile="$OUT_DIR/popup/popup.js" --format=iife --target=es2020

# Copy static files
cp manifest.json "$OUT_DIR/"
cp src/popup/popup.html "$OUT_DIR/popup/"
cp src/popup/popup.css "$OUT_DIR/popup/"
cp src/widget/widget.css "$OUT_DIR/"
cp icons/* "$OUT_DIR/icons/" 2>/dev/null || true

echo "Extension built to $OUT_DIR/"
