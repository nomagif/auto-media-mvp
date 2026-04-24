#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INPUT_FILE = path.join(ROOT, 'data', 'rankings', 'latest.json');
const OUTPUT_DIR = path.join(ROOT, 'premium', 'full-dataset');

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function writeCollection(dirName, rows, date, manifestFiles) {
  const dir = path.join(OUTPUT_DIR, dirName);
  ensureDir(dir);

  for (const row of rows || []) {
    const fileName = `${slugify(row.label)}.json`;
    const datedFile = path.join(dir, date, fileName);
    const latestFile = path.join(dir, 'latest', fileName);
    writeJson(datedFile, row);
    writeJson(latestFile, row);
    manifestFiles.push(path.relative(ROOT, datedFile), path.relative(ROOT, latestFile));
  }
}

function main() {
  const rankings = readJson(INPUT_FILE);
  const generatedAt = rankings.generated_at || new Date().toISOString();
  const date = isoDate(generatedAt);
  const manifestFiles = [];

  const fullSnapshot = {
    product: 'full-ranking-dataset-pack',
    version: 'v1',
    generated_at: generatedAt,
    source_types: rankings.source_types || [],
    counts: rankings.counts || {},
    rankings: rankings.rankings || {}
  };

  ensureDir(OUTPUT_DIR);
  const datedSnapshot = path.join(OUTPUT_DIR, `${date}-full-ranking-dataset.json`);
  const latestSnapshot = path.join(OUTPUT_DIR, 'latest.json');
  writeJson(datedSnapshot, fullSnapshot);
  writeJson(latestSnapshot, fullSnapshot);
  manifestFiles.push(path.relative(ROOT, datedSnapshot), path.relative(ROOT, latestSnapshot));

  writeCollection('topics', rankings.rankings?.topics || [], date, manifestFiles);
  writeCollection('companies', rankings.rankings?.companies || [], date, manifestFiles);
  writeCollection('regions', rankings.rankings?.regions || [], date, manifestFiles);
  writeCollection('categories', rankings.rankings?.categories || [], date, manifestFiles);

  const manifest = {
    product: 'full-ranking-dataset-pack',
    version: 'v1',
    generated_at: generatedAt,
    files: manifestFiles,
    counts: rankings.counts || {}
  };
  const datedManifest = path.join(OUTPUT_DIR, `${date}-manifest.json`);
  const latestManifest = path.join(OUTPUT_DIR, 'latest-manifest.json');
  writeJson(datedManifest, manifest);
  writeJson(latestManifest, manifest);
  manifestFiles.push(path.relative(ROOT, datedManifest), path.relative(ROOT, latestManifest));

  console.log(JSON.stringify({
    ok: true,
    product: manifest.product,
    version: manifest.version,
    generated_at: generatedAt,
    output_count: manifestFiles.length,
    output_files: [
      path.relative(ROOT, datedSnapshot),
      path.relative(ROOT, latestSnapshot),
      path.relative(ROOT, datedManifest),
      path.relative(ROOT, latestManifest)
    ]
  }, null, 2));
}

main();
