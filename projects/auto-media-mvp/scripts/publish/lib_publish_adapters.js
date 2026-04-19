const fs = require('fs');
const path = require('path');
const { ROOT, now } = require('./lib_publish_queue');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

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
  const text = (input.text || '').trim();
  const maxChars = 280;

  if (!text) {
    return {
      ok: false,
      item_id: input.item_id,
      platform: 'x',
      status: 'error',
      published_at: null,
      external_post_id: null,
      error: {
        message: 'text is empty',
        code: 'EMPTY_TEXT',
        retryable: false
      },
      meta: {
        dry_run: input.dry_run === true,
        raw_status: 400
      }
    };
  }

  if (text.length > maxChars) {
    return {
      ok: false,
      item_id: input.item_id,
      platform: 'x',
      status: 'error',
      published_at: null,
      external_post_id: null,
      error: {
        message: `text exceeds ${maxChars} characters`,
        code: 'TEXT_TOO_LONG',
        retryable: false
      },
      meta: {
        dry_run: input.dry_run === true,
        raw_status: 400,
        text_length: text.length,
        max_chars: maxChars
      }
    };
  }

  if (input.media && !Array.isArray(input.media)) {
    return {
      ok: false,
      item_id: input.item_id,
      platform: 'x',
      status: 'error',
      published_at: null,
      external_post_id: null,
      error: {
        message: 'media must be an array',
        code: 'INVALID_MEDIA',
        retryable: false
      },
      meta: {
        dry_run: input.dry_run === true,
        raw_status: 400
      }
    };
  }

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
      media_count: Array.isArray(input.media) ? input.media.length : 0,
      text_length: text.length,
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
  const outputDir = path.join(ROOT, 'outputs', 'note');
  ensureDir(outputDir);
  const exportRelativeFile = `outputs/note/${input.item_id}.md`;
  const exportFile = path.join(ROOT, exportRelativeFile);
  const title = (input.title || 'Untitled').trim();
  const body = (input.body_markdown || '').trim();
  const content = `# ${title}\n\n${body}\n`;
  fs.writeFileSync(exportFile, content, 'utf8');

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
      exported_file: exportRelativeFile,
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
