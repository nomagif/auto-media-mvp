#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REQUESTS_DIR = path.join(ROOT, 'data', 'processed', 'requests');
const STATE_DIR = path.join(ROOT, 'state');
const QUEUE_FILE = path.join(STATE_DIR, 'summary_queue.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');

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

function listRequestFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('-summary-request.json'))
    .sort()
    .map((name) => path.join(dir, name));
}

function now() {
  return new Date().toISOString();
}

function main() {
  ensureDir(STATE_DIR);

  const queue = readJson(QUEUE_FILE, []);
  const lastRun = readJson(LAST_RUN_FILE, {});
  const existingIds = new Set(queue.map((item) => item.item_id));
  const requestFiles = listRequestFiles(REQUESTS_DIR);
  const added = [];

  for (const file of requestFiles) {
    const request = readJson(file, null);
    const itemId = request?.item?.id;
    if (!itemId || existingIds.has(itemId)) continue;

    const entry = {
      request_file: path.relative(ROOT, file),
      item_id: itemId,
      status: 'pending',
      created_at: now(),
      updated_at: now(),
      attempts: 0,
      last_error: null,
      response_file: null,
      applied_at: null
    };

    queue.push(entry);
    existingIds.add(itemId);
    added.push(entry.item_id);
  }

  writeJson(QUEUE_FILE, queue);
  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    enqueue_summary_requests: {
      ran_at: now(),
      added_count: added.length,
      added_items: added
    }
  });

  console.log(JSON.stringify({
    ok: true,
    queue_file: path.relative(ROOT, QUEUE_FILE),
    added_count: added.length,
    added_items: added,
    queue_size: queue.length
  }, null, 2));
}

main();
