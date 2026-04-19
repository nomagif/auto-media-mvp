#!/usr/bin/env node

const {
  loadPublishQueue,
  savePublishQueue,
  applyPublishResult,
  appendPublishResultLog,
  getQueueItemsByStatus
} = require('./lib_publish_queue');
const { runPublishForQueueItem } = require('./lib_publish_adapters');

function parseArgs(argv) {
  const args = { itemId: null, platform: null, dryRun: false, includePending: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--item-id' && argv[i + 1]) {
      args.itemId = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--platform' && argv[i + 1]) {
      args.platform = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--include-pending') {
      args.includePending = true;
    }
  }
  return args;
}


async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queue = loadPublishQueue();
  const statuses = args.includePending ? ['approved', 'pending_review'] : ['approved'];
  const targets = getQueueItemsByStatus(queue, { itemId: args.itemId, platform: args.platform, statuses });

  if (targets.length === 0) {
    console.log(JSON.stringify({ ok: true, processed: 0, items: [] }, null, 2));
    return;
  }

  const results = [];
  for (const item of targets) {
    const result = await runPublishForQueueItem(item);
    if (!args.dryRun) {
      applyPublishResult(queue, result);
      appendPublishResultLog(result, {
        runner: 'run_publish_ready.js',
        source_statuses: statuses,
        dry_run: false
      });
    }
    results.push(result);
  }

  if (!args.dryRun) {
    savePublishQueue(queue);
  }

  console.log(JSON.stringify({
    ok: true,
    dry_run: args.dryRun,
    include_pending: args.includePending,
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
