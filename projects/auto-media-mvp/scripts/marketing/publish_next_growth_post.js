#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const stateFile = path.join(ROOT, 'state', 'growth_x_7day_state.json');
const postsDir = path.join(ROOT, 'site', 'marketing', 'scheduled-x');

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return { next_index: 1, published: [] }; }
}
function writeState(state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
}
function run(command, args) {
  execFileSync(command, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
}

function getQueueItem(itemId) {
  const queueFile = path.join(ROOT, 'state', 'publish_queue.json');
  try {
    const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
    return Array.isArray(queue)
      ? queue.find((item) => item.item_id === itemId && item.platform === 'x')
      : null;
  } catch {
    return null;
  }
}

const state = readState();
const idx = Number(state.next_index || 1);
if (idx > 21) {
  console.log(JSON.stringify({ ok: true, status: 'complete', message: 'all 21 growth posts already published' }, null, 2));
  process.exit(0);
}

const id = `growth-7day-${String(idx).padStart(2, '0')}`;
const textFile = path.join(postsDir, `${id}.txt`);
if (!fs.existsSync(textFile)) throw new Error(`missing scheduled post file: ${textFile}`);

run('node', ['scripts/publish/enqueue_manual_x_post.js', '--item-id', id, '--text-file', textFile, '--approve', '--force']);
run('node', ['scripts/publish/run_publish_ready.js', '--item-id', id, '--platform', 'x']);

const queueItem = getQueueItem(id);
if (!queueItem || queueItem.status !== 'published' || !queueItem.external_post_id) {
  console.error(JSON.stringify({
    ok: false,
    item_id: id,
    status: queueItem ? queueItem.status : 'missing',
    error: queueItem ? (queueItem.error || queueItem.last_error || null) : null
  }, null, 2));
  process.exit(1);
}

state.published = Array.isArray(state.published) ? state.published : [];
state.published.push({ item_id: id, text_file: path.relative(ROOT, textFile), published_at: queueItem.published_at });
state.next_index = idx + 1;
writeState(state);
console.log(JSON.stringify({ ok: true, published: id, next_index: state.next_index }, null, 2));
