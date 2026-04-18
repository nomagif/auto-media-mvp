#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw', 'tech');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const STATE_DIR = path.join(ROOT, 'state');
const SEEN_URLS_FILE = path.join(STATE_DIR, 'seen_urls.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');

const TOP_STORIES_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const ITEM_URL = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

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

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'auto-media-mvp/0.1 (+OpenClaw)'
    }
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

function normalizeItem(item, collectedAt, rank) {
  return {
    id: `hn-${new Date(collectedAt).toISOString().slice(0, 10)}-${String(rank).padStart(3, '0')}`,
    source_type: 'tech',
    source_name: 'HackerNews',
    source_url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    title: item.title || '(untitled)',
    body: item.text || '',
    author: item.by || null,
    published_at: item.time ? new Date(item.time * 1000).toISOString() : null,
    collected_at: collectedAt,
    language: 'en',
    tags: ['Hacker News'],
    metrics: {
      rank,
      score: item.score ?? null,
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

  const ids = (await fetchJson(TOP_STORIES_URL)).slice(0, 20);
  const items = [];
  for (const id of ids) {
    const item = await fetchJson(ITEM_URL(id));
    items.push(item);
  }

  const rawName = `${isoSafe(new Date())}-hackernews-topstories.json`;
  fs.writeFileSync(path.join(RAW_DIR, rawName), JSON.stringify(items, null, 2) + '\n', 'utf8');

  const normalized = items
    .map((item, index) => normalizeItem(item, collectedAt, index + 1))
    .filter((item) => item.source_url && !seenSet.has(item.source_url));

  if (normalized.length > 0) {
    const outName = `${isoSafe(new Date())}-hackernews-normalized.json`;
    fs.writeFileSync(path.join(NORMALIZED_DIR, outName), JSON.stringify(normalized, null, 2) + '\n', 'utf8');

    const updatedSeen = [...new Set([...seenUrls, ...normalized.map((item) => item.source_url)])];
    writeJson(SEEN_URLS_FILE, updatedSeen);
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      hackernews_collect: {
        ran_at: collectedAt,
        raw_file: path.join('data', 'raw', 'tech', rawName),
        normalized_file: path.join('data', 'normalized', outName),
        new_items: normalized.length
      }
    });

    console.log(JSON.stringify({
      ok: true,
      source: 'HackerNews',
      raw_file: path.join('data', 'raw', 'tech', rawName),
      normalized_file: path.join('data', 'normalized', outName),
      fetched_items: items.length,
      new_items: normalized.length
    }, null, 2));
    return;
  }

  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    hackernews_collect: {
      ran_at: collectedAt,
      raw_file: path.join('data', 'raw', 'tech', rawName),
      normalized_file: null,
      new_items: 0
    }
  });

  console.log(JSON.stringify({
    ok: true,
    source: 'HackerNews',
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
