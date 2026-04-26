#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { buildModelPlan } = require('./lib_model_routing');
const { runModelPlanTask } = require('./lib_worker_runtime');
const { normalizeSummaryResponse, buildSummaryErrorResponse } = require('./lib_summary_response');
const { loadPublishQueue, savePublishQueue, findQueueItem } = require('../publish/lib_publish_queue');

const ROOT = path.resolve(__dirname, '..', '..');
const RANKINGS_FILE = path.join(ROOT, 'data', 'rankings', 'latest.json');
const OUTPUT_DIR = path.join(ROOT, 'output', 'weekly', 'cluster-briefs');
const OUTPUT_LATEST_FILE = path.join(ROOT, 'output', 'weekly', 'cluster-briefs-latest.json');
const DRAFTS_DIR = path.join(ROOT, 'drafts');
const STATE_DIR = path.join(ROOT, 'state');
const STATE_FILE = path.join(STATE_DIR, 'cluster_brief_state.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }
function now() { return new Date().toISOString(); }

function parseArgs(argv) {
  const args = { force: false, publish: true, limit: null, templateOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--no-publish') args.publish = false;
    else if (argv[i] === '--template-only') args.templateOnly = true;
    else if (argv[i] === '--limit' && argv[i + 1]) { args.limit = Number(argv[i + 1]); i += 1; }
  }
  return args;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function slugify(input) {
  return String(input || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'cluster';
}

function clusterScore(item) {
  return (item.mention_count || 0) * 100 + (item.delta_vs_prev || 0) * 10 + (item.source_count || 0) * 5 + (item.streak_days || 0);
}

function selectClusters(rankings, limit) {
  const topics = Array.isArray(rankings?.rankings?.topics) ? rankings.rankings.topics : [];
  const filtered = topics
    .filter((item) => item && item.key !== 'topic:general')
    .sort((a, b) => clusterScore(b) - clusterScore(a));
  const effectiveLimit = Number.isFinite(limit) && limit > 0 ? limit : Number(process.env.CLUSTER_BRIEF_LIMIT || '3');
  return filtered.slice(0, effectiveLimit);
}

function buildFingerprint(cluster, rankingsGeneratedAt) {
  return stableHash({
    rankings_generated_at: rankingsGeneratedAt,
    key: cluster.key,
    mention_count: cluster.mention_count,
    source_count: cluster.source_count,
    delta_vs_prev: cluster.delta_vs_prev,
    delta_ratio: cluster.delta_ratio,
    streak_days: cluster.streak_days,
    sample_item_ids: cluster.sample_item_ids,
    sample_urls: cluster.sample_urls,
    category_mix: cluster.category_mix,
    region_mix: cluster.region_mix
  });
}

function isDue(state, force) {
  if (force) return true;
  const minHours = Number(process.env.CLUSTER_BRIEF_MIN_INTERVAL_HOURS || '24');
  const lastRunAt = state?.last_run_at ? Date.parse(state.last_run_at) : NaN;
  if (!Number.isFinite(lastRunAt)) return true;
  return (Date.now() - lastRunAt) >= minHours * 60 * 60 * 1000;
}

function buildClusterRequest(cluster) {
  const item = {
    id: cluster.key,
    title: `Cluster brief: ${cluster.label}`,
    body: [
      `mention_count=${cluster.mention_count}`,
      `source_count=${cluster.source_count}`,
      `delta_vs_prev=${cluster.delta_vs_prev}`,
      `delta_ratio=${cluster.delta_ratio}`,
      `streak_days=${cluster.streak_days}`,
      `region_mix=${(cluster.region_mix || []).join(',')}`,
      `category_mix=${(cluster.category_mix || []).join(',')}`,
      `sample_urls=${(cluster.sample_urls || []).join('\n')}`
    ].join('\n'),
    source_url: cluster.sample_urls?.[0] || null,
    cluster
  };

  return {
    job_type: 'cluster_summary_generation',
    version: 'v0.1',
    requested_at: now(),
    prompt_file: 'prompts/cluster_summary.md',
    item,
    target_model: buildModelPlan('summary').primary_model,
    model_plan: buildModelPlan('summary')
  };
}

function buildTemplateSummary(cluster) {
  const trend = cluster.delta_vs_prev > 0 ? '増加' : cluster.delta_vs_prev < 0 ? '減少' : '横ばい';
  return {
    ok: true,
    version: 'v0.1',
    item_id: cluster.key,
    model: 'template-fallback',
    generated_at: now(),
    summary: {
      summary_ja: `${cluster.label} は ${cluster.mention_count} 件の言及を集め、前回比は ${cluster.delta_vs_prev} 件で ${trend} でした。主な観測元は ${cluster.source_count} ソースです。`,
      background_ja: `主な地域は ${(cluster.region_mix || []).join(' / ') || 'n/a'}、カテゴリは ${(cluster.category_mix || []).slice(0, 4).join(' / ') || 'n/a'} です。`,
      why_it_matters_ja: `継続日数は ${cluster.streak_days || 0} 日で、観測面では ${cluster.label} が引き続き追跡対象であることを示します。`
    },
    meta: {
      prompt_file: 'prompts/cluster_summary.md',
      raw_response: null,
      status: 'template-fallback',
      fallback_used: true
    }
  };
}

function renderMarkdown(brief) {
  const c = brief.cluster;
  const s = brief.summary.summary;
  const lines = [
    `# ${c.label} cluster brief`,
    '',
    `- Generated: ${brief.summary.generated_at}`,
    `- Mention count: ${c.mention_count}`,
    `- Delta vs previous: ${c.delta_vs_prev}`,
    `- Source count: ${c.source_count}`,
    `- Streak days: ${c.streak_days}`,
    '',
    '## Summary',
    '',
    s.summary_ja,
    '',
    '## Background',
    '',
    s.background_ja,
    '',
    '## Why it matters',
    '',
    s.why_it_matters_ja,
    '',
    '## Sample URLs',
    ''
  ];
  for (const url of c.sample_urls || []) lines.push(`- ${url}`);
  lines.push('');
  return lines.join('\n');
}

function buildXPostText(brief) {
  const cluster = brief.cluster;
  const summary = brief.summary?.summary?.summary_ja || '';
  const delta = Number(cluster.delta_vs_prev || 0);
  const deltaLabel = delta > 0 ? `Δ+${delta}` : delta < 0 ? `Δ${delta}` : 'Δ0';
  const windowLabel = brief.windowLabel || 'weekly';
  const sampleUrl = 'https://auto-media-mvp.pages.dev/premium';
  const variants = [
    `${cluster.label}: ${summary} ${deltaLabel} / ${cluster.source_count} sources / ${windowLabel}. ${sampleUrl}`,
    `${windowLabel} observatory: ${cluster.label} は ${cluster.mention_count} mentions、${cluster.source_count} sources。${deltaLabel}。 ${sampleUrl}`,
    `${cluster.label} cluster update — ${cluster.mention_count} mentions, ${cluster.source_count} sources, ${deltaLabel}. ${sampleUrl}`
  ];
  const variantIndex = parseInt(brief.fingerprint.slice(0, 2), 16) % variants.length;
  return variants[variantIndex].replace(/\s+/g, ' ').trim().slice(0, 278);
}

function writeBriefArtifacts(brief) {
  ensureDir(OUTPUT_DIR);
  ensureDir(path.join(DRAFTS_DIR, 'markdown'));
  ensureDir(path.join(DRAFTS_DIR, 'x'));
  ensureDir(path.join(DRAFTS_DIR, 'wordpress'));
  ensureDir(path.join(DRAFTS_DIR, 'note'));

  const slug = brief.slug;
  const markdown = renderMarkdown(brief);
  const markdownRel = path.join('output', 'weekly', 'cluster-briefs', `${slug}.md`);
  const xRel = path.join('drafts', 'x', `${slug}.txt`);
  const wpRel = path.join('drafts', 'wordpress', `${slug}.md`);
  const noteRel = path.join('drafts', 'note', `${slug}.md`);

  fs.writeFileSync(path.join(ROOT, markdownRel), markdown, 'utf8');
  fs.writeFileSync(path.join(ROOT, wpRel), markdown, 'utf8');
  fs.writeFileSync(path.join(ROOT, noteRel), markdown, 'utf8');
  const xText = buildXPostText(brief);
  fs.writeFileSync(path.join(ROOT, xRel), xText, 'utf8');

  return { markdownRel, xRel, wpRel, noteRel };
}

function queuePublishItems(brief, draftFiles, queue) {
  const created = [];
  const platforms = ['x', 'wordpress', 'note'];
  for (const platform of platforms) {
    const itemId = `${brief.slug}-${platform}`;
    const draftFile = platform === 'x' ? draftFiles.xRel : platform === 'wordpress' ? draftFiles.wpRel : draftFiles.noteRel;
    const existing = findQueueItem(queue, itemId, platform);
    const payload = {
      item_id: itemId,
      platform,
      status: 'approved',
      draft_file: draftFile,
      source_url: brief.cluster.sample_urls?.[0] || null,
      created_at: now(),
      updated_at: now(),
      approved_at: now(),
      published_at: null,
      external_post_id: null,
      error: null,
      automation: {
        lane: 'cluster_brief',
        cluster_key: brief.cluster.key,
        fingerprint: brief.fingerprint,
        fallback_used: Boolean(brief.summary.meta?.fallback_used)
      }
    };

    if (existing) {
      if (existing.automation?.fingerprint === brief.fingerprint && existing.status === 'published') continue;
      Object.assign(existing, payload);
    } else {
      queue.push(payload);
    }
    created.push(`${itemId}:${platform}`);
  }
  return created;
}

function runPublishForAutomation(targetIds) {
  if (targetIds.length === 0) return { ok: true, processed: 0, items: [] };
  const results = [];
  for (const [itemId, platform] of targetIds.map((x) => x.split(':'))) {
    const result = spawnSync('node', ['scripts/publish/run_publish_ready.js', '--item-id', itemId, '--platform', platform], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 10 * 1024 * 1024
    });
    if (result.status !== 0) {
      results.push({ item_id: itemId, platform, ok: false, error: (result.stderr || result.stdout || `exit ${result.status}`).trim() });
      continue;
    }
    try {
      const parsed = JSON.parse((result.stdout || '{}').trim());
      results.push({ item_id: itemId, platform, ok: true, parsed });
    } catch (error) {
      results.push({ item_id: itemId, platform, ok: false, error: error.message });
    }
  }
  return { ok: results.every((r) => r.ok), processed: results.length, items: results };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureDir(STATE_DIR);
  ensureDir(path.dirname(OUTPUT_LATEST_FILE));
  const rankings = readJson(RANKINGS_FILE, null);
  if (!rankings) throw new Error(`Missing rankings file: ${RANKINGS_FILE}`);

  const state = readJson(STATE_FILE, { clusters: {}, last_run_at: null, last_publish_at: null });
  const lastRun = readJson(LAST_RUN_FILE, {});
  if (!isDue(state, args.force)) {
    console.log(JSON.stringify({ ok: true, status: 'skipped_not_due', last_run_at: state.last_run_at }, null, 2));
    return;
  }

  const selected = selectClusters(rankings, args.limit);
  const briefs = [];
  const reused = [];
  for (const cluster of selected) {
    const slug = slugify(cluster.key.replace(/^topic:/, ''));
    const fingerprint = buildFingerprint(cluster, rankings.generated_at);
    const cached = state.clusters?.[cluster.key];

    let summary;
    let cacheHit = false;
    if (!args.force && cached?.fingerprint === fingerprint && cached?.summary) {
      summary = cached.summary;
      cacheHit = true;
      reused.push(cluster.key);
    } else if (args.templateOnly) {
      summary = buildTemplateSummary(cluster);
    } else {
      const request = buildClusterRequest(cluster);
      const response = runModelPlanTask({
        taskName: 'summary',
        request,
        normalizeResponse: normalizeSummaryResponse,
        buildErrorResponse: buildSummaryErrorResponse,
        notImplementedMessage: 'Cluster summary executor is not configured.'
      });
      summary = response.ok ? response : buildTemplateSummary(cluster);
      if (!response.ok) {
        summary.meta = { ...(summary.meta || {}), source_error: response.error, fallback_used: true };
      }
    }

    const brief = { slug, cluster, fingerprint, cache_hit: cacheHit, summary, windowLabel: rankings?.window?.label || rankings?.generated_at?.slice(0, 10) || 'weekly' };
    const draftFiles = writeBriefArtifacts(brief);
    brief.files = draftFiles;
    briefs.push(brief);
    state.clusters[cluster.key] = {
      fingerprint,
      summary,
      slug,
      files: draftFiles,
      updated_at: now()
    };
  }

  writeJson(OUTPUT_LATEST_FILE, {
    ok: true,
    generated_at: now(),
    rankings_generated_at: rankings.generated_at,
    briefs: briefs.map((brief) => ({
      slug: brief.slug,
      cluster_key: brief.cluster.key,
      label: brief.cluster.label,
      fingerprint: brief.fingerprint,
      cache_hit: brief.cache_hit,
      summary: brief.summary,
      files: brief.files
    }))
  });

  let publish = { ok: true, processed: 0, items: [] };
  let queued = [];
  if (args.publish) {
    const queue = loadPublishQueue();
    for (const brief of briefs) {
      queued.push(...queuePublishItems(brief, brief.files, queue));
    }
    savePublishQueue(queue);
    publish = runPublishForAutomation(queued);
  }

  state.last_run_at = now();
  if (args.publish) state.last_publish_at = now();
  writeJson(STATE_FILE, state);
  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    cluster_brief_lane: {
      ran_at: now(),
      selected_count: selected.length,
      generated_count: briefs.length,
      reused_count: reused.length,
      queued_count: queued.length,
      publish_processed: publish.processed,
      output_file: path.relative(ROOT, OUTPUT_LATEST_FILE)
    }
  });

  console.log(JSON.stringify({
    ok: true,
    status: 'completed',
    selected_count: selected.length,
    generated_count: briefs.length,
    reused_count: reused.length,
    queued_count: queued.length,
    publish,
    output_file: path.relative(ROOT, OUTPUT_LATEST_FILE)
  }, null, 2));
}

main();
