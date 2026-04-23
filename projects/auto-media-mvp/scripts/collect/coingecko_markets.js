#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw', 'market');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const STATE_DIR = path.join(ROOT, 'state');
const SEEN_URLS_FILE = path.join(STATE_DIR, 'seen_urls.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';

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
      'user-agent': 'auto-media-mvp/0.1 (+OpenClaw)',
      accept: 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

function buildCoinUrl(item) {
  return `https://www.coingecko.com/en/coins/${item.id}`;
}

function normalizeItem(item, collectedAt, rank) {
  const sourceUrl = buildCoinUrl(item);
  const price = item.current_price ?? null;
  const change24h = item.price_change_percentage_24h_in_currency ?? item.price_change_percentage_24h ?? null;

  return {
    id: `coingecko-${new Date(collectedAt).toISOString().slice(0, 10)}-${String(rank).padStart(3, '0')}`,
    source_type: 'market-data',
    source_name: 'CoinGecko',
    source_url: sourceUrl,
    title: `${item.name} market snapshot`,
    body: `${item.symbol?.toUpperCase() || item.id} market cap ${item.market_cap ?? 'unknown'}, current price ${price ?? 'unknown'}, 24h change ${change24h ?? 'unknown'}%.`,
    author: null,
    published_at: item.last_updated || collectedAt,
    collected_at: collectedAt,
    language: 'en',
    tags: ['crypto', 'market-data', item.symbol?.toUpperCase() || item.id],
    metrics: {
      rank,
      score: item.market_cap_rank ?? rank,
      price_change_24h: change24h
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

  const markets = await fetchJson(COINGECKO_URL);
  const rawName = `${isoSafe(new Date())}-coingecko-markets.json`;
  fs.writeFileSync(path.join(RAW_DIR, rawName), JSON.stringify(markets, null, 2) + '\n', 'utf8');

  const normalized = markets
    .map((item, index) => normalizeItem(item, collectedAt, index + 1))
    .filter((item) => item.source_url && !seenSet.has(item.source_url));

  if (normalized.length > 0) {
    const outName = `${isoSafe(new Date())}-coingecko-normalized.json`;
    fs.writeFileSync(path.join(NORMALIZED_DIR, outName), JSON.stringify(normalized, null, 2) + '\n', 'utf8');

    const updatedSeen = [...new Set([...seenUrls, ...normalized.map((item) => item.source_url)])];
    writeJson(SEEN_URLS_FILE, updatedSeen);
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      coingecko_collect: {
        ran_at: collectedAt,
        raw_file: path.join('data', 'raw', 'market', rawName),
        normalized_file: path.join('data', 'normalized', outName),
        new_items: normalized.length
      }
    });

    console.log(JSON.stringify({
      ok: true,
      source: 'CoinGecko',
      endpoint: COINGECKO_URL,
      raw_file: path.join('data', 'raw', 'market', rawName),
      normalized_file: path.join('data', 'normalized', outName),
      fetched_items: markets.length,
      new_items: normalized.length
    }, null, 2));
    return;
  }

  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    coingecko_collect: {
      ran_at: collectedAt,
      raw_file: path.join('data', 'raw', 'market', rawName),
      normalized_file: null,
      new_items: 0
    }
  });

  console.log(JSON.stringify({
    ok: true,
    source: 'CoinGecko',
    endpoint: COINGECKO_URL,
    raw_file: path.join('data', 'raw', 'market', rawName),
    normalized_file: null,
    fetched_items: markets.length,
    new_items: 0,
    message: 'No new URLs found'
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
