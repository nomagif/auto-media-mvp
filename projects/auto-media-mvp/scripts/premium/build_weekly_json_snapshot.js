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

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function isoDate(input = new Date()) {
  return new Date(input).toISOString().slice(0, 10);
}

function weekLabel(dateInput = new Date()) {
  const date = new Date(dateInput);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function buildWindow(generatedAt) {
  const end = new Date(generatedAt || new Date().toISOString());
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  return {
    kind: 'weekly',
    label: weekLabel(end),
    from: start.toISOString(),
    to: end.toISOString()
  };
}

function main() {
  const rankings = readJson(INPUT_FILE);
  const generatedAt = rankings.generated_at || new Date().toISOString();
  const weeklySnapshot = {
    product: 'weekly-json-snapshot',
    version: 'v1',
    generated_at: generatedAt,
    window: buildWindow(generatedAt),
    source_types: rankings.source_types || [],
    counts: rankings.counts || {},
    rankings: {
      topics: rankings.rankings?.topics || [],
      companies: rankings.rankings?.companies || [],
      regions: rankings.rankings?.regions || [],
      categories: rankings.rankings?.categories || []
    },
    notes: {
      sensitive_rows_included: true,
      public_ui_deemphasis_applied: false,
      intended_use: ['analysis', 'internal dashboards', 'automation']
    }
  };

  ensureDir(OUTPUT_DIR);
  const datedFile = path.join(OUTPUT_DIR, `${isoDate(generatedAt)}-weekly-snapshot.json`);
  const latestFile = path.join(OUTPUT_DIR, 'latest.json');

  writeJson(datedFile, weeklySnapshot);
  writeJson(latestFile, weeklySnapshot);

  console.log(JSON.stringify({
    ok: true,
    input_file: 'data/rankings/latest.json',
    output_files: [
      path.relative(ROOT, datedFile),
      path.relative(ROOT, latestFile)
    ],
    product: weeklySnapshot.product,
    version: weeklySnapshot.version,
    window: weeklySnapshot.window
  }, null, 2));
}

main();
