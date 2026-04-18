# cron-plan

## 1. auto-media-collect
- 目的: tech / crypto / social の新規データを収集
- 頻度: 15〜30分おき
- 処理:
  - sources.json を読む
  - raw に保存
  - normalized に変換
  - seen_urls / seen_topics を見て重複回避

### systemEvent text案
auto-media-mvp の収集ジョブです。sources.json を見て tech / crypto / social の新規データを収集し、raw と normalized に保存。seen_urls と seen_topics を見て重複を避けてください。

## 2. auto-media-generate
- 目的: 候補抽出と生成
- 頻度: 30分おき
- 処理:
  - normalized から未処理候補を抽出
  - 最大5件を選定
  - prompts/ を使って summary / article / x_post / image_prompt を生成
  - processed と drafts に保存

### systemEvent text案
auto-media-mvp の生成ジョブです。normalized の未処理データから重要候補を最大5件選び、prompts/ を使って日本語要約・タイトル候補・記事下書き・X投稿案・画像プロンプトを生成して processed と drafts に保存してください。

## 3. auto-media-review-digest
- 目的: pending 下書きのレビュー通知
- 頻度: 1時間おき または 朝昼晩
- 処理:
  - pending を集約
  - 確認しやすい要点を3件程度に整理
  - 保存先と状態を通知

### systemEvent text案
auto-media-mvp のレビュー通知ジョブです。publish_status=pending の下書きを集計し、人間が確認しやすいように3件程度の要点と保存先をまとめて通知してください。
