#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

should_publish_premium() {
  local mode="${PREMIUM_PUBLISH_ENABLED:-auto}"

  if [[ "$mode" == "0" || "$mode" == "false" || "$mode" == "off" ]]; then
    return 1
  fi

  if [[ "$mode" == "1" || "$mode" == "true" || "$mode" == "on" ]]; then
    return 0
  fi

  [[ -n "${R2_ACCOUNT_ID:-}" ]] \
    && [[ -n "${R2_BUCKET:-}" ]] \
    && [[ -n "${R2_ACCESS_KEY_ID:-}" ]] \
    && [[ -n "${R2_SECRET_ACCESS_KEY:-}" ]]
}

if should_publish_premium; then
  printf '[observatory-push] premium publish enabled\n'
  npm run premium:publish
else
  printf '[observatory-push] premium publish skipped (disabled or R2 env missing)\n'
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
