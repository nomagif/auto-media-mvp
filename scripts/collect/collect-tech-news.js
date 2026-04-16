#!/usr/bin/env node

/**
 * MVP collector stub for tech news.
 *
 * Current behavior:
 * - reads config/sources/tech-news.json
 * - prints configured sources
 * - reserved for RSS fetch + extraction implementation
 */

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const workspace = path.resolve(__dirname, '../..');
  const configPath = path.join(workspace, 'config/sources/tech-news.json');
  const config = readJson(configPath);

  console.log(JSON.stringify({
    ok: true,
    topic: config.topic,
    sourceCount: config.sources.length,
    sources: config.sources.map((s) => ({ id: s.id, type: s.type, url: s.url }))
  }, null, 2));
}

main();
