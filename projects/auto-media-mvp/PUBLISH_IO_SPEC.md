# PUBLISH_IO_SPEC

publish queue と投稿結果の最小スキーマ。

## 1. queue entry
```json
{
  "item_id": "hn-2026-04-18-002",
  "platform": "x",
  "status": "pending_review",
  "draft_file": "drafts/x/hn-2026-04-18-002.txt",
  "created_at": "2026-04-19T03:00:00+09:00",
  "updated_at": "2026-04-19T03:00:00+09:00",
  "published_at": null,
  "external_post_id": null,
  "last_error": null
}
```

## 2. status 値
- `pending_review`
- `approved`
- `scheduled`
- `published`
- `error`

## 3. platform 値
- `x`
- `wordpress`
- `note`

## 4. publish result 例
```json
{
  "ok": true,
  "item_id": "hn-2026-04-18-002",
  "platform": "x",
  "published_at": "2026-04-19T03:10:00+09:00",
  "external_post_id": "1234567890",
  "meta": {
    "status": "published"
  }
}
```
