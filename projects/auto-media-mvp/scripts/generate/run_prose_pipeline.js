#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const REQUESTS_DIR = path.join(ROOT, 'data', 'processed', 'requests');
const RESPONSES_DIR = path.join(ROOT, 'data', 'processed', 'responses');
const STATE_DIR = path.join(ROOT, 'state');
const SUMMARY_QUEUE_FILE = path.join(STATE_DIR, 'summary_queue.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function runNodeScript(script, args = [], env = {}) {
  const result = spawnSync('node', [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      ...env
    }
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `${script} exited with status ${result.status}`).trim());
  }
  const text = (result.stdout || '').trim();
  return text ? JSON.parse(text) : null;
}

function writeTempItemsFile(items) {
  const file = path.join(ROOT, `.tmp-apply-items-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  fs.writeFileSync(file, JSON.stringify(items, null, 2) + '\n', 'utf8');
  return file;
}

function listRequestFiles(suffix) {
  if (!fs.existsSync(REQUESTS_DIR)) return [];
  return fs.readdirSync(REQUESTS_DIR)
    .filter((name) => name.endsWith(suffix))
    .sort()
    .map((name) => path.join(REQUESTS_DIR, name));
}

function hasResponseForRequest(requestFile, requestSuffix, responseSuffix) {
  const base = path.basename(requestFile).replace(requestSuffix, '');
  return fs.existsSync(path.join(RESPONSES_DIR, `${base}${responseSuffix}`));
}

function parseArgs(argv) {
  const args = { limit: null, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--limit' && argv[i + 1]) {
      args.limit = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--force') {
      args.force = true;
    }
  }
  return args;
}

function takeLimit(items, limit) {
  return Number.isFinite(limit) && limit >= 0 ? items.slice(0, limit) : items;
}

function runRequestWorkers({ requestSuffix, responseSuffix, workerScript, applyScript, limit, force }) {
  const allRequests = listRequestFiles(requestSuffix);
  const targets = takeLimit(
    force ? allRequests : allRequests.filter((file) => !hasResponseForRequest(file, requestSuffix, responseSuffix)),
    limit
  );

  const processed = [];
  for (const requestFile of targets) {
    const result = runNodeScript(workerScript, ['--request-file', requestFile]);
    processed.push(result?.item_id || path.basename(requestFile));
  }
  let applied = { applied_count: 0, applied_items: [] };
  if (processed.length > 0) {
    const itemsFile = writeTempItemsFile(processed);
    try {
      applied = runNodeScript(applyScript, ['--items-file', itemsFile]);
    } finally {
      try { fs.unlinkSync(itemsFile); } catch {}
    }
  }
  return {
    processed_count: processed.length,
    processed_items: processed,
    applied_count: applied?.applied_count || 0,
    applied_items: applied?.applied_items || []
  };
}

function runSummaryFlow(limit, force) {
  runNodeScript('scripts/generate/enqueue_summary_requests.js');
  let queue = readJson(SUMMARY_QUEUE_FILE, []);
  let pending = queue.filter((item) => item.status === 'pending');

  if (!force) {
    pending = pending.filter((item) => !item.response_file);
  }
  pending = takeLimit(pending, limit);

  const processed = [];
  for (let i = 0; i < pending.length; i += 1) {
    const result = runNodeScript('scripts/generate/run_summary_worker.js');
    if (result?.processed_item) processed.push(result.processed_item);
  }
  let applied = { applied_count: 0, applied_items: [] };
  if (processed.length > 0) {
    const itemsFile = writeTempItemsFile(processed);
    try {
      applied = runNodeScript('scripts/generate/apply_summary_response.js', ['--items-file', itemsFile]);
    } finally {
      try { fs.unlinkSync(itemsFile); } catch {}
    }
  }

  return {
    processed_count: processed.length,
    processed_items: processed,
    applied_count: applied?.applied_count || 0,
    applied_items: applied?.applied_items || []
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const enrich = runNodeScript('scripts/generate/enrich_from_sources.js');
  const summary = runSummaryFlow(args.limit, args.force);

  runNodeScript('scripts/generate/build_title_requests.js');
  const title = runRequestWorkers({
    requestSuffix: '-title-request.json',
    responseSuffix: '-title-response.json',
    workerScript: 'scripts/generate/run_title_worker.js',
    applyScript: 'scripts/generate/apply_title_response.js',
    limit: args.limit,
    force: args.force
  });

  runNodeScript('scripts/generate/build_xpost_requests.js');
  const xpost = runRequestWorkers({
    requestSuffix: '-xpost-request.json',
    responseSuffix: '-xpost-response.json',
    workerScript: 'scripts/generate/run_xpost_worker.js',
    applyScript: 'scripts/generate/apply_xpost_response.js',
    limit: args.limit,
    force: args.force
  });

  runNodeScript('scripts/generate/build_article_requests.js');
  const article = runRequestWorkers({
    requestSuffix: '-article-request.json',
    responseSuffix: '-article-response.json',
    workerScript: 'scripts/generate/run_article_worker.js',
    applyScript: 'scripts/generate/apply_article_response.js',
    limit: args.limit,
    force: args.force
  });

  runNodeScript('scripts/generate/build_image_prompt_requests.js');
  const image = runRequestWorkers({
    requestSuffix: '-image-prompt-request.json',
    responseSuffix: '-image-prompt-response.json',
    workerScript: 'scripts/generate/run_image_prompt_worker.js',
    applyScript: 'scripts/generate/apply_image_prompt_response.js',
    limit: args.limit,
    force: args.force
  });

  console.log(JSON.stringify({
    ok: true,
    mode: 'internal-prose-automation',
    limit: args.limit,
    force: args.force,
    enrich,
    summary,
    title,
    xpost,
    article,
    image
  }, null, 2));
}

main();
