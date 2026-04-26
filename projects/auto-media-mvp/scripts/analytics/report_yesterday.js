#!/usr/bin/env node

const crypto = require('crypto');

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding);
}

function encodeRfc3986Path(pathname) {
  return pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`))
    .join('/');
}

function buildSignature({ method, pathname, query = '', headers, payloadHash, timestamp, dateStamp, secretAccessKey }) {
  const canonicalHeaders = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), String(value).trim().replace(/\s+/g, ' ')])
    .sort(([a], [b]) => a.localeCompare(b));

  const canonicalHeadersString = canonicalHeaders.map(([name, value]) => `${name}:${value}\n`).join('');
  const signedHeaders = canonicalHeaders.map(([name]) => name).join(';');
  const canonicalRequest = [
    method.toUpperCase(),
    encodeRfc3986Path(pathname),
    query,
    canonicalHeadersString,
    signedHeaders,
    payloadHash
  ].join('\n');

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    credentialScope,
    sha256Hex(Buffer.from(canonicalRequest, 'utf8'))
  ].join('\n');

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = crypto.createHmac('sha256', kDate).update('auto', 'utf8').digest();
  const kService = crypto.createHmac('sha256', kRegion).update('s3', 'utf8').digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request', 'utf8').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return { signature, signedHeaders, credentialScope };
}

async function signedFetch({ accountId, accessKeyId, secretAccessKey, method, pathname, query = '', body = '' }) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const payloadHash = sha256Hex(Buffer.from(body, 'utf8'));
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = timestamp.slice(0, 8);
  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': timestamp
  };

  const { signature, signedHeaders, credentialScope } = buildSignature({
    method,
    pathname,
    query,
    headers,
    payloadHash,
    timestamp,
    dateStamp,
    secretAccessKey
  });

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `https://${host}${pathname}${query ? `?${query}` : ''}`;
  return fetch(url, {
    method,
    headers: {
      ...headers,
      Authorization: authorization
    },
    body: body || undefined
  });
}

function xmlTagValues(xml, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  const out = [];
  let match;
  while ((match = regex.exec(xml))) out.push(match[1]);
  return out;
}

function decodeXml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function tokyoDayOffset(daysAgo = 1) {
  const now = new Date();
  const tokyo = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  tokyo.setHours(0, 0, 0, 0);
  tokyo.setDate(tokyo.getDate() - daysAgo);
  const y = tokyo.getFullYear();
  const m = String(tokyo.getMonth() + 1).padStart(2, '0');
  const d = String(tokyo.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function listKeys({ accountId, bucket, accessKeyId, secretAccessKey, prefix }) {
  const pathname = `/${bucket}`;
  const query = `list-type=2&prefix=${encodeURIComponent(prefix)}`;
  const response = await signedFetch({ accountId, accessKeyId, secretAccessKey, method: 'GET', pathname, query });
  const text = await response.text();
  if (!response.ok) throw new Error(`R2 list failed: ${response.status} ${response.statusText}\n${text}`);
  return xmlTagValues(text, 'Key').map(decodeXml);
}

async function getObjectText({ accountId, bucket, accessKeyId, secretAccessKey, key }) {
  const pathname = `/${bucket}/${key}`;
  const response = await signedFetch({ accountId, accessKeyId, secretAccessKey, method: 'GET', pathname });
  const text = await response.text();
  if (!response.ok) throw new Error(`R2 get failed for ${key}: ${response.status} ${response.statusText}\n${text}`);
  return text;
}

async function main() {
  const accountId = requiredEnv('R2_ACCOUNT_ID');
  const bucket = requiredEnv('R2_BUCKET');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY');
  const prefixBase = env('R2_PREMIUM_PREFIX', 'premium').replace(/^\/+|\/+$/g, '');
  const day = process.argv[2] || tokyoDayOffset(1);
  const prefix = `${prefixBase}/analytics/events/${day}/`;

  const keys = await listKeys({ accountId, bucket, accessKeyId, secretAccessKey, prefix });
  const events = [];
  for (const key of keys) {
    try {
      events.push(JSON.parse(await getObjectText({ accountId, bucket, accessKeyId, secretAccessKey, key })));
    } catch (error) {
      events.push({ event: 'parse_error', key, error: error.message || String(error) });
    }
  }

  const pageViews = events.filter((item) => item.event === 'page_view');
  const uniqueVisitors = new Set(pageViews.map((item) => item.client_id).filter(Boolean));
  const premiumClicks = events.filter((item) => String(item.event || '').startsWith('premium_') && !['premium_access_submit', 'premium_access_verified', 'premium_download_link'].includes(item.event));
  const eventCounts = {};
  for (const item of events) {
    const name = String(item.event || 'unknown');
    eventCounts[name] = (eventCounts[name] || 0) + 1;
  }

  console.log(JSON.stringify({
    ok: true,
    day,
    totals: {
      stored_events: events.length,
      page_views: pageViews.length,
      unique_visitors_estimate: uniqueVisitors.size,
      premium_clicks: premiumClicks.length
    },
    premium_click_breakdown: Object.fromEntries(Object.entries(eventCounts).filter(([name]) => name.startsWith('premium_')).sort(([a], [b]) => a.localeCompare(b))),
    top_pages: Object.entries(pageViews.reduce((acc, item) => {
      const key = item.page || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
