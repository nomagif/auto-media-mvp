# MVP実装タスクリスト

## Phase 0: 土台
- [ ] projects/auto-media-mvp の初期構成確認
- [ ] config / prompts / data / drafts / state / logs / scripts を整える
- [ ] 初期JSONファイルを確認

## Phase 1: 収集
- [ ] TechCrunch RSS取得処理
- [ ] Hacker News取得処理
- [ ] CoinGecko取得処理
- [ ] Product Hunt取得処理
- [ ] raw保存
- [ ] normalized変換
- [ ] URL重複チェック
- [ ] タイトル類似の簡易重複チェック

## Phase 2: 候補抽出
- [ ] classify基準の実装
- [ ] 優先度スコアリング
- [ ] 1run最大5件抽出
- [ ] candidates保存

## Phase 3: 生成
- [x] summarize / title / x_post / image_prompt の雛形出力
- [x] normalized + draft を入力にした enrich 構造の土台
- [x] summary 生成アダプタ分離（LLM差し替え準備）
- [x] OpenClaw / Codex summary 委譲の入出力仕様書
- [x] summary request/response 保存スケルトン
- [x] summary_queue.json と enqueue_summary_requests.js
- [x] run_summary_worker.js の雛形
- [x] apply_summary_response.js の雛形
- [x] OpenClaw summary worker turn 用の処理仕様書
- [x] .gitignore とデータ運用方針
- [x] OpenClaw worker 実行プロンプト雛形
- [x] summary 応答正規化アダプタのたたき台
- [x] worker 正規化統合の実装計画
- [x] Phase A worker fixture 計画
- [x] run_summary_worker.js の Phase A `--raw-file` 対応
- [x] manual summary worker runbook
- [x] title / x post IO spec たたき台
- [x] title_generation scaffold
- [x] title response normalization helper
- [x] title worker の最小版 scaffold
- [x] x post generation scaffold
- [x] article generation scaffold
- [x] image prompt generation scaffold
- [x] 現状整理ロードマップ
- [ ] x_post の本生成
- [ ] image_prompt の本生成
- [x] processed保存
- [x] markdown へ下書き出力
- [ ] note/wordpress/x へ下書き出力

## Phase 4: レビュー
- [x] pending一覧生成の土台（publish_queue.json）
- [x] 人間確認用サマリ生成の雛形（review digest）
- [ ] review_status更新

## Phase 5: cron
- [ ] collect cron追加
- [ ] generate cron追加
- [ ] review digest cron追加
- [ ] ログ確認
- [ ] 失敗時の再実行方針決定

## Phase 6: 投稿準備
- [ ] publish_queue整備
- [ ] note形式整形
- [ ] WordPress形式整形
- [ ] X形式整形
- [ ] 投稿前承認フロー
