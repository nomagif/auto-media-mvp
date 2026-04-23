# News Trend Observatory

Auto-generated landing page for the ranking outputs.

## Focus
- Primary genres: **AI / Technology**
- Primary genres: **Finance / Economics (Investing / Macro)**
- Supporting lenses: policy, crypto, semiconductors, security

## Start here
- [Latest Ranking Summary](latest.md)

## What this observatory tracks
- AI / software / infrastructure / chips
- macro / rates / central bank / regulation
- crypto / market-data / market-move signals
- company, topic, region, and category shifts over time

## Browse by view
- [Topic Pages](pages/topics/)
- [Company Pages](pages/companies/)
- [Region Pages](pages/regions/)
- [Category Pages](pages/categories/)

## Recommended reading order
1. `latest.md`
2. AI / Technology Focus
3. Finance / Macro Focus
4. Market / Policy Topics
5. topic / company / category pages

## Current operating model
- collect refresh runs on a recurring cron job
- ranking refresh runs on a separate recurring cron job
- source types currently include `tech`, `official`, and `market-data`
- this separation makes failures easier to diagnose

## Current state
This is an MVP observatory surface.

The project is now intentionally centered on:
- AI・テクノロジー
- 金融・経済（投資・マクロ）

This surface is designed to show signals, counts, rankings, and changes — not strong narrative commentary.

Classification quality, topic coverage, and source breadth will improve over time.

## Related docs
- `../../README.md`
- `../../ROADMAP.md`
- `../../TREND_RANKING_SCHEMA.md`
- `../../TREND_CLASSIFICATION_RULES.md`
- `../../RANKING_CRON_RUNBOOK.md`
- `../../COLLECT_AND_RANK_CRON_PLAN.md`
