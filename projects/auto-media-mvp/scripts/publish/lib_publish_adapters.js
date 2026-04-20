const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const { ROOT, now } = require('./lib_publish_queue');

const X_CREATE_POST_URL = 'https://api.twitter.com/2/tweets';

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').split('\n');
  const html = [];
  let paragraph = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    html.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      html.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ''))}</h1>`);
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      html.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      html.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      html.push(`<li>${escapeHtml(line.replace(/^-\s+/, ''))}</li>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return html
    .join('\n')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match.trim()}\n</ul>`);
}

function extractExcerpt(markdown, maxLength = 140) {
  const lines = String(markdown || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const text = lines.join(' ');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

function buildMissingEnvError(platform, itemId, vars) {
  return {
    ok: false,
    item_id: itemId,
    platform,
    status: 'error',
    published_at: null,
    external_post_id: null,
    error: {
      message: `missing required env for ${platform} publish: ${vars.join(', ')}`,
      code: 'MISSING_ENV',
      retryable: false
    },
    meta: {
      dry_run: false
    }
  };
}

function getMissingEnvVars(names) {
  return names.filter((name) => !process.env[name]);
}

function buildXAuthConfig() {
  return {
    apiKey: process.env.X_API_KEY,
    apiSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
    baseUrl: process.env.X_API_BASE_URL || X_CREATE_POST_URL
  };
}

function buildXOAuth1Header(auth, request) {
  const oauth = new OAuth({
    consumer: {
      key: auth.apiKey,
      secret: auth.apiSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    }
  });

  const authData = oauth.authorize(
    {
      url: request.url,
      method: request.method
    },
    {
      key: auth.accessToken,
      secret: auth.accessTokenSecret
    }
  );

  return oauth.toHeader(authData).Authorization;
}

function maskOAuthAuthorizationHeader(value) {
  if (!value || typeof value !== 'string' || !value.startsWith('OAuth ')) {
    return value;
  }

  return value.replace(/(oauth_(?:consumer_key|token|signature)="?)([^"]+)("?)/g, '$1***redacted***$3');
}

function sanitizeRequestForLogs(request) {
  if (!request) return request;

  return {
    ...request,
    headers: {
      ...(request.headers || {}),
      Authorization: maskOAuthAuthorizationHeader(request.headers?.Authorization)
    }
  };
}

async function createXPostRequest(input, auth) {
  const request = {
    url: auth.baseUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      text: input.text,
      reply: input.reply_to_post_id ? { in_reply_to_tweet_id: input.reply_to_post_id } : undefined
    }
  };

  request.headers.Authorization = buildXOAuth1Header(auth, request);
  return request;
}

async function sendXPost(input, auth) {
  const request = await createXPostRequest(input, auth);
  const requestForLogs = sanitizeRequestForLogs(request);

  if (process.env.X_REQUEST_SHAPE_ONLY === '1') {
    return {
      ok: false,
      item_id: input.item_id,
      platform: 'x',
      status: 'error',
      published_at: null,
      external_post_id: null,
      error: {
        message: 'x request shape only mode',
        code: 'REQUEST_SHAPE_ONLY',
        retryable: false
      },
      meta: {
        dry_run: false,
        request: requestForLogs
      }
    };
  }

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body)
    });

    const rawText = await response.text();
    let json = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        item_id: input.item_id,
        platform: 'x',
        status: 'error',
        published_at: null,
        external_post_id: null,
        error: {
          message: json?.detail || json?.title || `x publish failed with status ${response.status}`,
          code: `HTTP_${response.status}`,
          retryable: response.status >= 500 || response.status === 429
        },
        meta: {
          dry_run: false,
          raw_status: response.status,
          request: requestForLogs,
          response: json || rawText
        }
      };
    }

    const externalPostId = json?.data?.id || null;
    return {
      ok: true,
      item_id: input.item_id,
      platform: 'x',
      status: 'published',
      published_at: now(),
      external_post_id: externalPostId,
      error: null,
      meta: {
        dry_run: false,
        raw_status: response.status,
        request: requestForLogs,
        response: json
      }
    };
  } catch (error) {
    return {
      ok: false,
      item_id: input.item_id,
      platform: 'x',
      status: 'error',
      published_at: null,
      external_post_id: null,
      error: {
        message: error.message || 'network error',
        code: 'NETWORK_ERROR',
        retryable: true
      },
      meta: {
        dry_run: false,
        request: requestForLogs
      }
    };
  }
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
    content_html: markdownToHtml(content),
    excerpt: extractExcerpt(content),
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

function buildWordPressAuthConfig() {
  return {
    baseUrl: process.env.WP_BASE_URL,
    username: process.env.WP_USERNAME,
    appPassword: process.env.WP_APP_PASSWORD,
    apiBasePath: process.env.WP_API_BASE_PATH || '/wp-json/wp/v2',
    defaultStatus: process.env.WP_DEFAULT_STATUS || 'draft'
  };
}

function createWordPressPostRequest(input, auth) {
  const baseUrl = (auth.baseUrl || '').replace(/\/$/, '');
  const apiBasePath = auth.apiBasePath.startsWith('/') ? auth.apiBasePath : `/${auth.apiBasePath}`;
  const token = Buffer.from(`${auth.username || ''}:${auth.appPassword || ''}`).toString('base64');

  return {
    url: `${baseUrl}${apiBasePath}/posts`,
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json'
    },
    body: {
      status: input.status || auth.defaultStatus || 'draft',
      title: input.title,
      content: input.content_html || input.content_markdown || '',
      excerpt: input.excerpt || ''
    }
  };
}

async function sendWordPressPost(input, auth) {
  const request = createWordPressPostRequest(input, auth);

  if (process.env.WP_REQUEST_SHAPE_ONLY === '1') {
    return {
      ok: false,
      item_id: input.item_id,
      platform: 'wordpress',
      status: 'error',
      published_at: null,
      external_post_id: null,
      error: {
        message: 'wordpress request shape only mode',
        code: 'REQUEST_SHAPE_ONLY',
        retryable: false
      },
      meta: {
        dry_run: false,
        request
      }
    };
  }

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body)
    });

    const rawText = await response.text();
    let json = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        item_id: input.item_id,
        platform: 'wordpress',
        status: 'error',
        published_at: null,
        external_post_id: null,
        error: {
          message: json?.message || json?.code || `wordpress publish failed with status ${response.status}`,
          code: `HTTP_${response.status}`,
          retryable: response.status >= 500 || response.status === 429
        },
        meta: {
          dry_run: false,
          raw_status: response.status,
          request,
          response: json || rawText
        }
      };
    }

    return {
      ok: true,
      item_id: input.item_id,
      platform: 'wordpress',
      status: 'published',
      published_at: now(),
      external_post_id: json?.id ? String(json.id) : null,
      error: null,
      meta: {
        dry_run: false,
        raw_status: response.status,
        url: json?.link || null,
        wp_status: json?.status || request.body.status,
        request,
        response: json
      }
    };
  } catch (error) {
    return {
      ok: false,
      item_id: input.item_id,
      platform: 'wordpress',
      status: 'error',
      published_at: null,
      external_post_id: null,
      error: {
        message: error.message || 'network error',
        code: 'NETWORK_ERROR',
        retryable: true
      },
      meta: {
        dry_run: false,
        request
      }
    };
  }
}

async function publishToX(input) {
  const text = (input.text || '').trim();
  const maxChars = 280;
  const forceDryRun = process.env.PUBLISH_DRY_RUN_FORCE === '1' || process.env.X_DRY_RUN_FORCE === '1';
  const requestShapeOnly = process.env.X_REQUEST_SHAPE_ONLY === '1';
  const effectiveDryRun = input.dry_run === true || forceDryRun;

  if (!effectiveDryRun && !requestShapeOnly) {
    const missingEnv = getMissingEnvVars(['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET']);
    if (missingEnv.length > 0) {
      return buildMissingEnvError('x', input.item_id, missingEnv);
    }
  }

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
        dry_run: effectiveDryRun,
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
        dry_run: effectiveDryRun,
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
        dry_run: effectiveDryRun,
        raw_status: 400
      }
    };
  }

  if (!effectiveDryRun || requestShapeOnly) {
    const auth = buildXAuthConfig();
    return sendXPost(input, auth);
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
      dry_run: effectiveDryRun,
      media_count: Array.isArray(input.media) ? input.media.length : 0,
      text_length: text.length,
      input
    }
  };
}

async function publishToWordPress(input) {
  const forceDryRun = process.env.PUBLISH_DRY_RUN_FORCE === '1' || process.env.WP_DRY_RUN_FORCE === '1';
  const requestShapeOnly = process.env.WP_REQUEST_SHAPE_ONLY === '1';
  const effectiveDryRun = input.dry_run === true || forceDryRun;

  if (!effectiveDryRun && !requestShapeOnly) {
    const missingEnv = getMissingEnvVars(['WP_BASE_URL', 'WP_USERNAME', 'WP_APP_PASSWORD']);
    if (missingEnv.length > 0) {
      return buildMissingEnvError('wordpress', input.item_id, missingEnv);
    }
  }

  if (!effectiveDryRun || requestShapeOnly) {
    const auth = buildWordPressAuthConfig();
    return sendWordPressPost(input, auth);
  }

  return {
    ok: true,
    item_id: input.item_id,
    platform: 'wordpress',
    status: 'published',
    published_at: now(),
    external_post_id: `dryrun-wp-${input.item_id}`,
    error: null,
    meta: {
      dry_run: effectiveDryRun,
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
  const forceDryRun = process.env.PUBLISH_DRY_RUN_FORCE === '1' || process.env.NOTE_DRY_RUN_FORCE === '1';
  const effectiveDryRun = input.dry_run === true || forceDryRun;
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
      dry_run: effectiveDryRun,
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
  buildXAuthConfig,
  buildXOAuth1Header,
  createXPostRequest,
  sendXPost,
  publishToX,
  publishToWordPress,
  buildWordPressAuthConfig,
  createWordPressPostRequest,
  sendWordPressPost,
  publishToNote,
  runPublishForQueueItem
};
