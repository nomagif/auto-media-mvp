#!/usr/bin/env node

/**
 * Tech news collector MVP.
 *
 * Implements:
 * - RSS fetch
 * - item extraction
 * - simple article body extraction
 * - normalized JSON persistence
 * - collector state persistence
 *
 * Notes:
 * - currently uses built-in fetch + lightweight RSS parsing
 * - article extraction is heuristic HTML cleanup, not a full readability parser
 */

const path = require('path');
const {
  ensureDir,
  readJson,
  writeJson,
  appendJsonl,
  isoDate,
  sha256,
  slugify
} = require('../shared/file-utils');

function workspaceRoot() {
  return path.resolve(__dirname, '../..');
}

function resolveFromWorkspace(relativePath) {
  return path.join(workspaceRoot(), relativePath);
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeXmlEntities(text = '') {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTag(block, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? decodeXmlEntities(match[1].trim()) : '';
}

function extractAtomLink(block) {
  const altMatch = block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i)
    || block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*\/?>/i);
  if (altMatch) return altMatch[1];
  const anyHref = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return anyHref ? anyHref[1] : '';
}

function extractBlocks(xml, tagName) {
  const regex = new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return xml.match(regex) || [];
}

function normalizeFeedItems(xmlText) {
  if (/<rss\b/i.test(xmlText) || /<rdf:RDF\b/i.test(xmlText)) {
    const items = extractBlocks(xmlText, 'item');
    return items.map((item) => ({
      title: extractTag(item, 'title'),
      link: extractTag(item, 'link'),
      publishedAt: extractTag(item, 'pubDate') || extractTag(item, 'published') || '',
      summary: extractTag(item, 'description') || extractTag(item, 'content:encoded') || '',
      author: extractTag(item, 'author') || extractTag(item, 'dc:creator') || ''
    }));
  }

  if (/<feed\b/i.test(xmlText)) {
    const entries = extractBlocks(xmlText, 'entry');
    return entries.map((entry) => ({
      title: extractTag(entry, 'title'),
      link: extractAtomLink(entry),
      publishedAt: extractTag(entry, 'updated') || extractTag(entry, 'published') || '',
      summary: extractTag(entry, 'summary') || extractTag(entry, 'content') || '',
      author: extractTag(entry, 'name') || extractTag(entry, 'author') || ''
    }));
  }

  return [];
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'OpenClaw Automation MVP Collector/1.0',
      accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8'
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

function extractArticleText(html) {
  const articleMatch = html.match(/<article\b[\s\S]*?<\/article>/i);
  const mainMatch = html.match(/<main\b[\s\S]*?<\/main>/i);
  const bodyMatch = html.match(/<body\b[\s\S]*?<\/body>/i);
  const candidate = articleMatch?.[0] || mainMatch?.[0] || bodyMatch?.[0] || html;
  return stripHtml(candidate);
}

async function extractArticle(item) {
  try {
    const html = await fetchText(item.link);
    const text = extractArticleText(html);
    return {
      contentText: text.slice(0, 40000),
      extractionMethod: 'heuristic-html'
    };
  } catch (error) {
    return {
      contentText: stripHtml(item.summary || ''),
      extractionMethod: `feed-summary-fallback:${error.message}`
    };
  }
}

function buildNormalizedItem({ source, item, article, topic, language }) {
  const canonicalUrl = item.link;
  const id = `sha256:${sha256(canonicalUrl || `${source.id}:${item.title}`)}`;

  return {
    id,
    source_type: source.type,
    topic,
    source_id: source.id,
    title: item.title,
    url: item.link,
    canonical_url: canonicalUrl,
    published_at: item.publishedAt,
    collected_at: new Date().toISOString(),
    language,
    author: item.author,
    summary: stripHtml(item.summary || ''),
    content_text: article.contentText,
    metadata: {
      source_name: source.name,
      tags: source.tags || [],
      extraction_method: article.extractionMethod
    }
  };
}

async function collectSource(source, config) {
  const rssXml = await fetchText(source.url);
  const feedItems = normalizeFeedItems(rssXml).slice(0, config.defaults.maxItemsPerRun || 10);

  const normalized = [];
  for (const item of feedItems) {
    if (!item.link || !item.title) continue;
    const article = await extractArticle(item);
    normalized.push(buildNormalizedItem({
      source,
      item,
      article,
      topic: config.topic,
      language: config.defaults.language || 'en'
    }));
  }

  return {
    source,
    rssXml,
    normalized
  };
}

function persistCollectionResult(result, config) {
  const today = isoDate();
  const rawDir = resolveFromWorkspace(path.join(config.output.rawDir, today));
  const normalizedDir = resolveFromWorkspace(path.join(config.output.normalizedDir, today));
  const stateDir = resolveFromWorkspace(config.output.stateDir);
  const logFile = resolveFromWorkspace(config.output.logFile);

  ensureDir(rawDir);
  ensureDir(normalizedDir);
  ensureDir(stateDir);

  const rawFile = path.join(rawDir, `${result.source.id}.xml`);
  require('fs').writeFileSync(rawFile, result.rssXml, 'utf8');

  const state = {
    sourceId: result.source.id,
    lastCollectedAt: new Date().toISOString(),
    lastItemCount: result.normalized.length,
    lastUrls: result.normalized.map((item) => item.url).filter(Boolean).slice(0, 20)
  };
  writeJson(path.join(stateDir, `${result.source.id}.json`), state);

  for (const item of result.normalized) {
    const fileName = `${slugify(result.source.id)}-${slugify(item.title || item.id)}.json`;
    writeJson(path.join(normalizedDir, fileName), item);
    appendJsonl(logFile, {
      ts: new Date().toISOString(),
      topic: config.topic,
      source_id: result.source.id,
      item_id: item.id,
      url: item.url,
      action: 'normalized_saved'
    });
  }
}

async function main() {
  const config = readJson(resolveFromWorkspace('config/sources/tech-news.json'));

  if (!config.enabled) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'config disabled' }, null, 2));
    return;
  }

  const results = [];
  for (const source of config.sources) {
    const result = await collectSource(source, config);
    persistCollectionResult(result, config);
    results.push({
      source_id: source.id,
      item_count: result.normalized.length
    });
  }

  console.log(JSON.stringify({
    ok: true,
    topic: config.topic,
    date: isoDate(),
    results
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
