#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { ROOT, loadPublishQueue, savePublishQueue, now } = require('./lib_publish_queue');

const DRAFTS_DIR = path.join(ROOT, 'drafts', 'x');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs(argv) {
  const args = {
    itemId: null,
    text: null,
    textFile: null,
    sourceUrl: null,
    approve: false,
    force: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--item-id' && argv[i + 1]) {
      args.itemId = argv[i + 1];
      i += 1;
    } else if (arg === '--text' && argv[i + 1]) {
      args.text = argv[i + 1];
      i += 1;
    } else if (arg === '--text-file' && argv[i + 1]) {
      args.textFile = argv[i + 1];
      i += 1;
    } else if (arg === '--source-url' && argv[i + 1]) {
      args.sourceUrl = argv[i + 1];
      i += 1;
    } else if (arg === '--approve') {
      args.approve = true;
    } else if (arg === '--force') {
      args.force = true;
    }
  }

  return args;
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function loadText(args) {
  if (args.textFile) {
    return normalizeText(fs.readFileSync(path.resolve(args.textFile), 'utf8'));
  }
  return normalizeText(args.text);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.itemId) throw new Error('--item-id is required');
  const text = loadText(args);
  if (!text) throw new Error('post text is required (--text or --text-file)');
  if (text.length > 280) throw new Error(`x post exceeds 280 chars (${text.length})`);

  ensureDir(DRAFTS_DIR);
  const queue = loadPublishQueue();
  const existing = queue.find((item) => item.item_id === args.itemId && item.platform === 'x');
  if (existing && !args.force) {
    throw new Error(`queue item already exists: ${args.itemId}:x (use --force to overwrite)`);
  }

  const draftPath = path.join(DRAFTS_DIR, `${args.itemId}.txt`);
  fs.writeFileSync(draftPath, `${text}\n`, 'utf8');

  const timestamp = now();
  const status = args.approve ? 'approved' : 'pending_review';
  const item = {
    item_id: args.itemId,
    platform: 'x',
    status,
    draft_file: path.relative(ROOT, draftPath),
    created_at: existing?.created_at || timestamp,
    updated_at: timestamp,
    approved_at: args.approve ? timestamp : null,
    published_at: null,
    external_post_id: null,
    error: null,
    source_url: args.sourceUrl || undefined
  };

  if (existing) {
    const index = queue.findIndex((entry) => entry.item_id === args.itemId && entry.platform === 'x');
    queue[index] = item;
  } else {
    queue.push(item);
  }

  savePublishQueue(queue);
  console.log(JSON.stringify({
    ok: true,
    item_id: item.item_id,
    platform: item.platform,
    status: item.status,
    draft_file: item.draft_file,
    text_length: text.length,
    source_url: item.source_url || null
  }, null, 2));
}

main();
