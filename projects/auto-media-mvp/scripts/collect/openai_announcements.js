#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw', 'official');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const STATE_DIR = path.join(ROOT, 'state');
const SEEN_URLS_FILE = path.join(STATE_DIR, 'seen_urls.json');
const LAST_RUN_FILE = path.join(STATE_DIR, 'last_run.json');

const OPENAI_SITEMAP_URL = 'https://openai.com/sitemap.xml';

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

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractUrlEntries(xml) {
  return [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => m[1])
    .map((entry) => {
      const loc = (entry.match(/<loc>([\s\S]*?)<\/loc>/i) || [])[1] || '';
      const lastmod = (entry.match(/<lastmod>([\s\S]*?)<\/lastmod>/i) || [])[1] || '';
      return {
        loc: decodeXml(loc.trim()),
        lastmod: decodeXml(lastmod.trim())
      };
    });
}

function isAnnouncementUrl(url) {
  return /openai\.com\/(news|index|research|product|blog)\//i.test(url) || /openai\.com\/index\//i.test(url);
}

function titleFromUrl(url) {
  const clean = String(url || '').replace(/https?:\/\/[^/]+\//, '').replace(/\/+$/, '');
  const last = clean.split('/').filter(Boolean).pop() || 'openai-update';
  return last
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function normalizeItem(entry, collectedAt, index) {
  const title = titleFromUrl(entry.loc);
  return {
    id: `openai-${new Date(collectedAt).toISOString().slice(0, 10)}-${String(index + 1).padStart(3, '0')}`,
    source_type: 'official',
    source_name: 'OpenAI',
    source_url: entry.loc,
    title,
    body: `OpenAI official announcement or publication detected from sitemap: ${stripHtml(title)}`,
    author: null,
    published_at: entry.lastmod ? new Date(entry.lastmod).toISOString() : null,
    collected_at: collectedAt,
    language: 'en',
    tags: ['ai', 'official', 'openai'],
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

  const rawXml = await fetchText(OPENAI_SITEMAP_URL);
  const rawName = `${isoSafe(new Date())}-openai-sitemap.xml`;
  fs.writeFileSync(path.join(RAW_DIR, rawName), rawXml, 'utf8');

  const entries = extractUrlEntries(rawXml)
    .filter((entry) => entry.loc)
    .filter((entry) => isAnnouncementUrl(entry.loc))
    .slice(0, 20);

  const normalized = entries
    .filter((entry) => !seenSet.has(entry.loc))
    .map((entry, index) => normalizeItem(entry, collectedAt, index));

  if (normalized.length > 0) {
    const outName = `${isoSafe(new Date())}-openai-normalized.json`;
    fs.writeFileSync(path.join(NORMALIZED_DIR, outName), JSON.stringify(normalized, null, 2) + '\n', 'utf8');

    const updatedSeen = [...new Set([...seenUrls, ...normalized.map((item) => item.source_url)])];
    writeJson(SEEN_URLS_FILE, updatedSeen);
    writeJson(LAST_RUN_FILE, {
      ...lastRun,
      openai_collect: {
        ran_at: collectedAt,
        raw_file: path.join('data', 'raw', 'official', rawName),
        normalized_file: path.join('data', 'normalized', outName),
        new_items: normalized.length
      }
    });

    console.log(JSON.stringify({
      ok: true,
      source: 'OpenAI',
      sitemap_url: OPENAI_SITEMAP_URL,
      raw_file: path.join('data', 'raw', 'official', rawName),
      normalized_file: path.join('data', 'normalized', outName),
      fetched_items: entries.length,
      new_items: normalized.length
    }, null, 2));
    return;
  }

  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    openai_collect: {
      ran_at: collectedAt,
      raw_file: path.join('data', 'raw', 'official', rawName),
      normalized_file: null,
      new_items: 0
    }
  });

  console.log(JSON.stringify({
    ok: true,
    source: 'OpenAI',
    sitemap_url: OPENAI_SITEMAP_URL,
    raw_file: path.join('data', 'raw', 'official', rawName),
    normalized_file: null,
    fetched_items: entries.length,
    new_items: 0,
    message: 'No new URLs found'
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
