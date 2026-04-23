#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RANKINGS_FILE = path.join(ROOT, 'data', 'rankings', 'latest.json');
const OUTPUT_DIR = path.join(ROOT, 'output', 'rankings', 'pages');

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isSensitiveRow(row) {
  const label = String(row?.label || '').toLowerCase();
  const key = String(row?.key || '').toLowerCase();
  const categories = (row?.category_mix || []).map((value) => String(value).toLowerCase());
  const sensitiveTerms = ['policy', 'regulation', 'security-incident', 'surveillance', 'war', 'conflict', 'defense', 'military'];
  return sensitiveTerms.some((term) => label.includes(term) || key.includes(term) || categories.includes(term));
}

function renderPage(row) {
  const delta = row.delta_vs_prev > 0 ? `+${row.delta_vs_prev}` : `${row.delta_vs_prev}`;
  const links = (row.sample_urls || []).map((url) => `- ${url}`).join('\n');
  const itemIds = (row.sample_item_ids || []).map((id) => `- ${id}`).join('\n');
  const sensitive = isSensitiveRow(row);

  return [
    `# ${row.label}`,
    '',
    `- key: ${row.key}`,
    `- kind: ${row.kind}`,
    `- mentions: ${row.mention_count}`,
    `- sources: ${row.source_count}`,
    `- delta vs prev: ${delta}`,
    `- delta ratio: ${row.delta_ratio}`,
    `- streak days: ${row.streak_days}`,
    row.region_mix?.length ? `- regions: ${row.region_mix.join(', ')}` : '',
    row.category_mix?.length ? `- categories: ${row.category_mix.join(', ')}` : '',
    sensitive ? '- public note: sensitive policy / conflict-adjacent row; keep interpretation minimal and metrics-first' : '',
    '',
    '## Sample item IDs',
    '',
    itemIds || '(none)',
    '',
    '## Sample links',
    '',
    links || '(none)',
    ''
  ].filter(Boolean).join('\n');
}

function writePages(rows, subdir) {
  const dir = path.join(OUTPUT_DIR, subdir);
  ensureDir(dir);

  for (const row of rows || []) {
    const file = path.join(dir, `${slugify(row.label)}.md`);
    fs.writeFileSync(file, renderPage(row), 'utf8');
  }

  return dir;
}

function main() {
  ensureDir(OUTPUT_DIR);

  const rankings = readJson(RANKINGS_FILE, null);
  if (!rankings) {
    throw new Error('missing rankings file: data/rankings/latest.json');
  }

  writePages(rankings.rankings?.topics || [], 'topics');
  writePages(rankings.rankings?.companies || [], 'companies');
  writePages(rankings.rankings?.regions || [], 'regions');
  writePages(rankings.rankings?.categories || [], 'categories');

  console.log(JSON.stringify({
    ok: true,
    input_file: 'data/rankings/latest.json',
    output_dir: 'output/rankings/pages',
    topic_pages: (rankings.rankings?.topics || []).length,
    company_pages: (rankings.rankings?.companies || []).length,
    region_pages: (rankings.rankings?.regions || []).length,
    category_pages: (rankings.rankings?.categories || []).length
  }, null, 2));
}

main();
