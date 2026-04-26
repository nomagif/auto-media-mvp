#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const RANKINGS_FILE = path.join(ROOT, 'data', 'rankings', 'latest.json');
const SITE_URL = process.env.OBSERVATORY_SITE_URL || 'https://auto-media-mvp.pages.dev';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function formatGeneratedDay(iso) {
  return String(iso || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
}

function buildSummary(rankings) {
  const counts = rankings.counts || {};
  const topics = ((rankings.rankings || {}).topics || []).slice(0, 3).map((topic) => topic.label).filter(Boolean);
  const templates = [
    ({ counts, topics }) => [
      `Observatory refreshed: ${counts.items || '?'} ranked items across ${counts.topics || '?'} topics.`,
      topics.length ? `Top topics now: ${topics.join(', ')}.` : null,
      '',
      SITE_URL
    ],
    ({ counts, topics }) => [
      `Fresh observatory update is live.`,
      `${counts.items || '?'} items / ${counts.companies || '?'} companies / ${counts.regions || '?'} regions tracked.`,
      topics.length ? `Watching: ${topics.join(', ')}.` : null,
      '',
      SITE_URL
    ],
    ({ counts, topics }) => [
      `Updated the overseas news rankings and trend view.`,
      topics.length ? `Current leaders: ${topics.join(', ')}.` : null,
      `${counts.items || '?'} ranked items in the latest refresh.`,
      '',
      SITE_URL
    ]
  ];

  const generatedAt = rankings.generated_at || new Date().toISOString();
  const variant = new Date(generatedAt).getUTCHours() % templates.length;
  return templates[variant]({ counts, topics }).filter(Boolean).join('\n');
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ALLOW_PROSE_ROUTES: '1' }
  });
}

function main() {
  const rankings = readJson(RANKINGS_FILE);
  const itemId = `observatory-refresh-x-${formatGeneratedDay(rankings.generated_at)}`;
  const text = buildSummary(rankings);

  run('node', [
    path.join(ROOT, 'scripts', 'publish', 'enqueue_manual_x_post.js'),
    '--item-id', itemId,
    '--text', text,
    '--approve',
    '--force'
  ]);

  run('node', [
    path.join(ROOT, 'scripts', 'publish', 'run_publish_ready.js'),
    '--item-id', itemId,
    '--platform', 'x'
  ]);
}

main();
