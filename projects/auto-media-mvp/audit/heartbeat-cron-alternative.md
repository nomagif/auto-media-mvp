# Heartbeat vs cron: recommended alternative for this project

Created: 2026-04-23 12:26 JST

## Recommendation
For `auto-media-mvp`, prefer **cron** over heartbeat whenever the task is one of these:
- exact-time reminders
- fixed schedule checks
- must-succeed background routines
- tasks that need clear operator auditability

Keep heartbeat only for:
- tiny best-effort checks
- low-risk conversational nudges
- lightweight opportunistic maintenance

## Why cron is better here
Observed incident pattern:
- heartbeat request entered the session
- model timed out internally
- fallback occurred
- fallback then hit quota exhaustion
- no final assistant reply was produced

This is a bad fit for work that needs strong reliability.

Cron improves this because it:
- isolates scheduled work from the main session flow
- fits deterministic schedules better
- makes reminders and routine checks more explicit
- reduces dependence on an active conversational heartbeat path

## Suggested split

### Use heartbeat for
- small status pings
- low-priority review prompts
- lightweight housekeeping reminders

### Use cron for
- daily collection jobs
- exact-time reminders
- routine audits
- any task where missing the final reply would be operationally confusing

## Example migration pattern
Instead of:
- putting several checks into `HEARTBEAT.md`

Prefer:
- leave `HEARTBEAT.md` short
- create separate cron jobs for deterministic tasks
- keep project-specific audit notes under `projects/auto-media-mvp/audit/`

## Operator note
If a scheduled task matters enough that you would inspect logs when it fails, it probably belongs in cron, not heartbeat.
