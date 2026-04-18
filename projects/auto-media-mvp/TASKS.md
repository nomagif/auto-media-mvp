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
- [ ] summarize prompt適用
- [ ] article prompt適用
- [ ] x_post prompt適用
- [ ] image_prompt prompt適用
- [ ] processed保存
- [ ] markdown/note/wordpress/x へ下書き出力

## Phase 4: レビュー
- [ ] pending一覧生成
- [ ] 人間確認用サマリ生成
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
