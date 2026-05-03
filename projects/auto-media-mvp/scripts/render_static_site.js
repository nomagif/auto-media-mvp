#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'output', 'rankings');
const RANKINGS_FILE = path.join(ROOT, 'data', 'rankings', 'latest.json');
const DIST_DIR = path.join(ROOT, 'site');
const BASE_PATH = normalizeBasePath(process.env.SITE_BASE_PATH || '');
const PREMIUM_API_BASE = (process.env.PREMIUM_API_BASE || 'https://auto-media-mvp-premium-api.iba-star-9929.workers.dev').replace(/\/$/, '');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMarkdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function normalizeBasePath(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned || cleaned === '/') return '';
  return `/${cleaned.replace(/^\/+|\/+$/g, '')}`;
}

function sitePath(targetPath) {
  const normalized = String(targetPath || '').startsWith('/') ? String(targetPath) : `/${String(targetPath || '')}`;
  return `${BASE_PATH}${normalized}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineFormat(text) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const normalized = href.endsWith('.md') ? href.replace(/\.md$/i, '.html') : href;
    const linked = normalized.startsWith('/') ? sitePath(normalized) : normalized;
    return `<a href="${linked}">${escapeHtml(label)}</a>`;
  });
  return out;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const parts = [];
  let inList = false;

  function closeList() {
    if (inList) {
      parts.push('</ul>');
      inList = false;
    }
  }

  for (const line of lines) {
    if (!line.trim()) {
      closeList();
      continue;
    }

    if (/^###\s+/.test(line)) {
      closeList();
      parts.push(`<h3>${inlineFormat(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      closeList();
      parts.push(`<h2>${inlineFormat(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      closeList();
      parts.push(`<h1>${inlineFormat(line.replace(/^#\s+/, ''))}</h1>`);
      continue;
    }
    if (/^-\s+/.test(line)) {
      if (!inList) {
        parts.push('<ul>');
        inList = true;
      }
      parts.push(`<li>${inlineFormat(line.replace(/^-\s+/, ''))}</li>`);
      continue;
    }

    closeList();
    parts.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeList();
  return parts.join('\n');
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function renderDashboard(rankings) {
  if (!rankings) return '';
  const counts = rankings.counts || {};
  const sourceTypes = (rankings.source_types || []).join(', ');
  return `
    <section class="dashboard">
      <div class="metric"><div class="metric-label">Items</div><div class="metric-value">${counts.items || 0}</div></div>
      <div class="metric"><div class="metric-label">Topics</div><div class="metric-value">${counts.topics || 0}</div></div>
      <div class="metric"><div class="metric-label">Companies</div><div class="metric-value">${counts.companies || 0}</div></div>
      <div class="metric"><div class="metric-label">Categories</div><div class="metric-value">${counts.categories || 0}</div></div>
      <div class="metric wide"><div class="metric-label">Source Types</div><div class="metric-value small">${escapeHtml(sourceTypes || 'n/a')}</div></div>
    </section>
  `;
}

function renderHighlights(rankings) {
  if (!rankings) return '';

  const topTopics = visibleRows(rankings.rankings?.topics || []).slice(0, 3);
  const topCompanies = visibleRows(rankings.rankings?.companies || []).slice(0, 3);
  const topCategories = visibleRows(rankings.rankings?.categories || []).slice(0, 3);
  const generatedAt = rankings.generated_at || 'unknown';

  const block = (title, rows, kind) => `
    <div class="highlight-block">
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${rows.map((row) => `<li><a href="${sitePath(`/pages/${kind}/${row.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.html`)}">${escapeHtml(row.label)}</a> <span class="meta">${row.mention_count} mentions</span></li>`).join('')}
      </ul>
    </div>`;

  return `
    <section class="highlights">
      <div class="highlights-header">
        <h2>Current Highlights</h2>
        <p>Generated at ${escapeHtml(generatedAt)} · metrics view only · sensitive policy / conflict-adjacent rows are de-emphasized on the public UI</p>
      </div>
      <div class="highlight-grid">
        ${block('Top Topics', topTopics, 'topics')}
        ${block('Top Companies', topCompanies, 'companies')}
        ${block('Top Categories', topCategories, 'categories')}
      </div>
    </section>
  `;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isSensitiveRow(row) {
  const label = String(row?.label || '').toLowerCase();
  const key = String(row?.key || '').toLowerCase();
  const categories = (row?.category_mix || []).map((value) => String(value).toLowerCase());
  const sensitiveTerms = [
    'policy',
    'regulation',
    'security-incident',
    'surveillance',
    'war',
    'conflict',
    'defense',
    'military'
  ];

  return sensitiveTerms.some((term) => label.includes(term) || key.includes(term) || categories.includes(term));
}

function visibleRows(rows, options = {}) {
  const { includeSensitive = false } = options;
  return (rows || []).filter((row) => includeSensitive || !isSensitiveRow(row));
}

function renderListPage(title, rows, kind, options = {}) {
  const filteredRows = visibleRows(rows, options);
  const items = filteredRows.map((row) => `
    <li>
      <a href="${sitePath(`/pages/${kind}/${slugify(row.label)}.html`)}">${escapeHtml(row.label)}</a>
      <span class="meta">${row.mention_count} mentions · ${row.source_count} sources</span>
    </li>`).join('');

  const note = options.includeSensitive
    ? '<p class="meta">This index includes sensitive rows.</p>'
    : '<p class="meta">Sensitive policy / conflict-adjacent rows are omitted from this public browse view.</p>';

  return `
    <h1>${escapeHtml(title)}</h1>
    ${note}
    <ul>${items}</ul>
  `;
}

function renderSourceTypePage(rankings) {
  const sourceTypes = rankings?.source_types || [];
  const cards = sourceTypes.map((type) => {
    const relatedTopics = visibleRows(rankings.rankings?.topics || [])
      .filter((row) => (row.category_mix || []).length > 0)
      .slice(0, 5)
      .map((row) => `<li><a href="${sitePath(`/pages/topics/${slugify(row.label)}.html`)}">${escapeHtml(row.label)}</a> <span class="meta">${row.mention_count}</span></li>`)
      .join('');

    return `
      <div class="highlight-block">
        <h3>${escapeHtml(type)}</h3>
        <p class="meta">Current source type in the observatory mix, shown as a structural signal rather than commentary.</p>
        <ul>${relatedTopics}</ul>
      </div>`;
  }).join('');

  return `
    <h1>Browse Source Types</h1>
    <p class="meta">Current source mix across the observatory.</p>
    <div class="highlight-grid">${cards}</div>
  `;
}

function analyticsSnippet() {
  return `
  <script>
    (() => {
      const API_BASE = '${escapeHtml(PREMIUM_API_BASE)}';
      const STORAGE_KEY = 'auto_media_mvp_client_id';
      function getClientId() {
        try {
          let value = localStorage.getItem(STORAGE_KEY);
          if (!value) {
            value = (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2));
            localStorage.setItem(STORAGE_KEY, value);
          }
          return value;
        } catch (_) {
          return 'anon';
        }
      }
      function track(eventName) {
        try {
          const payload = JSON.stringify({
            event: eventName,
            page: location.pathname,
            ts: new Date().toISOString(),
            client_id: getClientId(),
            referrer: document.referrer || ''
          });
          const url = API_BASE + '/api/premium/event';
          const blob = new Blob([payload], { type: 'application/json' });
          const sent = navigator.sendBeacon ? navigator.sendBeacon(url, blob) : false;
          if (!sent && window.fetch) {
            fetch(url, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: payload,
              mode: 'cors',
              keepalive: true
            }).catch(() => {});
          }
        } catch (_) {}
      }
      track('page_view');
      document.addEventListener('click', (event) => {
        const target = event.target.closest?.('[data-track]');
        if (target?.dataset?.track) track(target.dataset.track);
      });
    })();
  </script>`;
}

function premiumCtaSection() {
  return `
    <section class="premium-cta">
      <div class="premium-cta-copy">
        <div class="eyebrow">Premium data</div>
        <h2>Want the reusable export behind these rankings?</h2>
        <p class="meta">Use the weekly JSON and CSV packs when you want to move from browsing to dashboards, watchlists, spreadsheets, or internal briefs without rebuilding the collection workflow yourself.</p>
      </div>
      <div class="premium-cta-actions">
        <a href="${sitePath('/premium.html')}" data-track="premium_cta_view_offer">See premium datasets</a>
        <a href="${sitePath('/samples/weekly-json-sample.json')}" data-track="premium_cta_sample_json">Preview JSON sample</a>
        <a href="${sitePath('/samples/weekly-topics-sample.csv')}" data-track="premium_cta_sample_csv">Preview CSV sample</a>
      </div>
    </section>
  `;
}

function wrapHtml(title, body, options = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #0b1020;
      --panel: rgba(17, 24, 39, 0.88);
      --panel-2: rgba(15, 23, 42, 0.9);
      --line: #243041;
      --text: #e5e7eb;
      --muted: #94a3b8;
      --link: #7dd3fc;
      --accent: #8b5cf6;
      --accent-2: #22c55e;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(139, 92, 246, 0.18), transparent 28%),
        radial-gradient(circle at top right, rgba(34, 197, 94, 0.14), transparent 24%),
        var(--bg);
      color: var(--text);
    }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 32px 20px 72px; }
    a { color: var(--link); }
    h1, h2, h3 { color: #fff; line-height: 1.2; }
    h1 { font-size: 2.3rem; margin-top: 0; margin-bottom: .4rem; }
    h2 { margin-top: 2rem; border-bottom: 1px solid var(--line); padding-bottom: .5rem; }
    h3 { margin-top: 1.4rem; }
    p, li { line-height: 1.7; }
    p { color: var(--text); }
    code { background: #111827; padding: .1rem .35rem; border-radius: 6px; color: #c4b5fd; }
    ul { padding-left: 1.2rem; }
    .hero {
      margin-bottom: 1.2rem;
      background: linear-gradient(135deg, rgba(17,24,39,.92), rgba(15,23,42,.96));
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
    }
    .eyebrow { color: var(--accent-2); font-size: .9rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    .subtitle { color: var(--muted); margin: 0; }
    .nav {
      margin-bottom: 1.2rem;
      display: flex;
      flex-wrap: wrap;
      gap: .7rem;
    }
    .nav a {
      margin-right: 0;
      text-decoration: none;
      color: #fff;
      background: rgba(17,24,39,.78);
      border: 1px solid var(--line);
      padding: .55rem .8rem;
      border-radius: 999px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,.18);
      backdrop-filter: blur(8px);
    }
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 14px;
      margin: 0 0 1.2rem;
    }
    .metric {
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px;
    }
    .metric.wide { grid-column: span 2; }
    .metric-label { color: var(--muted); font-size: .85rem; text-transform: uppercase; letter-spacing: .05em; }
    .metric-value { color: #fff; font-size: 1.8rem; font-weight: 700; margin-top: .35rem; }
    .metric-value.small { font-size: 1rem; font-weight: 600; line-height: 1.4; }
    .highlights {
      margin: 0 0 1.2rem;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 20px;
    }
    .highlights-header p, .meta { color: var(--muted); font-size: .95rem; }
    .highlight-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .highlight-block {
      background: rgba(17,24,39,.5);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
    }
    .highlight-block h3 { margin-top: 0; }
    .footer {
      color: var(--muted);
      margin-top: 1rem;
      font-size: .95rem;
    }
    .premium-cta {
      margin-top: 1rem;
      background: linear-gradient(135deg, rgba(34, 197, 94, .12), rgba(125, 211, 252, .08));
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 20px;
    }
    .premium-cta h2 {
      border-bottom: 0;
      padding-bottom: 0;
      margin-top: .25rem;
      margin-bottom: .55rem;
    }
    .premium-cta-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }
    .premium-cta-actions a {
      text-decoration: none;
      color: #fff;
      background: rgba(17,24,39,.78);
      border: 1px solid var(--line);
      padding: .65rem .9rem;
      border-radius: 999px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="eyebrow">AI / Macro Observatory</div>
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">A minimal static view of signals, counts, rankings, and changes for AI / Technology and Finance / Economics.</p>
      <p class="meta">Free layer: public observatory and top rankings. Paid layer: full datasets, historical exports, and packaged premium snapshots.</p>
    </div>
    <div class="nav">
      <a href="${sitePath('/index.html')}">Home</a>
      <a href="${sitePath('/latest.html')}">Latest</a>
      <a href="${sitePath('/pages/categories/ai.html')}">AI</a>
      <a href="${sitePath('/pages/categories/macro.html')}">Macro</a>
      <a href="${sitePath('/pages/topics/market-move.html')}">Market Move</a>
      <a href="${sitePath('/browse/topics.html')}">Browse Topics</a>
      <a href="${sitePath('/browse/companies.html')}">Browse Companies</a>
      <a href="${sitePath('/browse/source-types.html')}">Source Types</a>
      <a href="${sitePath('/premium.html')}">Premium</a>
    </div>
    ${options.highlights || ''}
    <div class="card">
${body}
    </div>
    ${options.premiumCta || ''}
    <div class="footer">Generated from <code>output/rankings</code> via the minimal static renderer. This surface is intended to show metrics and observed changes, not narrative analysis. Premium monetization should stay automation-first: weekly CSV / JSON snapshots, historical exports, packaged feeds, and later API access.</div>
  </div>
${analyticsSnippet()}
</body>
</html>
`;
}

function main() {
  ensureDir(DIST_DIR);
  const files = listMarkdownFiles(SRC_DIR);
  const rankings = readJson(RANKINGS_FILE, null);

  if (rankings) {
    ensureDir(path.join(DIST_DIR, 'browse'));
    fs.writeFileSync(path.join(DIST_DIR, 'browse', 'topics.html'), wrapHtml('Browse Topics', renderListPage('Browse Topics', rankings.rankings?.topics || [], 'topics')), 'utf8');
    fs.writeFileSync(path.join(DIST_DIR, 'browse', 'companies.html'), wrapHtml('Browse Companies', renderListPage('Browse Companies', rankings.rankings?.companies || [], 'companies')), 'utf8');
    fs.writeFileSync(path.join(DIST_DIR, 'browse', 'categories.html'), wrapHtml('Browse Categories', renderListPage('Browse Categories', rankings.rankings?.categories || [], 'categories')), 'utf8');
    fs.writeFileSync(path.join(DIST_DIR, 'browse', 'regions.html'), wrapHtml('Browse Regions', renderListPage('Browse Regions', rankings.rankings?.regions || [], 'regions')), 'utf8');
    fs.writeFileSync(path.join(DIST_DIR, 'browse', 'source-types.html'), wrapHtml('Browse Source Types', renderSourceTypePage(rankings)), 'utf8');
  }

  for (const file of files) {
    const rel = path.relative(SRC_DIR, file);
    const dest = path.join(DIST_DIR, rel.replace(/\.md$/i, '.html'));
    ensureDir(path.dirname(dest));

    const markdown = fs.readFileSync(file, 'utf8');
    const firstHeading = (markdown.match(/^#\s+(.+)$/m) || [])[1] || 'Observatory';
    const isLanding = rel === 'index.md' || rel === 'latest.md';
    const html = wrapHtml(firstHeading, markdownToHtml(markdown), {
      highlights: isLanding ? `${renderDashboard(rankings)}${renderHighlights(rankings)}` : '',
      premiumCta: premiumCtaSection()
    });
    fs.writeFileSync(dest, html, 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    source_dir: 'output/rankings',
    output_dir: 'site',
    base_path: BASE_PATH || '/',
    files: files.length
  }, null, 2));
}

main();
