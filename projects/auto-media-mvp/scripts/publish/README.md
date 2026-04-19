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
- dry-run でない場合、X / WordPress は必要 env がなければ `MISSING_ENV` を返す
- `--include-pending` を付けると、開発中だけ `pending_review` も dry-run 対象にできる

## 例
```bash
npm run publish:list-ready
npm run publish:run -- --dry-run
npm run publish:run -- --item-id hn-2026-04-18-002 --platform x
npm run publish:run -- --dry-run --include-pending --item-id hn-2026-04-18-002 --platform note
npm run publish:run -- --dry-run --include-pending --item-id hn-2026-04-18-002 --platform wordpress
node ../../scripts/publish/publish-x.js fixtures/publish/x-publish-input.json
node ../../scripts/publish/publish-x.js fixtures/publish/x-publish-input-live.json
node ../../scripts/publish/publish-x.js fixtures/publish/x-publish-input-too-long.json
node ../../scripts/publish/publish-x.js fixtures/publish/x-publish-input-empty.json
node ../../scripts/publish/publish-x.js fixtures/publish/x-publish-input-invalid-media.json
node ../../scripts/publish/publish-wordpress.js fixtures/publish/wordpress-publish-input.json
node ../../scripts/publish/publish-wordpress.js fixtures/publish/wordpress-publish-input-live.json
node ../../scripts/publish/publish-note.js fixtures/publish/note-publish-input.json
```

## Expected output fixtures
- `fixtures/publish/expected/x-publish-output-success.json`
- `fixtures/publish/expected/x-publish-output-too-long.json`
- `fixtures/publish/expected/x-publish-output-empty.json`
- `fixtures/publish/expected/x-publish-output-invalid-media.json`
- `fixtures/publish/expected/wordpress-publish-output-success.json`
- `fixtures/publish/expected/wordpress-publish-output-missing-env.json`
- `fixtures/publish/expected/note-publish-output-success.json`
- `fixtures/publish/expected/x-publish-output-missing-env.json`

`published_at` や `text_length` のような動的値はプレースホルダで表している。

## Fixture check script
1本ずつ実行するのがおすすめ。長い `&&` 連結より、どこでズレたか追いやすい。

```bash
npm run publish:check-fixture -- --command ../../scripts/publish/publish-x.js --input fixtures/publish/x-publish-input.json --expected fixtures/publish/expected/x-publish-output-success.json
npm run publish:check-fixture -- --command ../../scripts/publish/publish-x.js --input fixtures/publish/x-publish-input-too-long.json --expected fixtures/publish/expected/x-publish-output-too-long.json
npm run publish:check-fixture -- --command ../../scripts/publish/publish-x.js --input fixtures/publish/x-publish-input-empty.json --expected fixtures/publish/expected/x-publish-output-empty.json
npm run publish:check-fixture -- --command ../../scripts/publish/publish-x.js --input fixtures/publish/x-publish-input-invalid-media.json --expected fixtures/publish/expected/x-publish-output-invalid-media.json
npm run publish:check-fixture -- --command ../../scripts/publish/publish-wordpress.js --input fixtures/publish/wordpress-publish-input.json --expected fixtures/publish/expected/wordpress-publish-output-success.json
npm run publish:check-fixture -- --command ../../scripts/publish/publish-note.js --input fixtures/publish/note-publish-input.json --expected fixtures/publish/expected/note-publish-output-success.json

# missing env contract check examples
env -u X_API_KEY -u X_API_SECRET -u X_ACCESS_TOKEN -u X_ACCESS_TOKEN_SECRET node ../../scripts/publish/publish-x.js fixtures/publish/x-publish-input.json
env -u WP_BASE_URL -u WP_USERNAME -u WP_APP_PASSWORD node ../../scripts/publish/publish-wordpress.js fixtures/publish/wordpress-publish-input.json
```
``````
