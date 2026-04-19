# WORDPRESS_API_PLAN

WordPress publish adapter を実 API 化するための最小設計。

## 1. 結論
MVP では **WordPress REST API で draft post を作成** するところまでを対象にする。

理由:
- public publish より安全
- 既存の `status: draft` 方針と合う
- 実投稿前のレビュー運用を崩しにくい

## 2. 使う env
- `WP_BASE_URL`
- `WP_USERNAME`
- `WP_APP_PASSWORD`

任意:
- `WP_API_BASE_PATH`
- `WP_DEFAULT_STATUS`
- `WP_DRY_RUN_FORCE`

## 3. 分離する関数
- `buildWordPressPublishInput()`
- `buildWordPressAuthConfig()`
- `createWordPressPostRequest()`
- `sendWordPressPost()`
- `normalizeWordPressPostResponse()`

現状は `buildWordPressAuthConfig()` / `createWordPressPostRequest()` / `sendWordPressPost()` の seam までコード化済み。

## 4. 想定 endpoint
- `POST {WP_BASE_URL}/wp-json/wp/v2/posts`

`WP_API_BASE_PATH` があればそちらを使う。

## 5. request の最小形
```json
{
  "status": "draft",
  "title": "...",
  "content": "<h1>...</h1>",
  "excerpt": "..."
}
```

## 6. auth 方針
MVP は **Application Password + Basic Auth** 前提。

- username: `WP_USERNAME`
- password: `WP_APP_PASSWORD`

## 7. 成功時の最小正規化
- `external_post_id`
- `published_at`（local now でも可）
- `meta.url`
- `meta.wp_status`

## 8. 失敗時の最小正規化
- HTTP status
- message
- retryable

## 9. 安全策
- 初期値は `draft`
- `WP_DRY_RUN_FORCE=1` があれば送信しない
- `WP_REQUEST_SHAPE_ONLY=1` なら実送信せず request shape だけ確認する
- 最初は categories / tags / media を未対応でよい

## 10. 率直なおすすめ
WordPress は X より実装しやすい。
先に draft 作成が通れば、publish 基盤としてかなり前進する。
