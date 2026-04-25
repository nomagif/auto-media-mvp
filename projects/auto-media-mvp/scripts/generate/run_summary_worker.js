#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, 'state');
const QUEUE_FILE = path.join(STATE_DIR, 'summary_queue.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');
const RESPONSES_DIR = path.join(ROOT, 'data', 'processed', 'responses');
const { normalizeSummaryResponse, buildSummaryErrorResponse } = require('./lib_summary_response');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function now() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = { rawFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--raw-file' && argv[i + 1]) {
      args.rawFile = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function main() {
  ensureDir(STATE_DIR);
  ensureDir(RESPONSES_DIR);

  const args = parseArgs(process.argv.slice(2));
  const queue = readJson(QUEUE_FILE, []);
  const lastRun = readJson(LAST_RUN_FILE, {});
  const target = queue.find((item) => item.status === 'pending');

  if (!target) {
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      summary_worker: {
        ran_at: now(),
        processed_item: null,
        status: 'idle'
      }
    });

    console.log(JSON.stringify({ ok: true, status: 'idle', processed_item: null }, null, 2));
    return;
  }

  target.status = 'processing';
  target.updated_at = now();
  target.attempts = (target.attempts || 0) + 1;
  writeJson(QUEUE_FILE, queue);

  const responsePath = path.join(ROOT, 'data', 'processed', 'responses', `${target.item_id}-summary-response.json`);
  const requestPath = path.join(ROOT, target.request_file);

  try {
    const request = readJson(requestPath, null);
    let response;

    if (args.rawFile) {
      const rawText = fs.readFileSync(path.resolve(args.rawFile), 'utf8');
      response = normalizeSummaryResponse(rawText, request);
    } else {
      response = buildSummaryErrorResponse(
        request,
        'NOT_IMPLEMENTED',
        'OpenClaw isolated execution is not wired yet and no --raw-file was provided.',
        null,
        true
      );
    }

    if (request?.model_plan && response?.meta) {
      response.meta.model_plan = request.model_plan;
    }

    fs.writeFileSync(responsePath, JSON.stringify(response, null, 2) + '\n', 'utf8');

    target.status = response.ok ? 'success' : 'error';
    target.updated_at = now();
    target.response_file = path.relative(ROOT, responsePath);
    target.last_error = response.ok ? null : response.error;

    writeJson(QUEUE_FILE, queue);
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      summary_worker: {
        ran_at: now(),
        processed_item: target.item_id,
        status: target.status,
        response_file: path.relative(ROOT, responsePath),
        raw_file: args.rawFile || null
      }
    });

    console.log(JSON.stringify({
      ok: true,
      status: target.status,
      processed_item: target.item_id,
      response_file: path.relative(ROOT, responsePath),
      raw_file: args.rawFile || null
    }, null, 2));
  } catch (error) {
    target.status = 'error';
    target.updated_at = now();
    target.last_error = {
      code: 'EXECUTION_FAILED',
      message: error.message,
      retryable: true
    };

    writeJson(QUEUE_FILE, queue);
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      summary_worker: {
        ran_at: now(),
        processed_item: target.item_id,
        status: 'error'
      }
    });

    throw error;
  }
}

main();
