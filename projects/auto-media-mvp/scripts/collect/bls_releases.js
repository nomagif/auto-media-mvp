#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw', 'official');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const STATE_DIR = path.join(ROOT, 'state');
const SEEN_URLS_FILE = path.join(STATE_DIR, 'seen_urls.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');

const BLS_NEWS_URL = 'https://www.bls.gov/feed/bls_latest.rss';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function isoSafe(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'auto-media-mvp/0.1 (+OpenClaw)'
    }
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripCdata(value) {
  return String(value || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchTag(text, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = String(text || '').match(re);
  return m ? decodeXml(stripCdata(m[1]).trim()) : '';
}

function extractItems(xml) {
  const items = [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

  return items.map((item, index) => ({
    title: matchTag(item, 'title'),
    link: matchTag(item, 'link'),
    pubDate: matchTag(item, 'pubDate'),
    description: stripHtml(matchTag(item, 'description')),
    guid: matchTag(item, 'guid') || `bls-${index + 1}`
  }));
}

function normalizeItem(item, collectedAt, index) {
  return {
    id: `bls-${new Date(collectedAt).toISOString().slice(0, 10)}-${String(index + 1).padStart(3, '0')}`,
    source_type: 'official',
    source_name: 'BLS',
    source_url: item.link,
    title: item.title,
    body: item.description,
    author: null,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    collected_at: collectedAt,
    language: 'en',
    tags: ['macro', 'official', 'bls'],
    metrics: {
      rank: index + 1,
      score: null,
      price_change_24h: null
    }
  };
}

async function main() {
  ensureDir(RAW_DIR);
  ensureDir(NORMALIZED_DIR);
  ensureDir(STATE_DIR);

  const seenUrls = readJson(SEEN_URLS_FILE, []);
  const lastRun = readJson(LAST_RUN_FILE, {});
  const seenSet = new Set(seenUrls);
  const collectedAt = new Date().toISOString();

  const rawXml = await fetchText(BLS_NEWS_URL);
  const rawName = `${isoSafe(new Date())}-bls-latest.xml`;
  fs.writeFileSync(path.join(RAW_DIR, rawName), rawXml, 'utf8');

  const items = extractItems(rawXml).slice(0, 20);
  const normalized = items
    .filter((item) => item.link && !seenSet.has(item.link))
    .map((item, index) => normalizeItem(item, collectedAt, index));

  if (normalized.length > 0) {
    const outName = `${isoSafe(new Date())}-bls-normalized.json`;
    fs.writeFileSync(path.join(NORMALIZED_DIR, outName), JSON.stringify(normalized, null, 2) + '\n', 'utf8');

    const updatedSeen = [...new Set([...seenUrls, ...normalized.map((item) => item.source_url)])];
    writeJson(SEEN_URLS_FILE, updatedSeen);
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      bls_collect: {
        ran_at: collectedAt,
        raw_file: path.join('data', 'raw', 'official', rawName),
        normalized_file: path.join('data', 'normalized', outName),
        new_items: normalized.length
      }
    });

    console.log(JSON.stringify({
      ok: true,
      source: 'BLS',
      feed_url: BLS_NEWS_URL,
      raw_file: path.join('data', 'raw', 'official', rawName),
      normalized_file: path.join('data', 'normalized', outName),
      fetched_items: items.length,
      new_items: normalized.length
    }, null, 2));
    return;
  }

  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    bls_collect: {
      ran_at: collectedAt,
      raw_file: path.join('data', 'raw', 'official', rawName),
      normalized_file: null,
      new_items: 0
    }
  });

  console.log(JSON.stringify({
    ok: true,
    source: 'BLS',
    feed_url: BLS_NEWS_URL,
    raw_file: path.join('data', 'raw', 'official', rawName),
    normalized_file: null,
    fetched_items: items.length,
    new_items: 0,
    message: 'No new URLs found'
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
