#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SITE = path.join(ROOT, 'site');

const style = `:root { --bg:#0b1020; --panel:rgba(17,24,39,.88); --line:#243041; --text:#e5e7eb; --muted:#94a3b8; --link:#7dd3fc; --accent:#22c55e; }
* { box-sizing:border-box; }
body { margin:0; font-family:-apple-system,BlinkMacSystemFont,sans-serif; background:var(--bg); color:var(--text); }
.wrap { max-width:980px; margin:0 auto; padding:32px 20px 72px; }
.hero,.card { background:var(--panel); border:1px solid var(--line); border-radius:18px; padding:24px; margin-bottom:18px; }
.eyebrow { color:var(--accent); font-size:.9rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
.nav,.actions { display:flex; flex-wrap:wrap; gap:10px; margin:16px 0; }
.nav a,.button { text-decoration:none; color:#fff; border:1px solid var(--line); border-radius:999px; padding:.62rem .9rem; background:rgba(17,24,39,.78); display:inline-block; }
.button.primary { background:rgba(34,197,94,.28); border-color:rgba(34,197,94,.58); }
a { color:var(--link); }
h1,h2,h3 { color:#fff; }
p,li { line-height:1.7; }
.meta { color:var(--muted); }
.grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:16px; }
.kicker { font-size:1.1rem; color:#dbeafe; }`;

const pages = [
  {
    file: 'ai-trend-dataset.html',
    eyebrow: 'AI Trend Dataset',
    title: 'AI Trend Dataset for Weekly Media Monitoring',
    description: 'Reusable AI trend dataset with weekly JSON and CSV exports for dashboards, watchlists, analyst notes, and research workflows.',
    kicker: 'Track AI topics, companies, categories, mention deltas, and streaks without rebuilding the same spreadsheet by hand.',
    sections: [
      ['What this dataset helps with', ['Weekly AI media monitoring', 'Company and topic watchlists', 'Dashboard inputs and internal reporting', 'Spotting movement by mentions, deltas, and streaks']],
      ['Best fit', ['Analysts tracking AI narratives', 'Builders creating lightweight monitoring dashboards', 'Research teams that need reusable structured data instead of another newsletter']]
    ]
  },
  {
    file: 'tech-news-trends-csv.html',
    eyebrow: 'Tech News CSV',
    title: 'Tech News Trends CSV for Spreadsheets and Reporting',
    description: 'Download spreadsheet-ready tech news trend CSV files covering topics, companies, regions, categories, deltas, and streaks.',
    kicker: 'Use CSV exports as a weekly starting point for reporting, sorting, filtering, and manual review.',
    sections: [
      ['Included CSV slices', ['Topics CSV', 'Companies CSV', 'Regions CSV', 'Categories CSV', 'Metadata JSON']],
      ['Use it for', ['Weekly reporting tables', 'Market or product watchlists', 'Internal notes and briefings', 'Quick spreadsheet exploration']]
    ]
  },
  {
    file: 'ai-company-monitoring-spreadsheet.html',
    eyebrow: 'Company Monitoring',
    title: 'AI Company Monitoring Spreadsheet Inputs',
    description: 'Weekly company-level media signal exports for tracking AI company attention, mention counts, deltas, and streaks.',
    kicker: 'Start from company-level CSV/JSON data instead of manually collecting AI company mentions every week.',
    sections: [
      ['Company signals', ['Mention counts by company', 'Delta versus previous refresh', 'Source counts and sample URLs', 'Trend persistence through streak days']],
      ['Useful for', ['Competitive monitoring', 'Investor watchlists', 'Strategy research', 'Analyst dashboards']]
    ]
  },
  {
    file: 'weekly-market-signals-csv.html',
    eyebrow: 'Market Signals CSV',
    title: 'Weekly Market Signals CSV for AI, Tech, and Macro Trends',
    description: 'Spreadsheet-ready weekly market signal CSV files for AI, technology, macro, policy, security, regions, and companies.',
    kicker: 'A compact weekly input for teams that monitor narratives across AI, tech, macro, policy, and market-moving categories.',
    sections: [
      ['Signals tracked', ['AI and technology topics', 'Macro and policy categories', 'Company momentum', 'Regional attention shifts']],
      ['Why CSV', ['Easy to inspect', 'Easy to share', 'Easy to sort by mentions, deltas, or streaks', 'Fits analyst workflows immediately']]
    ]
  },
  {
    file: 'media-monitoring-json-api.html',
    eyebrow: 'JSON Monitoring Data',
    title: 'Media Monitoring JSON Data for Dashboards and Automation',
    description: 'Machine-readable weekly media monitoring JSON snapshot for AI, tech, macro, company, region, topic, and category rankings.',
    kicker: 'Use the weekly JSON snapshot as a seed for dashboards, alerts, scripts, and internal research automation.',
    sections: [
      ['JSON is best when', ['You want to ingest rankings programmatically', 'You need dashboard-ready structured data', 'You want trend movement in a repeatable schema', 'You prefer automation over spreadsheet cleanup']],
      ['Data shape', ['Topics, companies, regions, and categories', 'Mention counts and deltas', 'Streak days and source counts', 'Sample item IDs and URLs']]
    ]
  }
];

function esc(s) { return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function render(page) {
  const canonical = `https://auto-media-mvp.pages.dev/${page.file}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(page.title)} | AI / Macro Observatory</title>
  <meta name="description" content="${esc(page.description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${esc(page.title)}" />
  <meta property="og:description" content="${esc(page.description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <style>${style}</style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="eyebrow">${esc(page.eyebrow)}</div>
      <h1>${esc(page.title)}</h1>
      <p class="kicker">${esc(page.kicker)}</p>
      <div class="actions">
        <a class="button primary" href="/premium.html">View premium CSV / JSON packs</a>
        <a class="button" href="/samples/weekly-json-sample.json">Inspect JSON sample</a>
        <a class="button" href="/samples/weekly-topics-sample.csv">Download CSV sample</a>
      </div>
    </div>
    <div class="nav">
      <a href="/index.html">Home</a>
      <a href="/latest.html">Latest rankings</a>
      <a href="/browse/topics.html">Topics</a>
      <a href="/browse/companies.html">Companies</a>
      <a href="/premium.html">Premium data</a>
    </div>
    <div class="grid">
      ${page.sections.map(([h, items]) => `<div class="card"><h2>${esc(h)}</h2><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('\n      ')}
    </div>
    <div class="card">
      <h2>Free sample, paid reusable files</h2>
      <p class="meta">The public site is useful for browsing. The paid packs are built for reuse: CSV for spreadsheets and JSON for dashboards, scripts, alerts, and internal research workflows.</p>
      <div class="actions"><a class="button primary" href="/premium.html">See pricing and samples</a></div>
    </div>
  </div>
</body>
</html>
`;
}
for (const page of pages) fs.writeFileSync(path.join(SITE, page.file), render(page));
console.log(JSON.stringify({ ok: true, pages: pages.map(p => p.file) }, null, 2));
