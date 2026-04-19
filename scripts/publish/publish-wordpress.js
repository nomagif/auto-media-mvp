#!/usr/bin/env node

/**
 * WordPress adapter placeholder.
 *
 * Current behavior:
 * - reads WordPressPublishInput JSON
 * - returns WordPressPublishOutput-compatible JSON
 *
 * Production integration point:
 * - add authenticated REST API POST to /wp-json/wp/v2/posts
 */

const fs = require('fs');
const path = require('path');
const { publishToWordPress } = require(path.resolve(__dirname, '../../projects/auto-media-mvp/scripts/publish/lib_publish_adapters'));

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node scripts/publish/publish-wordpress.js <wordpress-publish-input.json>');
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const output = await publishToWordPress(input);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
