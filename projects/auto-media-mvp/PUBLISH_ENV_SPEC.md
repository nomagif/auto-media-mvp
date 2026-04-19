# PUBLISH_ENV_SPEC

実 API 連携時に必要な env / secret interface の最小仕様。

まだ本番実装は入れず、どの adapter が何を要求するかだけを固定する。

## 1. 基本方針
- secret はコードに埋め込まない
- adapter ごとに必要な env を分離する
- `dry_run` では secret 未設定でも動ける形を保つ
- orchestration は secret の詳細を知らず、adapter 側に閉じ込める

## 2. X adapter
対象: `publishToX(input)` / `scripts/publish/publish-x.js`

### 必須候補
- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

### 任意候補
- `X_API_BASE_URL`
  - sandbox / mock / proxy 差し替え用
- `X_DRY_RUN_FORCE`
  - 強制的に dry-run にする安全弁

### adapter 側の責務
- 必要な env が足りないとき、`status=error` で返す
- `error.code` は例: `MISSING_ENV`
- `dry_run=true` なら env 未設定でも通してよい

## 3. WordPress adapter
対象: `publishToWordPress(input)` / `scripts/publish/publish-wordpress.js`

### 必須候補
- `WP_BASE_URL`
- `WP_USERNAME` または `WP_AUTH_USER`
- `WP_APP_PASSWORD` または `WP_AUTH_TOKEN`

### 任意候補
- `WP_DEFAULT_STATUS`
  - 例: `draft`
- `WP_API_BASE_PATH`
  - 例: `/wp-json/wp/v2`
- `WP_DRY_RUN_FORCE`

### adapter 側の責務
- 実 POST 先 URL を組み立てる
- 認証方式を adapter 内に閉じ込める
- `content_html` を優先し、なければ `content_markdown` を fallback にする

## 4. note adapter
対象: `publishToNote(input)` / `scripts/publish/publish-note.js`

### 現状
- 本番投稿ではなく export scaffold
- したがって env / secret は必須ではない

### 将来の必須候補
- `NOTE_EMAIL` または `NOTE_USERNAME`
- `NOTE_PASSWORD` または `NOTE_AUTH_TOKEN`
- `NOTE_BASE_URL`

### 任意候補
- `NOTE_DRY_RUN_FORCE`
- `NOTE_EXPORT_DIR`
  - export 先を差し替えたい場合

### adapter 側の責務
- export モードなら secret なしで動く
- publish/draft モードでだけ認証を要求する

## 5. 共通 env 方針
### 共通候補
- `PUBLISH_DRY_RUN_FORCE`
  - 全 platform を強制 dry-run
- `PUBLISH_LOG_DISABLE`
  - append-only log を無効化したいとき用

### 優先順位の考え方
1. input の `dry_run`
2. platform 個別の `*_DRY_RUN_FORCE`
3. 共通の `PUBLISH_DRY_RUN_FORCE`

ただし MVP では実装を単純に保ち、最初は platform 個別より共通1本でもよい。

## 6. エラー正規化
env / secret 不足時は次を返す想定。

```json
{
  "ok": false,
  "status": "error",
  "error": {
    "message": "missing required env for wordpress publish",
    "code": "MISSING_ENV",
    "retryable": false
  }
}
```

## 7. 率直なおすすめ
最初の本番連携はこうすると安全。

1. X: 実投稿
2. WordPress: draft 作成
3. note: export のまま維持

note まで一気に本番化しようとすると認証・運用が重くなりやすい。
まずは X と WordPress の責務を固めるのがいい。
