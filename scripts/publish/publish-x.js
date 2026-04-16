#!/usr/bin/env node

/**
 * MVP X publisher stub.
 *
 * Current behavior:
 * - reads generated artifact JSON from argv[2]
 * - prints the post payload that would be sent
 */

const fs = require('fs');

function main() {
  const artifactPath = process.argv[2];

  if (!artifactPath) {
    console.error('Usage: node scripts/publish/publish-x.js <artifact.json>');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const payload = {
    mode: 'review',
    text: artifact.x_post || '',
    source_url: artifact.source?.url || null,
    image_prompt: artifact.image_prompt || ''
  };

  console.log(JSON.stringify(payload, null, 2));
}

main();
