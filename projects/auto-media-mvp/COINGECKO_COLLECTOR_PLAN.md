# COINGECKO_COLLECTOR_PLAN

CoinGecko 系 source を observatory に追加するための collector plan。

## 目的
crypto / market 系の signal を観測面に加える。

## 期待する role
- `crypto` category の厚みを出す
- `market-move` topic を増やす
- asset 名を entity 的に扱う基盤を作る

## 最小 collector 要件
### 入力
- CoinGecko の market-oriented endpoint

### 出力
- `data/raw/market/...`
- `data/normalized/...-coingecko-normalized.json`

### normalized shape の例
```json
{
  "id": "coingecko-2026-04-23-001",
  "source_type": "market-data",
  "source_name": "CoinGecko",
  "source_url": "https://www.coingecko.com/...",
  "title": "Bitcoin market snapshot",
  "body": "BTC market cap ..., price change 24h ...",
  "published_at": "...",
  "collected_at": "...",
  "language": "en",
  "tags": ["crypto", "market-data"],
  "metrics": {
    "rank": 1,
    "score": null,
    "price_change_24h": 3.4
  }
}
```

## classification expectation
- category: `crypto`
- region: `global`
- source_type: `market-data`
- topics: `market-move`
- entities: BTC / ETH / SOL など

## 実装順
1. collector scaffold
2. raw 保存
3. normalized 保存
4. ranking 反映
5. entity 抽出改善

## 注意
- 最初は top assets の snapshot だけでよい
- 深い市場分析は後回し
- 重要なのは daily / recurring observability
