# PUBLISH_PLAN

WordPress / note / X への配信設計。

## 1. 基本方針
- 生成と投稿は分ける
- MVPでは承認付き投稿を基本にする
- プラットフォームごとに最終整形を行う
- 投稿結果は必ず記録する

---

## 2. publish queue の考え方
生成済みデータから、投稿候補を queue に積む。

想定状態:
- `pending_review`
- `approved`
- `scheduled`
- `published`
- `error`

最低限の項目例:
```json
{
  "item_id": "hn-2026-04-18-002",
  "platform": "x",
  "status": "pending_review",
  "draft_file": "drafts/x/hn-2026-04-18-002.txt",
  "created_at": "...",
  "updated_at": "...",
  "published_at": null,
  "last_error": null
}
```

---

## 3. プラットフォーム別の出力責務
### WordPress
- article を元に長文記事へ整形
- title / lead / sections / closing を使う
- Markdown か HTML 化を想定
- アイキャッチは image prompt から後段で生成可能

### note
- article を元に、やや読み物寄りに整形
- WordPress より少し柔らかい文体でもよい
- 見出し構造は維持

### X
- social.x_post をそのまま主に使う
- 必要なら title と image prompt を補助に使う
- 画像を付ける場合は image prompt → 画像生成の後に投稿

---

## 4. 承認フロー
### MVP
1. generated outputs を作る
2. publish queue に積む
3. review digest で人が確認
4. 承認後に投稿

### 将来
- ソース信頼度が高いものだけ自動投稿
- 人間の承認を省略する条件を定義

---

## 5. 失敗時の扱い
- 投稿失敗は `error` にする
- `error` を残す
- 再試行可能かを記録する
- 同一アイテムの二重投稿を防ぐ

---

## 6. 重複防止
- `item_id + platform` をキーにする
- 同一 platform への再投稿は原則しない
- 投稿済み記録を残す

---

## 7. ログ
最低限残すもの:
- `item_id`
- `platform`
- `status`
- `published_at`
- `external_post_id`
- `error`

publish result の最小更新対象は次の4つで十分。
- `status`（approved -> published / error）
- `published_at`
- `external_post_id`
- `error`

---

## 8. 実装順のおすすめ
1. X publish queue
2. X 実投稿 interface 固定
3. WordPress / note publish 入口固定
4. 承認フロー
5. 実投稿連携

関連ドキュメント:
- `PUBLISH_IO_SPEC.md`: queue/result の最小スキーマ
- `X_PUBLISH_INTERFACE.md`: X 実投稿 interface
- `PUBLISH_ENTRYPOINTS.md`: WordPress / note publish 入口
- `PUBLISH_ENV_SPEC.md`: 実 API 連携時の env / secret interface

X が一番軽く、検証しやすい。

---

## 9. 率直なおすすめ
投稿は最後まで手動承認付きで進めた方がいい。
生成の品質が安定してから、自動化範囲を増やすのが安全。
