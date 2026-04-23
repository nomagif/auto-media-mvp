# COLLECT_AND_RANK_CRON_PLAN

collect と ranking をまとめて定期実行するためのメモ。

## 推奨方針
ranking refresh と collect を別ジョブに分ける。

理由:
- collect failure と ranking failure を切り分けやすい
- source 側のネットワーク失敗で ranking 更新まで巻き込まれにくい
- 運用時の原因特定がしやすい

## 推奨ジョブ構成
### 1. ranking refresh
- 既存 normalized データから
  - rank:generate
  - rank:render
  - rank:pages

### 2. collect refresh
- collect:techcrunch
- collect:hackernews
- 必要なら将来他ソース追加

## 将来の拡張
- collect job の完了後に ranking refresh をすぐ走らせる
- もしくは collect を先、ranking を後ろに時間差設定する

## 注意
- いきなり外部投稿 cron と一緒にしない
- collect / ranking / publish は別レイヤーで持つ
