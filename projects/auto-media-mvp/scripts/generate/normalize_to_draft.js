#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const DRAFT_DIR = path.join(ROOT, 'drafts', 'markdown');
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');

function latestJsonFile(dir) {
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  return files.length ? path.join(dir, files[files.length - 1]) : null;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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

  const latest = latestJsonFile(NORMALIZED_DIR);
  if (!latest) {
    throw new Error('No normalized JSON found. Run collect script first.');
  }

  const items = JSON.parse(fs.readFileSync(latest, 'utf8'));
  const selected = items.slice(0, 3);
  const manifest = [];

  for (const item of selected) {
    const name = `${item.id}-${slugify(item.title)}.md`;
    const draftPath = path.join(DRAFT_DIR, name);
    fs.writeFileSync(draftPath, buildDraft(item), 'utf8');

    manifest.push({
      id: item.id,
      source_url: item.source_url,
      draft_file: path.join('drafts', 'markdown', name),
      review_status: 'draft',
      publish_status: 'pending'
    });
  }

  const outName = path.basename(latest).replace('-normalized.json', '-draft-manifest.json');
  fs.writeFileSync(path.join(PROCESSED_DIR, outName), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({ ok: true, normalized_input: latest, drafts: manifest.length }, null, 2));
}

main();
