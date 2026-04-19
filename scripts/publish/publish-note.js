#!/usr/bin/env node

/**
 * note adapter placeholder.
 *
 * Current behavior:
 * - reads NotePublishInput JSON
 * - returns NotePublishOutput-compatible JSON
 *
 * Production integration point:
 * - replace export/dry-run behavior with real note integration when available
 */

const fs = require('fs');
const path = require('path');
const { publishToNote } = require(path.resolve(__dirname, '../../projects/auto-media-mvp/scripts/publish/lib_publish_adapters'));

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node scripts/publish/publish-note.js <note-publish-input.json>');
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const output = await publishToNote(input);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
