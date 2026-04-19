#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  loadPublishQueue,
  savePublishQueue,
  applyPublishResult,
  getApprovedQueueItems,
  now
} = require('./lib_publish_queue');

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function parseArgs(argv) {
  const args = { itemId: null, platform: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--item-id' && argv[i + 1]) {
      args.itemId = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--platform' && argv[i + 1]) {
      args.platform = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

function buildXInput(queueItem) {
  const draftPath = path.join(ROOT, queueItem.draft_file);
  return {
    item_id: queueItem.item_id,
    platform: 'x',
    text: readText(draftPath).trim(),
    idempotency_key: `${queueItem.item_id}:x`,
    dry_run: true,
    meta: {
      draft_file: queueItem.draft_file
    }
  };
}

function buildWordPressInput(queueItem) {
  const draftPath = path.join(ROOT, queueItem.draft_file);
  const content = readText(draftPath).trim();
  const titleLine = content.split('\n').find((line) => line.startsWith('# ')) || '# Untitled';
  return {
    item_id: queueItem.item_id,
    platform: 'wordpress',
    title: titleLine.replace(/^#\s+/, '').trim() || 'Untitled',
    content_markdown: content,
    status: 'draft',
    meta: {
      draft_file: queueItem.draft_file
    }
  };
}

function buildNoteInput(queueItem) {
  const draftPath = path.join(ROOT, queueItem.draft_file);
  const content = readText(draftPath).trim();
  const titleLine = content.split('\n').find((line) => line.startsWith('# ')) || '# Untitled';
  return {
    item_id: queueItem.item_id,
    platform: 'note',
    title: titleLine.replace(/^#\s+/, '').trim() || 'Untitled',
    body_markdown: content,
    publish_mode: 'export',
    meta: {
      draft_file: queueItem.draft_file
    }
  };
}

function simulatePublish(queueItem) {
  const publishedAt = now();

  if (queueItem.platform === 'x') {
    return {
      ok: true,
      item_id: queueItem.item_id,
      platform: 'x',
      status: 'published',
      published_at: publishedAt,
      external_post_id: `dryrun-x-${queueItem.item_id}`,
      error: null,
      meta: {
        dry_run: true,
        input: buildXInput(queueItem)
      }
    };
  }

  if (queueItem.platform === 'wordpress') {
    return {
      ok: true,
      item_id: queueItem.item_id,
      platform: 'wordpress',
      status: 'published',
      published_at: publishedAt,
      external_post_id: `dryrun-wp-${queueItem.item_id}`,
      error: null,
      meta: {
        dry_run: true,
        input: buildWordPressInput(queueItem)
      }
    };
  }

  if (queueItem.platform === 'note') {
    return {
      ok: true,
      item_id: queueItem.item_id,
      platform: 'note',
      status: 'published',
      published_at: publishedAt,
      external_post_id: `dryrun-note-${queueItem.item_id}`,
      error: null,
      meta: {
        dry_run: true,
        input: buildNoteInput(queueItem)
      }
    };
  }

  return {
    ok: false,
    item_id: queueItem.item_id,
    platform: queueItem.platform,
    status: 'error',
    published_at: null,
    external_post_id: null,
    error: {
      message: `unsupported platform: ${queueItem.platform}`,
      code: 'UNSUPPORTED_PLATFORM',
      retryable: false
    }
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const queue = loadPublishQueue();
  const targets = getApprovedQueueItems(queue, { itemId: args.itemId, platform: args.platform });

  if (targets.length === 0) {
    console.log(JSON.stringify({ ok: true, processed: 0, items: [] }, null, 2));
    return;
  }

  const results = [];
  for (const item of targets) {
    const result = simulatePublish(item);
    if (!args.dryRun) {
      applyPublishResult(queue, result);
    }
    results.push(result);
  }

  if (!args.dryRun) {
    savePublishQueue(queue);
  }

  console.log(JSON.stringify({
    ok: true,
    dry_run: args.dryRun,
    processed: results.length,
    items: results.map((result) => ({
      item_id: result.item_id,
      platform: result.platform,
      status: result.status,
      published_at: result.published_at,
      external_post_id: result.external_post_id,
      error: result.error,
      meta: result.meta
    }))
  }, null, 2));
}

main();
