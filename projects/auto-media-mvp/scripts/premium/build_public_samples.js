#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PREMIUM_WEEKLY_DIR = path.join(ROOT, 'premium', 'weekly');
const SITE_SAMPLES_DIR = path.join(ROOT, 'site', 'samples');
const SITE_MARKETING_DIR = path.join(ROOT, 'site', 'marketing');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }

function buildCsvSample(csvText, keepRows = 5) {
  const lines = String(csvText || '').trim().split(/\r?\n/);
  if (lines.length <= 1) return csvText;
  return lines.slice(0, Math.min(lines.length, keepRows + 1)).join('\n') + '\n';
}

function buildJsonSample(payload) {
  const topics = Array.isArray(payload?.rankings?.topics) ? payload.rankings.topics.slice(0, 5) : [];
  const companies = Array.isArray(payload?.rankings?.companies) ? payload.rankings.companies.slice(0, 5) : [];
  const regions = Array.isArray(payload?.rankings?.regions) ? payload.rankings.regions.slice(0, 4) : [];
  const categories = Array.isArray(payload?.rankings?.categories) ? payload.rankings.categories.slice(0, 5) : [];

  return {
    sample: true,
    note: 'Public sample of the premium weekly snapshot. Full product includes complete rankings and fresh licensed downloads.',
    generated_at: payload.generated_at,
    window: payload.window,
    source_types: payload.source_types,
    counts: payload.counts,
    rankings: {
      topics,
      companies,
      regions,
      categories
    }
  };
}

function buildMarketingCopy(sampleJson) {
  const topTopics = (sampleJson.rankings.topics || []).slice(0, 3).map((item) => `${item.label} (${item.mention_count})`).join(', ');
  return [
    '# X post ideas',
    '',
    '## Post 1',
    '',
    `AI / tech / macro の週次トレンドを、読む用じゃなくて “再利用できるCSV/JSON” にした。今週サンプルで見えている上位 topic は ${topTopics}。`,
    '',
    'データをそのまま watchlist / dashboard / weekly memo に流し込みたい人向け。',
    '',
    'Sample: https://auto-media-mvp.pages.dev/samples/weekly-json-sample.json',
    'Premium: https://auto-media-mvp.pages.dev/premium',
    '',
    '## Post 2',
    '',
    '毎週ニュースを読むより、何がどれだけ増えたかだけ欲しい人向けに AI / tech observatory の CSV/JSON を出してます。',
    '',
    '- topics',
    '- companies',
    '- regions',
    '- categories',
    '',
    '無料サンプルあり:',
    'https://auto-media-mvp.pages.dev/samples/weekly-topics-sample.csv',
    '',
    '## One-line positioning',
    '',
    'AI / tech / macro の話題量を、毎週すぐ使えるCSV/JSONで受け取れる observatory data pack。',
    ''
  ].join('\n');
}

function main() {
  ensureDir(SITE_SAMPLES_DIR);
  ensureDir(SITE_MARKETING_DIR);

  const latestCsvFile = path.join(PREMIUM_WEEKLY_DIR, 'latest-topics.csv');
  const latestJsonFile = path.join(PREMIUM_WEEKLY_DIR, 'latest.json');

  const csvText = fs.readFileSync(latestCsvFile, 'utf8');
  const jsonPayload = readJson(latestJsonFile);

  const csvSample = buildCsvSample(csvText, 5);
  const jsonSample = buildJsonSample(jsonPayload);
  const marketingCopy = buildMarketingCopy(jsonSample);

  const csvOut = path.join(SITE_SAMPLES_DIR, 'weekly-topics-sample.csv');
  const jsonOut = path.join(SITE_SAMPLES_DIR, 'weekly-json-sample.json');
  const marketingOut = path.join(SITE_MARKETING_DIR, 'x-post-ideas.md');

  fs.writeFileSync(csvOut, csvSample, 'utf8');
  writeJson(jsonOut, jsonSample);
  fs.writeFileSync(marketingOut, marketingCopy, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    sample_files: [
      path.relative(ROOT, csvOut),
      path.relative(ROOT, jsonOut),
      path.relative(ROOT, marketingOut)
    ],
    top_topics: (jsonSample.rankings.topics || []).map((item) => item.label)
  }, null, 2));
}

main();
