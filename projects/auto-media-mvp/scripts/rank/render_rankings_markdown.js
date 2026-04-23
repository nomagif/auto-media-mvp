#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RANKINGS_FILE = path.join(ROOT, 'data', 'rankings', 'latest.json');
const OUTPUT_DIR = path.join(ROOT, 'output', 'rankings');

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

function pageLinkForRow(row) {
  if (!row?.kind || !row?.label) return null;
  if (row.kind === 'topic') return `pages/topics/${slugify(row.label)}.md`;
  if (row.kind === 'company') return `pages/companies/${slugify(row.label)}.md`;
  if (row.kind === 'region') return `pages/regions/${slugify(row.label)}.md`;
  if (row.kind === 'category') return `pages/categories/${slugify(row.label)}.md`;
  return null;
}

function formatRow(row, index) {
  const delta = row.delta_vs_prev > 0 ? `+${row.delta_vs_prev}` : `${row.delta_vs_prev}`;
  const ratio = typeof row.delta_ratio === 'number' ? row.delta_ratio : 0;
  const links = (row.sample_urls || []).slice(0, 2).map((url) => `  - ${url}`).join('\n');
  const pageLink = pageLinkForRow(row);

  return [
    `### ${index + 1}. ${row.label}`,
    `- mentions: ${row.mention_count}`,
    `- sources: ${row.source_count}`,
    `- delta vs prev: ${delta}`,
    `- delta ratio: ${ratio}`,
    `- streak days: ${row.streak_days}`,
    row.region_mix?.length ? `- regions: ${row.region_mix.join(', ')}` : '',
    row.category_mix?.length ? `- categories: ${row.category_mix.join(', ')}` : '',
    pageLink ? `- details: ${pageLink}` : '',
    links ? `- sample links:\n${links}` : ''
  ].filter(Boolean).join('\n');
}

function renderSection(title, rows, limit = 10) {
  const selected = (rows || []).slice(0, limit);
  if (selected.length === 0) {
    return `## ${title}\n\n(no data)`;
  }

  return `## ${title}\n\n${selected.map((row, index) => formatRow(row, index)).join('\n\n')}`;
}

function pickRisingRows(rows, limit = 5) {
  return (rows || [])
    .filter((row) => (row.delta_vs_prev || 0) > 0)
    .sort((a, b) => (b.delta_vs_prev - a.delta_vs_prev) || (b.delta_ratio - a.delta_ratio) || (b.mention_count - a.mention_count))
    .slice(0, limit);
}

function renderRisingSection(title, rows, limit = 5) {
  const selected = pickRisingRows(rows, limit);
  if (selected.length === 0) {
    return `## ${title}\n\n(no rising items yet)`;
  }

  return `## ${title}\n\n${selected.map((row, index) => formatRow(row, index)).join('\n\n')}`;
}

function main() {
  ensureDir(OUTPUT_DIR);

  const rankings = readJson(RANKINGS_FILE, null);
  if (!rankings) {
    throw new Error('missing rankings file: data/rankings/latest.json');
  }

  const markdown = [
    '# Trend Rankings',
    '',
    `Generated at: ${rankings.generated_at}`,
    '',
    `Inputs: ${(rankings.inputs || []).join(', ')}`,
    '',
    renderSection('Top Topics', rankings.rankings?.topics, 10),
    '',
    renderRisingSection('Rising Topics', rankings.rankings?.topics, 5),
    '',
    renderSection('Top Companies', rankings.rankings?.companies, 10),
    '',
    renderRisingSection('Rising Companies', rankings.rankings?.companies, 5),
    '',
    renderSection('Top Regions', rankings.rankings?.regions, 10),
    '',
    renderSection('Top Categories', rankings.rankings?.categories, 10),
    '',
    renderRisingSection('Rising Categories', rankings.rankings?.categories, 5),
    ''
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, 'latest.md'), markdown, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    input_file: 'data/rankings/latest.json',
    output_file: 'output/rankings/latest.md'
  }, null, 2));
}

main();
