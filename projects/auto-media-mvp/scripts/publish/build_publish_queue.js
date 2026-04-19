#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');
const DRAFTS_DIR = path.join(ROOT, 'drafts');
const STATE_DIR = path.join(ROOT, 'state');
const PUBLISH_QUEUE_FILE = path.join(STATE_DIR, 'publish_queue.json');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }
function listEnrichedFiles() {
  if (!fs.existsSync(PROCESSED_DIR)) return [];
  return fs.readdirSync(PROCESSED_DIR).filter((name) => name.endsWith('-enriched.json')).sort().map((name) => path.join(PROCESSED_DIR, name));
}
function now() { return new Date().toISOString(); }

function buildDraftText(platform, entry) {
  if (platform === 'x') return entry?.outputs?.social?.x_post || '';
  if (platform === 'wordpress' || platform === 'note') {
    const article = entry?.outputs?.article;
    if (!article) return '';
    const sections = (article.sections || []).map((s) => `## ${s.heading}\n\n${s.body}`).join('\n\n');
    return `# ${article.title}\n\n${article.lead}\n\n${sections}\n\n${article.closing || ''}`.trim() + '\n';
  }
  return '';
}

function draftPath(platform, itemId) {
  if (platform === 'x') return path.join(DRAFTS_DIR, 'x', `${itemId}.txt`);
  return path.join(DRAFTS_DIR, platform, `${itemId}.md`);
}

function main() {
  ensureDir(STATE_DIR);
  ensureDir(path.join(DRAFTS_DIR, 'x'));
  ensureDir(path.join(DRAFTS_DIR, 'wordpress'));
  ensureDir(path.join(DRAFTS_DIR, 'note'));

  const queue = readJson(PUBLISH_QUEUE_FILE, []);
  const existing = new Set(queue.map((item) => `${item.item_id}:${item.platform}`));
  const added = [];

  for (const file of listEnrichedFiles()) {
    const entries = readJson(file, []);
    for (const entry of entries) {
      const platforms = [];
      if (entry?.outputs?.social?.x_post) platforms.push('x');
      if (entry?.outputs?.article?.title) {
        platforms.push('wordpress');
        platforms.push('note');
      }

      for (const platform of platforms) {
        const key = `${entry.id}:${platform}`;
        if (existing.has(key)) continue;

        const filePath = draftPath(platform, entry.id);
        const content = buildDraftText(platform, entry);
        fs.writeFileSync(filePath, content, 'utf8');

        const item = {
          item_id: entry.id,
          platform,
          status: 'pending_review',
          draft_file: path.relative(ROOT, filePath),
          created_at: now(),
          updated_at: now(),
          approved_at: null,
          published_at: null,
          external_post_id: null,
          error: null
        };

        queue.push(item);
        existing.add(key);
        added.push(key);
      }
    }
  }

  writeJson(PUBLISH_QUEUE_FILE, queue);
  console.log(JSON.stringify({ ok: true, added_count: added.length, added_items: added, queue_size: queue.length }, null, 2));
}

main();
