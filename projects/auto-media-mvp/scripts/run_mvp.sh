#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[1/4] Collect: TechCrunch"
npm run collect:techcrunch

echo "[2/4] Collect: Hacker News"
npm run collect:hackernews

echo "[3/5] Generate drafts"
npm run generate:drafts

echo "[4/6] Enrich manifests"
npm run generate:enrich

echo "[5/8] Enqueue summary requests"
npm run summary:enqueue

echo "[6/8] Run summary worker"
npm run summary:worker

echo "[7/8] Apply summary responses"
npm run summary:apply

echo "[8/8] Generate review digest"
npm run generate:review-digest

echo "Done. Check data/, drafts/, output/, and state/."
