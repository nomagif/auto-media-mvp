# Automation MVP

このMVPは、海外テックニュースを対象にした収集・変換・配信パイプラインの雛形です。

## 今あるもの
- `config/sources/tech-news.json` ソース定義
- `prompts/transformer/tech-news.md` 変換プロンプト
- `scripts/collect/collect-tech-news.js` RSS取得 + 本文抽出 + normalized保存
- `scripts/transform/run-transformer.js` 変換runner（現状は安全なstub）
- `scripts/publish/publish-wordpress.js` WordPress payload生成
- `scripts/publish/publish-x.js` X payload生成
- `data/normalized/2026-04-16/sample-tech-item.json` サンプル入力

## 実装済み範囲
- RSS取得
- フィード項目抽出
- 記事本文の簡易抽出
- normalized JSON 保存
- collector state 保存
- publish log 追記

## 未実装/接続保留
- Codex/ACP の本番接続
- OpenClaw cron 登録

## 実装メモ
### X API (OAuth 1.0a)
- `POST /2/tweets` は `application/json` で送っている
- OAuth 1.0a の署名生成時に **JSON body を署名パラメータへ混ぜない** こと
- 以前 `data: request.body` を署名側へ渡していて、X 側で `401 Unauthorized` になった
- 修正後は live post で `201 Created` を確認済み

### WordPress (medianews.jp)
- XServer VPS 上に Ubuntu 24.04 + Nginx + MariaDB + PHP-FPM + WordPress を構築済み
- `medianews.jp` / `www.medianews.jp` は VPS (`162.43.36.33`) に向ける
- Let's Encrypt により HTTPS 有効化済み
- WordPress REST API + Application Password で draft 投稿の live test に成功済み
- live test では `POST /wp-json/wp/v2/posts` に対して `201 Created` を確認済み
- live test の下書き投稿 URL: `https://medianews.jp/?p=6`

### ログ上の認証情報
- X の OAuth Authorization ヘッダはログ返却前にマスクする
- WordPress の Basic Authorization ヘッダもログ返却前にマスクする
- request shape / error meta を残す場合でも、生の認証値は返さない

## 動作確認
### 1. RSS取得して normalized 保存
```bash
node scripts/collect/collect-tech-news.js
```

### 2. 変換stubを実行
```bash
node scripts/transform/run-transformer.js data/normalized/2026-04-16/sample-tech-item.json
```

### 3. WordPress下書きpayloadを確認
```bash
node scripts/transform/run-transformer.js data/normalized/2026-04-16/sample-tech-item.json > /tmp/artifact.json
node scripts/publish/publish-wordpress.js /tmp/artifact.json
```

### 3.1 WordPress 実投稿スモークテスト（draft）
```bash
cat >/tmp/wp-live-test.json <<'JSON'
{
  "item_id": "wp-live-test-001",
  "platform": "wordpress",
  "title": "Clawdy WordPress live test",
  "content_markdown": "# Clawdy WordPress live test\n\nThis is a live publish path check.",
  "content_html": "<h1>Clawdy WordPress live test</h1><p>This is a live publish path check.</p>",
  "excerpt": "This is a live publish path check.",
  "status": "draft",
  "dry_run": false
}
JSON

export WP_BASE_URL='https://medianews.jp'
export WP_USERNAME='...'
export WP_APP_PASSWORD='...'

cd projects/auto-media-mvp
node ../../scripts/publish/publish-wordpress.js /tmp/wp-live-test.json
```

期待値:
- 成功時は `ok: true`
- `raw_status: 201`
- `wp_status: draft`
- `external_post_id` が返る

### 4. X投稿payloadを確認
```bash
node scripts/publish/publish-x.js /tmp/artifact.json
```

### 5. X 実投稿スモークテスト
```bash
cat >/tmp/x-live-test.json <<'JSON'
{
  "item_id": "x-live-test-001",
  "platform": "x",
  "text": "Clawdy test post. OAuth 1.0a publish path check.",
  "idempotency_key": "x-live-test-001",
  "dry_run": false
}
JSON

export X_API_KEY='...'
export X_API_SECRET='...'
export X_ACCESS_TOKEN='...'
export X_ACCESS_TOKEN_SECRET='...'

cd projects/auto-media-mvp
node ../../scripts/publish/publish-x.js /tmp/x-live-test.json
```

期待値:
- 成功時は `ok: true`
- `raw_status: 201`
- `external_post_id` が返る

## 次の実装候補
- ACP経由の transformer 本接続
- JSON schema validation の追加
- WordPress 投稿のカテゴリ・タグ・アイキャッチ連携
- WordPress / X 投稿の本番運用ルール整備（draft→review→publish）
- cronジョブ化
