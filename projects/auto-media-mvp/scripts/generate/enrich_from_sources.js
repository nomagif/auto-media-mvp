#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const DRAFT_DIR = path.join(ROOT, 'drafts', 'markdown');
const STATE_DIR = path.join(ROOT, 'state');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');
const ENRICHED_MANIFESTS_FILE = path.join(STATE_DIR, 'enriched_manifests.json');
const { buildSummaryInput, generateSummary } = require('./lib_summary');

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

function loadNormalizedIndex() {
  const files = fs.readdirSync(NORMALIZED_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(NORMALIZED_DIR, name));

  const map = new Map();
  for (const file of files) {
    const items = readJson(file, []);
    for (const item of items) {
      map.set(item.id, item);
    }
  }
  return map;
}

function readDraft(entry) {
  if (!entry.draft_file) return '';
  const file = path.join(ROOT, entry.draft_file);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function buildInputBundle(entry, normalized, draft) {
  return {
    id: entry.id,
    source_url: entry.source_url,
    review_status: entry.review_status,
    publish_status: entry.publish_status,
    normalized: normalized || null,
    draft_markdown: draft || ''
  };
}

async function buildEnrichedEntry(bundle) {
  const title = bundle.normalized?.title || bundle.id;
  const body = bundle.normalized?.body || '';
  const bodyShort = body.slice(0, 280);
  const summaryInput = buildSummaryInput(bundle);
  const summary = await generateSummary(summaryInput);

  return {
    id: bundle.id,
    source_url: bundle.source_url,
    source_name: bundle.normalized?.source_name || null,
    source_type: bundle.normalized?.source_type || null,
    input: bundle,
    outputs: {
      summary,
      titles: {
        title_candidates: [
          `${title} を3分で把握`,
          `${title} の重要ポイント`,
          `${title} から見える変化`
        ]
      },
      social: {
        x_post: `${title} を日本語で短く整理した投稿文のプレースホルダ。`,
        hashtags: []
      },
      article: {
        lead: `${title} についてのリード文プレースホルダ。`,
        sections: [
          { heading: '何が起きたか', body: bodyShort || '本文要約をここに入れる。' },
          { heading: '背景', body: '背景説明をここに入れる。' },
          { heading: 'なぜ重要か', body: '重要性をここに入れる。' }
        ]
      },
      image: {
        image_prompt: `${title}, tech editorial illustration, clean infographic, minimal text, modern UI`
      }
    },
    model_plan: {
      target_model: 'GPT',
      prompt_files: {
        summarize: 'prompts/summarize.md',
        article: 'prompts/article.md',
        x_post: 'prompts/x_post.md',
        image_prompt: 'prompts/image_prompt.md'
      },
      status: 'placeholder-summary-adapter'
    }
  };
}

async function main() {
  ensureDir(PROCESSED_DIR);
  ensureDir(STATE_DIR);

  const lastRun = readJson(LAST_RUN_FILE, {});
  const enriched = readJson(ENRICHED_MANIFESTS_FILE, []);
  const enrichedSet = new Set(enriched);
  const normalizedIndex = loadNormalizedIndex();

  const files = listManifestFiles(PROCESSED_DIR);
  const targets = files.filter((file) => !enrichedSet.has(path.basename(file)));

  if (targets.length === 0) {
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      enrich_sources: {
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
    const manifest = readJson(file, []);
    const enrichedItems = [];
    for (const entry of manifest) {
      const normalized = normalizedIndex.get(entry.id) || null;
      const draft = readDraft(entry);
      const bundle = buildInputBundle(entry, normalized, draft);
      enrichedItems.push(await buildEnrichedEntry(bundle));
    }

    const outName = path.basename(file).replace('-draft-manifest.json', '-enriched.json');
    fs.writeFileSync(path.join(PROCESSED_DIR, outName), JSON.stringify(enrichedItems, null, 2) + '\n', 'utf8');
    outputs.push(path.join('data', 'processed', outName));
    enrichedSet.add(path.basename(file));
    itemCount += enrichedItems.length;
  }

  writeJson(ENRICHED_MANIFESTS_FILE, [...enrichedSet]);
  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    enrich_sources: {
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

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
