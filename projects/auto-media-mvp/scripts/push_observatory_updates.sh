#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_PREFIX="$(python3 - <<'PY'
import os
print(os.path.relpath(os.getcwd(), os.popen('git rev-parse --show-toplevel').read().strip()))
PY
)"

project_pathspecs() {
  local paths=(
    data/rankings
    site
    output/rankings
    README.md
    ROADMAP.md
    package.json
    scripts
    config
    .gitignore
  )

  local prefixed=()
  local p
  for p in "${paths[@]}"; do
    [[ -e "$p" ]] || continue

    if [[ "$PROJECT_PREFIX" == "." ]]; then
      prefixed+=(":(top)$p")
    else
      prefixed+=(":(top)$PROJECT_PREFIX/$p")
    fi
  done

  printf '%s\n' "${prefixed[@]}"
}

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

PROJECT_PATHS=()
while IFS= read -r path; do
  PROJECT_PATHS+=("$path")
done < <(project_pathspecs)

if [[ -n "$(git status --porcelain -- "${PROJECT_PATHS[@]}")" ]]; then
  git add -- "${PROJECT_PATHS[@]}" || true
  if [[ -n "$(git diff --cached --name-only -- "${PROJECT_PATHS[@]}")" ]]; then
    git commit -m "Refresh observatory outputs"
    git push origin main
    printf '[observatory-push] committed and pushed updates\n'

    if [[ "${OBSERVATORY_X_AUTOPUBLISH:-1}" != "0" ]]; then
      printf '[observatory-push] publishing observatory X update\n'
      ALLOW_PROSE_ROUTES=1 node scripts/publish/publish_observatory_x_update.js
    else
      printf '[observatory-push] observatory X update skipped (disabled)\n'
    fi
  else
    printf '[observatory-push] no commit after staged selection\n'
  fi
else
  printf '[observatory-push] no changes detected\n'
fi
