#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OPENCLAW_CONFIG = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildTempConfig(requestedModel) {
  const basePath = process.env.OPENCLAW_CONFIG_PATH || DEFAULT_OPENCLAW_CONFIG;
  const base = readJson(basePath);
  const config = JSON.parse(JSON.stringify(base));
  config.agents = config.agents || {};
  config.agents.defaults = config.agents.defaults || {};
  config.agents.defaults.models = config.agents.defaults.models || {};
  if (!config.agents.defaults.models[requestedModel]) {
    config.agents.defaults.models[requestedModel] = {};
  }
  config.agents.defaults.model = config.agents.defaults.model || {};
  config.agents.defaults.model.primary = requestedModel;

  const file = path.join(os.tmpdir(), `openclaw-worker-config-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  writeJson(file, config);
  return file;
}

function getPayloadText(cliJson) {
  const payloads = Array.isArray(cliJson?.payloads) ? cliJson.payloads : [];
  const text = payloads.map((payload) => payload?.text || '').join('\n').trim();
  if (!text) throw new Error('OpenClaw returned no text payload');
  return text;
}

function normalizePayloadText(text, cliJson, requestedModel) {
  try {
    const parsed = JSON.parse(text);
    const actualModel = cliJson?.meta?.agentMeta?.model || cliJson?.meta?.executionTrace?.winnerModel || null;
    const meta = parsed?.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
    parsed.meta = {
      ...meta,
      openclaw: {
        requested_model: requestedModel,
        actual_model: actualModel,
        session_id: cliJson?.meta?.agentMeta?.sessionId || null,
        provider: cliJson?.meta?.agentMeta?.provider || null,
        runner: cliJson?.meta?.executionTrace?.runner || 'embedded'
      }
    };
    if (actualModel) parsed.model = actualModel;
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}

function buildTaskRules(taskName) {
  switch (taskName) {
    case 'summary':
      return {
        system: 'You are a summary generation worker.',
        successShape: `{
  "ok": true,
  "version": "v0.1",
  "item_id": "...",
  "model": "requested model label",
  "generated_at": "ISO-8601 timestamp",
  "summary": {
    "summary_ja": "...",
    "background_ja": "...",
    "why_it_matters_ja": "..."
  },
  "meta": {
    "prompt_file": "prompts/summarize.md",
    "raw_response": null,
    "status": "success"
  }
}`
      };
    case 'title':
      return {
        system: 'You are a Japanese headline generation worker.',
        successShape: `{
  "ok": true,
  "version": "v0.1",
  "item_id": "...",
  "model": "requested model label",
  "generated_at": "ISO-8601 timestamp",
  "titles": {
    "candidates": ["候補1", "候補2", "候補3"]
  },
  "meta": {
    "prompt_file": "prompts/title_candidates.md",
    "raw_response": null,
    "status": "success"
  }
}`
      };
    case 'article':
      return {
        system: 'You are a Japanese tech article drafting worker.',
        successShape: `{
  "ok": true,
  "version": "v0.1",
  "item_id": "...",
  "model": "requested model label",
  "generated_at": "ISO-8601 timestamp",
  "article": {
    "title": "...",
    "lead": "...",
    "sections": [
      {"heading": "何が起きたか", "body": "..."},
      {"heading": "背景", "body": "..."},
      {"heading": "なぜ重要か", "body": "..."}
    ],
    "closing": "..."
  },
  "meta": {
    "prompt_file": "prompts/article.md",
    "raw_response": null,
    "status": "success"
  }
}`
      };
    case 'xpost':
      return {
        system: 'You are a Japanese X post generation worker.',
        successShape: `{
  "ok": true,
  "version": "v0.1",
  "item_id": "...",
  "model": "requested model label",
  "generated_at": "ISO-8601 timestamp",
  "social": {
    "x_post": "..."
  },
  "meta": {
    "prompt_file": "prompts/x_post.md",
    "raw_response": null,
    "status": "success"
  }
}`
      };
    case 'image_prompt':
      return {
        system: 'You are an image prompt generation worker.',
        successShape: `{
  "ok": true,
  "version": "v0.1",
  "item_id": "...",
  "model": "requested model label",
  "generated_at": "ISO-8601 timestamp",
  "image": {
    "image_prompt": "..."
  },
  "meta": {
    "prompt_file": "prompts/image_prompt.md",
    "raw_response": null,
    "status": "success"
  }
}`
      };
    default:
      throw new Error(`Unsupported task: ${taskName}`);
  }
}

function buildPrompt(taskName, request, requestedModel) {
  const promptFile = path.join(ROOT, request.prompt_file || '');
  const promptBody = fs.existsSync(promptFile) ? fs.readFileSync(promptFile, 'utf8').trim() : '';
  const rules = buildTaskRules(taskName);

  return `${rules.system}

Read the request JSON and return JSON only.
Do not include markdown fences.
Do not include explanations, notes, greetings, or commentary.
Do not call tools.
Do not edit files.
Do not use apply_patch, read, write, edit, exec, or any other tool.
Answer directly in plain JSON in the assistant message.
Preserve item_id and version from the request.
Use natural Japanese where applicable.
Requested model label: ${requestedModel}

Task prompt reference:
${promptBody}

Success JSON shape:
${rules.successShape}

Error JSON shape:
{
  "ok": false,
  "version": "${request.version || 'v0.1'}",
  "item_id": "${request?.item?.id || ''}",
  "generated_at": "ISO-8601 timestamp",
  "error": {
    "code": "GENERATION_FAILED",
    "message": "reason text",
    "retryable": true
  },
  "meta": {
    "prompt_file": "${request.prompt_file || ''}",
    "status": "error"
  }
}

Request JSON:
${JSON.stringify(request, null, 2)}
`;
}

function maybeInjectTestFailure(requestedModel) {
  const failModels = String(process.env.OPENCLAW_WORKER_TEST_FAIL_MODELS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (failModels.includes(requestedModel)) {
    process.stdout.write('not json');
    process.exit(0);
  }
}

function main() {
  const requestFile = process.env.WORKER_REQUEST_FILE;
  const taskName = process.env.WORKER_TASK;
  const requestedModel = process.env.WORKER_MODEL || 'openai/gpt-4.1-mini';
  const thinking = process.env.WORKER_THINKING || 'low';

  if (!requestFile) throw new Error('Missing WORKER_REQUEST_FILE');
  if (!taskName) throw new Error('Missing WORKER_TASK');

  const request = readJson(path.resolve(requestFile));
  maybeInjectTestFailure(requestedModel);
  const prompt = buildPrompt(taskName, request, requestedModel);
  const sessionId = `worker-${taskName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tempConfigPath = buildTempConfig(requestedModel);

  try {
    const result = spawnSync('openclaw', [
      'agent',
      '--local',
      '--agent',
      'main',
      '--session-id',
      sessionId,
      '--json',
      '--thinking',
      thinking,
      '--timeout',
      process.env.OPENCLAW_WORKER_TIMEOUT_SECONDS || '180',
      '--message',
      prompt
    ], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        OPENCLAW_CONFIG_PATH: tempConfigPath
      }
    });

    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || `openclaw exited with status ${result.status}`).trim());
    }

    const rawCliJson = (result.stdout || result.stderr || '').trim();
    if (!rawCliJson) {
      throw new Error('OpenClaw returned no JSON envelope');
    }

    const cliJson = JSON.parse(rawCliJson);
    const text = normalizePayloadText(getPayloadText(cliJson), cliJson, requestedModel);
    process.stdout.write(text);
  } finally {
    try { fs.unlinkSync(tempConfigPath); } catch {}
  }
}

main();
