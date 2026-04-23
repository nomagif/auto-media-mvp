# auto-media-mvp

Operational workspace for the auto-media MVP.

## Structure

### Prompts
- `prompts/image_prompt.md`
- `prompts/summarize.md`
- `prompts/summary_worker_task.md`
- `prompts/title_candidates.md`
- `prompts/x_post.md`

### Logs and audit notes
- `logs/2026-04-22-2200-plus-human-log.md`
  - Human-readable timeline of the session activity after 2026-04-22 22:00 JST
- `audit/2026-04-22-2200-plus-audit-log.md`
  - Audit view split into successful outcomes, failed outcomes, and internal hidden errors
- `audit/heartbeat-failure-prevention.md`
  - Immediate prevention guidance after the heartbeat incident
- `audit/heartbeat-ops-summary.md`
  - Short incident summary for operators
- `audit/heartbeat-cron-alternative.md`
  - Guidance on when this project should prefer cron over heartbeat

## Operational guidance

### Heartbeat
Use heartbeat only for:
- tiny best-effort checks
- lightweight low-risk maintenance
- conversational nudges where occasional failure is acceptable

Do not rely on heartbeat for:
- exact-time reminders
- must-succeed scheduled jobs
- tasks that need strong auditability

### Cron
Prefer cron for:
- deterministic schedules
- important reminders
- routine background checks
- tasks where a missing final reply would be operationally confusing

## Incident-review rule
If chat history appears incomplete, treat the raw session JSONL transcript as the source of truth before concluding that logs were lost.

## Current takeaway
The recent heartbeat issue was not primarily transcript loss. The raw transcript preserved internal timeout and quota-failure events, while the simplified history made the run look incomplete.
