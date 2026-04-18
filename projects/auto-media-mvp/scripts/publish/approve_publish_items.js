#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, 'state');
const PUBLISH_QUEUE_FILE = path.join(STATE_DIR, 'publish_queue.json');

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }
function now() { return new Date().toISOString(); }

function parseArgs(argv) {
  const args = { itemId: null, platform: null, all: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--item-id' && argv[i + 1]) { args.itemId = argv[i + 1]; i += 1; }
    else if (argv[i] === '--platform' && argv[i + 1]) { args.platform = argv[i + 1]; i += 1; }
    else if (argv[i] === '--all-pending') { args.all = true; }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const queue = readJson(PUBLISH_QUEUE_FILE, []);
  const approved = [];

  for (const item of queue) {
    const matchesAll = args.all && item.status === 'pending_review';
    const matchesOne = item.status === 'pending_review' && (!args.itemId || item.item_id === args.itemId) && (!args.platform || item.platform === args.platform);

    if (!matchesAll && !matchesOne) continue;

    item.status = 'approved';
    item.updated_at = now();
    item.approved_at = now();
    approved.push(`${item.item_id}:${item.platform}`);
  }

  writeJson(PUBLISH_QUEUE_FILE, queue);
  console.log(JSON.stringify({ ok: true, approved_count: approved.length, approved_items: approved }, null, 2));
}

main();
