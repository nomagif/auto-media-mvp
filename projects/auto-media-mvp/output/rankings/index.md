# News Trend Observatory

Auto-generated landing page for the ranking outputs.

## Start here
- [Latest Ranking Summary](latest.md)

## Browse by view
- [Topic Pages](pages/topics/)
- [Company Pages](pages/companies/)
- [Region Pages](pages/regions/)
- [Category Pages](pages/categories/)

## What this surface shows
- topic momentum
- company mentions
- region slices
- category slices
- rising items vs previous run

## Recommended reading order
1. `latest.md`
2. rising topics
3. topic pages
4. company pages
5. region/category pages

## Operational notes
- ranking refresh runs on a recurring cron job
- collect refresh runs on a separate recurring cron job
- this separation makes failures easier to diagnose

## Current state
This is an MVP observatory surface.
Classification quality, topic coverage, and source breadth will improve over time.

## Related docs
- `../../README.md`
- `../../ROADMAP.md`
- `../../TREND_RANKING_SCHEMA.md`
- `../../TREND_CLASSIFICATION_RULES.md`
- `../../RANKING_CRON_RUNBOOK.md`
- `../../COLLECT_AND_RANK_CRON_PLAN.md`
