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

function entitySlug(row) {
  return String(row?.key || row?.label || '')
    .replace(/^[^:]+:/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function entityUrl(row) {
  const kind = String(row?.kind || '').toLowerCase();
  const slug = entitySlug(row);
  if (!kind || !slug) return SITE_URL;
  const group = kind === 'category' ? 'categories' : kind === 'company' ? 'companies' : `${kind}s`;
  return `${SITE_URL}/pages/${group}/${slug}.html`;
}

function sampleUrl() {
  return `${SITE_URL}/samples/weekly-json-sample.json`;
}

function hashtags(rows = []) {
  const base = ['#AI', '#TechNews', '#MarketSignals'];
  const labels = rows.map((row) => String(row?.label || '').toLowerCase()).join(' ');
  if (/openai|anthropic|claude|chatgpt|sora|ai/.test(labels)) base.push('#AITrends');
  if (/market|macro|rates|inflation|jobs/.test(labels)) base.push('#Macro');
  if (/crypto|bitcoin|ethereum|solana|xrp|bnb/.test(labels)) base.push('#Crypto');
  if (/security|policy|regulation/.test(labels)) base.push('#CyberSecurity');
  return [...new Set(base)].slice(0, 3).join(' ');
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
    ({ risingTopic, risingCompany }) => [
      risingTopic ? `One thing stood out in today’s AI/macro scan: ${risingTopic.label} is picking up.` : `Fresh AI / macro ranking scan is live.`,
      risingTopic ? `${formatDelta(risingTopic)} mentions vs the last refresh; ${risingCompany?.label || 'company momentum'} is worth a second look too.` : null,
      risingTopic ? entityUrl(risingTopic) : SITE_URL,
      hashtags([risingTopic, risingCompany])
    ],
    ({ newEntry, risingCompany }) => [
      newEntry ? `Small signal, but worth tracking: ${newEntry.label} just showed up with ${newEntry.mention_count} mentions.` : `${risingCompany?.label || 'AI / macro'} is moving in today’s rankings.`,
      risingCompany ? `${risingCompany.label} also moved ${formatDelta(risingCompany)} vs the previous run.` : null,
      entityUrl(newEntry || risingCompany),
      hashtags([newEntry, risingCompany])
    ],
    ({ risingCategory, longestTopic }) => [
      risingCategory ? `The interesting part of today’s scan: ${risingCategory.label} momentum is up ${formatRatio(risingCategory)}.` : `Overseas news momentum board updated.`,
      longestTopic ? `${longestTopic.label} is still hanging around — ${longestTopic.streak_days} days now.` : null,
      risingCategory ? entityUrl(risingCategory) : SITE_URL,
      hashtags([risingCategory, longestTopic])
    ],
    ({ risingTopic, risingCompany }) => [
      risingTopic ? `Not calling it a full trend yet, but ${risingTopic.label} is the clearest signal in today’s refresh.` : `Today’s AI / macro signal board is live.`,
      risingTopic ? `${formatDelta(risingTopic)} mentions / ${formatRatio(risingTopic)} growth.` : null,
      risingCompany ? `Related company move: ${risingCompany.label} ${formatDelta(risingCompany)}.` : null,
      entityUrl(risingTopic || risingCompany),
      hashtags([risingTopic, risingCompany])
    ],
    ({ longestTopic, newEntry }) => [
      longestTopic ? `I keep seeing ${longestTopic.label} in the scan — the streak is now ${longestTopic.streak_days} days.` : `Trend board refreshed.`,
      newEntry ? `New thing to watch: ${newEntry.label}.` : `Full sample data is here: ${sampleUrl()}`,
      entityUrl(longestTopic || newEntry),
      hashtags([longestTopic, newEntry])
    ],
    ({ counts, risingCompany }) => [
      `Today’s scan covered ${counts.items || '?'} overseas news items. The useful bit is not the volume — it’s what moved.`,
      risingCompany ? `${risingCompany.label} was the biggest company move at ${formatDelta(risingCompany)}.` : null,
      `${SITE_URL}/latest.html`,
      hashtags([risingCompany])
    ],
    ({ risingTopic }) => [
      risingTopic ? `If you only inspect one AI/macro signal today, I’d start with ${risingTopic.label}.` : `AI / macro trend rankings updated.`,
      risingTopic ? `${risingTopic.mention_count} mentions, ${formatDelta(risingTopic)} vs previous.` : null,
      entityUrl(risingTopic),
      `Sample data: ${sampleUrl()}`,
      hashtags([risingTopic])
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
