#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'output', 'rankings');
const RANKINGS_FILE = path.join(ROOT, 'data', 'rankings', 'latest.json');
const DIST_DIR = path.join(ROOT, 'site');

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
    return `<a href="${normalized}">${escapeHtml(label)}</a>`;
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

  const topTopics = (rankings.rankings?.topics || []).slice(0, 3);
  const topCompanies = (rankings.rankings?.companies || []).slice(0, 3);
  const topCategories = (rankings.rankings?.categories || []).slice(0, 3);
  const generatedAt = rankings.generated_at || 'unknown';

  const block = (title, rows, kind) => `
    <div class="highlight-block">
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${rows.map((row) => `<li><a href="/pages/${kind}/${row.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.html">${escapeHtml(row.label)}</a> <span class="meta">${row.mention_count} mentions</span></li>`).join('')}
      </ul>
    </div>`;

  return `
    <section class="highlights">
      <div class="highlights-header">
        <h2>Current Highlights</h2>
        <p>Generated at ${escapeHtml(generatedAt)}</p>
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

function renderListPage(title, rows, kind) {
  const items = (rows || []).map((row) => `
    <li>
      <a href="/pages/${kind}/${slugify(row.label)}.html">${escapeHtml(row.label)}</a>
      <span class="meta">${row.mention_count} mentions · ${row.source_count} sources</span>
    </li>`).join('');

  return `
    <h1>${escapeHtml(title)}</h1>
    <ul>${items}</ul>
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
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="eyebrow">AI / Macro Observatory</div>
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">A minimal static view of the ranking outputs for AI / Technology and Finance / Economics.</p>
    </div>
    <div class="nav">
      <a href="/index.html">Home</a>
      <a href="/latest.html">Latest</a>
      <a href="/pages/categories/ai.html">AI</a>
      <a href="/pages/categories/macro.html">Macro</a>
      <a href="/pages/topics/market-move.html">Market Move</a>
      <a href="/browse/topics.html">Browse Topics</a>
      <a href="/browse/companies.html">Browse Companies</a>
    </div>
    ${options.highlights || ''}
    <div class="card">
${body}
    </div>
    <div class="footer">Generated from <code>output/rankings</code> via the minimal static renderer.</div>
  </div>
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
  }

  for (const file of files) {
    const rel = path.relative(SRC_DIR, file);
    const dest = path.join(DIST_DIR, rel.replace(/\.md$/i, '.html'));
    ensureDir(path.dirname(dest));

    const markdown = fs.readFileSync(file, 'utf8');
    const firstHeading = (markdown.match(/^#\s+(.+)$/m) || [])[1] || 'Observatory';
    const isLanding = rel === 'index.md' || rel === 'latest.md';
    const html = wrapHtml(firstHeading, markdownToHtml(markdown), {
      highlights: isLanding ? `${renderDashboard(rankings)}${renderHighlights(rankings)}` : ''
    });
    fs.writeFileSync(dest, html, 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    source_dir: 'output/rankings',
    output_dir: 'site',
    files: files.length
  }, null, 2));
}

main();
