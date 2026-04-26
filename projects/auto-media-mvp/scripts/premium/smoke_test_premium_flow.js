#!/usr/bin/env node

const DEFAULT_SITE_BASE = process.env.PREMIUM_BASE_URL || 'https://auto-media-mvp.pages.dev';
const DEFAULT_API_BASE = process.env.PREMIUM_API_BASE_URL || 'https://auto-media-mvp-premium-api.iba-star-9929.workers.dev';

async function expectStatus(url, expectedStatus, label) {
  const response = await fetch(url, { redirect: 'follow' });
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected HTTP ${expectedStatus}, got ${response.status}`);
  }
  return { url: response.url, status: response.status, body: text };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = null;
  }
  return { response, text, json };
}

async function main() {
  const siteBase = DEFAULT_SITE_BASE.replace(/\/$/, '');
  const apiBase = DEFAULT_API_BASE.replace(/\/$/, '');
  const expires = Math.floor(Date.now() / 1000) + 900;

  const premiumPage = await expectStatus(`${siteBase}/premium`, 200, 'premium page');
  const accessPage = await expectStatus(`${siteBase}/premium-access`, 200, 'premium access page');

  if (!premiumPage.body.includes('Get on Gumroad')) {
    throw new Error('premium page: expected Gumroad CTA text');
  }
  if (!accessPage.body.includes('Get latest download links')) {
    throw new Error('premium access page: expected access form CTA text');
  }

  const auth = await postJson(`${apiBase}/api/premium/auth`, {
    product: 'weekly-json-snapshot',
    license_key: 'smoke-test-invalid-license',
    email: 'smoke@example.com'
  });

  if (auth.response.status !== 403) {
    throw new Error(`premium auth: expected HTTP 403 for invalid license, got ${auth.response.status}`);
  }
  if (!auth.json || auth.json.error !== 'That license does not exist for the provided product.') {
    throw new Error(`premium auth: unexpected response body: ${auth.text}`);
  }

  const downloadUrl = new URL('/api/premium/download', `${apiBase}/`);
  downloadUrl.searchParams.set('product', 'weekly-json-snapshot');
  downloadUrl.searchParams.set('file', 'premium/weekly/latest.json');
  downloadUrl.searchParams.set('expires', String(expires));
  downloadUrl.searchParams.set('sig', 'invalid-signature');
  downloadUrl.searchParams.set('filename', 'smoke.json');

  const download = await expectStatus(downloadUrl.toString(), 403, 'premium download invalid signature');
  let downloadJson;
  try {
    downloadJson = JSON.parse(download.body);
  } catch (_) {
    throw new Error(`premium download: expected JSON body, got: ${download.body}`);
  }
  if (downloadJson.error !== 'invalid signature') {
    throw new Error(`premium download: unexpected response body: ${download.body}`);
  }

  console.log(JSON.stringify({
    ok: true,
    site_base: siteBase,
    api_base: apiBase,
    checks: [
      { name: 'premium page', status: 'ok', url: premiumPage.url },
      { name: 'premium access page', status: 'ok', url: accessPage.url },
      { name: 'premium auth invalid license', status: 'ok', http_status: auth.response.status },
      { name: 'premium download invalid signature', status: 'ok', http_status: 403 }
    ],
    note: 'Smoke test verifies public pages and live premium API wiring without using a real customer license.'
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
