#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INPUT_FILE = path.join(ROOT, 'data', 'rankings', 'latest.json');
const OUTPUT_DIR = path.join(ROOT, 'premium', 'weekly');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeText(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value, 'utf8');
}

function isoDate(input = new Date()) {
  return new Date(input).toISOString().slice(0, 10);
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value) ? value.join('|') : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','));
  return [header, ...lines].join('\n') + '\n';
}

function buildRows(rows) {
  return (rows || []).map((row) => ({
    key: row.key,
    kind: row.kind,
    label: row.label,
    window: row.window,
    mention_count: row.mention_count,
    source_count: row.source_count,
    region_mix: row.region_mix || [],
    category_mix: row.category_mix || [],
    delta_vs_prev: row.delta_vs_prev,
    delta_ratio: row.delta_ratio,
    streak_days: row.streak_days,
    sample_item_ids: row.sample_item_ids || [],
    sample_urls: row.sample_urls || [],
    updated_at: row.updated_at
  }));
}

function main() {
  const rankings = readJson(INPUT_FILE);
  const generatedAt = rankings.generated_at || new Date().toISOString();
  const date = isoDate(generatedAt);
  const baseColumns = [
    'key',
    'kind',
    'label',
    'window',
    'mention_count',
    'source_count',
    'region_mix',
    'category_mix',
    'delta_vs_prev',
    'delta_ratio',
    'streak_days',
    'sample_item_ids',
    'sample_urls',
    'updated_at'
  ];

  ensureDir(OUTPUT_DIR);

  const datasets = [
    ['topics', rankings.rankings?.topics || []],
    ['companies', rankings.rankings?.companies || []],
    ['regions', rankings.rankings?.regions || []],
    ['categories', rankings.rankings?.categories || []]
  ];

  const outputFiles = [];

  for (const [name, rows] of datasets) {
    const csv = toCsv(buildRows(rows), baseColumns);
    const datedFile = path.join(OUTPUT_DIR, `${date}-${name}.csv`);
    const latestFile = path.join(OUTPUT_DIR, `latest-${name}.csv`);
    writeText(datedFile, csv);
    writeText(latestFile, csv);
    outputFiles.push(path.relative(ROOT, datedFile), path.relative(ROOT, latestFile));
  }

  const metadata = {
    product: 'weekly-csv-pack',
    version: 'v1',
    generated_at: generatedAt,
    files: outputFiles
  };
  const metadataFile = path.join(OUTPUT_DIR, `${date}-csv-pack-metadata.json`);
  const latestMetadataFile = path.join(OUTPUT_DIR, 'latest-csv-pack-metadata.json');
  writeText(metadataFile, JSON.stringify(metadata, null, 2) + '\n');
  writeText(latestMetadataFile, JSON.stringify(metadata, null, 2) + '\n');
  outputFiles.push(path.relative(ROOT, metadataFile), path.relative(ROOT, latestMetadataFile));

  console.log(JSON.stringify({
    ok: true,
    input_file: 'data/rankings/latest.json',
    output_files: outputFiles,
    product: metadata.product,
    version: metadata.version
  }, null, 2));
}

main();
