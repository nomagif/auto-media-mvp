#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROCESSED_DIR = path.join(ROOT, 'data', 'processed');
const RESPONSES_DIR = path.join(PROCESSED_DIR, 'responses');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function listTitleResponses() {
  if (!fs.existsSync(RESPONSES_DIR)) return [];
  return fs.readdirSync(RESPONSES_DIR)
    .filter((name) => name.endsWith('-title-response.json'))
    .sort()
    .map((name) => path.join(RESPONSES_DIR, name));
}

function listEnrichedFiles() {
  if (!fs.existsSync(PROCESSED_DIR)) return [];
  return fs.readdirSync(PROCESSED_DIR)
    .filter((name) => name.endsWith('-enriched.json'))
    .sort()
    .map((name) => path.join(PROCESSED_DIR, name));
}

function main() {
  const responses = listTitleResponses();
  const enrichedFiles = listEnrichedFiles();
  const applied = [];

  for (const responseFile of responses) {
    const response = readJson(responseFile, null);
    if (!response?.ok || !response?.item_id || !response?.titles?.candidates) continue;

    for (const enrichedFile of enrichedFiles) {
      const entries = readJson(enrichedFile, []);
      let touched = false;

      for (const entry of entries) {
        if (entry.id !== response.item_id) continue;
        entry.outputs = entry.outputs || {};
        entry.outputs.titles = {
          candidates: response.titles.candidates,
          meta: {
            prompt_file: response?.meta?.prompt_file || 'prompts/title_candidates.md',
            raw_response: response?.meta?.raw_response ?? null,
            status: response?.meta?.status || 'success',
            response_file: path.join('data', 'processed', 'responses', path.basename(responseFile))
          }
        };
        touched = true;
        applied.push(response.item_id);
      }

      if (touched) {
        fs.writeFileSync(enrichedFile, JSON.stringify(entries, null, 2) + '\n', 'utf8');
      }
    }
  }

  console.log(JSON.stringify({ ok: true, applied_count: applied.length, applied_items: applied }, null, 2));
}

main();
