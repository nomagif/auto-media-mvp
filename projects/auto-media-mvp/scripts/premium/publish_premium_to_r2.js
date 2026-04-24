#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const PREMIUM_DIR = path.join(ROOT, 'premium');
const DEFAULT_PREFIX = 'premium';

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
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

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.json': return 'application/json; charset=utf-8';
    case '.csv': return 'text/csv; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.html': return 'text/html; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function buildSignature({ method, pathname, headers, payloadHash, timestamp, dateStamp, secretAccessKey }) {
  const canonicalHeaders = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), String(value).trim().replace(/\s+/g, ' ')])
    .sort(([a], [b]) => a.localeCompare(b));

  const canonicalHeadersString = canonicalHeaders.map(([name, value]) => `${name}:${value}\n`).join('');
  const signedHeaders = canonicalHeaders.map(([name]) => name).join(';');
  const canonicalRequest = [
    method.toUpperCase(),
    encodeRfc3986Path(pathname),
    '',
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

async function uploadFile({ accountId, bucket, accessKeyId, secretAccessKey, key, filePath, prefix }) {
  const body = fs.readFileSync(filePath);
  const payloadHash = sha256Hex(body);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = timestamp.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const objectKey = `${prefix.replace(/^\/+|\/+$/g, '')}/${key.replace(/^\/+/, '')}`;
  const pathname = `/${bucket}/${objectKey}`;
  const headers = {
    host,
    'content-type': contentTypeFor(filePath),
    'content-length': String(body.byteLength),
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': timestamp
  };

  const { signature, signedHeaders, credentialScope } = buildSignature({
    method: 'PUT',
    pathname,
    headers,
    payloadHash,
    timestamp,
    dateStamp,
    secretAccessKey
  });

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}${pathname}`, {
    method: 'PUT',
    headers: {
      ...headers,
      Authorization: authorization
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed for ${objectKey}: ${response.status} ${response.statusText}\n${text}`);
  }

  return {
    key: objectKey,
    size: body.byteLength,
    contentType: headers['content-type']
  };
}

async function main() {
  const accountId = requiredEnv('R2_ACCOUNT_ID');
  const bucket = requiredEnv('R2_BUCKET');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY');
  const prefix = env('R2_PREMIUM_PREFIX', DEFAULT_PREFIX);
  const files = listFiles(PREMIUM_DIR);

  if (files.length === 0) {
    throw new Error('No premium files found. Run npm run premium:build first.');
  }

  const uploaded = [];
  for (const filePath of files) {
    const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const premiumRelative = path.relative(PREMIUM_DIR, filePath).replace(/\\/g, '/');
    const result = await uploadFile({
      accountId,
      bucket,
      accessKeyId,
      secretAccessKey,
      key: premiumRelative,
      filePath,
      prefix
    });
    uploaded.push({
      source: relative,
      key: result.key,
      size: result.size,
      content_type: result.contentType
    });
  }

  console.log(JSON.stringify({
    ok: true,
    bucket,
    prefix,
    uploaded_count: uploaded.length,
    uploaded
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
