# Premium Sales Runbook

## Current production URLs

- Public premium page: <https://auto-media-mvp.pages.dev/premium>
- Buyer access page: <https://auto-media-mvp.pages.dev/premium-access>
- Premium API Worker: <https://auto-media-mvp-premium-api.iba-star-9929.workers.dev>

## Success criteria

The sales flow is healthy when this works end to end:

1. Buyer purchases the matching Gumroad product.
2. Buyer opens `/premium-access`.
3. Buyer selects the purchased product.
4. Buyer enters purchase email and license key.
5. Page shows `Verified`.
6. Signed download links appear.
7. At least one file downloads from Cloudflare R2.

## Products

| UI product | Worker product slug | Preferred secret | Delivered files |
| --- | --- | --- | --- |
| Weekly JSON Snapshot | `weekly-json-snapshot` | `GUMROAD_PRODUCT_ID_WEEKLY_JSON` | `premium/weekly/latest.json` |
| Weekly CSV Pack | `weekly-csv-pack` | `GUMROAD_PRODUCT_ID_WEEKLY_CSV` | `premium/weekly/latest-*.csv`, metadata JSON |

Legacy fallback secrets still exist for older products:

- `GUMROAD_PRODUCT_WEEKLY_JSON`
- `GUMROAD_PRODUCT_WEEKLY_CSV`

Prefer the `GUMROAD_PRODUCT_ID_*` secrets for current products.

## Smoke test

Run this from the project root:

```bash
npm run premium:smoke
```

This verifies:

- premium page is live
- premium access page is live
- premium API Worker is live
- Gumroad license verification endpoint reaches Gumroad and rejects an invalid dummy license correctly
- download endpoint validates signatures correctly

It does **not** require a real license key and does **not** prove a real buyer license works.

## Real E2E test

Use a real Gumroad purchase/license:

1. Open <https://auto-media-mvp.pages.dev/premium-access>
2. Select the matching product.
3. Enter the purchase email.
4. Paste the license key.
5. Click `Get latest download links`.
6. Confirm `Verified` appears.
7. Open one signed link before it expires.

## Troubleshooting

### Error: `That license does not exist for the provided product.`

Most likely causes:

- wrong product selected on `/premium-access`
- license key belongs to the other product
- Worker secret points to the wrong Gumroad product ID

Check:

```bash
npx wrangler secret list
```

Expected secrets:

- `DOWNLOAD_SIGNING_SECRET`
- `GUMROAD_PRODUCT_ID_WEEKLY_JSON`
- `GUMROAD_PRODUCT_ID_WEEKLY_CSV`

If the secret exists but may have the wrong value, overwrite it with the correct Gumroad product ID:

```bash
npx wrangler secret put GUMROAD_PRODUCT_ID_WEEKLY_CSV
npx wrangler secret put GUMROAD_PRODUCT_ID_WEEKLY_JSON
```

### Verified, but download returns 404

Likely R2 publish/key mismatch.

Run:

```bash
npm run premium:build
npm run premium:publish
```

Then retry `/premium-access` and generate fresh links.

### Verified, but download returns 403

Likely signature secret mismatch, expired link, or edited URL.

- Generate a fresh link from `/premium-access`
- Confirm Worker has `DOWNLOAD_SIGNING_SECRET`
- Do not edit query params on the signed URL

## Production automation

The cron job runs:

```bash
npm run run:observatory:push
```

That pipeline collects data, regenerates rankings/site/premium artifacts, publishes premium files to R2 when R2 env is available, and then commits/pushes selected observatory outputs.
