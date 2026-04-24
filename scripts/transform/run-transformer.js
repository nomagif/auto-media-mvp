#!/usr/bin/env node

/**
 * Transformer runner.
 *
 * Current behavior:
 * - reads a normalized input JSON path from argv[2]
 * - if OPENCLAW_TRANSFORMER_MODE=stub or no ACP config, returns placeholder artifact
 * - reserved integration point for Codex/ACP worker invocation
 */

const fs = require('fs');

function buildStubArtifact(source) {
  return {
    source: {
      id: source.id,
      title: source.title,
      url: source.url,
      published_at: source.published_at
    },
    summary_ja_short: 'TODO: Codex/ACP integration',
    summary_ja_long: 'TODO: Codex/ACP integration',
    key_points: [],
    related_items: [],
    titles: [source.title],
    x_post: '',
    note_markdown: '',
    wordpress_html: '',
    image_prompt: '',
    risk_flags: ['needs-review'],
    citations: [
      {
        title: source.title,
        url: source.url
      }
    ],
    transformer: {
      mode: 'stub'
    }
  };
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node scripts/transform/run-transformer.js <normalized-item.json>');
    process.exit(1);
  }

  const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  // Safe placeholder until ACP wiring is finalized.
  // Future implementation options:
  // - call an ACP/Codex session via OpenClaw sessions_spawn
  // - post-process returned JSON here
  const artifact = buildStubArtifact(source);

  console.log(JSON.stringify(artifact, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
