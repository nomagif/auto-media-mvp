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

function pickRows(rows = [], predicate, sorter) {
  return (rows || []).filter(predicate).sort(sorter);
}

function formatDelta(row) {
  const delta = Number(row?.delta_vs_prev || 0);
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function formatRatio(row) {
  const ratio = Number(row?.delta_ratio || 0);
  return `${Math.round(ratio * 100)}%`;
}

function isNewEntry(row) {
  return Number(row?.streak_days || 0) <= 1 || (Number(row?.delta_ratio || 0) >= 1 && Number(row?.delta_vs_prev || 0) === Number(row?.mention_count || 0));
}

function buildLeadSignals(rankings) {
  const topics = (rankings.rankings || {}).topics || [];
  const companies = (rankings.rankings || {}).companies || [];
  const categories = (rankings.rankings || {}).categories || [];

  const risingTopic = pickRows(topics, (row) => row.key !== 'topic:general' && Number(row.delta_vs_prev || 0) > 0,
    (a, b) => Number(b.delta_vs_prev || 0) - Number(a.delta_vs_prev || 0) || Number(b.delta_ratio || 0) - Number(a.delta_ratio || 0) || Number(b.mention_count || 0) - Number(a.mention_count || 0))[0];

  const longestTopic = pickRows(topics, (row) => row.key !== 'topic:general' && Number(row.streak_days || 0) > 0,
    (a, b) => Number(b.streak_days || 0) - Number(a.streak_days || 0) || Number(b.mention_count || 0) - Number(a.mention_count || 0))[0];

  const newEntry = [
    ...pickRows(topics, (row) => row.key !== 'topic:general' && isNewEntry(row),
      (a, b) => Number(b.mention_count || 0) - Number(a.mention_count || 0) || Number(b.delta_vs_prev || 0) - Number(a.delta_vs_prev || 0)),
    ...pickRows(companies, (row) => isNewEntry(row),
      (a, b) => Number(b.mention_count || 0) - Number(a.mention_count || 0) || Number(b.delta_vs_prev || 0) - Number(a.delta_vs_prev || 0)),
    ...pickRows(categories, (row) => isNewEntry(row),
      (a, b) => Number(b.mention_count || 0) - Number(a.mention_count || 0) || Number(b.delta_vs_prev || 0) - Number(a.delta_vs_prev || 0))
  ][0];

  const risingCompany = pickRows(companies, (row) => Number(row.delta_vs_prev || 0) > 0,
    (a, b) => Number(b.delta_vs_prev || 0) - Number(a.delta_vs_prev || 0) || Number(b.delta_ratio || 0) - Number(a.delta_ratio || 0))[0];

  const risingCategory = pickRows(categories, (row) => Number(row.delta_vs_prev || 0) > 0,
    (a, b) => Number(b.delta_ratio || 0) - Number(a.delta_ratio || 0) || Number(b.delta_vs_prev || 0) - Number(a.delta_vs_prev || 0))[0];

  return { risingTopic, longestTopic, newEntry, risingCompany, risingCategory };
}

function buildSummary(rankings) {
  const counts = rankings.counts || {};
  const { risingTopic, longestTopic, newEntry, risingCompany, risingCategory } = buildLeadSignals(rankings);
  const templates = [
    ({ counts, risingTopic, longestTopic }) => [
      risingTopic ? `${risingTopic.label} jumped ${formatDelta(risingTopic)} mentions (${formatRatio(risingTopic)}) in the latest observatory refresh.` : `Observatory refreshed: ${counts.items || '?'} ranked items across ${counts.topics || '?'} topics.`,
      longestTopic ? `${longestTopic.label} is on a ${longestTopic.streak_days}-day streak.` : null,
      '',
      SITE_URL
    ],
    ({ counts, newEntry, risingCompany }) => [
      newEntry
        ? `New entry signal: ${newEntry.label} entered with ${newEntry.mention_count} mentions in this refresh.`
        : risingCompany
          ? `${risingCompany.label} rose ${formatDelta(risingCompany)} mentions (${formatRatio(risingCompany)}).`
          : `Fresh observatory update is live.`,
      risingCompany && !newEntry ? `${counts.items || '?'} items / ${counts.companies || '?'} companies / ${counts.regions || '?'} regions tracked.` : risingCompany ? `${risingCompany.label} rose ${formatDelta(risingCompany)} mentions (${formatRatio(risingCompany)}).` : `${counts.items || '?'} items / ${counts.companies || '?'} companies / ${counts.regions || '?'} regions tracked.`,
      '',
      SITE_URL
    ],
    ({ counts, risingCategory, longestTopic }) => [
      `Updated the overseas news rankings and trend view.`,
      risingCategory ? `${risingCategory.label} led category momentum at ${formatRatio(risingCategory)} growth.` : null,
      longestTopic ? `${longestTopic.label} kept its streak alive for ${longestTopic.streak_days} days.` : `${counts.items || '?'} ranked items in the latest refresh.`,
      '',
      SITE_URL
    ]
  ];

  const generatedAt = rankings.generated_at || new Date().toISOString();
  const variant = new Date(generatedAt).getUTCHours() % templates.length;
  return templates[variant]({ counts, risingTopic, longestTopic, newEntry, risingCompany, risingCategory }).filter(Boolean).join('\n');
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
