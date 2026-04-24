#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  git add data/rankings premium site output/rankings README.md ROADMAP.md package.json scripts || true
  if [[ -n "$(git status --porcelain)" ]]; then
    git commit -m "Refresh observatory outputs"
    git push origin main
    printf '[observatory-push] committed and pushed updates\n'
  else
    printf '[observatory-push] no commit after staged selection\n'
  fi
else
  printf '[observatory-push] no changes detected\n'
fi
