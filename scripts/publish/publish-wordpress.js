#!/usr/bin/env node

/**
 * MVP WordPress publisher stub.
 *
 * Current behavior:
 * - reads generated artifact JSON from argv[2]
 * - prints the draft payload that would be sent
 */

const fs = require('fs');

function main() {
  const artifactPath = process.argv[2];

  if (!artifactPath) {
    console.error('Usage: node scripts/publish/publish-wordpress.js <artifact.json>');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const draftPayload = {
    status: 'draft',
    title: artifact.titles?.[0] || artifact.source?.title || 'Untitled',
    content: artifact.wordpress_html || '<p>TODO</p>',
    meta: {
      source_url: artifact.source?.url,
      generated_by: 'mvp-stub'
    }
  };

  console.log(JSON.stringify(draftPayload, null, 2));
}

main();
