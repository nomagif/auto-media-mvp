# Heartbeat incident ops summary

Created: 2026-04-23 12:25 JST

## What happened
Two heartbeat runs appeared to have missing history in the simplified view.

Actual failure pattern found in raw JSONL:
1. user heartbeat request arrives
2. assistant begins work
3. internal timeout occurs: `openclaw:prompt-error`
4. fallback / replay happens
5. fallback fails with quota exhaustion
6. no completed assistant text reply is produced

## Affected times
- 2026-04-23 08:47 JST
- 2026-04-23 09:20 JST

## Root cause summary
Not true transcript loss.
The raw transcript preserved the failure chain, but the simplified history view did not surface the internal custom-error events clearly.

## Operational rule going forward
- Keep heartbeat tiny.
- Use cron for deterministic or important scheduled work.
- During incidents, trust JSONL over simplified history.
- Treat memory-search quota failures as a separate degraded mode.

## Reference files
- `projects/auto-media-mvp/logs/2026-04-22-2200-plus-human-log.md`
- `projects/auto-media-mvp/audit/2026-04-22-2200-plus-audit-log.md`
- `projects/auto-media-mvp/audit/heartbeat-failure-prevention.md`
