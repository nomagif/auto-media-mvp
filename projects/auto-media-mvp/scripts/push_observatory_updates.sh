#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${PREMIUM_PUBLISH_ENABLED:-0}" == "1" ]]; then
  npm run premium:publish
fi

if [[ -n "$(git status --porcelain)" ]]; then
  git add data/rankings site output/rankings README.md ROADMAP.md package.json scripts functions config *.md .gitignore || true
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
