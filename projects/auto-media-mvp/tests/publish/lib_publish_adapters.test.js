const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createXPostRequest,
  createWordPressPostRequest,
  sendXPost,
  sendWordPressPost,
  buildWordPressPublishInput
} = require('../../scripts/publish/lib_publish_adapters');

test('createXPostRequest builds OAuth header for JSON tweet posts', async () => {
  const request = await createXPostRequest(
    {
      item_id: 'item-1',
      text: 'hello world'
    },
    {
      apiKey: 'consumer-key',
      apiSecret: 'consumer-secret',
      accessToken: 'access-token',
      accessTokenSecret: 'access-secret',
      baseUrl: 'https://api.twitter.com/2/tweets'
    }
  );

  assert.equal(request.method, 'POST');
  assert.equal(request.headers['Content-Type'], 'application/json');
  assert.match(request.headers.Authorization, /^OAuth /);
  assert.ok(!request.headers.Authorization.includes('hello%20world'));
  assert.ok(!request.headers.Authorization.includes('text='));
  assert.deepEqual(request.body, { text: 'hello world', reply: undefined });
});

test('sendXPost masks OAuth credentials in error meta request logs', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: false,
    status: 401,
    async text() {
      return JSON.stringify({ title: 'Unauthorized', detail: 'Unauthorized' });
    }
  });

  try {
    const result = await sendXPost(
      {
        item_id: 'item-2',
        text: 'hello world'
      },
      {
        apiKey: 'consumer-key',
        apiSecret: 'consumer-secret',
        accessToken: 'access-token',
        accessTokenSecret: 'access-secret',
        baseUrl: 'https://api.twitter.com/2/tweets'
      }
    );

    assert.equal(result.ok, false);
    const authHeader = result.meta.request.headers.Authorization;
    assert.equal(authHeader.includes('consumer-key'), false);
    assert.equal(authHeader.includes('access-token'), false);
    assert.match(authHeader, /oauth_consumer_key="\*\*\*redacted\*\*\*"/);
    assert.match(authHeader, /oauth_token="\*\*\*redacted\*\*\*"/);
    assert.match(authHeader, /oauth_signature="\*\*\*redacted\*\*\*"/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('createWordPressPostRequest uses Basic auth for JSON posts', () => {
  const request = createWordPressPostRequest(
    {
      item_id: 'wp-item-1',
      title: 'hello',
      content_html: '<p>world</p>',
      excerpt: 'short',
      status: 'draft'
    },
    {
      baseUrl: 'https://example.com',
      username: 'noma',
      appPassword: 'app-pass',
      apiBasePath: '/wp-json/wp/v2',
      defaultStatus: 'draft'
    }
  );

  assert.equal(request.method, 'POST');
  assert.match(request.headers.Authorization, /^Basic /);
  assert.equal(request.headers['Content-Type'], 'application/json');
});

test('buildWordPressPublishInput strips h1 and appends source url metadata', () => {
  const fs = require('fs');
  const path = require('path');
  const draftRel = 'drafts/wordpress/test-wordpress-input.md';
  const draftAbs = path.resolve(__dirname, '../../', draftRel);
  fs.mkdirSync(path.dirname(draftAbs), { recursive: true });
  fs.writeFileSync(draftAbs, '# 見出し\n\n本文です。\n\n## 背景\n\n補足です。', 'utf8');

  const input = buildWordPressPublishInput({
    item_id: 'test-item',
    draft_file: draftRel,
    source_url: 'https://example.com/source',
    platform: 'wordpress'
  });

  assert.equal(input.title, '見出し');
  assert.equal(input.content_html.includes('<h1>'), false);
  assert.equal(input.content_html.includes('<h2>背景</h2>'), true);
  assert.equal(input.content_html.includes('https://example.com/source'), true);
  assert.deepEqual(input.categories, [2]);
  assert.equal(Array.isArray(input.tags), true);
});

test('sendWordPressPost masks Basic auth credentials in error meta request logs', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: false,
    status: 401,
    async text() {
      return JSON.stringify({ code: 'rest_forbidden', message: 'Unauthorized' });
    }
  });

  try {
    const result = await sendWordPressPost(
      {
        item_id: 'wp-item-2',
        title: 'hello',
        content_html: '<p>world</p>',
        excerpt: 'short',
        status: 'draft'
      },
      {
        baseUrl: 'https://example.com',
        username: 'noma',
        appPassword: 'app-pass',
        apiBasePath: '/wp-json/wp/v2',
        defaultStatus: 'draft'
      }
    );

    assert.equal(result.ok, false);
    assert.equal(result.meta.request.headers.Authorization, 'Basic ***redacted***');
  } finally {
    global.fetch = originalFetch;
  }
});
