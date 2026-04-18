#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { normalizeImagePromptResponse, buildImagePromptErrorResponse } = require('./lib_image_prompt_response');

const ROOT = path.resolve(__dirname, '..', '..');
const RESPONSES_DIR = path.join(ROOT, 'data', 'processed', 'responses');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
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
  const responsePath = path.join(RESPONSES_DIR, `${itemId}-image-prompt-response.json`);

  let response;
  if (args.rawFile) {
    const rawText = fs.readFileSync(path.resolve(args.rawFile), 'utf8');
    response = normalizeImagePromptResponse(rawText, request);
  } else {
    response = buildImagePromptErrorResponse(request, 'NOT_IMPLEMENTED', 'Image prompt subagent execution is not wired yet and no --raw-file was provided.', null, true);
  }

  fs.writeFileSync(responsePath, JSON.stringify(response, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, item_id: itemId, response_file: path.join('data', 'processed', 'responses', `${itemId}-image-prompt-response.json`), status: response.ok ? 'success' : 'error' }, null, 2));
}

main();
