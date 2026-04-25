#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { normalizeArticleResponse, buildArticleErrorResponse } = require('./lib_article_response');
const { ensureDir, runModelPlanTask } = require('./lib_worker_runtime');

const ROOT = path.resolve(__dirname, '..', '..');
const RESPONSES_DIR = path.join(ROOT, 'data', 'processed', 'responses');

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function parseArgs(argv) {
  const args = { requestFile: null, rawFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--request-file' && argv[i + 1]) { args.requestFile = argv[i + 1]; i += 1; }
    else if (argv[i] === '--raw-file' && argv[i + 1]) { args.rawFile = argv[i + 1]; i += 1; }
  }
  return args;
}

function main() {
  ensureDir(RESPONSES_DIR);
  const args = parseArgs(process.argv.slice(2));
  if (!args.requestFile) throw new Error('Missing --request-file');

  const request = readJson(path.resolve(args.requestFile), null);
  const itemId = request?.item?.id || 'unknown-item';
  const responsePath = path.join(RESPONSES_DIR, `${itemId}-article-response.json`);

  const response = runModelPlanTask({
    taskName: 'article',
    request,
    rawFile: args.rawFile,
    normalizeResponse: normalizeArticleResponse,
    buildErrorResponse: buildArticleErrorResponse,
    notImplementedMessage: 'Article executor is not configured and no --raw-file was provided.'
  });

  if (request?.model_plan && response?.meta) {
    response.meta.model_plan = request.model_plan;
  }

  fs.writeFileSync(responsePath, JSON.stringify(response, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, item_id: itemId, response_file: path.join('data', 'processed', 'responses', `${itemId}-article-response.json`), status: response.ok ? 'success' : 'error' }, null, 2));
}

main();
