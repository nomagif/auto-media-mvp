#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildSummaryInput, buildSummaryRequest } = require('./lib_summary');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, 'state');
const QUEUE_FILE = path.join(STATE_DIR, 'summary_queue.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');

function readMaybe(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function makeTempRequestFile() {
  const input = buildSummaryInput({
    id: `summary-fallback-test-${Date.now()}`,
    source_url: 'https://example.com/openai-demo-platform',
    normalized: {
      source_name: 'Example Source',
      source_type: 'news',
      title: 'OpenAI launches demo platform',
      body: 'OpenAI launched a new demo platform for developers to validate workflows and reduce operations burden.',
      published_at: new Date().toISOString(),
      collected_at: new Date().toISOString()
    },
    draft_markdown: ''
  });
  const req = buildSummaryRequest(input);
  const file = path.join(os.tmpdir(), `${req.item.id}.json`);
  fs.writeFileSync(file, JSON.stringify(req, null, 2) + '\n', 'utf8');
  return { file, itemId: req.item.id };
}

function main() {
  const { file, itemId } = makeTempRequestFile();
  const queueBackup = readMaybe(QUEUE_FILE);
  const lastRunBackup = readMaybe(LAST_RUN_FILE);

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    writeJson(QUEUE_FILE, [{
      item_id: itemId,
      status: 'pending',
      attempts: 0,
      request_file: path.relative(ROOT, file),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]);
    writeJson(LAST_RUN_FILE, {});

    const result = spawnSync('node', ['scripts/generate/run_summary_worker.js'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        OPENCLAW_WORKER_TEST_FAIL_MODELS: 'openai/gpt-4.1-mini'
      }
    });

    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || `worker exited with status ${result.status}`).trim());
    }

    const responsePath = path.join(ROOT, 'data', 'processed', 'responses', `${itemId}-summary-response.json`);
    const response = JSON.parse(fs.readFileSync(responsePath, 'utf8'));

    const attempted = response?.meta?.execution?.attempted_models || [];
    const actualModel = response?.meta?.openclaw?.actual_model || null;

    if (!response.ok) throw new Error('Expected success response after fallback');
    if (attempted.length < 2) throw new Error(`Expected at least 2 attempts, got ${attempted.length}`);
    if (attempted[0] !== 'openai/gpt-4.1-mini') throw new Error(`Unexpected first attempt: ${attempted[0]}`);
    if (attempted[1] !== 'openai/gpt-5.4') throw new Error(`Unexpected fallback attempt: ${attempted[1]}`);
    if (!actualModel || !String(actualModel).includes('gpt-5.4')) throw new Error(`Unexpected actual fallback model: ${actualModel}`);

    process.stdout.write(JSON.stringify({
      ok: true,
      item_id: itemId,
      attempted_models: attempted,
      actual_model: actualModel,
      response_file: path.relative(ROOT, responsePath)
    }, null, 2) + '\n');
  } finally {
    try { fs.unlinkSync(file); } catch {}
    if (queueBackup === null) {
      try { fs.unlinkSync(QUEUE_FILE); } catch {}
    } else {
      fs.writeFileSync(QUEUE_FILE, queueBackup, 'utf8');
    }
    if (lastRunBackup === null) {
      try { fs.unlinkSync(LAST_RUN_FILE); } catch {}
    } else {
      fs.writeFileSync(LAST_RUN_FILE, lastRunBackup, 'utf8');
    }
  }
}

main();
