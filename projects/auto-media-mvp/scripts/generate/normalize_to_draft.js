#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const DRAFT_DIR = path.join(ROOT, 'drafts', 'markdown');
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');
const STATE_DIR = path.join(ROOT, 'state');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');
const PUBLISH_QUEUE_FILE = path.join(STATE_DIR, 'publish_queue.json');
const GENERATED_MANIFESTS_FILE = path.join(STATE_DIR, 'generated_manifests.json');

function listJsonFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(dir, name));
}

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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function buildDraft(item) {
  return `# ${item.title}\n\n- Source: ${item.source_name}\n- URL: ${item.source_url}\n- Published: ${item.published_at || 'unknown'}\n- Collected: ${item.collected_at}\n\n## Raw summary\n${item.body || '(empty)'}\n\n## Notes\n- TODO: summarize prompt を通す\n- TODO: title candidates を追加\n- TODO: X投稿文を追加\n`;
}

function main() {
  ensureDir(DRAFT_DIR);
  ensureDir(PROCESSED_DIR);
  ensureDir(STATE_DIR);

  const lastRun = readJson(LAST_RUN_FILE, {});
  const queue = readJson(PUBLISH_QUEUE_FILE, []);
  const generatedManifests = readJson(GENERATED_MANIFESTS_FILE, []);
  const queueById = new Map(queue.map((item) => [item.id, item]));
  const processedSet = new Set(generatedManifests);

  const files = listJsonFiles(NORMALIZED_DIR);
  const targets = files.filter((file) => !processedSet.has(path.basename(file)));
  if (targets.length === 0) {
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      generate_drafts: {
        ran_at: new Date().toISOString(),
        normalized_inputs: [],
        processed_manifests: [],
        draft_count: 0
      }
    });

    console.log(JSON.stringify({ ok: true, normalized_inputs: [], drafts: 0, publish_queue_size: queue.length }, null, 2));
    return;
  }

  const processedManifestFiles = [];
  let draftCount = 0;

  for (const file of targets) {
    const items = JSON.parse(fs.readFileSync(file, 'utf8'));
    const selected = items.slice(0, 3);
    const manifest = [];

    for (const item of selected) {
      const name = `${item.id}-${slugify(item.title)}.md`;
      const draftPath = path.join(DRAFT_DIR, name);
      fs.writeFileSync(draftPath, buildDraft(item), 'utf8');

      const entry = {
        id: item.id,
        source_url: item.source_url,
        draft_file: path.join('drafts', 'markdown', name),
        review_status: 'draft',
        publish_status: 'pending'
      };

      manifest.push(entry);
      queueById.set(item.id, entry);
      draftCount += 1;
    }

    const outName = path.basename(file).replace('-normalized.json', '-draft-manifest.json');
    fs.writeFileSync(path.join(PROCESSED_DIR, outName), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    processedManifestFiles.push(path.join('data', 'processed', outName));
    processedSet.add(path.basename(file));
  }

  writeJson(PUBLISH_QUEUE_FILE, [...queueById.values()]);
  writeJson(GENERATED_MANIFESTS_FILE, [...processedSet]);
  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    generate_drafts: {
      ran_at: new Date().toISOString(),
      normalized_inputs: targets.map((file) => path.relative(ROOT, file)),
      processed_manifests: processedManifestFiles,
      draft_count: draftCount
    }
  });

  console.log(JSON.stringify({
    ok: true,
    normalized_inputs: targets.map((file) => path.relative(ROOT, file)),
    drafts: draftCount,
    publish_queue_size: [...queueById.values()].length
  }, null, 2));
}

main();
