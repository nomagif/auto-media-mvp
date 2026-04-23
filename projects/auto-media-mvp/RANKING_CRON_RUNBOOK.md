# RANKING_CRON_RUNBOOK

ランキング生成の定期実行 runbook。

## 目的
以下を定期的に更新する。
- normalized inputs
- ranking JSON
- ranking markdown
- topic/company/region/category pages

## 推奨フロー
1. collect
2. rank:generate
3. rank:render
4. rank:pages

## MVP の定期実行方針
最初は collect を含めず、
**既存 normalized データから ranking を再生成する job** を先に定期化してもよい。

理由:
- まず ranking 側の安定性だけ確認できる
- 投稿や外部送信がない
- 障害時の影響が小さい

## 将来の一括フロー
```bash
cd projects/auto-media-mvp
npm run collect:techcrunch
npm run collect:hackernews
npm run rank:generate
npm run rank:render
npm run rank:pages
```

## 注意
- 初期は exact-time よりも「数時間おき」で十分
- collect 失敗と ranking 失敗を分けて把握したい
- output は静的成果物として扱う
