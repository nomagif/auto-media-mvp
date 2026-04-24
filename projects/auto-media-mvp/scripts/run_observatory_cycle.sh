#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log() {
  printf '[observatory] %s\n' "$*"
}

run_collect() {
  log "collect: techcrunch"
  npm run collect:techcrunch
  log "collect: hackernews"
  npm run collect:hackernews
  log "collect: fed"
  npm run collect:fed
  log "collect: openai"
  npm run collect:openai
  log "collect: anthropic"
  npm run collect:anthropic
  log "collect: bls"
  npm run collect:bls
  log "collect: coingecko"
  npm run collect:coingecko
}

main() {
  log "start cycle"
  run_collect
  log "rank:generate"
  npm run rank:generate
  log "site:build"
  npm run site:build
  log "cycle complete"
}

main "$@"
