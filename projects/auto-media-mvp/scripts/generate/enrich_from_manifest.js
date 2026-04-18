#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');
const STATE_DIR = path.join(ROOT, 'state');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');
const ENRICHED_MANIFESTS_FILE = path.join(STATE_DIR, 'enriched_manifests.json');

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

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function listManifestFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('-draft-manifest.json'))
    .sort()
    .map((name) => path.join(dir, name));
}

function placeholderEnrichment(entry) {
  const slug = path.basename(entry.draft_file || '', '.md');
  const readable = slug.replace(/[-_]+/g, ' ').trim();

  return {
    ...entry,
    summary_ja: `${readable} の要点を日本語で要約するプレースホルダです。`,
    background_ja: '背景説明をここに入れる。Codex 連携時に元記事と周辺文脈から生成する。',
    why_it_matters_ja: 'なぜ重要かをここに入れる。読者にとっての意味を短くまとめる。',
    title_candidates: [
      `${readable} を読み解く`,
      `${readable} の重要ポイント`,
      `${readable} で何が起きたのか`
    ],
    x_post: `${readable} に関する速報メモ。要点・背景・重要性を短く整理して投稿文に落とし込む。`,
    image_prompt: `${readable}, tech news infographic, clean layout, minimal text, high contrast`
  };
}

function main() {
  ensureDir(PROCESSED_DIR);
  ensureDir(STATE_DIR);

  const lastRun = readJson(LAST_RUN_FILE, {});
  const enriched = readJson(ENRICHED_MANIFESTS_FILE, []);
  const enrichedSet = new Set(enriched);

  const files = listManifestFiles(PROCESSED_DIR);
  const targets = files.filter((file) => !enrichedSet.has(path.basename(file)));

  if (targets.length === 0) {
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      enrich_manifests: {
        ran_at: new Date().toISOString(),
        manifest_inputs: [],
        enriched_outputs: [],
        item_count: 0
      }
    });

    console.log(JSON.stringify({ ok: true, manifest_inputs: [], enriched_outputs: [], item_count: 0 }, null, 2));
    return;
  }

  const outputs = [];
  let itemCount = 0;

  for (const file of targets) {
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    const enrichedItems = manifest.map(placeholderEnrichment);
    const outName = path.basename(file).replace('-draft-manifest.json', '-enriched.json');
    fs.writeFileSync(path.join(PROCESSED_DIR, outName), JSON.stringify(enrichedItems, null, 2) + '\n', 'utf8');
    outputs.push(path.join('data', 'processed', outName));
    enrichedSet.add(path.basename(file));
    itemCount += enrichedItems.length;
  }

  writeJson(ENRICHED_MANIFESTS_FILE, [...enrichedSet]);
  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    enrich_manifests: {
      ran_at: new Date().toISOString(),
      manifest_inputs: targets.map((file) => path.relative(ROOT, file)),
      enriched_outputs: outputs,
      item_count: itemCount
    }
  });

  console.log(JSON.stringify({
    ok: true,
    manifest_inputs: targets.map((file) => path.relative(ROOT, file)),
    enriched_outputs: outputs,
    item_count: itemCount
  }, null, 2));
}

main();
