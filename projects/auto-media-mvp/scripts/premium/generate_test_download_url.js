#!/usr/bin/env node

const crypto = require('crypto');

const PRODUCTS = {
  'weekly-json-snapshot': {
    file: 'premium/weekly/latest.json',
    filename: 'ai-macro-observatory-weekly-json-snapshot.json'
  },
  'weekly-csv-pack': {
    file: 'premium/weekly/latest-topics.csv',
    filename: 'ai-macro-observatory-topics.csv'
  },
  '30-day-archive-pack': {
    file: 'premium/archive/30-day/latest-manifest.json',
    filename: 'ai-macro-observatory-30-day-archive-manifest.json'
  },
  'full-ranking-dataset-pack': {
    file: 'premium/full-dataset/latest.json',
    filename: 'ai-macro-observatory-full-ranking-dataset.json'
  }
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function sign(secret, message) {
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}

function main() {
  const baseUrl = process.env.PREMIUM_BASE_URL || 'https://auto-media-mvp.pages.dev';
  const product = process.argv[2] || 'weekly-json-snapshot';
  const ttlSeconds = Number(process.env.TEST_LINK_TTL_SECONDS || '900');
  const secret = requiredEnv('DOWNLOAD_SIGNING_SECRET');
  const selected = PRODUCTS[product];
  if (!selected) {
    throw new Error(`Unknown product: ${product}. Expected one of: ${Object.keys(PRODUCTS).join(', ')}`);
  }

  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = sign(secret, `${product}:${selected.file}:${expires}`);
  const url = new URL('/api/premium/download', baseUrl);
  url.searchParams.set('product', product);
  url.searchParams.set('file', selected.file);
  url.searchParams.set('expires', String(expires));
  url.searchParams.set('sig', sig);
  url.searchParams.set('filename', selected.filename);

  console.log(JSON.stringify({
    ok: true,
    product,
    expires_at: new Date(expires * 1000).toISOString(),
    url: url.toString()
  }, null, 2));
}

main();
