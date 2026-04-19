# publish

投稿関連処理。

MVP段階では本番投稿より、投稿フォーマットの整形と publish_queue 更新を優先する。

## いまあるもの
- `build_publish_queue.js`: enriched data から platform 別 queue を作る
- `approve_publish_items.js`: `pending_review -> approved` の最小承認
- `list_publish_ready.js`: `approved` 一覧を出す
- `lib_publish_queue.js`: queue 読み書きと publish result 反映の共通関数
- `run_publish_ready.js`: `approved` を対象に platform ごとの publish input を組み立て、最小の publish result を queue に反映する dry-run ベースの runner

## run_publish_ready.js の位置づけ
- まだ外部 API 投稿はしない
- まずは `PublishResult` を queue に反映する共通導線を固める
- `x / wordpress / note` で input 形を揃える

## 例
```bash
npm run publish:list-ready
npm run publish:run -- --dry-run
npm run publish:run -- --item-id hn-2026-04-18-002 --platform x
```
