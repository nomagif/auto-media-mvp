#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getPayloadText(cliJson) {
  const payloads = Array.isArray(cliJson?.payloads) ? cliJson.payloads : [];
  const text = payloads.map((payload) => payload?.text || '').join('\n').trim();
  if (!text) throw new Error('OpenClaw returned no text payload');
  return text;
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

function main() {
  const requestFile = process.env.WORKER_REQUEST_FILE;
  const taskName = process.env.WORKER_TASK;
  const requestedModel = process.env.WORKER_MODEL || 'openai/gpt-4.1-mini';
  const thinking = process.env.WORKER_THINKING || 'low';

  if (!requestFile) throw new Error('Missing WORKER_REQUEST_FILE');
  if (!taskName) throw new Error('Missing WORKER_TASK');

  const request = readJson(path.resolve(requestFile));
  const prompt = buildPrompt(taskName, request, requestedModel);
  const sessionId = `worker-${taskName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `openclaw exited with status ${result.status}`).trim());
  }

  const rawCliJson = (result.stdout || result.stderr || '').trim();
  if (!rawCliJson) {
    throw new Error('OpenClaw returned no JSON envelope');
  }

  const cliJson = JSON.parse(rawCliJson);
  const text = getPayloadText(cliJson);
  process.stdout.write(text);
}

main();
