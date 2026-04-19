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
  "approved_at": null,
  "published_at": null,
  "external_post_id": null,
  "error": null
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

## 4. publish result の最小版
publish 実行後に queue entry へ反映する入力の最小版。

```json
{
  "item_id": "hn-2026-04-18-002",
  "platform": "x",
  "status": "published",
  "published_at": "2026-04-19T03:10:00+09:00",
  "external_post_id": "1234567890",
  "error": null
}
```

失敗時:

```json
{
  "item_id": "hn-2026-04-18-002",
  "platform": "x",
  "status": "error",
  "published_at": null,
  "external_post_id": null,
  "error": {
    "message": "request timeout",
    "code": "TIMEOUT",
    "retryable": true
  }
}
```

## 5. queue 更新ルール（最小）
`approved -> published` の更新では次だけ触る。

- `status`: `approved` から `published` へ更新
- `published_at`: 成功時に設定
- `external_post_id`: 取得できたときだけ設定
- `error`: 成功時は `null`、失敗時はエラー要約
- `updated_at`: 常に更新

注意:
- publish 成功時に `approved_at` は保持する
- `item_id + platform` を更新キーにする
- `published` の再実行は原則しない

## 6. TypeScript 型イメージ
```ts
type PublishStatus = 'pending_review' | 'approved' | 'scheduled' | 'published' | 'error';

type PublishError = {
  message: string;
  code?: string;
  retryable?: boolean;
};

type PublishResult = {
  item_id: string;
  platform: 'x' | 'wordpress' | 'note';
  status: 'published' | 'error';
  published_at: string | null;
  external_post_id: string | null;
  error: PublishError | null;
};
```
