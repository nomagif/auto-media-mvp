#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { buildArticleInput, buildArticleRequest } = require('./lib_article');

const ROOT = path.resolve(__dirname, '..', '..');
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');
const REQUESTS_DIR = path.join(PROCESSED_DIR, 'requests');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function listEnrichedFiles() {
  if (!fs.existsSync(PROCESSED_DIR)) return [];
  return fs.readdirSync(PROCESSED_DIR)
    .filter((name) => name.endsWith('-enriched.json'))
    .sort()
    .map((name) => path.join(PROCESSED_DIR, name));
}

function main() {
  ensureDir(REQUESTS_DIR);
  const outputs = [];

  for (const file of listEnrichedFiles()) {
    const entries = readJson(file, []);
    for (const entry of entries) {
      const summary = entry?.outputs?.summary;
      if (!summary?.summary_ja) continue;

      const input = buildArticleInput({
        id: entry.id,
        source_name: entry.source_name,
        source_type: entry.source_type,
        source_url: entry.source_url,
        title_original: entry.input?.normalized?.title || '',
        summary_ja: summary.summary_ja,
        background_ja: summary.background_ja,
        why_it_matters_ja: summary.why_it_matters_ja
      });

      const request = buildArticleRequest(input);
      const outName = `${entry.id}-article-request.json`;
      fs.writeFileSync(path.join(REQUESTS_DIR, outName), JSON.stringify(request, null, 2) + '\n', 'utf8');
      outputs.push(path.join('data', 'processed', 'requests', outName));
    }
  }

  console.log(JSON.stringify({ ok: true, request_count: outputs.length, outputs }, null, 2));
}

main();
