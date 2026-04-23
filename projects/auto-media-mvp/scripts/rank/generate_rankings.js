#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const OUTPUT_DIR = path.join(ROOT, 'data', 'rankings');
const STATE_DIR = path.join(ROOT, 'state');
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

function listJsonFiles(dir) {
  try {
    return fs.readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

function safeLower(value) {
  return String(value || '').toLowerCase();
}

function guessCategory(item) {
  const text = [item.title, item.body, item.source_name].map(safeLower).join('\n');
  if (/openai|anthropic|gemini|claude|llm|artificial intelligence|生成ai|ai\b/.test(text)) return 'ai';
  if (/bitcoin|ethereum|crypto|token|blockchain|etf|btc|eth/.test(text)) return 'crypto';
  if (/regulation|regulator|government|law|policy|antitrust|commission/.test(text)) return 'policy';
  if (/military|missile|navy|army|defense|war/.test(text)) return 'defense';
  if (/cpi|gdp|inflation|jobs|employment|central bank|interest rate/.test(text)) return 'macro';
  if (/startup|funding|seed|series a|series b|venture/.test(text)) return 'startups';
  if (/breach|hack|security|vulnerability|cyber/.test(text)) return 'security';
  if (/semiconductor|chip|tsmc|nvidia|intel|gpu/.test(text)) return 'semiconductors';
  if (/x\.com|twitter|reddit|tiktok|instagram|youtube|social/.test(text)) return 'social';
  return 'general';
}

function guessRegion(item) {
  const text = [item.title, item.body, item.source_url, item.source_name].map(safeLower).join('\n');
  if (/united states|u\.s\.| us |america|american|techcrunch|ycombinator/.test(` ${text} `)) return 'us';
  if (/european union|europe|eu\b|brussels|germany|france/.test(text)) return 'eu';
  if (/united kingdom|u\.k\.| uk |britain|british|london/.test(` ${text} `)) return 'uk';
  if (/china|chinese|beijing|shanghai/.test(text)) return 'china';
  if (/japan|japanese|tokyo/.test(text)) return 'japan';
  if (/asia|singapore|india|korea|taiwan/.test(text)) return 'asia';
  return 'global';
}

function guessTopics(item) {
  const text = [item.title, item.body].map(safeLower).join('\n');
  const topics = [];
  if (/funding|raised|series a|series b|investment/.test(text)) topics.push('funding');
  if (/acquisition|acquire|acquired|merger|m&a/.test(text)) topics.push('acquisition');
  if (/launch|released|release|introduce|debut/.test(text)) topics.push('product-launch');
  if (/regulation|regulator|policy|law|antitrust/.test(text)) topics.push('regulation');
  if (/earnings|revenue|profit|quarter/.test(text)) topics.push('earnings');
  if (/security|breach|hack|cyber/.test(text)) topics.push('security-incident');
  if (/partnership|partner|deal with/.test(text)) topics.push('partnership');
  if (/research|paper|study/.test(text)) topics.push('research');
  if (/chip|gpu|semiconductor/.test(text)) topics.push('chips');
  return topics.length > 0 ? topics : ['general'];
}

function guessEntities(item) {
  const text = `${item.title || ''} ${item.body || ''}`;
  const known = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Microsoft', 'Apple', 'Amazon', 'Nvidia', 'Stripe', 'Airwallex', 'World', 'Tinder', 'Bitcoin', 'Ethereum'];
  return known.filter((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
}

function normalizeItem(item) {
  return {
    ...item,
    category: guessCategory(item),
    region: guessRegion(item),
    topics: guessTopics(item),
    entities: guessEntities(item)
  };
}

function pushRanking(map, key, kind, label, item) {
  if (!key) return;
  if (!map.has(key)) {
    map.set(key, {
      key,
      kind,
      label,
      window: 'all',
      mention_count: 0,
      source_set: new Set(),
      region_set: new Set(),
      category_set: new Set(),
      sample_item_ids: [],
      sample_urls: []
    });
  }

  const row = map.get(key);
  row.mention_count += 1;
  if (item.source_name) row.source_set.add(item.source_name);
  if (item.region) row.region_set.add(item.region);
  if (item.category) row.category_set.add(item.category);
  if (item.id && row.sample_item_ids.length < 3) row.sample_item_ids.push(item.id);
  if (item.source_url && row.sample_urls.length < 3) row.sample_urls.push(item.source_url);
}

function finalizeRows(map, updatedAt) {
  return [...map.values()]
    .map((row) => ({
      key: row.key,
      kind: row.kind,
      label: row.label,
      window: row.window,
      mention_count: row.mention_count,
      source_count: row.source_set.size,
      region_mix: [...row.region_set],
      category_mix: [...row.category_set],
      delta_vs_prev: 0,
      delta_ratio: 0,
      streak_days: 1,
      sample_item_ids: row.sample_item_ids,
      sample_urls: row.sample_urls,
      updated_at: updatedAt
    }))
    .sort((a, b) => b.mention_count - a.mention_count || a.label.localeCompare(b.label));
}

function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(STATE_DIR);

  const files = listJsonFiles(NORMALIZED_DIR);
  const allItems = files.flatMap((file) => readJson(file, []));
  const items = allItems.filter((item) => item && typeof item === 'object').map(normalizeItem);
  const updatedAt = new Date().toISOString();

  const topicMap = new Map();
  const companyMap = new Map();
  const regionMap = new Map();
  const categoryMap = new Map();

  for (const item of items) {
    for (const topic of item.topics || []) {
      pushRanking(topicMap, `topic:${topic}`, 'topic', topic, item);
    }

    for (const entity of item.entities || []) {
      pushRanking(companyMap, `company:${entity.toLowerCase()}`, 'company', entity, item);
    }

    pushRanking(regionMap, `region:${item.region}`, 'region', item.region, item);
    pushRanking(categoryMap, `category:${item.category}`, 'category', item.category, item);
  }

  const output = {
    generated_at: updatedAt,
    inputs: files.map((file) => path.relative(ROOT, file)),
    counts: {
      items: items.length,
      topics: topicMap.size,
      companies: companyMap.size,
      regions: regionMap.size,
      categories: categoryMap.size
    },
    rankings: {
      topics: finalizeRows(topicMap, updatedAt),
      companies: finalizeRows(companyMap, updatedAt),
      regions: finalizeRows(regionMap, updatedAt),
      categories: finalizeRows(categoryMap, updatedAt)
    }
  };

  writeJson(path.join(OUTPUT_DIR, 'latest.json'), output);

  const lastRun = readJson(LAST_RUN_FILE, {});
  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    rank_generate: {
      ran_at: updatedAt,
      inputs: output.inputs,
      output_file: path.join('data', 'rankings', 'latest.json'),
      item_count: items.length
    }
  });

  console.log(JSON.stringify({
    ok: true,
    output_file: 'data/rankings/latest.json',
    item_count: items.length,
    counts: output.counts
  }, null, 2));
}

main();
