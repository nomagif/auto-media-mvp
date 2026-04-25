# PREMIUM_DELIVERY_AUTOMATION

premium 生成物を public repo から切り離し、購入者だけが自動取得できるようにする最短構成。

## 決めた方式
- 決済: Gumroad
- ファイル保管: Cloudflare R2
- 配布ゲート: Cloudflare Pages Functions
- 認証: Gumroad license key verify
- 納品体験: 購入者が `premium-access.html` で license key を入れると、最新ファイルへの短命 signed link を受け取る

これは「完全自動化」に寄せつつ、メール送信や手動納品を挟まない最短ルート。

## なぜこの方式か
- Gumroad の販売導線はもうある
- Pages 公開面と Cloudflare をすでに使っている
- premium artifact を public GitHub repo に置くのは収益化と相性が悪い
- buyer ごとの file handoff を人手なしで回せる

## 配布フロー
1. `npm run premium:build`
2. `npm run premium:publish`
   - `premium/` 配下を R2 に upload
3. 購入者が `https://auto-media-mvp.pages.dev/premium-access.html` を開く
4. license key を送る
5. `/api/premium/auth` が Gumroad に verify
6. 正常なら `/api/premium/download?...` の signed links を返す
7. `/api/premium/download` が R2 から対象ファイルを返す

## 追加したもの
- `functions/api/premium/auth.js`
- `functions/api/premium/download.js`
- `site/premium-access.html`
- `scripts/premium/publish_premium_to_r2.js`

## 必要な Cloudflare Pages / Functions 設定
### R2 binding
Pages project に R2 binding を追加:
- Binding name: `PREMIUM_BUCKET`
- Bucket: premium 配布用 bucket

### Secrets
Pages project に secrets を追加:
- `DOWNLOAD_SIGNING_SECRET`
- `GUMROAD_PRODUCT_ID_WEEKLY_JSON`
- `GUMROAD_PRODUCT_ID_WEEKLY_CSV`
- `GUMROAD_PRODUCT_ID_30_DAY_ARCHIVE`
- `GUMROAD_PRODUCT_ID_FULL_DATASET`

`GUMROAD_PRODUCT_ID_*` には Gumroad license verify で使う `product_id` を入れる。
これは product content page の License key module を開くと確認できる。
`GUMROAD_PRODUCT_*` permalink は旧商品向け fallback としてのみ扱う。

## cron / build 側で必要な env
premium artifact upload 用:
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PREMIUM_PREFIX` (optional, default: `premium`)

## npm scripts
- `npm run premium:publish`
  - `premium/` 配下を R2 に upload

## push 自動化との接続
`PREMIUM_PUBLISH_ENABLED=1` のときだけ `push_observatory_updates.sh` から `npm run premium:publish` を呼ぶ。

つまり cron 側では:
- collect
- rank
- site build
- premium build
- premium upload to R2
- public site / ranking を commit & push

という流れにできる。

## 重要
premium artifact は public repo に置き続けない。
少なくとも以下をやる:
- `premium/` を ignore 対象にする
- `push_observatory_updates.sh` で `premium` を add しない
- 既存 tracking を外す

## 今回の制約
この実装では以下はまだ外部設定が必要:
- Cloudflare Pages に R2 binding / secrets を入れる
- Gumroad product permalink を secrets に入れる
- cron 環境に R2 upload 用 env を入れる

コード側は先に入れておき、残りは設定で繋ぐ前提。
