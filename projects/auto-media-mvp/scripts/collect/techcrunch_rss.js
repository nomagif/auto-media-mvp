#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FEED_URL = 'https://techcrunch.com/feed/';
const ROOT = path.resolve(__dirname, '..', '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw', 'tech');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const STATE_DIR = path.join(ROOT, 'state');
const SEEN_URLS_FILE = path.join(STATE_DIR, 'seen_urls.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');

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

function extractItems(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

  return items.map((item, index) => ({
    title: matchTag(item, 'title'),
    link: matchTag(item, 'link'),
    pubDate: matchTag(item, 'pubDate'),
    creator: matchTag(item, 'dc:creator') || null,
    description: stripCdata(matchTag(item, 'description')),
    guid: matchTag(item, 'guid') || `techcrunch-${index + 1}`
  }));
}

function matchTag(text, tag) {
  const re = new RegExp(`<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'i');
  const m = text.match(re);
  return m ? decodeXml(stripCdata(m[1]).trim()) : '';
}

function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeItem(item, collectedAt, index) {
  return {
    id: `techcrunch-${new Date(collectedAt).toISOString().slice(0, 10)}-${String(index + 1).padStart(3, '0')}`,
    source_type: 'tech',
    source_name: 'TechCrunch',
    source_url: item.link,
    title: item.title,
    body: stripHtml(item.description || ''),
    author: item.creator,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    collected_at: collectedAt,
    language: 'en',
    tags: [],
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
  const rawXml = await fetchText(FEED_URL);
  const rawName = `${isoSafe(new Date())}-techcrunch-feed.xml`;
  fs.writeFileSync(path.join(RAW_DIR, rawName), rawXml, 'utf8');

  const items = extractItems(rawXml).slice(0, 20);
  const freshItems = items.filter((item) => item.link && !seenSet.has(item.link));
  const normalized = freshItems.map((item, index) => normalizeItem(item, collectedAt, index));

  if (normalized.length > 0) {
    const outName = `${isoSafe(new Date())}-techcrunch-normalized.json`;
    fs.writeFileSync(path.join(NORMALIZED_DIR, outName), JSON.stringify(normalized, null, 2) + '\n', 'utf8');

    const updatedSeen = [...new Set([...seenUrls, ...normalized.map((item) => item.source_url)])];
    writeJson(SEEN_URLS_FILE, updatedSeen);
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      techcrunch_collect: {
        ran_at: collectedAt,
        raw_file: path.join('data', 'raw', 'tech', rawName),
        normalized_file: path.join('data', 'normalized', outName),
        new_items: normalized.length
      }
    });

    console.log(JSON.stringify({
      ok: true,
      source: 'TechCrunch',
      feed_url: FEED_URL,
      raw_file: path.join('data', 'raw', 'tech', rawName),
      normalized_file: path.join('data', 'normalized', outName),
      fetched_items: items.length,
      new_items: normalized.length
    }, null, 2));
    return;
  }

  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    techcrunch_collect: {
      ran_at: collectedAt,
      raw_file: path.join('data', 'raw', 'tech', rawName),
      normalized_file: null,
      new_items: 0
    }
  });

  console.log(JSON.stringify({
    ok: true,
    source: 'TechCrunch',
    feed_url: FEED_URL,
    raw_file: path.join('data', 'raw', 'tech', rawName),
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
