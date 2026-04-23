#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const NORMALIZED_DIR = path.join(ROOT, 'data', 'normalized');
const OUTPUT_DIR = path.join(ROOT, 'data', 'rankings');
const HISTORY_DIR = path.join(OUTPUT_DIR, 'history');
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

function isForumItem(item) {
  return /hacker news/i.test(String(item.source_name || '')) || /news\.ycombinator\.com/.test(String(item.source_url || ''));
}

function isOfficialItem(item) {
  return /federal reserve/i.test(String(item.source_name || '')) || /federalreserve\.gov/.test(String(item.source_url || '')) || String(item.source_type || '') === 'official';
}

function guessCategory(item) {
  const title = safeLower(item.title);
  const body = safeLower(item.body);
  const text = [title, body, item.source_name].map(safeLower).join('\n');

  if (/openai|anthropic|gemini|claude|llm|artificial intelligence|生成ai|\bai\b|model|inference|agentic|copilot|developer tool|coding assistant|gpu cloud/.test(text)) return 'ai';
  if (/cpi|gdp|inflation|jobs|employment|central bank|interest rate|fed\b|ecb\b|fomc|monetary policy|federal reserve|treasury|bond market|yield|tariff|macro/.test(text)) return 'macro';
  if (/regulation|regulator|government|law|policy|antitrust|commission|surveillance|court|supreme court|enforcement|supervision|rulemaking/.test(text)) return 'policy';
  if (/bitcoin|ethereum|crypto|token|blockchain|etf|btc|eth|solana|stablecoin/.test(text)) return 'crypto';
  if (/breach|hack|security flaw|vulnerability|cyber|exploit|malware|patched windows/.test(text)) return 'security';
  if (/semiconductor|chip|chips|tsmc|nvidia|intel|gpu|foundry/.test(text)) return 'semiconductors';
  if (/startup|funding|seed|series a|series b|venture|valuation|raises \$|raised \$/.test(text)) return 'startups';
  if (isOfficialItem(item) && /monetary policy|fomc|federal reserve|federal open market committee|interest rate|balance sheet|reserve bank/.test(text)) return 'macro';
  if (isOfficialItem(item) && /enforcement|banking|supervision|proposal|rule|board action|statement/.test(text)) return 'policy';
  if (/military|missile|navy|army|defense|war|weapon/.test(text)) return 'defense';
  if (/x\.com|twitter|reddit|tiktok|instagram|youtube|social|meeting|video feed|dating app|music archive/.test(text)) return 'social';
  if (/uber|airwallex|stripe|fintech|payments|consumer|app|platform/.test(text)) return 'general';
  if (isForumItem(item) && /open source|database|compiler|linux|programming|developer|infrastructure|security|chip|ai/.test(text)) return 'ai';
  if (isForumItem(item)) return 'general';
  return 'general';
}

function guessRegion(item) {
  const url = safeLower(item.source_url);
  const title = safeLower(item.title);
  const body = safeLower(item.body);
  const text = [title, body, url, item.source_name].map(safeLower).join('\n');

  if (isOfficialItem(item)) {
    if (/china|chinese|prc/.test(text)) return 'china';
    return 'us';
  }

  if (/techcrunch|news\.ycombinator\.com|united states|u\.s\.|america|american|supreme court/.test(text)) return 'us';
  if (/european union|europe|\beu\b|brussels|germany|france/.test(text)) return 'eu';
  if (/united kingdom|u\.k\.|britain|british|london/.test(text)) return 'uk';
  if (/china|chinese|beijing|shanghai/.test(text)) return 'china';
  if (/japan|japanese|tokyo/.test(text)) return 'japan';
  if (/asia|singapore|india|korea|taiwan/.test(text)) return 'asia';
  if (isForumItem(item)) return 'global';
  return 'global';
}

function guessTopics(item) {
  const text = [item.title, item.body].map(safeLower).join('\n');
  const topics = [];

  if (isOfficialItem(item) && /fomc|federal reserve|monetary policy|interest rate|balance sheet/.test(text)) topics.push('policy-announcement');
  if (isOfficialItem(item) && /inflation|employment|labor|growth|economic|market|yield|treasury/.test(text)) topics.push('market-move');
  if (String(item.source_type || '') === 'market-data') topics.push('market-move');
  if (/funding|raised|series a|series b|investment|valuation|raises \$|raised \$/.test(text)) topics.push('funding');
  if (/acquisition|acquire|acquired|merger|m&a/.test(text)) topics.push('acquisition');
  if (/launch|launched|released|release|introduce|debut|roll out/.test(text)) topics.push('product-launch');
  if (/regulation|regulator|policy|law|antitrust|surveillance|supervision|enforcement/.test(text)) topics.push('regulation');
  if (/earnings|revenue|profit|quarter/.test(text)) topics.push('earnings');
  if (/security|breach|hack|cyber|exploit|vulnerability/.test(text)) topics.push('security-incident');
  if (/partnership|partner|teams up|deal with|integrates with/.test(text)) topics.push('partnership');
  if (/research|paper|study/.test(text) && !isForumItem(item)) topics.push('research');
  if (/chip|gpu|semiconductor|foundry/.test(text)) topics.push('chips');
  if (/layoff|laid off|job cuts/.test(text)) topics.push('layoffs');
  if (/competition|compete|rival|going after each other/.test(text)) topics.push('competition');
  if (/verification|identity|human verification|orb/.test(text)) topics.push('identity');
  if (/recommendation|discovery|feed|archive/.test(text)) topics.push('consumer-apps');
  if (/developer tool|programming|open source|database|compiler|linux|infrastructure|cloud/.test(text) && !isOfficialItem(item)) topics.push('infrastructure');
  return [...new Set(topics)].length > 0 ? [...new Set(topics)] : ['general'];
}

function guessEntities(item) {
  const text = `${item.title || ''} ${item.body || ''}`;
  const known = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Microsoft', 'Apple', 'Amazon', 'Nvidia', 'TSMC', 'Intel', 'Stripe', 'Airwallex', 'World', 'Tinder', 'Bitcoin', 'Ethereum', 'Solana', 'XRP', 'BNB'];
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

function buildPreviousRowMap(previousRows = []) {
  return new Map((previousRows || []).map((row) => [row.key, row]));
}

function computeStreakDays(previousRow, mentionCount) {
  if (!previousRow || !mentionCount) return mentionCount > 0 ? 1 : 0;
  return previousRow.mention_count > 0 && mentionCount > 0 ? (previousRow.streak_days || 1) + 1 : 1;
}

function finalizeRows(map, updatedAt, previousRows = []) {
  const previousRowMap = buildPreviousRowMap(previousRows);

  return [...map.values()]
    .map((row) => {
      const previous = previousRowMap.get(row.key);
      const prevCount = previous?.mention_count || 0;
      const delta = row.mention_count - prevCount;
      const ratio = prevCount > 0 ? Number((delta / prevCount).toFixed(3)) : (row.mention_count > 0 ? 1 : 0);

      return {
        key: row.key,
        kind: row.kind,
        label: row.label,
        window: row.window,
        mention_count: row.mention_count,
        source_count: row.source_set.size,
        region_mix: [...row.region_set],
        category_mix: [...row.category_set],
        delta_vs_prev: delta,
        delta_ratio: ratio,
        streak_days: computeStreakDays(previous, row.mention_count),
        sample_item_ids: row.sample_item_ids,
        sample_urls: row.sample_urls,
        updated_at: updatedAt
      };
    })
    .sort((a, b) => b.mention_count - a.mention_count || b.delta_vs_prev - a.delta_vs_prev || a.label.localeCompare(b.label));
}

function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(HISTORY_DIR);
  ensureDir(STATE_DIR);

  const previousOutput = readJson(path.join(OUTPUT_DIR, 'latest.json'), null);
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
    source_types: [...new Set(items.map((item) => item.source_type).filter(Boolean))],
    inputs: files.map((file) => path.relative(ROOT, file)),
    counts: {
      items: items.length,
      topics: topicMap.size,
      companies: companyMap.size,
      regions: regionMap.size,
      categories: categoryMap.size
    },
    rankings: {
      topics: finalizeRows(topicMap, updatedAt, previousOutput?.rankings?.topics || []),
      companies: finalizeRows(companyMap, updatedAt, previousOutput?.rankings?.companies || []),
      regions: finalizeRows(regionMap, updatedAt, previousOutput?.rankings?.regions || []),
      categories: finalizeRows(categoryMap, updatedAt, previousOutput?.rankings?.categories || [])
    }
  };

  const historyName = `${updatedAt.replace(/[:.]/g, '-')}-rankings.json`;
  writeJson(path.join(HISTORY_DIR, historyName), output);
  writeJson(path.join(OUTPUT_DIR, 'latest.json'), output);

  const lastRun = readJson(LAST_RUN_FILE, {});
  writeJson(LAST_RUN_FILE, {
    ...lastRun,
    rank_generate: {
      ran_at: updatedAt,
      inputs: output.inputs,
      output_file: path.join('data', 'rankings', 'latest.json'),
      history_file: path.join('data', 'rankings', 'history', historyName),
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
