#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WEEKLY_DIR = path.join(ROOT, 'premium', 'weekly');
const OUTPUT_DIR = path.join(ROOT, 'premium', 'archive', '30-day');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function isoDate(input = new Date()) {
  return new Date(input).toISOString().slice(0, 10);
}

function listSnapshotFiles() {
  if (!fs.existsSync(WEEKLY_DIR)) return [];
  return fs.readdirSync(WEEKLY_DIR)
    .filter((name) => /^\d{4}-\d{2}-\d{2}-weekly-snapshot\.json$/.test(name))
    .map((name) => path.join(WEEKLY_DIR, name))
    .sort();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isWithinLast30Days(dateString, now = new Date()) {
  const target = new Date(dateString);
  const diffMs = now.getTime() - target.getTime();
  const diffDays = diffMs / 86400000;
  return diffDays >= 0 && diffDays <= 30;
}

function main() {
  const snapshotFiles = listSnapshotFiles();
  const snapshots = snapshotFiles
    .map((file) => ({ file, data: readJson(file) }))
    .filter(({ data }) => isWithinLast30Days(data.generated_at || new Date().toISOString()));

  const manifest = {
    product: '30-day-archive-pack',
    version: 'v1',
    generated_at: new Date().toISOString(),
    window: {
      kind: '30-day',
      from: new Date(Date.now() - (29 * 86400000)).toISOString().slice(0, 10),
      to: isoDate()
    },
    snapshot_count: snapshots.length,
    snapshots: snapshots.map(({ file, data }) => ({
      generated_at: data.generated_at,
      window: data.window,
      source_file: path.relative(ROOT, file),
      counts: data.counts,
      source_types: data.source_types
    })),
    notes: {
      bundle_format: 'manifest-only-v1',
      intended_next_step: 'attach referenced weekly snapshots as downloadable bundle',
      sensitive_rows_included: true
    }
  };

  ensureDir(OUTPUT_DIR);
  const datedFile = path.join(OUTPUT_DIR, `${isoDate()}-manifest.json`);
  const latestFile = path.join(OUTPUT_DIR, 'latest-manifest.json');
  writeJson(datedFile, manifest);
  writeJson(latestFile, manifest);

  console.log(JSON.stringify({
    ok: true,
    product: manifest.product,
    version: manifest.version,
    snapshot_count: manifest.snapshot_count,
    output_files: [
      path.relative(ROOT, datedFile),
      path.relative(ROOT, latestFile)
    ]
  }, null, 2));
}

main();
