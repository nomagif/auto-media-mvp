#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const outDir = path.join(ROOT, 'site', 'marketing', 'scheduled-x');
fs.mkdirSync(outDir, { recursive: true });
const url = 'https://auto-media-mvp.pages.dev/premium';
const posts = [
`Most AI/news monitoring becomes copy-paste work.

I built a small observatory that turns weekly signals into reusable CSV/JSON: topics, companies, categories, deltas, streaks.

${url}

#AI #TechNews #MarketSignals`,
`If you maintain a market/AI watchlist, the annoying part is rebuilding the same weekly table.

This is a lightweight data product for that: AI / tech / macro rankings as CSV or JSON.

${url}

#AI #TechNews #MarketSignals`,
`This week’s observatory snapshot tracks 442 items across AI, tech, macro, policy, security, regions, and companies.

Clean JSON/CSV files for dashboards and spreadsheets.

${url}

#AI #TechNews #MarketSignals`,
`Spreadsheet-first version is live.

Weekly CSV pack includes topics, companies, regions, categories, and metadata.

Built for quick reporting, not another newsletter.

${url}

#AI #CSV #MarketSignals`,
`For builders/analysts: the weekly JSON snapshot is live.

Use it as a seed for dashboards, watchlists, alerts, research workflows, and internal briefs.

${url}

#AI #JSON #TechNews`,
`A useful data product should be boring in the right way.

Weekly rankings as CSV/JSON so you can reuse the data instead of rereading the same signals manually.

${url}

#AI #Data #MarketSignals`,
`If your weekly research memo starts with “collect the same AI/macro signals again,” this is for you.

Reusable CSV/JSON trend exports, with samples before purchase.

${url}

#AI #Research #MarketSignals`,
`The free site is for browsing.

The paid packs are for reusing the data: dashboards, spreadsheets, watchlists, alerts, and weekly internal notes.

${url}

#AI #TechNews #MarketSignals`,
`CSV is the simplest way to test the product.

Open it in a spreadsheet, sort by mentions/deltas/streaks, and see whether it helps weekly monitoring.

${url}

#AI #CSV #TechNews`,
`JSON version is for automation.

If you want the AI / macro signal board inside your own dashboard or scripts, start with the weekly JSON snapshot.

${url}

#AI #JSON #MarketSignals`,
`I’m treating this as a small observatory, not a newsletter.

The point is structured media trend data: companies, topics, regions, categories, deltas, streaks.

${url}

#AI #TechNews #MarketSignals`,
`Analysts do not need another wall of commentary.

They need reusable inputs.

This is a weekly AI / tech / macro dataset for spreadsheets, dashboards, and watchlists.

${url}

#AI #Analytics #TechNews`,
`What changed this week?

That is easier to answer when the data already has mention counts, deltas, source counts, and streaks.

CSV + JSON packs:
${url}

#AI #TechNews #MarketSignals`,
`Small product, clear job:

turn weekly AI / tech / macro media monitoring into files you can reuse.

CSV for spreadsheets. JSON for automation.

${url}

#AI #Data #TechNews`,
`If you already maintain a company/topic watchlist, this can be a cleaner starting point.

Weekly rankings across AI, tech, macro, regions, categories, and companies.

${url}

#AI #TechNews #MarketSignals`,
`Instead of asking “what should I track this week?” start from a structured snapshot.

AI / Macro Observatory exports rankings and movement as JSON/CSV.

${url}

#AI #Research #TechNews`,
`The paid files are intentionally practical:

- topics CSV
- companies CSV
- regions CSV
- categories CSV
- weekly JSON snapshot

Samples before purchase:
${url}

#AI #CSV #MarketSignals`,
`A lightweight weekly input for anyone tracking AI, tech, macro, and market narratives.

Browse free. Reuse the data with CSV/JSON packs.

${url}

#AI #TechNews #MarketSignals`,
`If a dashboard or memo needs repeatable weekly trend inputs, copy-paste monitoring does not scale.

This is the compact CSV/JSON version.

${url}

#AI #Analytics #MarketSignals`,
`Free samples are live for the AI / Macro Observatory premium packs.

Check the structure first, then use CSV or JSON if it fits your workflow.

${url}

#AI #DataProducts #TechNews`,
`Weekly monitoring should produce reusable data, not just another tab full of links.

AI / Macro Observatory: CSV + JSON trend exports for analysts and builders.

${url}

#AI #TechNews #MarketSignals`
];
for (const [idx, text] of posts.entries()) {
  if (text.length > 280) throw new Error(`post ${idx + 1} too long: ${text.length}`);
  fs.writeFileSync(path.join(outDir, `growth-7day-${String(idx + 1).padStart(2, '0')}.txt`), `${text}\n`);
}
console.log(JSON.stringify({ ok: true, count: posts.length, outDir }, null, 2));
