# PREMIUM_WORKER_MIGRATION

Cloudflare Pages Functions + R2 binding で `binding PREMIUM_BUCKET of type r2_bucket contains an invalid jurisdiction` が継続したため、premium API を standalone Worker に切り出す方針へ切り替える。

## 新構成
- Pages: `premium-access.html` を含む静的サイト配信
- Worker: premium auth / download API
- R2 binding: Worker 側に付与

## 追加ファイル
- `workers/premium-api.js`
- `wrangler.premium-api.toml.example`

## Worker 側に入れるもの
### Vars
- `ALLOWED_ORIGIN=https://auto-media-mvp.pages.dev`
- `PUBLIC_API_BASE_URL=https://auto-media-mvp-premium-api.<your-subdomain>.workers.dev`

### Secrets
- `DOWNLOAD_SIGNING_SECRET`
- `GUMROAD_PRODUCT_WEEKLY_JSON`
- `GUMROAD_PRODUCT_WEEKLY_CSV`
- `GUMROAD_PRODUCT_30_DAY_ARCHIVE`
- `GUMROAD_PRODUCT_FULL_DATASET`

### R2 binding
- `PREMIUM_BUCKET`
- bucket: `auto-media-mvp-premium` (or working replacement bucket)

## Deploy 手順イメージ
1. `wrangler login`
2. `cp wrangler.premium-api.toml.example wrangler.toml`
3. `wrangler secret put DOWNLOAD_SIGNING_SECRET`
4. 他の Gumroad secrets も `wrangler secret put`
5. `wrangler deploy`
6. 発行された Worker URL を `premium-access.html` の API base URL に入れる

## premium-access.html 側
- 同一オリジン API がなくても動くように、API base URL を入力できるようにした
- 入力した URL は browser localStorage に保持する

## 方針
Pages は静的配信だけに寄せる。
R2 binding が必要な premium API は Worker 側で受ける。
