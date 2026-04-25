#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, 'state');
const QUEUE_FILE = path.join(STATE_DIR, 'summary_queue.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');

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

function parseArgs(argv) {
  const args = { itemIds: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--item-id' && argv[i + 1]) {
      args.itemIds.push(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--items-file' && argv[i + 1]) {
      const items = readJson(path.resolve(argv[i + 1]), []);
      if (Array.isArray(items)) args.itemIds.push(...items.filter(Boolean));
      i += 1;
    }
  }
  return args;
}

function now() {
  return new Date().toISOString();
}

function listEnrichedFiles() {
  return fs.readdirSync(PROCESSED_DIR)
    .filter((name) => name.endsWith('-enriched.json'))
    .sort()
    .map((name) => path.join(PROCESSED_DIR, name));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetIds = new Set(args.itemIds);
  const queue = readJson(QUEUE_FILE, []);
  const lastRun = readJson(LAST_RUN_FILE, {});
  const targets = queue.filter((item) => item.status === 'success' && !item.applied_at && item.response_file && (targetIds.size === 0 || targetIds.has(item.item_id)));

  if (targets.length === 0) {
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      apply_summary_response: {
        ran_at: now(),
        applied_count: 0,
        applied_items: []
      }
    });

    console.log(JSON.stringify({ ok: true, applied_count: 0, applied_items: [] }, null, 2));
    return;
  }

  const enrichedFiles = listEnrichedFiles();
  const applied = [];

  for (const target of targets) {
    const response = readJson(path.join(ROOT, target.response_file), null);
    if (!response?.ok) continue;

    for (const file of enrichedFiles) {
      const entries = readJson(file, []);
      let touched = false;

      for (const entry of entries) {
        if (entry.id !== target.item_id) continue;
        entry.outputs = entry.outputs || {};
        entry.outputs.summary = {
          ...response.summary,
          meta: {
            prompt_version: response.version,
            model: response.model,
            generated_at: response.generated_at,
            raw_response: response.meta?.raw_response ?? null,
            status: response.meta?.status ?? 'success',
            response_file: target.response_file
          }
        };
        touched = true;
      }

      if (touched) {
        fs.writeFileSync(file, JSON.stringify(entries, null, 2) + '\n', 'utf8');
      }
    }

    target.applied_at = now();
    target.updated_at = now();
    applied.push(target.item_id);
  }

  writeJson(QUEUE_FILE, queue);
  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    apply_summary_response: {
      ran_at: now(),
      applied_count: applied.length,
      applied_items: applied
    }
  });

  console.log(JSON.stringify({ ok: true, applied_count: applied.length, applied_items: applied }, null, 2));
}

main();
