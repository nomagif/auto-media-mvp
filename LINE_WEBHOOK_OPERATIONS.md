# LINE Webhook Operations

## Overview

- Domain: `bot.clawfortune.jp`
- App process (PM2): `line-webhook`
- App local endpoint: `http://127.0.0.1:3001`
- Health check: `GET /health`
- Production webhook path: `/line/webhook`

## Correct Webhook URL

Set the LINE Developers Console webhook URL to:

```text
https://bot.clawfortune.jp/line/webhook
```

## Incident Summary (2026-04-07)

Issue: LINE bot was not responding because the webhook path configured in LINE Developers did not match the path actually handled by nginx + Express.

### What was wrong

- Configured/expected path in some places: `/callback`
- Actual Express webhook path: `/line/webhook`
- nginx was proxying `/line/webhook` to the app
- Requests to `/callback` were not forwarded to the webhook handler

### Evidence

- `POST http://127.0.0.1:3001/callback` -> `404 Cannot POST /callback`
- `POST http://127.0.0.1:3001/line/webhook` -> `200`
- nginx config included:
  - `proxy_pass http://127.0.0.1:3001/health;`
  - `location /line/webhook { proxy_pass http://127.0.0.1:3001/line/webhook; }`
  - fallback response: `return 200 'bot.clawfortune.jp is alive';`

### Fix applied

Updated the LINE Developers Console webhook URL to:

```text
https://bot.clawfortune.jp/line/webhook
```

Result: bot responded successfully again.

## Quick Checks

### App status

```bash
pm2 show line-webhook
```

### Local health

```bash
curl -i http://127.0.0.1:3001/health
```

Expected: `200 OK`

### Local webhook path check

```bash
curl -i -X POST http://127.0.0.1:3001/line/webhook
```

Expected: non-404 response from the app.

### Wrong path check

```bash
curl -i -X POST http://127.0.0.1:3001/callback
```

Expected: `404 Cannot POST /callback`

### Logs

```bash
pm2 logs line-webhook --lines 100
```

## nginx Notes

Current behavior inferred from config:

- `/health` proxies to the app health endpoint
- `/line/webhook` proxies to the app webhook endpoint
- unmatched requests may hit a generic alive response

If webhook delivery breaks again, verify nginx still has a dedicated `location /line/webhook` block.

## Troubleshooting Checklist

1. Confirm LINE Developers webhook URL is exactly:
   `https://bot.clawfortune.jp/line/webhook`
2. Confirm webhook is enabled in LINE Developers Console
3. Confirm app is online:
   `pm2 show line-webhook`
4. Confirm health endpoint returns 200:
   `curl -i http://127.0.0.1:3001/health`
5. Check logs:
   `pm2 logs line-webhook --lines 100`
6. If needed, inspect nginx:
   ```bash
   sudo nginx -T | grep -nE 'bot\.clawfortune\.jp|line/webhook|callback|proxy_pass'
   ```

## Recommended Follow-up

- Review webhook signature verification behavior
- Confirm invalid or unsigned requests do not get a misleading `200` success response
- Consider documenting the actual Express routes in the app repo/config
