# FED_COLLECTOR_PLAN

Federal Reserve / FOMC 系 source を追加するための collector plan。

## 目的
公的 source を observatory に追加し、
`macro` / `policy` 観測を強化する。

## 期待する role
- tech news と被らない信号を追加する
- topic ranking に policy / macro の厚みを出す
- region = `us` かつ source_type = `official` の層を作る

## 最小 collector 要件
### 入力
- 公的ページ or feed

### 出力
- `data/raw/official/...`
- `data/normalized/...-fed-normalized.json`

### normalized shape
```json
{
  "id": "fed-2026-04-23-001",
  "source_type": "official",
  "source_name": "Federal Reserve",
  "source_url": "https://...",
  "title": "...",
  "body": "...",
  "published_at": "...",
  "collected_at": "...",
  "language": "en",
  "tags": [],
  "metrics": {
    "rank": 1,
    "score": null,
    "price_change_24h": null
  }
}
```

## classification expectation
- category: `macro` / `policy`
- region: `us`
- source_type: `official`
- topics: `policy-announcement`, `market-move`, `macro`

## 実装順
1. collector file を作る
2. raw 保存
3. normalized 保存
4. seen URL 管理
5. last_run 更新
6. ranking に混ぜて確認

## 注意
- 初期は feed / list page の shallow collect でよい
- 深い scraping は後回し
- 構造が壊れやすい source は 1 本目にしない
