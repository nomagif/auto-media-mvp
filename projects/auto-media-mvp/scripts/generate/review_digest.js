#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'output', 'daily');
const STATE_DIR = path.join(ROOT, 'state');
const PUBLISH_QUEUE_FILE = path.join(STATE_DIR, 'publish_queue.json');
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

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function buildDigest(items) {
  const lines = [];
  lines.push('# Review Digest');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Pending items: ${items.length}`);
  lines.push('');

  if (items.length === 0) {
    lines.push('- pending の項目はありません');
    return lines.join('\n') + '\n';
  }

  items.forEach((item, index) => {
    lines.push(`## ${index + 1}. ${item.id}`);
    lines.push(`- Draft: ${item.draft_file}`);
    lines.push(`- URL: ${item.source_url || '(none)'}`);
    lines.push(`- Review status: ${item.review_status}`);
    lines.push(`- Publish status: ${item.publish_status}`);
    lines.push('');
  });

  return lines.join('\n') + '\n';
}

function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(STATE_DIR);

  const queue = readJson(PUBLISH_QUEUE_FILE, []);
  const lastRun = readJson(LAST_RUN_FILE, {});
  const pending = queue.filter((item) => item.publish_status === 'pending').slice(0, 10);

  const fileName = `${nowStamp()}-review-digest.md`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(filePath, buildDigest(pending), 'utf8');

  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    review_digest: {
      ran_at: new Date().toISOString(),
      output_file: path.join('output', 'daily', fileName),
      pending_count: pending.length
    }
  });

  console.log(JSON.stringify({
    ok: true,
    output_file: path.join('output', 'daily', fileName),
    pending_count: pending.length
  }, null, 2));
}

main();
