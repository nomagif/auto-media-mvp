const fs = require('fs');
const path = require('path');
const { ROOT, now } = require('./lib_publish_queue');

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8').trim();
}

function extractMarkdownTitle(content) {
  const titleLine = content.split('\n').find((line) => line.startsWith('# '));
  return (titleLine || '# Untitled').replace(/^#\s+/, '').trim() || 'Untitled';
}

function buildXPublishInput(queueItem) {
  return {
    item_id: queueItem.item_id,
    platform: 'x',
    text: readText(queueItem.draft_file),
    idempotency_key: `${queueItem.item_id}:x`,
    dry_run: true,
    meta: {
      draft_file: queueItem.draft_file
    }
  };
}

function buildWordPressPublishInput(queueItem) {
  const content = readText(queueItem.draft_file);
  return {
    item_id: queueItem.item_id,
    platform: 'wordpress',
    title: extractMarkdownTitle(content),
    content_markdown: content,
    status: 'draft',
    meta: {
      draft_file: queueItem.draft_file
    }
  };
}

function buildNotePublishInput(queueItem) {
  const content = readText(queueItem.draft_file);
  return {
    item_id: queueItem.item_id,
    platform: 'note',
    title: extractMarkdownTitle(content),
    body_markdown: content,
    publish_mode: 'export',
    meta: {
      draft_file: queueItem.draft_file
    }
  };
}

async function publishToX(input) {
  return {
    ok: true,
    item_id: input.item_id,
    platform: 'x',
    status: 'published',
    published_at: now(),
    external_post_id: `dryrun-x-${input.item_id}`,
    error: null,
    meta: {
      dry_run: input.dry_run === true,
      input
    }
  };
}

async function publishToWordPress(input) {
  return {
    ok: true,
    item_id: input.item_id,
    platform: 'wordpress',
    status: 'published',
    published_at: now(),
    external_post_id: `dryrun-wp-${input.item_id}`,
    error: null,
    meta: {
      dry_run: true,
      wp_status: input.status || 'draft',
      input,
      draft_payload: {
        status: input.status || 'draft',
        title: input.title,
        content_markdown: input.content_markdown || null,
        content_html: input.content_html || null,
        excerpt: input.excerpt || '',
        meta: input.meta || {}
      }
    }
  };
}

async function publishToNote(input) {
  const exportFile = `outputs/note/${input.item_id}.md`;
  return {
    ok: true,
    item_id: input.item_id,
    platform: 'note',
    status: 'published',
    published_at: now(),
    external_post_id: `dryrun-note-${input.item_id}`,
    error: null,
    meta: {
      dry_run: true,
      mode: input.publish_mode || 'export',
      exported_file: exportFile,
      input
    }
  };
}

async function runPublishForQueueItem(queueItem) {
  if (queueItem.platform === 'x') {
    const input = buildXPublishInput(queueItem);
    return publishToX(input);
  }

  if (queueItem.platform === 'wordpress') {
    const input = buildWordPressPublishInput(queueItem);
    return publishToWordPress(input);
  }

  if (queueItem.platform === 'note') {
    const input = buildNotePublishInput(queueItem);
    return publishToNote(input);
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

module.exports = {
  buildXPublishInput,
  buildWordPressPublishInput,
  buildNotePublishInput,
  publishToX,
  publishToWordPress,
  publishToNote,
  runPublishForQueueItem
};
