#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'output', 'rankings');
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

function wrapHtml(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #0b1020; color: #e5e7eb; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
    a { color: #7dd3fc; }
    h1, h2, h3 { color: #fff; }
    h1 { font-size: 2rem; margin-top: 0; }
    h2 { margin-top: 2rem; border-bottom: 1px solid #243041; padding-bottom: .4rem; }
    h3 { margin-top: 1.4rem; }
    p, li { line-height: 1.65; }
    code { background: #111827; padding: .1rem .35rem; border-radius: 6px; }
    ul { padding-left: 1.2rem; }
    .nav { margin-bottom: 1.5rem; }
    .nav a { margin-right: 1rem; }
    .card { background: #111827; border: 1px solid #243041; border-radius: 12px; padding: 20px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="nav">
      <a href="/index.html">Home</a>
      <a href="/latest.html">Latest</a>
    </div>
    <div class="card">
${body}
    </div>
  </div>
</body>
</html>
`;
}

function main() {
  ensureDir(DIST_DIR);
  const files = listMarkdownFiles(SRC_DIR);

  for (const file of files) {
    const rel = path.relative(SRC_DIR, file);
    const dest = path.join(DIST_DIR, rel.replace(/\.md$/i, '.html'));
    ensureDir(path.dirname(dest));

    const markdown = fs.readFileSync(file, 'utf8');
    const firstHeading = (markdown.match(/^#\s+(.+)$/m) || [])[1] || 'Observatory';
    const html = wrapHtml(firstHeading, markdownToHtml(markdown));
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
