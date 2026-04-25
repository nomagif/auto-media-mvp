# CLOUDFLARE_PAGES_PREMIUM_SETUP

Cloudflare Pages + R2 + Gumroad verify で premium 配布を有効化する最短手順。

## 1. Pages project
対象:
- project: `auto-media-mvp`
- production branch: `main`

## 2. R2 bucket を作る
例:
- bucket: `auto-media-mvp-premium`

用途:
- `premium/` 配下の build artifacts を public repo ではなく R2 に置く

## 3. Pages に R2 binding を追加
Pages project → Settings → Functions → R2 bucket bindings

追加する binding:
- Variable name: `PREMIUM_BUCKET`
- Bucket: 作成した R2 bucket

## 4. Pages secrets を追加
Pages project → Settings → Environment variables

### Secrets
- `DOWNLOAD_SIGNING_SECRET`
  - 長いランダム文字列
- `GUMROAD_PRODUCT_ID_WEEKLY_JSON`
- `GUMROAD_PRODUCT_ID_WEEKLY_CSV`
- `GUMROAD_PRODUCT_ID_30_DAY_ARCHIVE`
- `GUMROAD_PRODUCT_ID_FULL_DATASET`

補足:
- `GUMROAD_PRODUCT_ID_*` には Gumroad license verify で使う `product_id` を入れる
- `product_id` は Gumroad product content page の License key module を開くと取得できる
- `GUMROAD_PRODUCT_*` permalink は旧商品向け fallback にだけ使う

## 5. observatory 実行環境に upload 用 env を入れる
cron / ローカル / CI のどこで `npm run premium:publish` を回すかに応じて設定:

- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PREMIUM_PREFIX` (optional, default `premium`)

## 6. 初回 upload
```bash
cd projects/auto-media-mvp
npm run premium:build
npm run premium:publish
```

## 7. access page を確認
公開URL:
- `/premium-access.html`

やること:
- valid な Gumroad license key で verify
- signed download link が返る
- download が成功する

## 8. cron へ接続
premium upload まで自動化したいときは、observatory 実行環境で:

```bash
PREMIUM_PUBLISH_ENABLED=1 npm run run:observatory:push
```

これで流れは:
- collect
- ranking build
- premium build
- premium upload to R2
- public site / ranking commit & push

## 注意
- `premium/` はもう public repo で持たない前提
- buyer delivery は `premium-access.html` 経由に寄せる
- まず Weekly JSON / Weekly CSV の2商品だけ本番化するのが安全
