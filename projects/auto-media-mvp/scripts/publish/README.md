# publish

投稿関連処理。

MVP段階では本番投稿より、投稿フォーマットの整形と publish_queue 更新を優先する。

## いまあるもの
- `build_publish_queue.js`: enriched data から platform 別 queue を作る
- `approve_publish_items.js`: `pending_review -> approved` の最小承認
- `list_publish_ready.js`: `approved` 一覧を出す
- `lib_publish_queue.js`: queue 読み書きと publish result 反映の共通関数
- `lib_publish_adapters.js`: x / wordpress / note の publish input/output adapter
- `run_publish_ready.js`: `approved` を対象に adapter を呼び、publish result を queue に反映する runner

## run_publish_ready.js の位置づけ
- まだ外部 API 投稿はしない
- まずは `PublishResult` を queue に反映する共通導線を固める
- `x / wordpress / note` で input 形を揃える
- 実 API 呼び出しは adapter 差し替えで対応する
- note は現状 `outputs/note/*.md` へ export を書き出す
- X は最小の入力バリデーション（空文字・280字超過・media型）を先に行う
- WordPress は Markdown から最小 HTML と excerpt を組み立てる
- `--include-pending` を付けると、開発中だけ `pending_review` も dry-run 対象にできる

## 例
```bash
npm run publish:list-ready
npm run publish:run -- --dry-run
npm run publish:run -- --item-id hn-2026-04-18-002 --platform x
npm run publish:run -- --dry-run --include-pending --item-id hn-2026-04-18-002 --platform note
npm run publish:run -- --dry-run --include-pending --item-id hn-2026-04-18-002 --platform wordpress
```
