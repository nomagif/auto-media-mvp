# PREMIUM_PRODUCT_MAP

premium artifacts と販売商品の対応表。

## Product 1: Weekly JSON Snapshot
- Product name: `AI / Macro Observatory — Weekly JSON Snapshot`
- Slug: `weekly-json-snapshot`
- Primary file:
  - `premium/weekly/latest.json`
- Dated file example:
  - `premium/weekly/2026-04-24-weekly-snapshot.json`

## Product 2: Weekly CSV Pack
- Product name: `AI / Macro Observatory — Weekly CSV Pack`
- Slug: `weekly-csv-pack`
- Primary files:
  - `premium/weekly/latest-topics.csv`
  - `premium/weekly/latest-companies.csv`
  - `premium/weekly/latest-regions.csv`
  - `premium/weekly/latest-categories.csv`
  - `premium/weekly/latest-csv-pack-metadata.json`
- Dated file example:
  - `premium/weekly/2026-04-24-topics.csv`
  - `premium/weekly/2026-04-24-companies.csv`
  - `premium/weekly/2026-04-24-regions.csv`
  - `premium/weekly/2026-04-24-categories.csv`
  - `premium/weekly/2026-04-24-csv-pack-metadata.json`

## Product 3: 30-Day Archive Pack
- Product name: `AI / Macro Observatory — 30-Day Archive Pack`
- Slug: `30-day-archive-pack`
- Status: manifest v1 implemented
- Current outputs:
  - `premium/archive/30-day/latest-manifest.json`
  - `premium/archive/30-day/YYYY-MM-DD-manifest.json`
- Planned next outputs:
  - historical snapshot bundle
  - packaged downloadable archive

## Initial publish order
1. Weekly JSON Snapshot
2. Weekly CSV Pack
3. 30-Day Archive Pack
