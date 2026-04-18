#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, 'state');
const PUBLISH_QUEUE_FILE = path.join(STATE_DIR, 'publish_queue.json');

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }

function main() {
  const queue = readJson(PUBLISH_QUEUE_FILE, []);
  const ready = queue.filter((item) => item.status === 'approved');
  console.log(JSON.stringify({ ok: true, ready_count: ready.length, items: ready }, null, 2));
}

main();
