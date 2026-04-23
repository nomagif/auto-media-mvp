# WORDPRESS_AUTOMATION_PLAN

WordPress 投稿自動化を安全に進めるための実装メモ。

## 現状
すでにあるもの:
- `scripts/publish/approve_publish_items.js`
- `scripts/publish/list_publish_ready.js`
- `scripts/publish/run_publish_ready.js`
- `scripts/publish/lib_publish_adapters.js`
- `state/publish_queue.json`
- `logs/publish_results.jsonl`

現状フロー:
1. publish queue に item が入る
2. `pending_review` を `approved` にする
3. `run_publish_ready.js` が `approved` item を処理する
4. WordPress では REST API へ post を送る
5. 結果は queue と `logs/publish_results.jsonl` に反映される

## 推奨する自動化レベル
### Phase 1
- 自動化するのは **approved → WordPress draft 作成** まで
- public publish はまだ自動化しない

理由:
- 失敗時の被害が小さい
- レビュー運用を維持できる
- 本文品質改善と投稿安定化を先に進められる

### Phase 2
- approved item のうち `platform=wordpress` だけを定期実行
- 初回は 1 件ずつ、次に複数件へ拡張

### Phase 3
- 将来必要なら publish status を `draft` 以外に拡張
- ただし MVP では後回し

## 必須ガードレール
- `WP_REQUEST_SHAPE_ONLY=1` で request shape を先に確認
- 初回は `WP_DEFAULT_STATUS=draft`
- `run_publish_ready.js` はまず `--platform wordpress --item-id ...` 単位で試す
- 実送信前に HTML / excerpt / category / tag を確認
- `logs/publish_results.jsonl` を append-only の監査ログとして扱う

## 次にやるべき実装・確認
1. WordPress 用 draft markdown の品質確認
2. `buildWordPressPublishInput()` の改善余地確認
   - 見出し構造
   - 箇条書き HTML
   - excerpt
   - category/tag 推定
   - source 表示
3. 単一 item 実行の運用手順を README / runbook に明記
4. その後に定期実行導線を検討

## 率直なおすすめ
いまは「WordPressへ完全自動公開」より、
**approved 済み記事を安全に draft 化する自動化** を固めるのが正しい。
それが安定してから品質改善と定期実行を広げる方が事故りにくい。
