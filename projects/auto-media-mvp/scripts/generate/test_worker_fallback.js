#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildTitleRequest } = require('./lib_title');

const ROOT = path.resolve(__dirname, '..', '..');

function makeTempRequestFile() {
  const req = buildTitleRequest({
    id: `fallback-test-${Date.now()}`,
    title_original: 'OpenAI launches demo platform',
    summary: {
      summary_ja: 'OpenAIが新しいデモ基盤を公開。',
      background_ja: '開発者向けの検証用途。',
      why_it_matters_ja: '運用負荷を下げられる可能性がある。'
    }
  });
  const file = path.join(os.tmpdir(), `${req.item.id}.json`);
  fs.writeFileSync(file, JSON.stringify(req, null, 2) + '\n', 'utf8');
  return { file, itemId: req.item.id };
}

function main() {
  const { file, itemId } = makeTempRequestFile();
  try {
    const result = spawnSync('node', ['scripts/generate/run_title_worker.js', '--request-file', file], {
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

    const responsePath = path.join(ROOT, 'data', 'processed', 'responses', `${itemId}-title-response.json`);
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
  }
}

main();
