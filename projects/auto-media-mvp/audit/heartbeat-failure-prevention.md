# Heartbeat failure prevention notes

Created: 2026-04-23 12:24 JST
Context: Hidden heartbeat failures were observed in the main OpenClaw session. The visible history looked incomplete because the raw transcript contained internal timeout + fallback + quota-failure events without a completed assistant reply.

## Immediate prevention steps

### 1. Keep `HEARTBEAT.md` minimal
Current `HEARTBEAT.md` is effectively empty, which is good.

Rule:
- Keep heartbeat instructions short.
- Do not pack large multi-step workflows into heartbeat.
- If a task needs more than a tiny checklist, move it to cron or a normal explicit user command.

Why:
- Short heartbeat turns reduce chance of model stalls and reduce token / provider pressure.

### 2. Use cron for exact reminders and background jobs
Do **not** rely on heartbeat for:
- exact-time reminders
- long-running background work
- anything that needs guaranteed delivery or auditing

Use cron instead for:
- reminders
- scheduled checks
- isolated jobs with clear output

Why:
- heartbeat is best-effort and conversational
- cron is better for deterministic timing and task isolation

### 3. Treat raw JSONL as source of truth during incidents
When the visible session history looks incomplete:
- inspect the session JSONL transcript directly
- look for `openclaw:prompt-error`
- look for fallback / model-snapshot transitions
- look for assistant messages with empty content and `stopReason: error`

Why:
- simplified history can omit internal custom events
- raw transcript preserves the actual failure chain

### 4. Expect degraded behavior when memory embeddings are quota-exhausted
If `memory_search` is unavailable due to quota:
- do not assume memory is empty
- fall back to direct file reads, session history, and raw transcript inspection
- note explicitly in the audit trail that memory search was unavailable

Why:
- failure to search memory can hide supporting context but is not the same as missing logs

### 5. Separate incident reporting into 3 buckets
For future incident notes, always split findings into:
- successful outcomes
- failed outcomes
- internal hidden errors

Why:
- this makes it obvious whether something was truly lost or only hidden by the simplified UI/history layer

## Recommended operator workflow

1. If a heartbeat reply appears missing, check whether the user message exists in session history.
2. If the assistant final reply is missing, inspect the raw JSONL transcript.
3. If JSONL shows `openclaw:prompt-error`, record the exact error string.
4. Check whether a fallback provider/model snapshot followed.
5. Check whether the fallback failed with quota exhaustion.
6. Write a human-readable log and a separate audit log.

## Practical conclusion

The main prevention strategy is not “make heartbeat do more.”
It is the opposite:
- keep heartbeat tiny
- move deterministic work to cron
- use raw transcripts for incident review
- document degraded modes when quota problems appear
